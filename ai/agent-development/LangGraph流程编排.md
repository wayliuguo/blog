# LangGraph：有状态的流程编排

## LangChain 与 LangGraph 的分工

LangChain 的 `createAgent()` 本身构建在 LangGraph 之上。两者不是二选一：LangChain 适合"模型、工具、提示词 + 现成流程扩展"；当任务需要"先做什么、何时重试、在哪等人确认、退出后怎么继续"这类**明确的有状态流程**时，直接用 LangGraph 设计 State / 节点 / 边 / 暂停 / 恢复。

| 维度 | LangChain（createAgent） | LangGraph |
| ---- | ---- | ---- |
| 主要决定者 | 模型、工具、提示词 | 状态怎么设计、步骤怎么连接、哪里分支/汇合、何时暂停 |
| 典型场景 | 天气助手（现成 Agent 流程） | 报告助手（检查 → 并行查询 → 校验 → 人工审核） |

## State / Node / Edge

- **State**：当前任务保存了哪些数据（类比 Store，但更新要遵循图的合并规则）。
- **Node**：这一步做什么（读取状态、执行、返回要更新的字段）。
- **Edge**：执行完去哪（`addEdge` 固定边 / `addConditionalEdges` 条件边）。

真正决定运行顺序的是边的连接；`.addNode().addEdge()...compile()` 只是组装图，`invoke()/stream()` 才启动。

> 示意片段（无配套脚本）

```ts
import { StateGraph, Annotation } from '@langchain/langgraph'

const State = Annotation.Root({
  plan: Annotation<string>,
  approved: Annotation<boolean>,
})

const graph = new StateGraph(State)
  .addNode('generate', generateNode)
  .addNode('review', reviewNode)
  .addEdge('generate', 'review')
  .addConditionalEdges('review', route, { approve: END, reject: 'generate' })
  .compile()
```

## 条件边与业务流程

`Conditional Edge` 按当前状态选下一步。例如"生成报告 → 校验 → 通过则成功 / 失败则带错误重生成 / 超限则失败"。判断顺序：**先判是否通过，再判修改次数是否耗尽**；最后一次修改若已合格应成功结束。

> 示意片段（无配套脚本）

```ts
const graph = new StateGraph(State)
  .addNode('generate', generate)
  .addNode('check', check)   // 程序检查明确规则（字段齐全、引用有效）
  .addConditionalEdges('check', route, { pass: END, fix: 'generate', fail: END })
// route: 先判通过 → 再判修改次数耗尽 → 否则回到 generate
```

## 并行执行与 Reducer

互不依赖的节点可并行（如两份资料同时获取再汇总）。多个节点写**不同字段**可各自更新；同一步写**同一字段**需定义合并规则（Reducer，如把新数组追加到已有数组）。并行节点读的是该步开始时的状态，不能把 State 当实时全局变量。消息可用 `MessagesAnnotation`，内置追加 / 按 ID 更新。

> 示意片段（无配套脚本）

```ts
const State = Annotation.Root({
  items: Annotation<number[]>({ reducer: (a, b) => a.concat(b) }),
})
// 两个并行节点各返回自己的 items，reducer 把数组合并

import { MessagesAnnotation } from '@langchain/langgraph'
// 对话消息用 MessagesAnnotation，避免手写合并逻辑
```

## Checkpoint 持久化

`Checkpointer` 记录与恢复执行状态，`thread_id` 标识一段会话 / 任务上下文。先用 `MemorySaver` 理解延续，再换 PostgreSQL 保存器实现"程序退出后数据仍在、不同会话不串"。

> 示意片段（无配套脚本）

```ts
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

const checkpointer = PostgresSaver({ connectionString: process.env.LANGGRAPH_DATABASE_URL })
const app = graph.compile({ checkpointer })
await app.invoke(input, { configurable: { thread_id: 'task-1' } })
```

## Human-in-the-loop

`interrupt()` 在指定位置暂停等人输入，`Command({ resume })` 提交后从检查点恢复。恢复时相关节点会从函数开头重跑，因此**幂等性**很关键：已成功的操作（如保存报告）重复恢复不应再产生一次。

> 示意片段（无配套脚本）

```ts
import { interrupt, Command } from '@langchain/langgraph'

// 节点里暂停等人输入
const decision = interrupt('请审核计划')
// 恢复：Command({ resume: decision })，需带同一 thread_id 与检查点
await app.invoke(Command({ resume: decision }), { configurable: { thread_id } })
```

## 多 Agent 与子图

职责需要独立模型决策 / 工具 / 上下文时才拆 Agent（如研究 Agent 与写作 Agent），简单数据校验保留为普通函数节点即可。`Subgraph` 把一段完整流程作为另一张图的节点，父子图通过共享字段或包装节点通信。

> 示意片段（无配套脚本）

```ts
const parent = new StateGraph(ParentState)
  .addNode('research', researchSubgraph)   // 子图作为父图的一个节点
  .addNode('write', writeAgent)
```

## 一个判断：动态子 Agent、复杂调度先放后

动态数量的子 Agent、复杂任务调度、历史检查点回放，等当前项目出现具体需求时再补。先把手写 Agent → LangChain → LangGraph 这条"理解底层、再上框架"的路线走通，比直接背框架 API 更扎实。

## 可运行镜像：零依赖复刻状态图

正文里的 `StateGraph / Annotation / addConditionalEdges` 需要 LangGraph + DeepSeek 环境。为了不依赖 API Key 也能把「模型决策 → 工具执行 → 是否继续」这一循环跑通，下面用零依赖方式复刻其核心机制：State 对象 + 节点 + 边 + 条件路由 + Reducer（消息追加）（真实集成见上方「示意片段」）。

> 摘自 `code/agent-lab/langgraph/langgraph-agent.ts`（运行：`npm run langgraph`）

```ts
/**
 * LangGraph 风格状态图（可运行镜像）
 * ──────────────────────────────────────────────
 * 文章正文里的「示意片段」展示真实集成：
 *   import { StateGraph, Annotation, END } from '@langchain/langgraph'
 *   const State = Annotation.Root().add(Annotation<Msg[]>({ reducer: (a, b) => a.concat(b) }))
 * 本文件用零依赖复刻其核心机制：State 对象 + 节点 + 边 + 条件路由 + Reducer（消息追加），
 * 让你不依赖 API Key 也能跑通「模型决策 → 工具执行 → 是否继续」的循环。
 *
 * 运行：npm install && npm run langgraph
 */

// 状态：一段消息列表。Reducer 负责把「新消息」追加到「已有状态」上，
// 对应 LangGraph 里 Annotation 的 reducer（增量合并而非整体覆盖）。
type State = { messages: string[] }

function reducer(state: State, update: Partial<State>): State {
  return {
    messages: [...state.messages, ...(update.messages ?? [])],
  }
}

// 节点：普通函数 (state) => 部分 state 更新
type Node = (s: State) => Partial<State>

const callModel: Node = () => ({
  messages: ['(model) 我需要查一下天气，调用 getWeather'],
})

const callTool: Node = () => ({
  messages: ['(tool) 西安 晴 22°C'],
})

// 条件边：根据状态决定下一步去哪个节点，
// 对应 LangGraph 的 addConditionalEdges（路由函数返回下一个节点的名字）。
function shouldContinue(s: State): string {
  const last = s.messages[s.messages.length - 1]
  if (last.includes('getWeather')) return 'callTool' // 还需要执行工具 → 继续
  return 'end' // 工具已执行 → 结束
}

function runGraph() {
  let state: State = { messages: ['(human) 西安天气怎么样？'] }
  const nodes: Record<string, Node> = { callModel, callTool }

  // 起点：先让模型决策
  state = reducer(state, callModel(state))
  let step = 0
  while (step++ < 10) {
    const next = shouldContinue(state)
    if (next === 'end') break
    state = reducer(state, nodes[next](state))
  }

  console.log('状态轨迹：')
  state.messages.forEach((m, i) => console.log(`  ${i}. ${m}`))
}

runGraph()
```

## 配套代码

| 文件 | 运行 | 说明 |
| ---- | ---- | ---- |
| `code/agent-lab/langgraph/langgraph-agent.ts` | `npm run langgraph` | 零依赖镜像：State + 节点 + 条件边 + Reducer（正文示意片段才是真实框架 API） |

> 正文其余代码为示意片段（来自教程代码，需 LangChain / LangGraph / DeepSeek 环境）。Agent Loop、AgentTool 等可运行实现见 `code/agent-lab/agent-loop/`。

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 7 篇：LangChain；回到 [Agent 模块总结](./总结.md) 看全景
