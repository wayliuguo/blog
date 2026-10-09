# Agent Loop：手写会循环的 Agent 运行时

## Tool Calling 并不等于 Agent：单轮撑不起依赖链

上一篇跑通了完整的单轮 Tool Calling：

```
用户 → LLM → tool_call → 程序执行 Tool → Tool Result → LLM → 最终回答
```

看起来已经挺像 Agent 了。但换个任务立刻露馅：「西安今天超过 30℃ 的话，帮我推荐几个室内去处」——第二步（推荐地点）依赖第一步的结果（35℃ > 30℃），单次 Tool Calling 无法完成：

```
查天气 → 得到 35℃ → 判断 35 > 30 → 搜索室内地点 → 生成最终答案
```

Tool Calling 只是「模型表达希望调用某个工具」的一次性动作；步骤之间有依赖的多步任务，需要一个新的执行机制——**Agent Loop**。

## Agent Loop 的本质就是一个循环

最简单的 Agent Loop，本质上就是一个循环：调用 LLM → 需要 Tool？→ 是 → 执行 Tool → 把结果放回上下文 → 再次调用 LLM → 继续判断——**直到模型不再返回 tool_calls**：

```
while (iteration < MAX_ITERATIONS) {
  const response = await llm(messages)
  if (!response.tool_calls?.length) {
    return response.content        // 模型认为任务完成
  }
  await executeTools(response.tool_calls)
}
```

用天气案例走一遍三轮：

```
第一轮：get_weather("西安") → {"city":"西安","temperature":35,"weather":"晴"}
第二轮：35 > 30 → search_indoor_places() → {"places":["陕西自然博物馆","西安科技馆"]}
第三轮：不再调用 Tool → 生成最终答案
```

由此得到 Agent 的最小公式：

```
Agent = LLM + Tools + Context + Agent Loop + Stop Condition
```

把 Agent 理解成「大模型调用几个工具」是不够的——最基础的 Agent 也是包含上下文管理与终止条件的系统。

## 为什么必须设置最大循环次数

最自然的写法是 `while (true)`，但危险场景立刻出现：模型不断认为「还需要调用 Tool」。四重后果连环发生：

```
死循环 → Token 持续消耗 → 第三方 API 持续调用 → 服务器资源持续占用
```

修复方案就是给循环一个硬性上限——**Stop Condition（停止条件）**：

> 示意片段（无配套脚本）

```ts
const MAX_ITERATIONS = 10
let iteration = 0
while (iteration < MAX_ITERATIONS) {
  iteration++
  // ... Agent Loop
}
throw new Error('Agent 超过最大执行次数')
```

## 一轮可以调用几个 Tool：while 管多轮，for 管一轮

`tool_calls.length` 一定等于 1 吗？不是。用户问「帮我查西安、北京、上海三个城市的天气」——三个任务互不依赖，模型一轮就并行返回三个调用：

```
tool_calls
├── get_weather("西安")
├── get_weather("北京")
└── get_weather("上海")
```

所以正确写法是两层循环各管一件事：

- **while 负责多轮决策**——模型判断「任务完成了吗」；
- **for 负责当前这一轮的多个 Tool Call**——逐个执行、逐个回填。

只取 `tool_calls[0]` 是常见错误，会静默漏掉同一轮的并行调用。

## 第一版 Agent Loop

把上面的概念落成可运行代码（LLM 用 mock 注入，脱离 API 也能跑）：

> 摘自 `code/agent-loop/agent-loop.ts`

```ts
export async function runAgentLoop(
  userMessage: string,
  tools: AgentTool[],
  llm: (messages: unknown[]) => Promise<LlmTurn>,
  // 默认 5：原文示例为 MAX_ITERATIONS = 10，语义一致，本实验台轮数够演示即可
  maxIterations = 5
): Promise<string> {
  const toolMap = new Map(tools.map(t => [t.name, t]))
  const messages: unknown[] = [{ role: 'user', content: userMessage }]

  for (let i = 0; i < maxIterations; i++) {
    const response = await llm(messages)
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response.content ?? ''
    }
    for (const call of response.tool_calls) {
      const tool = toolMap.get(call.name)
      if (!tool) throw new Error(`未知工具: ${call.name}`)
      const result = await tool.execute(call.arguments)
      messages.push({ role: 'assistant', tool_calls: [call] })
      messages.push({ role: 'tool', name: call.name, content: JSON.stringify(result) })
    }
  }
  throw new Error('达到最大迭代次数仍未结束')
}
```

这已经可以看出一个最简单 Agent Runtime 的雏形：LLM 调用、消息数组、循环、工具执行、结果回填全部到位。接下来逐个修掉它埋着的坑。

## 坑一：Tool 一定要 await

一个极隐蔽的 Bug：把 `execute()` 的调用写成 `const result = tool.execute(args)`——少一个 `await`。后果链是：

```
execute() 是异步函数 → result 是 Promise 而不是 Tool Result
→ JSON.stringify(Promise) 得到 {} → 模型看到的是假结果
```

Tool 可能确实执行了，但 LLM 没拿到真正执行结果——表面一切正常，上下文已经坏掉。**回填给 LLM 的必须是 await 之后的真实 Tool Result。**

## 坑二：assistantMessage 必须先入栈

时序不能乱：`assistant(tool_calls)` 必须在对应的 `tool` 结果**之前**进 messages。完整顺序是：

```
user → assistant（含 tool_call: call_123）→ tool（tool_call_id: call_123）
```

拟人化理解：模型先说「我要调用 call_123」，程序再答「call_123 的执行结果回来了」。`tool_call_id` 是告诉模型「这个结果对应你刚才哪次调用」的配对凭证；漏 push 或顺序颠倒，模型就无法把结果对应回自己发起的调用。真实 SDK 场景的完整配对与二次调用，见第 2 篇 `tool-closure.ts` 的逐步拆解。

## Tool 一多，if 分发开始失控

工具数量还会继续增长。在 AgentService 里这样写：

```
if (toolName === 'get_weather') { ... }
if (toolName === 'search_indoor_places') { ... }
```

两个工具看不出问题；等 WeatherTool、SearchTool、RAGTool、DatabaseTool、EmailTool、CalendarTool 都进来，就是几十个 `if`——显然不可维护。解决方式是把「根据名字找工具」集中到一处：**Tool Registry**。

## 统一 AgentTool 协议：四要素

Registry 要能泛化处理所有工具，前提是所有工具长一个样。约定统一协议：

> 摘自 `code/agent-loop/agent-tool.ts`

```ts
// 所有工具遵循统一协议：名字、描述、参数 schema、执行函数。
export interface AgentTool {
  name: string
  description: string
  schema: unknown
  execute(args: Record<string, unknown>): Promise<unknown>
}
```

每个具体工具实现这四要素：

> 摘自 `code/agent-loop/agent-tool.ts`

```ts
// 示例工具：真实实现会调用天气 API，这里返回固定结构以便脱离外部服务运行。
export class WeatherTool implements AgentTool {
  name = 'get_weather'
  description = '查询指定城市当前的天气信息'
  schema = { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { city } = args as { city: string }
    return { city, temperature: 35, weather: '晴', humidity: 48 }
  }
}
```

## Tool Registry：一张 Map + 一个 invoke

Registry 内部就是「名字 → 工具实例」的 Map。模型返回 `function.name` 后查表执行，AgentService 与具体工具从此解耦——它只依赖名字与协议：

> 摘自 `code/agent-loop/tool-registry.ts`

```ts
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }
```

## Zod：LLM 参数是运行时数据，TS 类型管不住它

安全原则先行：**永远不要完全相信 LLM 返回的 Tool 参数**。期望参数是 `{"city": "西安"}`，模型可能给 `{"city": 123}` 甚至 `{}`。不校验的灾难链：

```
String(args.city) → String(undefined) → "undefined" → 拿着 city=undefined 去请求真实天气 API
```

TypeScript 类型 `type WeatherArgs = { city: string }` 帮不上忙——它只保证编译期安全，而 LLM 参数来自运行时的 `JSON.parse`，编译完成后类型已被擦除。所以 LLM Output、Tool Arguments 和 HTTP Request、第三方 API 一样，都属于**不可信外部输入**，必须过运行时校验边界（Validation Boundary）：

```
不可信数据 → Validation Boundary → 可信数据
```

> 摘自 `code/agent-loop/tool-registry.ts`

```ts
const WeatherArgsSchema = z.object({
    city: z.string().min(1).describe('城市名称，例如西安、北京、上海')
})
```

## 一份 Schema 两处用：Single Source of Truth

最初容易写两份 Schema：Zod 版给校验、JSON Schema 版给 LLM。两份必然漂移。Zod 4 可以直接把 Zod Schema 转成 JSON Schema，一源两用：

> 摘自 `code/agent-loop/tool-registry.ts`

```ts
    // 给 LLM 的 Tool Definition：由 Zod Schema 自动生成 JSON Schema（一源两用）
    getDefinitions() {
        return [...this.tools.values()].map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: z.toJSONSchema(tool.schema)
            }
        }))
    }
```

一个 Zod Schema 派生出参数校验（`parse`）与 Tool Definition（`z.toJSONSchema`）；以后参数变化只改这一份。

## Registry 不只是 Map：Tool Runtime 的四步收口

Registry 的职责不止「找到工具」。查找、校验、执行、错误处理应统一封装在 `invoke()` 里。注意这里的 `AgentTool.schema` 直接定义为 Zod 类型（`z.ZodType`），比 `agent-tool.ts` 的 `unknown` 更进一步——校验因此能收口进 Registry：

> 摘自 `code/agent-loop/tool-registry.ts`

```ts
    // Tool Runtime：查找 → 校验 → 执行 → 错误处理，四步统一收口
    async invoke(toolName: string, args: unknown): Promise<ToolResult> {
        const tool = this.getTool(toolName)
        if (!tool) {
            return { success: false, error: `Tool 不存在: ${toolName}` }
        }
        try {
            const parsed = tool.schema.parse(args)
            const data = await tool.execute(parsed as Record<string, unknown>)
            return { success: true, data }
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: 'Tool 参数校验失败',
                    details: error.issues.map(issue => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }))
                }
            }
            return { success: false, error: error instanceof Error ? error.message : 'Tool 执行失败' }
        }
    }
```

职责分层就此清晰：

```
AgentService   →  Agent Loop / LLM / Messages
ToolRegistry   →  查找 / 校验 / 执行 / 错误处理
具体 Tool      →  业务逻辑
```

## Tool 执行失败，为什么不直接 HTTP 500？

传统后端思维：参数错误 → throw → HTTP 500。Agent 不该这样——校验失败后返回结构化错误，**错误仍然 push 进 messages 告诉模型**，模型下一轮自行修正：

```
传统后端：参数错误 → throw → HTTP 500
Agent：   校验失败 → 结构化错误 → 回填 messages → LLM 看到错误 → 重新决策
```

实跑读数（`npm run registry`）：

```
第一轮：模型传来坏参数 { city: 123 }
  返回（错误即 Observation）： {"success":false,"error":"Tool 参数校验失败",
    "details":[{"path":"city","message":"Invalid input: expected string, received number"}]}
  → 把这个错误原样 push 进 messages，模型下一轮会自行修正
第二轮：模型修正后传来 { city: "西安" }
  返回： {"success":true,"data":{"city":"西安","temperature":35,"weather":"晴","humidity":48}}
查无此工具： {"success":false,"error":"Tool 不存在: nope"}
```

这就是 **Self-Correction（自我纠错）**，机制一点也不玄学：

```
执行失败 → 错误成为 Observation → 加入 Context → LLM 看到错误 → 重新决策
```

用传统思维把 Tool 错误直接抛成 500，等于剥夺了模型自我纠错的机会。

## 重新理解 Agent：Action 与 Observation

再回头看 Agent Loop，就比一开始清楚很多：

```
User → LLM → Action → Tool → Observation → LLM → Action → Tool → Observation
     → LLM → Final Answer
```

两个概念映射：

- **Action = tool_call**——模型表达的「我想做什么」；
- **Observation = Tool Result**——甚至 Tool Error 也是一种 Observation。

Agent 能连续工作的本质：**模型不断根据新的 Observation 重新进行下一步决策**。

## 目前的 Agent 架构

几轮重构下来，整体结构已经和最初的 `LLM → if → Tool → return` 完全不是一回事：

```
User → AgentController → AgentService
                            │
                       Agent Loop / Messages / LLM
                            │ tool_call
                       ToolRegistry
                   ┌─────────┼──────────┐
                查找 Tool   Zod 校验    错误处理
                   └─────────┼──────────┘
                            ▼ execute
              WeatherTool / PlaceTool / FutureTool
                            │ Tool Result
                       回填 messages → 下一轮 Agent Loop
```

## 手写的这些东西，对应框架的什么概念

到这里还没有引入 LangChain，是刻意的：先手写，才知道框架每个 API 背后是哪一层。映射关系先存档，第 7 篇会正式对上：

| 手写组件 | LangChain 概念 |
| ---- | ---- |
| LLM Client | Chat Model |
| messages 数组 | BaseMessage |
| Zod Schema | Tool Schema |
| WeatherTool | Tool |
| Tool Result | ToolMessage |
| Agent Loop | Agent Runtime |

## 下一步：让 Agent 拥有 Memory

当前 Agent 最明显的缺陷：每次 HTTP 请求都重建 messages，没有记忆——

```
用户：我叫张三    → Agent：你好张三
（下一次请求，messages 从零开始）
用户：我叫什么？  → Agent：不知道
```

根因是请求结束后 messages 丢失。下一步就是把消息历史持久化（Conversation + Session + Message History），再往前是跨会话的长期记忆——第 4 篇从这里接上。到那时你对 Agent 的理解会再变一次：它不是「大模型会调用几个函数」，而是**一个围绕 LLM 构建的持续决策与执行系统**，而 while 循环就是这个系统最原始、也最值得亲手实现一次的起点。

## 跑起来验证：直接运行循环脚本

本篇是零依赖演示工程，没有 HTTP 服务，验证方式就是跑它本身。cmd 里：

```bash
cd code/agent-loop
npm install
npm run agent-loop
```

实测输出：

```
西安今天 35℃ 晴。
```

一行背后是完整的循环：mock LLM 第一轮返回 `tool_calls` → `WeatherTool` 执行 → 结果回灌 → 第二轮返回最终答案。第一版 Agent Loop 的 while/for 分工、Stop Condition、回填时序，全在这条链上。

再跑 Tool Registry（Zod 校验、错误即 Observation）：

```bash
npm run registry
```

实测输出：

```
第一轮：模型传来坏参数 { city: 123 }
  返回（错误即 Observation）： {"success":false,"error":"Tool 参数校验失败","details":[{"path":"city","message":"Invalid input: expected string, received number"}]}
  → 把这个错误原样 push 进 messages，模型下一轮会自行修正
第二轮：模型修正后传来 { city: "西安" }
  返回： {"success":true,"data":{"city":"西安","temperature":35,"weather":"晴","humidity":48}}
查无此工具： {"success":false,"error":"Tool 不存在: nope"}
```

LLM 是 mock，但循环、校验、错误回灌的机制是真实的——把 mock 换成第 2 篇的 `chatWithTools`，这套循环原样能跑。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-loop/agent-tool.ts` | （被 agent-loop.ts 引用；registry 内是 schema 为 z.ZodType 的独立定义） | 统一 AgentTool 协议四要素 |
| `code/agent-loop/agent-loop.ts` | `npm run agent-loop` | 第一版 Agent Loop：while/for、Stop Condition、回填 |
| `code/agent-loop/tool-registry.ts` | `npm run registry` | Tool Registry：Zod 校验、一源两用、错误即 Observation |
