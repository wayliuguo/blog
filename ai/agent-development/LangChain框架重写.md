# LangChain：用框架重写一遍 Agent

## 先手写再学框架，框架才是工程抽象

前面手写过 Tool Calling、Agent Loop、Memory、Vector Memory、RAG。再学 LangChain 时，那些概念不再陌生：`DocumentLoader / TextSplitter / Embeddings / VectorStore / Retriever` 背后就是我们亲手写过的切片、Embedding、检索。先理解底层，再让框架帮我们封装"通用且易错的部分"，才知道它到底替我们做了什么。

## 手写组件 → 框架抽象对应

| 手写组件 | LangChain 抽象 |
| ---- | ---- |
| `LlmService`（封装模型调用） | `ChatOpenAI` |
| 消息对象 `messages` | `SystemMessage / HumanMessage / AIMessage / ToolMessage` |
| `AgentTool`（name/desc/schema/execute） | `tool()` |
| `ToolRegistry` | 继续保留（职责分离仍有价值） |
| `EmbeddingProvider` | `Embeddings` |
| 内存 / pgvector 向量库 | `VectorStore` |
| 检索逻辑 | `Retriever` |

## ChatOpenAI / Message / tool()

`ChatOpenAI` 封装 DeepSeek 等兼容端点；消息统一为四类 Message；`tool()` 把"name/description/schema/execute"统一成一个工具定义。`description` 是 Agent Prompt 的一部分，模型据此选工具，必须写准。

> 示意片段（无配套脚本）

```ts
import { ChatOpenAI } from '@langchain/openai'
import { tool } from '@langchain/core/tools'

const model = new ChatOpenAI({
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: { baseURL: 'https://api.deepseek.com' },
})

const getWeather = tool(
  async ({ city }) => JSON.stringify(await weatherApi(city)),
  {
    name: 'getWeather',
    description: '查询指定城市的天气',
    schema: z.object({ city: z.string() }),
  }
)
```

## bindTools 与 Agent Loop

`bindTools(tools)` 只是把工具描述提供给模型，**不自动执行**。真正的 Loop 仍要手写：`invoke` → 拿到 `tool_calls` → 逐个执行 → 用 `ToolMessage`（带 `tool_call_id`）回灌 → 再 `invoke`，直到无 `tool_calls`。保留模型返回的完整消息、正确对应 `tool_call_id` 是循环跑通的关键。

> 示意片段（无配套脚本）

```ts
const modelWithTools = model.bindTools([getWeather, calculator])

const ai = await modelWithTools.invoke(messages)
if (ai.tool_calls?.length) {
  for (const call of ai.tool_calls) {
    const result = await runTool(call)            // 程序执行
    messages.push(new ToolMessage({ content: result, tool_call_id: call.id }))
  }
  // 把结果回灌，再 invoke 一次，让模型继续决策
}
```

## RAG 集成与"不是所有都交 LLM"

RAG 作为知识 Tool 接入 Agent；System Prompt 要约束 Agent"不要乱判"（如 Android 安全分析里不能仅凭 `exported` 判漏洞）。重要原则：**确定性逻辑交 Tool，知识交 RAG，决策交 LLM**——不要把所有事都丢给模型。结构化报告用 `withStructuredOutput()` + Zod，放在"调查阶段之后"单独整理，不要直接替换 Agent Loop。

> 示意片段（无配套脚本）

```ts
// 调查（Tool Calling）与整理（结构化报告）两阶段分离
const structuredLlm = model.withStructuredOutput(SecurityFindingSchema)
const report = await structuredLlm.invoke(summaryPrompt)  // 先调查，再整理
```

## LangChain 没有替我们做什么

业务规则、漏洞定义、Tool 设计、Prompt 约束、RAG 的知识源质量——这些仍属于应用开发，框架不会替你决定。框架的价值是封装"模型调用 / 消息管理 / 工具分发 / 检索"这类通用且易错的部分。

## 可运行镜像：零依赖复刻 Agent 闭环

正文里的 `ChatOpenAI / tool() / bindTools` 需要 LangChain + DeepSeek 环境。为了不依赖 API Key 也能把「工具定义 → 模型决策 → 工具执行 → 消息回流」这一闭环跑通，下面用零依赖方式复刻其核心机制（真实集成见上方「示意片段」）。

> 摘自 `code/agent-lab/langchain/langchain-agent.ts`（运行：`npm run langchain`）

```ts
/**
 * LangChain 风格 Agent 运行时（可运行镜像）
 * ──────────────────────────────────────────────
 * 文章正文里的「示意片段」展示真实集成：
 *   import { tool } from '@langchain/core/tools'
 *   const model = new ChatOpenAI({ apiKey }).bindTools(tools)
 * 本文件用零依赖方式复刻其核心机制，让你不依赖 API Key 也能跑通
 * 「工具定义 → 模型决策 → 工具执行 → 消息回流」这一闭环，
 * 从而把 LangChain 到底替我们做了什么看清楚。
 *
 * 运行：npm install && npm run langchain
 */
import { z } from 'zod'

// 镜像 LangChain 的 tool()：把「普通函数 + zod schema」包装成结构化工具。
// 真实 LangChain 的 tool() 也做同样的事——生成可被模型识别的 JSON Schema，
// 并在调用前用 schema 校验入参。
type Tool = {
  name: string
  description: string
  schema: z.ZodTypeAny
  invoke: (args: unknown) => Promise<string>
}

function tool(
  fn: (args: any) => Promise<string> | string,
  meta: { name: string; description: string; schema: z.ZodTypeAny },
): Tool {
  return {
    ...meta,
    async invoke(args) {
      const parsed = meta.schema.parse(args) // 对应 LangChain 在调用前用 schema 校验
      return String(await fn(parsed))
    },
  }
}

const getWeather = tool(
  async ({ city }: { city: string }) => {
    const fake: Record<string, string> = { 西安: '晴 22°C', 北京: '多云 18°C', 上海: '小雨 20°C' }
    return fake[city] ?? '未知城市'
  },
  {
    name: 'getWeather',
    description: '查询某个城市的当前天气',
    schema: z.object({ city: z.string().describe('城市名') }),
  },
)

const calculator = tool(
  async ({ expr }: { expr: string }) => `计算结果：${expr}`,
  {
    name: 'calculator',
    description: '计算一个算术表达式',
    schema: z.object({ expr: z.string().describe('表达式，如 1+1') }),
  },
)

const tools = [getWeather, calculator]
const byName = Object.fromEntries(tools.map((t) => [t.name, t]))

// 镜像 LangChain 的消息类型（HumanMessage / AIMessage / ToolMessage）
type Msg =
  | { type: 'human'; content: string }
  | { type: 'ai'; content: string; toolCalls: { name: string; args: any; id: string }[] }
  | { type: 'tool'; content: string; toolCallId: string }

// 模拟「模型」：根据用户输入挑一个工具并返回 tool_call。
// 真实场景这一步由 ChatOpenAI().bindTools(tools) 产出 AIMessage.tool_calls。
function mockModelDecide(text: string): Msg {
  if (text.includes('天气')) {
    return { type: 'ai', content: '', toolCalls: [{ name: 'getWeather', args: { city: '西安' }, id: 'call_1' }] }
  }
  return { type: 'ai', content: '', toolCalls: [{ name: 'calculator', args: { expr: '1+1' }, id: 'call_2' }] }
}

async function runAgent(userText: string) {
  const messages: Msg[] = [{ type: 'human', content: userText }]
  const ai = mockModelDecide(userText)
  messages.push(ai)
  for (const call of ai.toolCalls) {
    const fn = byName[call.name]
    const result = await fn.invoke(call.args) // 对应 LangChain 的 tool.invoke()
    messages.push({ type: 'tool', content: result, toolCallId: call.id })
  }
  console.log('消息流：')
  for (const m of messages) {
    if (m.type === 'ai') console.log(`  AIMessage  tool_calls=${JSON.stringify(m.toolCalls)}`)
    else if (m.type === 'human') console.log(`  HumanMessage  ${m.content}`)
    else console.log(`  ToolMessage(${m.toolCallId})  ${m.content}`)
  }
}

runAgent('西安现在天气怎么样？').catch((e) => {
  console.error(e)
  process.exit(1)
})
```

## 配套代码

| 文件 | 运行 | 说明 |
| ---- | ---- | ---- |
| `code/agent-lab/langchain/langchain-agent.ts` | `npm run langchain` | 零依赖镜像：tool() 封装 + 消息闭环（正文示意片段才是真实框架 API） |

> 正文其余代码为示意片段（来自教程代码，需 LangChain / DeepSeek 环境）。Agent Loop、AgentTool 等可运行实现见 `code/agent-lab/agent-loop/`。

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 6 篇：RAG；下一篇见第 8 篇：LangGraph
