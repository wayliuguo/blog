type Role = 'system' | 'user' | 'assistant' | 'tool'

interface Message {
  role: Role
  content?: string
  tool_calls?: unknown[]
}

// 按"完整对话轮次"裁剪历史：一轮 = 一次 user 触发的连续交互。
export function trimMessages(messages: Message[], maxRounds = 5): Message[] {
  const rounds: Message[][] = []
  let current: Message[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      if (current.length > 0) rounds.push(current)
      current = [message]
      continue
    }
    current.push(message)
  }
  if (current.length > 0) rounds.push(current)
  return rounds.slice(-maxRounds).flat()
}

// 运行：npx tsx context-manager.ts
if (process.argv[1] && process.argv[1].endsWith('context-manager.ts')) {
  const msgs: Message[] = [
    { role: 'user', content: '我叫张三' },
    { role: 'assistant', content: '你好张三' },
    { role: 'user', content: '我叫什么' }
  ]
  console.log(trimMessages(msgs, 1))
}
