type Role = 'system' | 'user' | 'assistant' | 'tool'

interface Message {
    role: Role
    content?: string
}

// 摘要器抽象：真实实现把旧轮次交给 LLM 压缩成一段 summary；
// 这里注入 mock，便于脱离 API Key 运行整个流程。
export type Summarizer = (oldMessages: Message[]) => Promise<string>

// 与 context-manager.ts 相同的轮次划分：遇到 user 就开新轮。
export function splitRounds(messages: Message[]): Message[][] {
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
    return rounds
}

// Rolling Summary：把装不下的旧轮次压成一段摘要注入 System，
// 与保留的近期轮次拼回，构成「System + 摘要 + 近期」的 Context。
export async function buildContextWithSummary(
    messages: Message[],
    keepRounds: number,
    summarize: Summarizer,
    systemPrompt = '你是一个专业的 AI Agent 助手。'
): Promise<Message[]> {
    const rounds = splitRounds(messages)
    if (rounds.length <= keepRounds) {
        return [{ role: 'system', content: systemPrompt }, ...messages]
    }
    const oldRounds = rounds.slice(0, rounds.length - keepRounds)
    const recent = rounds.slice(-keepRounds).flat()
    const summary = await summarize(oldRounds.flat())
    return [{ role: 'system', content: `${systemPrompt}\n\n已知背景摘要：\n${summary}` }, ...recent]
}

// 运行：npx tsx rolling-summary.ts
if (process.argv[1] && process.argv[1].endsWith('rolling-summary.ts')) {
    const history: Message[] = [
        { role: 'user', content: '我叫张三，是个前端工程师' },
        { role: 'assistant', content: '你好张三！' },
        { role: 'user', content: '帮我把项目迁移到 Vite' },
        { role: 'assistant', content: '已给出迁移步骤' },
        { role: 'user', content: '构建报错了怎么办' },
        { role: 'assistant', content: '检查 optimizeDeps 配置' },
        { role: 'user', content: '现在继续优化首屏性能' },
        { role: 'assistant', content: '好的' }
    ]

    // mock 摘要器：真实场景把 oldMessages 交给 LLM，让它保留关键事实与未决任务
    const mockSummarize: Summarizer = async old => {
        const facts = old.filter(m => m.role === 'user').map(m => m.content)
        return `用户张三（前端工程师）已把项目迁移到 Vite，遇到并解决过构建报错。`
    }

    const context = await buildContextWithSummary(history, 1, mockSummarize)
    console.log('=== 裁剪 + 摘要后的 Context ===')
    for (const m of context) {
        console.log(`[${m.role}] ${(m.content ?? '').slice(0, 60)}`)
    }
}
