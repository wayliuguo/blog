// Token-aware 递归切块 + 保留标题路径。
// 对应 RAG 入库流水线的 Chunking 环节：500 characters ≠ 500 tokens，
// Embedding / LLM 都围绕 Token 工作，所以切块预算必须按 Token 算。

// 近似 Token 计数：中文字符 ≈ 1 token，英文字符 ≈ 0.25 token。
// 这只是工程近似，不是 tokenizer 的真实规则；换真实 tokenizer 时实现本接口即可。
export interface TokenCounter {
  count(text: string): number
}

export class ApproximateTokenCounter implements TokenCounter {
  count(text: string): number {
    let tokens = 0
    for (const ch of text) {
      tokens += /[\u4e00-\u9fff]/.test(ch) ? 1 : 0.25
    }
    return Math.ceil(tokens)
  }
}

export interface DocumentSection {
  heading?: string // 一级标题，如「公司员工手册」
  section?: string // 二级标题，如「年假制度」
  content: string
}

export interface ChunkData {
  content: string // 含标题路径的完整语义单元，供 Embedding 与 Context
  chunkIndex: number
  heading?: string
  section?: string
  tokenCount: number
  metadata: { chunkStrategy: 'token-aware'; maxTokens: number }
}

// 标题路径拼进 Chunk：离开原文也尽量是「可独立理解的语义单元」。
export function buildChunkContent(section: DocumentSection): string {
  const context: string[] = []
  if (section.heading) context.push(`# ${section.heading}`)
  if (section.section) context.push(`## ${section.section}`)
  context.push(section.content)
  return context.join('\n\n')
}

// Token-aware 递归切块：超限就按「段落 → 句子 → 字符硬切」逐级降级。
export function chunkSection(
  section: DocumentSection,
  maxTokens: number,
  counter: TokenCounter,
): ChunkData[] {
  const content = buildChunkContent(section)
  if (counter.count(content) <= maxTokens) {
    return [toChunk(content, section, maxTokens, counter)]
  }

  // 标题路径是每个 Chunk 都要带的公共头部
  const header = content.slice(0, content.length - section.content.length)
  const headerTokens = counter.count(header)
  const pieces = splitByUnit(section.content, ['\n\n', '。', '；'])

  const chunks: ChunkData[] = []
  let buffer = ''
  const flush = () => {
    if (buffer.trim()) {
      chunks.push(toChunk(header + buffer, section, maxTokens, counter))
      buffer = ''
    }
  }

  for (const piece of pieces) {
    // 单句连标题都装不下：字符级硬切兜底
    if (headerTokens + counter.count(piece) > maxTokens) {
      flush()
      const charsPerToken = piece.length / Math.max(1, counter.count(piece))
      const budget = Math.max(4, Math.floor((maxTokens - headerTokens) * charsPerToken))
      for (let rest = piece; rest.trim(); rest = rest.slice(budget)) {
        chunks.push(toChunk(header + rest.slice(0, budget), section, maxTokens, counter))
      }
      continue
    }
    if (headerTokens + counter.count(buffer + piece) > maxTokens) {
      flush()
    }
    buffer += piece
  }
  flush()
  return chunks
}

function toChunk(content: string, section: DocumentSection, maxTokens: number, counter: TokenCounter): ChunkData {
  return {
    content: content.trim(),
    chunkIndex: 0, // 由调用方（Ingestion 流水线）统一编号
    heading: section.heading,
    section: section.section,
    tokenCount: counter.count(content),
    metadata: { chunkStrategy: 'token-aware', maxTokens },
  }
}

// 切分并保留分隔符（分隔符归前段），空段丢弃。
function splitByUnit(text: string, separators: string[]): string[] {
  let parts = [text]
  for (const sep of separators) {
    parts = parts
      .flatMap((p) => p.split(sep))
      .map((s, i, arr) => (i < arr.length - 1 ? s + sep : s))
      .filter((s) => s.trim())
    // 粒度已足够小就不再降级
    if (parts.every((p) => counterFreeLength(p) < 40)) break
  }
  return parts
}

function counterFreeLength(text: string): number {
  return text.replace(/\s/g, '').length
}

// 运行：npx tsx token-chunker.ts
if (process.argv[1] && process.argv[1].endsWith('token-chunker.ts')) {
  const counter = new ApproximateTokenCounter()
  const sections: DocumentSection[] = [
    {
      heading: '公司员工手册',
      section: '年假制度',
      content: '正式员工每年享有 10 天带薪年假。年假原则上当年使用。'
      + '确因工作安排无法休完的，经审批可以顺延到次年第一季度。'
      + '离职时未休年假按天数折算。',
    },
    {
      heading: '公司员工手册',
      section: '数据库管理制度',
      content: '生产环境 PostgreSQL 数据库每天凌晨 2 点进行全量备份。',
    },
  ]

  let index = 0
  for (const section of sections) {
    for (const chunk of chunkSection(section, 40, counter)) {
      chunk.chunkIndex = index++
      console.log(`--- Chunk ${chunk.chunkIndex}（${chunk.tokenCount} tokens）[${section.section}] ---`)
      console.log(chunk.content)
    }
  }
}
