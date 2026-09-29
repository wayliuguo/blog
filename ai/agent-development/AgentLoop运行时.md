# Agent Loop：手写会循环的 Agent 运行时

## Tool Calling 不等于 Agent：缺的是循环

单次 Tool Calling 只是"模型表达希望调用哪个工具"；真正执行 Tool、管理上下文、决定是否继续循环的是 **Agent Runtime**。一个最基础的 Agent = **LLM + Tools + Context + Agent Loop + Stop Condition**。把循环补上，Agent 才第一次成型。

```
LLM → Action → Observation → LLM → Action → Observation → Final Answer
```

## Agent Loop 的执行机制

最简单的 Loop 就是"调 LLM → 需要工具？→ 执行 → 结果放回 Context → 再调 LLM → 直到无 tool_calls"。下面是一份可脱离 API 运行的最小实现：把"模型决策 → 执行工具 → 结果回灌"循环起来，`llm` 注入具体模型或 mock。

> 摘自 `code/agent-lab/agent-loop/agent-loop.ts`（运行：`npm run agent-loop`）

```ts
interface LlmTurn {
  content?: string
  tool_calls?: Array<{ name: string; arguments: Record<string, unknown> }>
}

// 最小 Agent Loop：把"模型决策 → 执行工具 → 结果回灌"循环起来。
// llm 是注入了具体模型或 mock 的纯函数，便于脱离 API 运行。
export async function runAgentLoop(
  userMessage: string,
  tools: AgentTool[],
  llm: (messages: unknown[]) => Promise<LlmTurn>,
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

伪代码对应的执行骨架：

```
while (iteration < MAX) {
  const r = await llm()
  if (!r.tool_calls?.length) return r.content   // 停止条件
  await executeTools()                            // 执行并把结果放回 messages
}
```

## 统一工具协议 AgentTool

所有工具遵循统一接口：`name / description / schema / execute()`。这把"工具定义"和"工具实现"彻底分开——schema 给模型看，execute 给程序跑。再配一个 `ToolRegistry` 管理工具集合，职责分离、便于注入。

> 摘自 `code/agent-lab/agent-loop/agent-tool.ts`（运行：`npm run agent-loop` 依赖此文件）

```ts
// 所有工具遵循统一协议：名字、描述、参数 schema、执行函数。
export interface AgentTool {
  name: string
  description: string
  schema: unknown
  execute(args: Record<string, unknown>): Promise<unknown>
}

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

## 一轮多工具与"错误即观察"

`while` 管"多轮"，`for` 管"一轮里的多个 Tool"：一轮里模型可能一次请求多个工具，要逐个执行。工具的**错误同样可以作为 Observation 回灌给模型**，让模型重新决策——这是 Agent 与传统后端程序的重要区别：失败不一定等于 Agent 失败。

> 示意片段（无配套脚本）

```ts
// 一轮里多个工具：逐个执行；工具报错也作为 Observation 回灌
for (const call of response.tool_calls) {
  try {
    const result = await tool.execute(call.arguments)
    messages.push({ role: 'tool', name: call.name, content: JSON.stringify(result) })
  } catch (err) {
    messages.push({ role: 'tool', name: call.name, content: `错误: ${err.message}` })
  }
}
```

## LLM 输出不可信：必须校验

无论 Structured Output 还是 Tool 参数，LLM 输出永远属于不可信外部数据，必须经过 `JSON.parse` + Schema 校验才能真正进入业务系统。没有校验就信任模型输出，是 Agent 落地的头号风险。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/agent-loop/agent-tool.ts` | `npm run agent-loop` | 统一工具协议 AgentTool |
| `code/agent-lab/agent-loop/agent-loop.ts` | `npm run agent-loop` | Agent Loop 的执行机制 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 2 篇：Tool Calling；下一篇见第 4 篇：上下文与记忆
