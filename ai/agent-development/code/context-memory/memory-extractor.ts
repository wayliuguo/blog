// Memory Extractor：判断一条对话里哪些内容值得沉淀为长期记忆。
// 真实实现 = Structured Output（response_format: json_object）+ Zod 校验（见第 1 篇），
// 让 LLM 返回 { memories: [...] }；这里用规则 mock，便于脱离 API 运行。
export interface ExtractedMemory {
    type: 'preference' | 'profile' | 'project'
    key: string
    value: string
}

// mock 版提取器：只有带「以后 / 不要 / 喜欢 / 记住」等信号词的用户输入才值得提取；
// 「西安今天多少度」这类即时问题返回空数组——不是所有对话都有长期价值。
export function extractMemories(userMessage: string): ExtractedMemory[] {
    const memories: ExtractedMemory[] = []
    if (/以后.*(不要|要|用)/.test(userMessage) || /(喜欢|记住)/.test(userMessage)) {
        memories.push({
            type: 'preference',
            key: `pref_${userMessage.length}`,
            value: userMessage
        })
    }
    return memories
}

// MemoryStore：长期记忆的落点。真实实现用 upsert（type+key 唯一）写入
// user_memory 表并生成 embedding（见第 5 篇）；这里用内存 Map 演示。
export class MemoryStore {
    private items = new Map<string, ExtractedMemory>()

    upsert(memory: ExtractedMemory): void {
        // Map 键用 type:key 复合——不同 type 的同 key 记忆互不覆盖，
        // 与真实表的 @@unique([userId, type, key]) 唯一约束对齐。
        this.items.set(`${memory.type}:${memory.key}`, memory)
    }

    all(): ExtractedMemory[] {
        return [...this.items.values()]
    }
}

// 运行：npx tsx memory-extractor.ts
if (process.argv[1] && process.argv[1].endsWith('memory-extractor.ts')) {
    const store = new MemoryStore()
    const conversation = ['以后给我写 TypeScript 不要使用 any', '西安今天多少度？', '记住我喜欢用 pnpm 管理依赖']

    for (const message of conversation) {
        const extracted = extractMemories(message)
        if (extracted.length === 0) {
            console.log(`跳过（无长期价值）：${message}`)
            continue
        }
        for (const memory of extracted) {
            store.upsert(memory)
            console.log(`沉淀为长期记忆：[${memory.type}] ${memory.value}`)
        }
    }

    console.log('=== MemoryStore 当前内容 ===')
    console.log(JSON.stringify(store.all(), null, 2))
}
