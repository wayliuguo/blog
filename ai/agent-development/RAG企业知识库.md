# RAG：从 0 手写企业级知识库

## RAG 是什么

RAG = Retrieval-Augmented Generation（检索增强生成）：用户问题 → 从知识库检索相关资料 → 作为 Context 交给 LLM → 基于资料回答。它让模型"基于企业资料回答"，而不是凭自己记忆瞎编——这是企业 Agent 绕不开的能力。

```
用户问题 → Embedding → 向量检索 → 找到相关片段 → 作为 Context → LLM → 答案 + 来源
```

## RAG 与 Tool 的关系

RAG 是一种能力，不一定非要是 Tool。普通 RAG 可以独立成"检索 → 生成"链路；在 Agent 里，常把知识库检索包装成 `search_knowledge` 这样的 Tool 交给 Agent 自主调用。**RAG ≠ Tool，但 RAG Retrieval 可以作为 Tool 提供给 Agent。**

## 文档入库流水线

企业 RAG 真正的工程量在"数据工程"，而不只是调一次 Embedding API。链路是：

```
Document → Loader → Parser → Chunking → Metadata → Embedding → pgvector(存储)
查询： Query → QueryEmbedding → Vector Retrieval → TopK → Context → LLM → Answer+Sources
```

真实知识库不能手工写 Chunk，要有 Ingestion Pipeline 自动读取/解析/切片/入库；还要处理去重、事务、文档版本（同一 `documentKey` 多 `version`，`isActive` 标记生效版）。

> 示意片段（无配套脚本）

```prisma
model Document {
  id         String  @id @default(uuid())
  documentKey String
  name       String
  checksum   String  @unique     // 去重：内容不变则不重复入库
  version    Int     @default(1)
  isActive   Boolean @default(true)
  chunks     DocumentChunk[]
  @@unique([documentKey, version])
}

model DocumentChunk {
  id         String                 @id @default(uuid())
  documentId String
  content    String
  chunkIndex Int
  embedding  Unsupported("vector")?
  @@unique([documentId, chunkIndex])
}
```

## 向量检索、阈值与评估

向量存进去后，用 pgvector 的 `<=>` 做余弦距离检索。注意 `0.618` 不是"模型 61.8% 把握"，只是向量距离算出来的分数；相似度阈值（如 `similarity > 0.6`）**不能拍脑袋**，要靠 Retrieval Evaluation 得出合适值。

> 示意片段（无配套脚本）

```sql
-- 一次真实检索：取 TopK 并附带相似度
SELECT dc.content,
       1 - (dc.embedding <=> $1::vector) AS similarity
FROM "DocumentChunk" dc
INNER JOIN "Document" d ON d.id = dc."documentId"
WHERE dc.embedding IS NOT NULL
  AND d.status = 'COMPLETED'
  AND d."isActive" = true
ORDER BY dc.embedding <=> $1::vector
LIMIT $2;
```

脱离外部服务也能理解检索本质：下面的实现用"伪 embedding"做余弦 TopK，跑通的就是 RAG 检索的核心链路。

> 摘自 `code/agent-lab/rag/rag-retrieval.ts`（运行：`npm run rag`）

```ts
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

> 摘自 `code/agent-lab/embedding/cosine-similarity.ts`（运行：`npm run cosine`）

```ts
// 计算两个向量的余弦相似度：越接近 1 越相似，越接近 0 越不相关。
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量维度必须一致')
  }
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

## 进阶方向

RAG Generation（答案 + 来源）、Context Assembly、Prompt Engineering、Metadata 过滤、Hybrid Search（向量 + BM25）、Rerank、邻居召回、权限过滤、RAG 评估、异步 Ingestion、PDF/DOCX/HTML 解析。先把底层做透，再用 LangChain 重构，才知道框架到底封装了什么。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/rag/rag-retrieval.ts` | `npm run rag` | 向量检索、阈值与评估 |
| `code/agent-lab/embedding/cosine-similarity.ts` | `npm run cosine` | 向量检索、阈值与评估 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 5 篇：Embedding 与向量检索；下一篇见第 7 篇：LangChain
