# Embedding 与向量检索：长期记忆的持久化

## Embedding 把语义变成向量

长期记忆不能靠"全量把记忆塞进 Context"——既撑爆窗口又浪费 token。正确做法是把记忆**语义化**：Embedding 把文本语义转成数字向量，语义越近、向量空间距离越近。于是"登录凭证多久失效"也能召回"Refresh Token 有效期 30 天"（关键词并不一致）。

## 余弦相似度衡量"多像"

用余弦相似度衡量两个向量的接近程度：越接近 1 越相似，越接近 0 越不相关。`cosineSimilarity(a, b) = dot / (|a|·|b|)`，维度必须一致。

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

## 内存向量库与 TopK

向量存进来后，按余弦相似度取最相近的 K 条（TopK）就是一次检索。下面是内存版实现。

> 摘自 `code/agent-lab/embedding/in-memory-vector-store.ts`（运行：`npm run vector-store`）

```ts
export interface VectorItem {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

// 内存版向量库：写入向量，按余弦相似度取 Top K。
export class InMemoryVectorStore {
  private items: VectorItem[] = []

  upsert(item: VectorItem): void {
    const idx = this.items.findIndex(i => i.id === item.id)
    if (idx >= 0) this.items[idx] = item
    else this.items.push(item)
  }

  search(query: number[], topK = 3): Array<VectorItem & { similarity: number }> {
    return this.items
      .map(item => ({ ...item, similarity: cosineSimilarity(query, item.vector) }))
      .sort((x, y) => y.similarity - x.similarity)
      .slice(0, topK)
  }
}
```

## 抽象 EmbeddingProvider 解耦厂商

Embedding 模型也要抽象：推理模型（DeepSeek）与 Embedding 模型（OpenAI）**凭证独立、不要混用 Key**。用接口把具体厂商（OpenAI / 阿里云 / 本地）解耦，换模型不碰业务。

> 摘自 `code/agent-lab/embedding/embedding-provider.interface.ts`

```ts
// 抽象 Embedding 模型，解耦具体厂商（OpenAI / 阿里云 / 本地模型）。
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  readonly dimensions: number
}
```

## pgvector 持久化：重启不丢、可并发

内存向量库重启即丢失。生产用 PostgreSQL + `pgvector` 扩展，列类型 `vector(n)`。用 `<=>` 计算余弦距离（`1 - distance` 即相似度），写入与检索走 SQL。

> 示意片段（无配套脚本）

```sql
-- 启用扩展并建表（n 为向量维度，需实测，如 1536）
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE "DocumentChunk" (
  id uuid PRIMARY KEY,
  content text,
  embedding vector(1536)
);

-- 向量检索：取最相近的 K 条
SELECT content,
       1 - (embedding <=> $1::vector) AS similarity
FROM "DocumentChunk"
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT $2;
```

用 Prisma 管理时，embedding 列映射为 `Unsupported("vector")`，写入与检索走 `$queryRaw`；允许 embedding 为 `NULL` 给 Embedding API 临时故障留容错空间。

> 示意片段（无配套脚本）

```prisma
model DocumentChunk {
  id        String                 @id @default(uuid())
  documentId String
  content   String
  chunkIndex Int
  embedding Unsupported("vector")?
  @@unique([documentId, chunkIndex])
}
```

## 语义检索与 Context 层级

一轮 Agent Context 的层级通常是：`System + 相关记忆 + 摘要 + 近期 + 当前`。长期记忆从"全量塞入"升级为"语义检索 TopK 注入"，只把与当前问题相关的记忆送进窗口。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/embedding/cosine-similarity.ts` | `npm run cosine` | 余弦相似度衡量"多像" |
| `code/agent-lab/embedding/in-memory-vector-store.ts` | `npm run vector-store` | 内存向量库与 TopK |
| `code/agent-lab/embedding/embedding-provider.interface.ts` | （接口定义） | 抽象 EmbeddingProvider 解耦厂商 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 4 篇：上下文与记忆；下一篇见第 6 篇：RAG
