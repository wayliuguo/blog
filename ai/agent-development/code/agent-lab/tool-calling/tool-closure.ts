// 完整的单轮 Tool Calling 闭环（mock LLM，零依赖）：
// user → LLM → tool_calls → 程序执行 → assistant(tool_calls) + tool(result) 回灌 → 二次调用 → Final Answer。
// 对齐正文：判空分支、Type Narrowing、JSON.parse(arguments)、tool_call_id 配对。
interface ToolCall {
  id: string
  type: 'function'
  // 注意：arguments 不是对象，是 JSON 字符串——真正需要 JSON.parse 的地方在这里
  function: { name: string; arguments: string }
}

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

const toolMap: Record<string, (args: { city?: string; expression?: string }) => unknown> = {
  getWeather: ({ city = '' }) => ({ city, temperature: 32, weather: '晴' }),
  calculator: ({ expression = '' }) => ({ expression, result: 123 * 456 }),
}

// Mock LLM 的两轮剧本：
// 第一轮：看到用户问天气 → 返回 tool_calls（content 为 null）
// 第二轮：看到最后一条是 tool 结果 → 生成最终自然语言回答
function mockLLM(messages: ChatMessage[]): { content: string | null; tool_calls?: ToolCall[] } {
  const last = messages[messages.length - 1]
  if (last.role === 'user') {
    return {
      content: null,
      tool_calls: [
        {
          id: 'call_001',
          type: 'function',
          function: { name: 'getWeather', arguments: '{"city":"西安"}' },
        },
      ],
    }
  }
  return { content: '西安今天晴，32℃，天气比较热，外出注意防晒补水。' }
}

function runOnce(userMessage: string): string {
  const messages: ChatMessage[] = [
    { role: 'system', content: '你是一个 AI Agent。需要外部数据时调用工具，不要虚构数据。' },
    { role: 'user', content: userMessage },
  ]

  // 第一次调用：模型决定「调什么、传什么」
  const assistantMessage = mockLLM(messages)

  // 模型不一定每次都调工具：没有 tool_calls 就直接返回文本（判空分支）
  const toolCalls = assistantMessage.tool_calls
  if (!toolCalls?.length) {
    return assistantMessage.content ?? ''
  }

  // 关键时序：assistant(tool_calls) 这条消息本身也是 Context 的一部分，
  // 必须在 tool 结果之前 push 进 messages——模型需要知道「刚才是我自己决定调用的」
  messages.push({ role: 'assistant', content: assistantMessage.content ?? '', tool_calls: toolCalls })

  const toolCall = toolCalls[0]
  // 新版 SDK 的 tool_calls 是联合类型：只有 function 型才有 function 字段 → Type Narrowing
  if (toolCall.type !== 'function') {
    throw new Error(`暂不支持的工具类型: ${toolCall.type}`)
  }

  const args = JSON.parse(toolCall.function.arguments) as { city?: string }
  const result = toolMap[toolCall.function.name](args)

  // tool 结果消息三要素：role: 'tool' + tool_call_id（与 call 的 id 配对）+ JSON 字符串内容
  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: JSON.stringify(result),
  })

  // 第二次调用：模型看到完整链路（问题 → 我的决策 → 工具结果）→ 生成最终回答
  const final = mockLLM(messages)
  if (final.tool_calls?.length) {
    throw new Error('演示剧本假设第二次调用不再发起工具')
  }
  return final.content ?? ''
}

function main() {
  console.log('== 单轮 Tool Calling 完整闭环')
  console.log('  最终回答：', runOnce('帮我看看西安今天热不热'))
  console.log('链路：User → LLM → tool_calls → 执行 → tool(result) 回灌 → LLM → Final Answer')
}

main()
