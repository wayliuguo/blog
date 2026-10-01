# RAG：从 0 手写企业级知识库

## RAG 是什么：先检索、后生成

RAG 全称 **Retrieval-Augmented Generation（检索增强生成）**。最简单的理解是四步：

```
用户问题 → 从企业知识库检索相关资料 → 把资料作为 Context 交给大模型 → 大模型基于资料回答
```

用《公司员工手册》走一遍技术版链路：

```
用户问「数据库什么时候备份？」
  → 问题 Embedding → 向量检索
  → 命中「生产环境 PostgreSQL 数据库每天凌晨 2 点进行全量备份」
  → 作为 Context 交给 LLM → 生成最终答案
```

核心工作方式：**不靠模型自身知识回答，而是先检索、后生成**——模型的参数里没有你们公司的制度，但它可以读你塞给它的资料。

## RAG 和 Tool 是什么关系：能力 ≠ 调用形式

刚开始最容易混淆的一点，用两条流程对比：

```
普通 RAG：   用户问题 → Retriever → 知识库 → LLM
Agent 化：   Agent → 判断需要查询企业知识 → search_knowledge（Tool）→ RAG Retriever → 返回相关知识
```

结论：**RAG 不等于 Tool，但在 Agent 系统里，RAG Retrieval 完全可以作为一个 Tool 提供给 Agent**——RAG 是一种能力，Tool 是暴露这种能力的形式。

## 企业 RAG 的完整链路：两条流水线

写代码之前先把整条链路拆开，建立地图：

```
入库：Document → Loader → Parser → Structure Extraction → Chunking
      → Metadata → Embedding → PostgreSQL + pgvector

查询：User Query → Query Embedding → Vector Retrieval → Top-K Chunks
      → Context → LLM → Answer + Sources
```

后续升级项先记下：Hybrid Search、BM25、Rerank、Metadata Filter、Permission、Document Version、Evaluation。企业 RAG 真正复杂的地方，远不只是「调用一次 Embedding API」。

## 数据模型：Document 与 DocumentChunk

两张表、一对多（示意）：

```
Document（id, documentKey, name, checksum, version, status, isActive, ...）
   1..n
DocumentChunk（documentId, content, chunkIndex, heading, section, tokenCount, embedding vector(1024)）
```

一个容易误解的点：**chunkIndex 不是全局 ID**，而是「Chunk 在当前文档内的位置」——不同文档都有自己的 `chunkIndex = 0`；真正的唯一约束是 `(documentId, chunkIndex)`。

## 第一次把 Vector 写进 PostgreSQL：`[...]` 字符串 + `::vector`

> 示意片段

pgvector 不能直接吃 JS 数组，要转成它的字符串字面量格式并显式转型：

```ts
const vector = `[${embedding.join(',')}]`          // [0.012,-0.018,...]
await prisma.$executeRaw`
  UPDATE "DocumentChunk" SET "embedding" = ${vector}::vector WHERE "id" = ${chunk.id}
`
```

验证维度用一行 SQL：

```
SELECT content, vector_dims(embedding) FROM "DocumentChunk";   -- 1024
```

## 真正理解 Vector Retrieval：0.6184 不是「61.84% 的把握」

检索 SQL 在第 5 篇已经见过。这里补一个最重要的读数理解：实测用「登录凭证多久会失效？」检索，命中「Refresh Token 的有效期为 30 天」，similarity = `0.6184`——

- 用户不会原样提问：知识库写「Refresh Token 有效期 30 天」，用户问「登录凭证多久会失效？」，关键词完全不同，**这就是语义检索存在的意义**；
- **0.6184 不是「模型有 61.84% 的把握」**，只是基于向量距离算出来的相似度分数；
- 相似度阈值（如 `similarity > 0.6`）**不能拍脑袋决定**，要通过 Retrieval Evaluation 得出。

配套脚本用「伪 embedding」在本机复现同类检索链路（真实向量来自 Embedding 模型，这里用字符频次伪向量代替（对文本按字符频次统计成固定维度向量，不是哈希），检索逻辑完全一致）：

> 摘自 `code/agent-lab/rag/rag-retrieval.ts`

```ts
// 用"伪 embedding"演示 RAG 检索本质：把文本哈希成低维向量做余弦 TopK。
// 真实场景里 vector 来自 Embedding 模型；这里只为不依赖外部服务即可跑通检索链路。
function pseudoEmbedding(text: string, dim = 16): number[] {
  const vec = new Array(dim).fill(0)
  for (let i = 0; i < text.length; i++) {
    vec[text.charCodeAt(i) % dim] += 1
  }
  return vec
}

export function retrieve(chunks: Chunk[], query: string, topK = 2): Chunk[] {
  const qv = pseudoEmbedding(query)
  return chunks
    .map(c => ({ chunk: c, score: cosineSimilarity(qv, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(x => x.chunk)
}
```

## 企业 RAG 不能手工创建 Chunk：Document Ingestion Pipeline

跑通检索后要自省一件事：目前的 Chunk 还是硬编码写进数据库的（`content: 'Refresh Token 的有效期为 30 天...'`）。企业知识库不可能让开发一条条写，目标是全自动：

```
employee-handbook.md → 自动读取 → 自动解析 → 自动切片 → 自动 Embedding → 自动入库
```

本篇剩下的所有小节，都在实现这条 **Document Ingestion Pipeline**。

## Document Loader：supports + load 的插件式设计

Pipeline 第一步。先定义统一数据结构与 Loader 接口，再给第一版实现——`supports()` 判定文件类型，`load()` 负责读取：

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
// ---------- Loader：只负责「文件 → 文本」 ----------
export interface LoadedDocument {
  content: string
  metadata: { fileName: string; mimeType?: string; source?: string }
}

export interface DocumentLoader {
  supports(fileName: string): boolean
  load(filePath: string): Promise<LoadedDocument>
}
```

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
export class TextDocumentLoader implements DocumentLoader {
  supports(fileName: string): boolean {
    return ['.txt', '.md', '.markdown'].some((ext) => fileName.endsWith(ext))
  }
  async load(filePath: string): Promise<LoadedDocument> {
    const content = files.get(filePath)
    if (content === undefined) throw new Error(`文件不存在: ${filePath}`)
    const ext = filePath.slice(filePath.lastIndexOf('.'))
    return {
      content,
      metadata: { fileName: filePath, mimeType: ext === '.txt' ? 'text/plain' : 'text/markdown' },
    }
  }
}
```

插件式的意义：以后扩展 `PdfDocumentLoader`、`DocxDocumentLoader`、`HtmlDocumentLoader`，各自实现 supports/load 即可，互不影响。

## Loader 和 Parser 必须分开：Structure Extraction

两条极简转换式定义职责：

```
Loader：文件 → 文本
Parser：文本 → 结构
```

Parser 把 Markdown 解析成结构化小节（Structure Extraction），产出 `heading / section / content`——这是后面 Chunking 的重要基础：

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
// ---------- Parser：只负责「文本 → 结构」（Structure Extraction） ----------
export interface DocumentSection {
  heading: string
  section: string
  content: string
}
```

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
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
```

输入 `# 公司员工手册 / ## 年假制度 / 正文`，输出就是：

> 示意片段

```json
[
  { "heading": "公司员工手册", "section": "年假制度", "content": "公司正式员工每年享有 10 天带薪年假。" }
]
```

职责混淆（读文件的同时做解析）的代价：换格式或换解析策略时，两件事无法独立替换。

## 为什么不能每 500 字切一次：Recursive Splitting

Demo 里常见 `text.slice(0, 500); text.slice(500, 1000)`——确实能跑，但企业文档天然有结构（标题 → 章节 → 段落 → 句子），固定长度硬切会把 `## 数据库管理制度` 的标题和正文切散。正确做法是**递归切分**，每级「太大」就降一级：

```
完整 Section → 段落 → 换行 → 句子 → 分句 → 字符
```

## Chunk 里要保留标题路径：独立可理解的语义单元

反例：Chunk 只存正文「申请时间不得超过 7 天。」——语义不完整，「什么申请？」无从知晓。把标题层级拼进 Chunk，让每个 Chunk **离开原始文档也能被独立理解**：

> 摘自 `code/agent-lab/rag/token-chunker.ts`

```ts
// 标题路径拼进 Chunk：离开原文也尽量是「可独立理解的语义单元」。
export function buildChunkContent(section: DocumentSection): string {
  const context: string[] = []
  if (section.heading) context.push(`# ${section.heading}`)
  if (section.section) context.push(`## ${section.section}`)
  context.push(section.content)
  return context.join('\n\n')
}
```

拼出来的是 `# 公司员工手册 \n\n ## 年假制度 \n\n 正文`——向量检索命中后，LLM 拿到的是有上下文的完整语义单元。

## Chunk Size 按 Token 算：500 characters ≠ 500 tokens

最初的实现是 `maxChunkLength = 500`（字符数），后来发现不对——Embedding 和 LLM 都围绕 **Token** 工作，字符数不等于 Token 数。所以抽象出 TokenCounter 接口：

> 摘自 `code/agent-lab/rag/token-chunker.ts`

```ts
// 近似 Token 计数：中文字符 ≈ 1 token，英文字符 ≈ 0.25 token。
// 这只是工程近似，不是 tokenizer 的真实规则；换真实 tokenizer 时实现本接口即可。
export interface TokenCounter {
  count(text: string): number
}
```

当前学习版用近似计数（中文 ≈ 1 Token、英文 ≈ 0.25 Token），预留替换路径 `ApproximateTokenCounter → 真实 Tokenizer`，Chunker 无需改动。**特别强调：近似规则只是工程近似，绝对不能理解成 tokenizer 的真实规则。**

## 超限怎么办：逐级降级 + 字符硬切兜底

完整的 Chunker 要处理「一个 Section 太大」的情况：按段落、句子逐级降级拼装；单句连标题都装不下时，退到字符级硬切兜底：

> 摘自 `code/agent-lab/rag/token-chunker.ts`

```ts
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
```

> 摘自 `code/agent-lab/rag/token-chunker.ts`

```ts
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
```

实跑读数（`npm run token-chunk`，`maxTokens = 40`）——「年假制度」一节被切成三个 Chunk，每个都带标题路径；同文档的下一节也照此处理：

```
--- Chunk 0（36 tokens）[年假制度] ---
# 公司员工手册

## 年假制度

正式员工每年享有 10 天带薪年假。年假原则上当年使用。
--- Chunk 1（38 tokens）[年假制度] ---
# 公司员工手册

## 年假制度

确因工作安排无法休完的，经审批可以顺延到次年第一季度。
--- Chunk 2（25 tokens）[年假制度] ---
# 公司员工手册

## 年假制度

离职时未休年假按天数折算。
--- Chunk 3（38 tokens）[数据库管理制度] ---
# 公司员工手册

## 数据库管理制度

生产环境 PostgreSQL 数据库每天凌晨 2 点进行全量备份。
```

## Chunk 不只是 content：每个字段都有用途

一个完整的 Chunk 长这样：

> 示意片段

```json
{
  "content": "# 公司员工手册 ## 年假制度 公司正式员工每年享有 10 天带薪年假。",
  "chunkIndex": 0,
  "heading": "公司员工手册",
  "section": "年假制度",
  "tokenCount": 48,
  "metadata": { "chunkStrategy": "token-aware", "maxTokens": 300 }
}
```

| 字段 | 用途 |
| ---- | ---- |
| `content` | Embedding → LLM Context |
| `heading / section` | 上下文 → 来源展示 |
| `chunkIndex` | 原文位置 → **Neighbor Retrieval**（命中 Chunk 17 后可补取 16/18） |
| `tokenCount` | Context Budget 计算 |
| `metadata` | Filter / Debug / Evaluation |

只存 content 丢弃元数据，后面做过滤、调试、评估、邻域扩展时全都没得用。

## 完整 Ingestion 串联：checksum 去重 + 事务式写入

各环节备齐后串成一条 `ingest(filePath)`。同一份文档重复上传的问题用 **SHA-256 内容指纹**解决——相同内容必然得到相同 checksum，拒绝重复入库，避免 Top-K 被重复知识占据：

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
// ---------- Ingestion：checksum 去重 + 事务式写入（要么全成、要么全无） ----------
function checksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
```

> 摘自 `code/agent-lab/rag/document-pipeline.ts`

```ts
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
```

实跑读数（`npm run rag-pipeline`，节选）：

```
  [commit] documents/employee-handbook.md 入库 2 个 Chunk
  chunk 0 [公司员工手册 / 年假制度] tokens=29
  chunk 1 [公司员工手册 / 数据库管理制度] tokens=38
  第二次上传同一份文档：
  [dedupe] 内容重复（checksum 相同），拒绝入库：documents/employee-handbook.md
```

## 事务的两条边界：Embedding 在外，写入在内

一对相反的规则，容易记反：

**Embedding 不能放进数据库事务**。Embedding 是外部 HTTP 调用（NestJS → Qwen API），耗时不确定（500ms / 2s / 10s / 429 重试）。把它写进 `$transaction` 回调的后果链：

```
BEGIN → 等待外部 HTTP → 事务一直打开 → 占用连接 → 锁竞争 / 超时风险
```

**数据库写入必须放进事务**。一份文档 100 个 Chunk，写到第 57 个失败——没有事务的话，Document + Chunk 0~56 已经留在库里，知识库出现「半成品」。正确边界：

```
Loader / Parser / Chunk / Embedding（外部计算全部完成）
    → BEGIN → Document → Chunks → Vectors → COMMIT（任何一步失败 → ROLLBACK）
```

这已经不只是 RAG 知识，而是企业后端的事务设计问题：**外部 I/O 与数据库事务隔离**。

## 只有 COMPLETED 的文档才能被检索

即使有事务兜底，Retriever 层依然要做自己的保护（纵深防御）——查询条件里过滤文档状态：

```
文档状态机：PENDING ✗ / PROCESSING ✗ / FAILED ✗ / COMPLETED ✓
```

```sql
WHERE dc.embedding IS NOT NULL AND d.status = 'COMPLETED' AND d."isActive" = true
```

检索层不校验状态，可能把处理中 / 失败的文档内容返回给用户。这一条同时为将来的异步 Ingestion 做铺垫。

## Checksum 解决不了的：文档版本

新问题：员工手册 v1 年假 10 天，v2 改成 12 天。内容不同 → checksum 不同 → 系统当成「两份合法的新文档」，但业务上这是**同一份逻辑文档的两个版本**。需要三个正交概念：

| 概念 | 回答的问题 |
| ---- | ---- |
| `documentKey` | 这是谁？（逻辑身份） |
| `version` | 这是它的第几个版本？ |
| `checksum` | 这份具体内容是否重复？ |

`documentKey` 的取值从本地到企业逐步升级：本地用规范化文件路径；企业级用 `knowledgeBaseId + relativePath`，多租户场景用 `tenantId + sourceSystem + externalDocumentId`（如 `company-a:notion:page-123456`）。

## isActive：新旧版本不能同时参与检索

冲突场景：v1（年假 10 天）和 v2（年假 12 天）都 `status = COMPLETED`，用户问「员工一年多少天年假？」——检索同时命中两个矛盾答案。所以 **COMPLETED（处理完成）≠ isActive（当前有效版本）**，是两个独立维度：

```
v1：status = COMPLETED, isActive = false   ← 保留用于审计 / 历史查询 / 回滚，不进检索
v2：status = COMPLETED, isActive = true    ← 唯一参与 Retrieval
```

## 版本切换必须放进事务：先建新，再下线旧

经典错误顺序：先把 v1 `isActive = false`，再创建 v2——一旦创建失败，v1 已失效、v2 不存在，知识库瞬间「空窗」。正确顺序：

```
BEGIN → 创建 v2 → Chunk 入库 → 写入全部 Vector → v2 COMPLETED
      → v1 isActive = false → v2 isActive = true → COMMIT

v2 任何一步失败 → ROLLBACK → v1 的 isActive = true 完全不受影响
```

原则：**新版本完全就绪后，才能下线旧版本**。

## 手写完再看 LangChain：`asRetriever()` 背后没有魔法

回头看 LangChain 的 `new RecursiveCharacterTextSplitter(...)` 和 `vectorStore.asRetriever()`，突然就不陌生了：

```
RecursiveCharacterTextSplitter 背后要回答：
  为什么 Recursive？优先按什么边界切？Chunk Size 怎么定？为什么需要 Overlap？
  标题要不要进 Chunk？Token 怎么算？Metadata 怎么保留？chunkIndex 有什么用？

vectorStore.asRetriever() 背后就是：
  Query → Embedding → Vector → Distance → ORDER BY → Top-K
```

这就是「先手写、再框架」的顺序价值——框架 API 背后的工程问题，你全部能答上来。

## 还不能叫完整的企业级 RAG

主动泼冷水：目前完成的是「从一份 Markdown 自动到可检索」的闭环，距离完整企业级还差一串能力，按递进排列：

```
RAG Generation / Context Assembly / Prompt Engineering / Answer + Sources
→ Retrieval Threshold → Metadata Filter → Hybrid Search（Vector + BM25）
→ Reranking → Neighbor Retrieval → Permission Filter → RAG Evaluation
→ 异步 Ingestion / Queue → PDF / DOCX / HTML 解析
```

结合之前学的 Tool Calling、Agent Loop、Memory、Vector Memory，已经整合了企业 RAG 的基础内容——但做出检索闭环就自称「企业级」，是初学者最常见的自我高估。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/rag/rag-retrieval.ts` | `npm run rag` | Vector Retrieval 本质：相似度排序 TopK |
| `code/agent-lab/rag/token-chunker.ts` | `npm run token-chunk` | Token-aware 递归切块、标题路径、硬切兜底 |
| `code/agent-lab/rag/document-pipeline.ts` | `npm run rag-pipeline` | Loader/Parser 分离、checksum 去重、事务式入库 |

> Embedding 批量调用、pgvector 真实写入与版本切换事务依赖数据库与 Embedding API，正文以示意片段呈现。
