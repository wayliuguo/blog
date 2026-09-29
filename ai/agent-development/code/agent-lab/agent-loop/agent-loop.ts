import { AgentTool, WeatherTool } from './agent-tool'

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

// 运行：npx tsx agent-loop.ts（本文件仅依赖同目录 agent-tool.ts）
if (process.argv[1] && process.argv[1].endsWith('agent-loop.ts')) {
  const mockLlm = async (messages: unknown[]) => {
    const last = messages[messages.length - 1] as { role: string; content?: string }
    if (last?.role === 'user') {
      return { tool_calls: [{ name: 'get_weather', arguments: { city: '西安' } }] }
    }
    return { content: '西安今天 35℃ 晴。' }
  }
  runAgentLoop('西安今天热不热？', [new WeatherTool()], mockLlm).then(console.log)
}
