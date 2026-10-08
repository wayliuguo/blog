// 文档入库流水线（零依赖教学版）：
// Loader（文件→文本）→ Parser（文本→结构）→ Chunk（保留标题路径 + Token 近似）→ checksum 去重 → 事务式写入
import { createHash } from 'node:crypto'

// ---------- Loader：只负责「文件 → 文本」 ----------
export interface LoadedDocument {
    content: string
    metadata: { fileName: string; mimeType?: string; source?: string }
}

export interface DocumentLoader {
    supports(fileName: string): boolean
    load(filePath: string): Promise<LoadedDocument>
}

// 教学版用内存 Map 代替文件系统，行为与 readFile 一致
const files = new Map<string, string>([
    [
        'documents/employee-handbook.md',
        [
            '# 公司员工手册',
            '## 年假制度',
            '公司正式员工每年享有 10 天带薪年假。',
            '## 数据库管理制度',
            '生产环境 PostgreSQL 数据库每天凌晨 2 点进行全量备份。'
        ].join('\n')
    ]
])

export class TextDocumentLoader implements DocumentLoader {
    supports(fileName: string): boolean {
        return ['.txt', '.md', '.markdown'].some(ext => fileName.endsWith(ext))
    }
    async load(filePath: string): Promise<LoadedDocument> {
        const content = files.get(filePath)
        if (content === undefined) throw new Error(`文件不存在: ${filePath}`)
        const ext = filePath.slice(filePath.lastIndexOf('.'))
        return {
            content,
            metadata: { fileName: filePath, mimeType: ext === '.txt' ? 'text/plain' : 'text/markdown' }
        }
    }
}

// ---------- Parser：只负责「文本 → 结构」（Structure Extraction） ----------
export interface DocumentSection {
    heading: string
    section: string
    content: string
}

export function parseMarkdownSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = []
    let heading = ''
    let section = ''
    let buffer: string[] = []
    const flush = () => {
        const text = buffer.join('\n').trim()
        if (text) sections.push({ heading, section, content: text })
        buffer = []
    }
    for (const line of content.split('\n')) {
        if (line.startsWith('# ')) {
            flush()
            heading = line.slice(2).trim()
        } else if (line.startsWith('## ')) {
            flush()
            section = line.slice(3).trim()
        } else {
            buffer.push(line)
        }
    }
    flush()
    return sections
}

// ---------- Chunker：保留标题路径 + Token 近似计数 ----------
// 近似规则：中文字符 ≈ 1 Token，其余字符 ≈ 0.25 Token。这只是工程近似，不是真实 tokenizer。
function tokenCount(text: string): number {
    let count = 0
    for (const ch of text) count += /[\u4e00-\u9fff]/.test(ch) ? 1 : 0.25
    return Math.ceil(count)
}

function buildChunkContent(heading: string, section: string, content: string): string {
    const parts: string[] = []
    if (heading) parts.push(`# ${heading}`)
    if (section) parts.push(`## ${section}`)
    parts.push(content)
    return parts.join('\n\n')
}

export interface DocumentChunkData {
    content: string
    chunkIndex: number
    heading: string
    section: string
    tokenCount: number
}

export function chunkSections(sections: DocumentSection[], maxTokens = 64): DocumentChunkData[] {
    const chunks: DocumentChunkData[] = []
    let index = 0
    for (const s of sections) {
        const content = buildChunkContent(s.heading, s.section, s.content)
        chunks.push({
            content,
            chunkIndex: index++,
            heading: s.heading,
            section: s.section,
            tokenCount: tokenCount(content)
        })
    }
    void maxTokens // 教学版不做二次切分；完整版见 token-chunker.ts 的递归降级
    return chunks
}

// ---------- Ingestion：checksum 去重 + 事务式写入（要么全成、要么全无） ----------
function checksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex')
}

const store: { document: string; chunks: DocumentChunkData[] }[] = []
const seenChecksums = new Map<string, string>()

export async function ingest(filePath: string): Promise<{ inserted: boolean; chunks: number }> {
    const loader = new TextDocumentLoader()
    if (!loader.supports(filePath)) throw new Error(`没有可用的 Loader: ${filePath}`)

    const doc = await loader.load(filePath)
    const hash = checksum(doc.content)

    // 内容级去重：同一份内容重复上传，直接拒绝，避免 Top-K 被重复知识占据
    if (seenChecksums.has(hash)) {
        console.log(`  [dedupe] 内容重复（checksum 相同），拒绝入库：${filePath}`)
        return { inserted: false, chunks: 0 }
    }

    const sections = parseMarkdownSections(doc.content)
    const chunks = chunkSections(sections)

    // 事务边界：所有「外部计算」（Loader/Parser/Chunk）在事务外完成，
    // 事务只包数据库写入 —— 任何一步失败就整体回滚，不会留下半成品。
    const pending: { document: string; chunks: DocumentChunkData[] } = { document: filePath, chunks }
    if (pending.chunks.length === 0) throw new Error('没有可入库的 Chunk，回滚')
    store.push(pending)
    seenChecksums.set(hash, filePath)
    console.log(`  [commit] ${filePath} 入库 ${chunks.length} 个 Chunk`)
    return { inserted: true, chunks: chunks.length }
}

async function main() {
    console.log('== 文档入库流水线：Loader → Parser → Chunk → checksum → 事务')
    const first = await ingest('documents/employee-handbook.md')
    console.log('  第一次入库：', JSON.stringify(first))
    for (const s of store[0].chunks) {
        console.log(`  chunk ${s.chunkIndex} [${s.heading} / ${s.section}] tokens=${s.tokenCount}`)
        console.log(`    ${s.content.replace(/\n/g, ' | ')}`)
    }
    console.log('  第二次上传同一份文档：')
    await ingest('documents/employee-handbook.md')
}

main()
