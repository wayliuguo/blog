# LangGraph：有状态的流程编排

## LangChain 与 LangGraph 的关系：配合，不是二选一

刚接触这两个名字，很容易理解成二选一的框架。关键事实：**当前 LangChain 的 Agent 抽象本身就构建在 LangGraph 之上**。所以工具调用、循环、多轮记忆、人工确认，都不是某一个框架独有的能力。侧重点这样分：

| 使用方式 | 由我决定什么 |
| ---- | ---- |
| LangChain 的 Agent 抽象 | 模型、工具、提示词，以及对现成 Agent 流程的扩展 |
| 直接使用 LangGraph | 状态怎么设计、步骤怎么连接、哪里分支、哪里汇合、什么时候暂停和结束 |

查询天气助手用 LangChain 就很方便；但「先查资料 → 并行查两个来源 → 生成报告 → 校验 → 不合格修改 → 人工审核」这种**流程本身需要设计**的任务，就是 LangGraph 的主场——它把业务规则明确地写进执行流程。

## 三个最基础的概念：State / Node / Edge

| 名词 | 中文含义 | 直观理解 |
| ---- | ---- | ---- |
| State | 状态 | 当前任务保存了哪些数据 |
| Node | 节点 | 这一步具体做什么 |
| Edge | 边 | 执行完这一步，接下来去哪里 |

对前端开发者，State 可以先类比成 Store，但它的更新要遵循图的执行与合并规则，**不能当全局变量用**。节点通常就是一个函数：读取当前状态、执行操作、返回需要更新的字段。配套实战脚本的 State 定义：

> 摘自 `code/langgraph/workflow.ts`

```ts
// State：这次任务保存了哪些数据。节点只返回自己修改的字段。
interface PlanState {
  topic: string
  plan: string
  errors: string[] // 校验失败的具体原因，反馈给生成节点修复
  revisions: number // 已修改次数
  pendingReview: string | null // 非空 = 图在 review 处暂停
  status: PlanStatus
}
```

节点只提交自己修改的字段——生成节点只返回 `{ plan }`，审核节点只返回 `{ pendingReview }` 这类暂停标记（审核结论要等恢复时才写入）。这条原则在并行流程里是硬约束：**把整个 State 展开全部返回，可能让多个节点同时写入本来不需要修改的字段。**

## 链式调用误区：组装顺序 ≠ 执行顺序

最初看到一长串 `.addNode().addEdge().compile()` 时，很容易以为代码从上往下排列就意味着流程按这个顺序执行。实际上五个 API 的职责是：

```
addNode()              注册一个步骤
addEdge()              建立固定连接
addConditionalEdges()  根据状态选择下一步
compile()              检查并构建可执行的图
invoke()/stream()      才启动执行
```

**真正决定运行顺序的是边的连接关系**；链式调用只是组装图的一种写法。图的定义阶段与执行阶段是分开的。

## 把 Agent Loop 放进图里：双节点循环

之前手写的 Agent Loop，在 LangGraph 里拆成「模型节点」和「工具节点」：

```
模型节点（返回工具调用请求） → 工具节点（执行后把结果交回） → 模型节点 → ……
        └──── 模型给出最终回答 → 结束 ────┘
```

配套镜像脚本把这个循环压缩成了可运行的三步：

> 摘自 `code/langgraph/langgraph-agent.ts`

```ts
// 节点：普通函数 (state) => 部分 state 更新
type Node = (s: State) => Partial<State>

const callModel: Node = () => ({
    messages: ['(model) 我需要查一下天气，调用 getWeather']
})

const callTool: Node = () => ({
    messages: ['(tool) 西安 晴 22°C']
})

// 条件边：根据状态决定下一步去哪个节点，
// 对应 LangGraph 的 addConditionalEdges（路由函数返回下一个节点的名字）。
function shouldContinue(s: State): string {
    const last = s.messages[s.messages.length - 1]
    if (last.includes('getWeather')) return 'callTool' // 还需要执行工具 → 继续
    return 'end' // 工具已执行 → 结束
}
```

两个不能省的实现细节：

- 必须保留模型返回的**完整消息**——其中包含工具调用信息；
- 工具结果消息 `ToolMessage` 的 `tool_call_id` 要对应原来的调用 ID，模型才能知道这个结果属于哪次请求。

## 循环停止条件：三个易混淆的限制

LangGraph 里同时存在三个「限制」，分别约束不同的执行层次，**不能互相替代**：

| 限制 | 控制什么 |
| ---- | ---- |
| 自己维护的工具轮数 | 业务允许执行多少轮工具；一轮可能包含多个调用 |
| `recursionLimit` | 图运行的超级步数上限；同一步可以包含并行节点 |
| 模型的 `maxRetries` | 模型请求失败后的自动重试次数 |

还有一组数字不能画等号：模型调用次数、工具调用次数、工具执行轮数、图的执行步数——**一轮模型回复可能请求多个工具**。另外注意：State 字段的 `.default(0)` 不会在每轮对话开始时自动把计数器清零；如果工具轮数按「本轮对话」计算，需要在新一轮输入里显式重置。

## 校验与修改：让模型自我修正

实战任务：生成「三天学习计划」，要求每天都有目标、有练习、时长不超过 60min。分工：提示词说明要求，**代码校验返回的数据**。校验节点只检查「能明确表达的规则」：

> 摘自 `code/langgraph/workflow.ts`

```ts
// 校验节点：程序只检查「能明确表达的规则」（字段在不在、数值超不超限），
// 计划内容是否合理属于评价问题，不在这里判。
const check: Node = s => {
    const errors: string[] = []
    if (!s.plan.includes('练习')) errors.push('缺少练习安排')
    if (!s.plan.includes('60min')) errors.push('未标注时长上限')
    return { errors }
}
```

生成节点带反馈修复（真实场景调 LLM，镜像用规则 mock）：

> 摘自 `code/langgraph/workflow.ts`

```ts
// 生成节点：第一版故意不合格（缺练习、没写时长）；带 feedback 时按错误修复——
// 真实场景这一步调 LLM，这里用规则 mock 保持零依赖。
const generate: Node = s => {
    if (s.errors.length === 0) {
        return { plan: `三天${s.topic}计划（每天只有目标）`, revisions: 0, status: 'drafting' }
    }
    return {
        plan: `三天${s.topic}计划（每天有目标、有练习、不超过 60min）`,
        revisions: s.revisions + 1,
        status: 'drafting'
    }
}
```

两个要点：

- **判断顺序**：先判断是否通过，再判断修改次数是否耗尽——「最后一次修改如果已经符合要求，应该成功结束」；
- **规则校验通过 ≠ 内容合适**——结构化校验只覆盖明确规则，计划内容是否适合学习者需要其他评价方式。

## 条件边：把分支写进图

根据校验结果路由，这就是 Conditional Edge：

> 摘自 `code/langgraph/workflow.ts`

```ts
// 条件边 1：先判通过，再判次数耗尽；最后一次修改若已合格应成功结束。
function routeAfterCheck(s: PlanState): 'review' | 'generate' | 'fail' {
  if (s.errors.length === 0) return 'review'
  if (s.revisions >= MAX_REVISIONS) return 'fail'
  return 'generate'
}
```

验收时三条路径都要能工作：一次通过、修改后通过、达到上限后停止。

## 并行节点与 Reducer：数据依赖决定串并行

两个节点是否可以并行，取决于**数据依赖关系**：

```
并行：两个节点只依赖同一个主题（一个生成概念说明、一个生成练习）→ 并行后汇总
串行：练习必须根据概念说明设计 → 先说明后练习
```

多节点写**不同字段**：可以分别更新；多节点写**同一字段**：需要定义合并规则——**Reducer**（状态合并函数），例如两个节点分别提交数组，Reducer 把新数组追加到已有数组。消息列表有专用的 `MessagesValue`：内置「追加消息 + 按消息 ID 更新已有消息」的合并逻辑。两个坑：

- **并行节点读取的是该步开始时的状态**——不能把 State 当作随时能看到其他节点最新修改的全局变量；
- **数组合并后的顺序不能理解成节点完成的先后顺序**。

## 实战：生成 → 暂停审核 → 恢复

案例目标：输入学习主题 → 生成计划 → 暂停等待人工确认 → 批准标记采用、拒绝标记拒绝；**暂停后程序可以退出，下次运行再继续审核**。核心三件事：审核节点挂起、Checkpointer 存状态、恢复时从检查点续跑。

审核节点用 `interrupt` 挂起（真实集成一行 `interrupt('请审核计划')`，镜像把挂起物写进 State）：

> 摘自 `code/langgraph/workflow.ts`

```ts
// 审核节点：interrupt——把待审内容挂起，图在这里暂停等人输入。
// 真实集成：const decision = interrupt('请审核计划')。
const review: Node = s => ({
    pendingReview: s.plan,
    status: 'paused'
})
```

Checkpointer 按 thread_id 存状态快照（真实集成换 PostgresSaver，实现「程序退出后数据仍在」）：

> 摘自 `code/langgraph/workflow.ts`

```ts
// 内存版 Checkpointer：thread_id → 状态快照。
// 真实集成换 PostgresSaver，实现「程序退出后数据仍在」。
class MemoryCheckpointer {
  private snapshots = new Map<string, PlanState>()

  save(threadId: string, state: PlanState): void {
    this.snapshots.set(threadId, structuredClone(state))
  }

  load(threadId: string): PlanState | undefined {
    return this.snapshots.has(threadId)
      ? structuredClone(this.snapshots.get(threadId))
      : undefined
  }
}
```

主流程串起「第一次运行 → 存检查点 → 模拟重启 → 恢复」：

> 摘自 `code/langgraph/workflow.ts`

```ts
    // 1) 第一次运行：生成 → 校验失败 → 修改 → 通过 → 暂停审核
    let state: PlanState = {
        topic: 'TypeScript',
        plan: '',
        errors: [],
        revisions: 0,
        pendingReview: null,
        status: 'drafting'
    }
    state = invoke('thread-1 第一次 invoke（无审核）', state, null)
    checkpointer.save('thread-1', state)
    console.log(`\n(checkpointer) thread-1 已保存，程序可以退出：status=${state.status}`)

    // 2) 模拟程序重启后恢复：从 Checkpointer 读回，提交审核结果
    const restored = checkpointer.load('thread-1')
    if (restored) {
        console.log(`\n(restart) 程序重启，从 Checkpointer 恢复 thread-1：status=${restored.status}`)
        state = invoke('thread-1 resume（approved）', restored, 'approved')
        checkpointer.save('thread-1', state)
    }
```

实跑读数（`npm run workflow`）：

```
=== thread-1 第一次 invoke（无审核） ===
  [generate] revisions=0 plan=三天TypeScript计划（每天只有目标）
  [check] errors=["缺少练习安排","未标注时长上限"]
  (conditional) 不合格 → 带反馈重做：缺少练习安排；未标注时长上限
  [generate] revisions=1 plan=三天TypeScript计划（每天有目标、有练习、不超过 60min）
  [check] errors=[]
  (conditional) 校验通过 → 进入人工审核
  [review] interrupt：等待人工输入（thread 暂停）

(checkpointer) thread-1 已保存，程序可以退出：status=paused

(restart) 程序重启，从 Checkpointer 恢复 thread-1：status=paused
=== thread-1 resume（approved） ===
(resume) 收到审核结果：approved
  [applyDecision] status=approved pendingReview=null

(thread-2) 未创建过任务：checkpointer 返回 undefined
```

一条链完整走完：生成 → 校验失败带反馈重做 → 校验通过 → 暂停等审核 → 重启恢复 → 落决定。不同 thread 的数据互不串扰。

## interrupt 与 Command resume：HITL 的完整时序

HITL（Human-in-the-loop，人工参与流程）的暂停-恢复机制：

```
① 审核节点调用 interrupt({...}) → 内容交给外部，当前运行暂停
② 外部提交 Command({ resume: { approved: true } })
③ 审核节点从头重新执行 → interrupt() 的返回值就是恢复数据
④ 节点返回 { approved } → 条件边分流到 adopt / reject
```

三条工程级注意事项：

- **恢复时，被中断的节点会从函数开头重跑**——如果模型调用、发消息等操作写在 `interrupt()` 前面，恢复时也会再次执行；会产生外部影响的操作必须考虑**幂等**（同一业务操作重复执行不应造成额外结果）；
- 正因如此，**生成计划和人工审核要拆成两个节点**——正常恢复审核时，能沿用之前保存的计划；
- **不要在节点里用宽泛的 try/catch 把 interrupt() 的中断信号吞掉**。

## Checkpoint 与持久化：程序退出后怎么继续

Checkpoint（检查点）记录流程的状态和执行进度；Checkpointer 是保存/读取它的组件：

| 实现 | 数据在哪 | 适用 |
| ---- | ---- | ---- |
| MemorySaver | 当前进程内存 | 学习、验证流程 |
| PostgresSaver | PostgreSQL | 程序退出后恢复 |

`PostgresSaver.fromConnString(url)` 创建，`checkpointer.setup()` 建表（数据库要提前建好），`compile({ checkpointer })` 挂到图上。每次运行通过 `configurable.thread_id` 定位任务——**thread 不指 Node.js 工作线程**，它标识一段会话或任务执行上下文。两个兼容性提醒：

- 数据库里保存的是状态和执行记录，**节点代码仍由应用提供**——恢复旧任务时，图定义和状态结构也要保持兼容；
- 跨会话共享用户偏好属于另一类记忆设计（第 4~5 篇的 Memory），不能靠检查点实现；
- `thread_id` 只标识「哪段会话」，不做权限校验——接入多用户登录后，要在业务层检查任务归属，**不能把会话 ID 当访问权限**。

## 流式输出：三种 streamMode

Streaming 就是在执行过程中不断把结果片段交给调用方。三种模式各管一类信息：

| 模式 | 本例如何使用 |
| ---- | ---- |
| `messages` | 接收模型消息片段，连续输出正文 |
| `updates` | 接收节点的状态更新，显示节点完成 |
| `custom` | 接收节点内 `config.writer` 发出的自定义进度 |

四个细节坑：

- `messages` 是**流模式名称**，不要求 State 里必须有一个 messages 字段；
- 节点内部可以照常等待 `model.invoke()` 的完整结果——节点内外的两种粒度并存不冲突；
- 文字片段用 `process.stdout.write()` 连续显示；**节点完成后 updates 里已包含完整计划，不能再追加一遍，否则显示重复**；
- **自定义进度消息不会自动写入 State**——要保存的数据仍通过节点返回值提交。

流结束有两种含义：流程完成，或者只是**暂停等待审核**——业务是否完成要看自己的状态字段，不能只看 `next` 是否为空。

## 学习路线：一次完成一个小闭环

LangGraph 的学习按九个阶段推进，每个阶段留下一个可运行、可观察的小练习：

| 阶段 | 这一版要完成的小闭环 |
| ---- | ---- |
| 1. 图的基础 | 输入问题，按规则进入不同节点 |
| 2. Agent 循环 | 模型调用工具，再根据结果回答 |
| 3. 业务流程 | 生成报告，检查并有限次修改 |
| 4. 并行执行 | 同时获取两份资料，再汇总 |
| 5. 持久化 | 重启程序后能读取已有任务状态 |
| 6. 人工参与 | 暂停审核，提交意见后继续 |
| 7. 多 Agent | 研究与写作分工，明确输入输出 |
| 8. 前端与调试 | 显示执行进度，定位失败步骤 |
| 9. 工程验证 | 处理超时、重试、重复请求和异常结束 |

固定验证用例（「能跑完一次」之后必须验证这些路径）：

| 场景 | 希望验证的行为 |
| ---- | ---- |
| 输入完整 | 正常生成报告 |
| 缺少必要资料 | 返回缺少的信息或进入补充分支 |
| 一个数据源临时失败 | 按策略重试，失败后给出明确原因 |
| 报告一直不合格 | 达到修改上限后停止 |
| 等待审核时重启 | 能恢复原来的任务 |
| 重复提交审核结果 | 不会重复产生业务结果 |

方法论：**先明确任务需要保存哪些状态、步骤之间有什么依赖，再决定哪些节点调用模型、哪些节点执行规则校验、哪里需要人工确认。**动态数量的子 Agent、复杂调度、历史检查点回放，等具体需求出现再补。

## 多 Agent 与子图：什么时候才拆

职责需要独立模型决策、独立工具、独立上下文时才拆 Agent（如研究 Agent 与写作 Agent）；简单的数据校验保留为普通函数节点。拆分后用 **Subgraph（子图）** 把一段完整流程作为另一张图的一个节点：父子图通过共享字段通信，或通过包装节点转换输入输出——写作 Agent 接收整理后的研究结果，不必处理研究过程中的全部工具消息。

| 角色 | 主要输入 | 主要输出 |
| ---- | ---- | ---- |
| 研究 Agent | 用户任务、资料来源 | 带来源的研究结论 |
| 写作 Agent | 用户任务、研究结论 | 报告正文 |

## 配套代码

| 脚本 | npm script | 对应小节 |
| ---- | ---- | ---- |
| `code/langgraph/langgraph-agent.ts` | `npm run langgraph` | State + 双节点 Agent Loop + 条件边（零依赖镜像） |
| `code/langgraph/workflow.ts` | `npm run workflow` | 生成 → 校验分支 → interrupt 暂停审核 → 恢复（零依赖镜像） |

> 正文里的 `StateGraph` / `interrupt()` / `Command({ resume })` / `PostgresSaver` 为真实框架 API，依赖 `@langchain/langgraph` 与数据库环境，以示意片段呈现。
>
> 原文参考版本（项目 `langgraph-study`）：`@langchain/langgraph@1.4.17` / `@langchain/core@1.2.12` / `@langchain/deepseek@1.1.13` / `@langchain/langgraph-checkpoint-postgres@1.0.5` / `zod@4.6.5` / `dotenv@18.0.3`；另含建库 `CREATE DATABASE langgraph_learning` 与 `.env`（`DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `LANGGRAPH_DATABASE_URL`）步骤。
