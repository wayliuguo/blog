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
