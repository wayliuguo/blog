# Embedding 与向量检索：长期记忆的持久化

## 旧方案的问题：每次把用户全部 Memory 塞进上下文

上一篇的 Memory 注入是这样的：每次用户发消息，`memoryStore.getAll(userId)` 把该用户的**所有** Memory 全部塞进上下文。几条没问题，长期使用积累到 100、1000、10000 条时肯定不能全发。

本篇目标：用 Embedding + PostgreSQL + pgvector，实现**可以持久化、可以语义检索**的长期记忆。最终架构：

```
User Message → Embedding → Query Vector → PostgreSQL + pgvector
    → Semantic Search → Top K Relevant Memories → Agent Context → LLM
```

## Embedding 到底是什么：把语义变成一组数字

Embedding 就是**把一段文本的「语义」转换成一组数字**，这组数字叫 Vector（向量）：

```
"用户希望 TypeScript 代码不要使用 any"
    → Embedding Model
    → [0.0182, -0.1341, 0.5528, ...]
```

核心性质：**语义越相似的文本，在向量空间里的距离通常越接近**。比如「NestJS 后端开发」与「服务端框架偏好 NestJS」的向量距离，比它与「西安旅游」近得多。有了距离，就有了 **Semantic Search（语义搜索）** 的可能。

## 为什么字符串匹配不行

用反例说明为什么 Memory 检索必须走语义路线。保存的记忆是「用户主要使用 NestJS 开发服务端」，用户问「帮我写一个后端注册接口」——用字符串匹配：

```
memory.includes('后端注册接口')   // false，什么都搜不到
```

字符串完全不同，语义却强相关（NestJS / 后端 / 服务端 / 接口开发）。Embedding 能从语义层面发现这层关联。这就是 **Memory Retrieval** 的流程：

```
当前问题 → Embedding → Vector Search → 找到相关 Memory
```

## 先手写一次 Cosine Similarity

用任何向量库之前，先手动实现相似度计算，理解底层：

> 摘自 `code/embedding/cosine-similarity.ts`

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

读数含义：**越接近 1 → 越相似；越接近 0 → 相关性越弱**。示例分数：

```
"用户主要使用 NestJS"      vs "NestJS 后端开发"   → 0.92
"用户喜欢 TypeScript"      vs "NestJS 后端开发"   → 0.76
"用户喜欢去西安旅游"        vs "NestJS 后端开发"   → 0.18
```

**Top K**：如果 Top K = 2，就只取相似度最高的前两条。

## 内存版 VectorStore：暴力检索的全部思想

有了相似度函数，包成一个可复用的存储/检索组件。Vector Search 最核心的思想就是暴力全量检索：

```
所有 Vector → 逐个计算 Similarity → 按相似度排序 → 取 Top K
```

> 摘自 `code/embedding/in-memory-vector-store.ts`

```ts
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

两个操作对应两件事：`upsert`（按 id 存在即更新、不存在即插入）、`search`（算相似度 → 排序 → 取 Top K）。源文的 NestJS 版在此基础上还有 `delete` 与按用户过滤，属业务层扩展，镜像从简未收录。

## 抽象 EmbeddingProvider：业务依赖抽象，不依赖具体模型

Embedding 不应该直接写死在 MemoryService 里。先定义接口：

> 摘自 `code/embedding/embedding-provider.interface.ts`

```ts
// 抽象 Embedding 模型，解耦具体厂商（OpenAI / 阿里云 / 本地模型）。
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  readonly dimensions: number
}
```

以后无论换成 OpenAI、阿里云还是本地模型，MemoryService 都不需要修改。分层架构：

```
MemoryService → EmbeddingProvider → 具体 Embedding Model
```

## 实现真实 Provider：推理模型与 Embedding 模型是两回事

真实 Provider 基于 OpenAI SDK（示意）。这里要澄清一个概念：当前 Agent 推理用 DeepSeek，但 Embedding 可以用单独的 Provider——**DeepSeek 负责 Agent 推理 / Tool Calling，Embedding 模型负责 Text → Vector，它们不是一回事**：

> 示意片段（无配套脚本）

```ts
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1536

  async embed(text: string): Promise<number[]> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error('Embedding text cannot be empty')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmed,
    })
    const vector = response.data[0]?.embedding
    if (!vector) throw new Error('Embedding API did not return a vector')
    return vector
  }
}
```

`embedMany` 还要注意**按 `index` 排序**——批量 API 返回顺序不保证与输入一致（该方法属于真实 NestJS 版 Provider 的接口；镜像 interface 只含单个 `embed`，保持最小可读）。

## 坑一：Missing credentials——两套凭证不能混用

真实 Provider 一启动就报错：

```
ERROR [ExceptionHandler] Missing credentials. Please pass an apiKey, ... or set the OPENAI_API_KEY ...
```

两个知识点：`OPENAI_API_KEY` 没读取到，要在 `.env` 配置并重启；更重要的是，**DeepSeek 能用 OpenAI SDK 调用（`baseURL` 兼容）只是 API 调用形式兼容，`DEEPSEEK_API_KEY` 不能直接当成 `OPENAI_API_KEY` 用**——这是两套独立凭证。

## 内存 VectorStore 为什么不够：进程一死，记忆全丢

目前的链路是 `Memory → Embedding → Vector → InMemoryVectorStore → Semantic Search`，功能完整，但有一个致命缺陷：**NestJS 重启 → Memory 全部丢失**——内存的生命周期只有进程。所以要升级到持久化：

```
Memory → Embedding → PostgreSQL 持久化 → pgvector Vector Search
```

## pgvector：让 PostgreSQL 认识 vector 类型

普通 PostgreSQL 擅长 `String / Number / Boolean / Date / JSON`；安装 **pgvector** 扩展后，多了一个 `vector` 数据类型：

```sql
CREATE TABLE vector_test (id SERIAL PRIMARY KEY, embedding vector(3));
-- vector(3) 表示三维向量，例如 [1, 0, 0]
```

环境搭建用 Docker（注意 `-p 5432:5432` 端口映射，漏掉就是坑二）：

```bash
docker pull pgvector/pgvector:pg16
docker run --name agent-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agent_db -p 5432:5432 -d pgvector/pgvector:pg16
# 进入数据库启用扩展
docker exec -it agent-postgres psql -U postgres -d agent_db \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## 坑二：`5432/tcp` 不是端口映射

`docker ps` 时如果 PORTS 列只显示 `5432/tcp`，说明只是容器内部开放端口，宿主机连不上；必须是 `0.0.0.0:5432->5432/tcp` 才是真正的映射。**端口映射无法事后补救，只能删容器重建并带上 `-p 5432:5432`**。这个坑会借 P1001 报错还魂：后面 Prisma 报 `P1001: Can't reach database server`，根因往往不是数据库挂了，而是这里。

## 手写一次 SQL Vector Search：Distance 与 Similarity 方向相反

接 ORM 之前，先用纯 SQL 体验一次向量检索，顺便辨析一个极易混淆的概念：

```sql
SELECT id, embedding,
       1 - (embedding <=> '[1, 0, 0]'::vector) AS similarity
FROM vector_test
ORDER BY embedding <=> '[1, 0, 0]'::vector
LIMIT 3;
```

| 运算符/函数 | 含义 | 方向 |
| ---- | ---- | ---- |
| `embedding <=> query` | Cosine Distance | **越小越相似** |
| `1 - (embedding <=> query)` | Cosine Similarity | 越接近 1 越相似 |

前面手写的 `cosineSimilarity` 越大越好；pgvector 的 `<=>` 返回的是**距离**，越小越好——**方向相反，必须换算**，否则排序整个是反的。

## 坑三：P1013 → P1001，错误码变化就是排查进度

Prisma 迁移时的报错链：

```
P1013: The provided database string is invalid.   ← DATABASE_URL 本身解析失败（还没开始连库）
  ↓ 修复 URL（密码含 @ # % 等特殊字符要 URL Encode，如 @ → %40）
P1001: Can't reach database server at localhost:5432   ← URL 正确了，连不上
  ↓ docker ps 检查 → 发现端口没映射 → 回到坑二，删容器重建
```

**排错方法论：错误码变化 = 排查进度的推进信号**——P1013 变成 P1001，说明连接串这一层已经修好，问题在下一层。

## 设计 UserMemory 表：三个容易忽略的细节

Prisma 模型（示意）：

> 示意片段（无配套脚本）

```ts
// prisma/schema.prisma —— 用示意片段标注，Prisma 模型语法无法在本实验台运行
// model UserMemory {
//   id        String   @id @default(uuid())
//   userId    String
//   type      String
//   key       String
//   value     String
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//   @@unique([userId, type, key])   // upsert 的唯一标识
//   @@index([userId])
//   @@map("user_memory")
// }
```

三个细节：

1. **为什么不能写 `embedding Float[]`**——`Float[]` 只是 PostgreSQL 数组，真正需要的是 pgvector 的 `vector(n)` 类型（带距离运算符）。Prisma 原生表达不了，要在 Migration 里手工补：`ALTER TABLE "user_memory" ADD COLUMN "embedding" vector(1536);`。同一条 migration 里还要写 `CREATE EXTENSION vector;`——它只会在执行 migration 的数据库会话里生效，新环境跑迁移时若只靠手工执行过一次，迁移必失败。
2. **维度 1536 不能照抄**——先跑 `vector.length` 实测当前 Embedding 模型的维度，输出多少写多少。
3. **为什么允许 embedding 为 NULL**——Memory 保存涉及 Database + Embedding API 两个环节；Embedding API 超时 / 429 / 网络错误时，不希望整个 Memory 保存失败，先允许 NULL，后续再加 retry 机制。`db pull` 之后看到 `Unsupported("vector")?` 是正常现象，不是出错。

工程版本事实（原文明确约定）：本篇按 **Prisma 7** 落地——generator 用 `provider = "prisma-client"`（output 指向 `../generated/prisma`），配套 `prisma.config.ts`，并**明确不升 Prisma 8**；迁移走两步法：`npx prisma migrate dev --name create_user_memory --create-only` 先生成迁移文件，手工补 `CREATE EXTENSION vector;` 与 `vector(1536)` 列后再执行。

## MemoryRepository：参数化 Raw SQL 检索

所有 pgvector 操作封装进 Repository。检索 SQL 的关键点全部在里面（示意）：

> 示意片段（无配套脚本）

```ts
async search(userId: string, queryVector: number[], topK = 5) {
  const vectorText = `[${queryVector.join(',')}]`
  return prisma.$queryRaw`
    SELECT "id", "userId", "type", "key", "value",
           1 - ("embedding" <=> ${vectorText}::vector) AS "similarity"
    FROM "user_memory"
    WHERE "userId" = ${userId} AND "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${vectorText}::vector
    LIMIT ${topK}
  `
}
```

- `1 - distance` 换算回相似度；`IS NOT NULL` 过滤未生成向量的记录；按距离升序即相似度降序；
- 用 `$queryRaw` **模板字符串**而不是 `$queryRawUnsafe()`——参数化查询防注入。

## MemoryService：写记忆 = 存文本 + 回写向量

把 Repository 和 EmbeddingProvider 组装起来（示意）。写链路多了一步「构造 Embedding 文本」——Embedding 的输入不是裸 value，而是带结构标签的拼接文本，能提升向量语义质量：

```
User Message → MemoryExtractor → MemoryService.save()
  → Prisma Upsert（type+key 唯一）→ Embedding → Vector 回写 → PostgreSQL
```

> 示意片段（无配套脚本）

```ts
private buildEmbeddingText(memory: { type: string; key: string; value: string }): string {
  return [`类型：${memory.type}`, `主题：${memory.key}`, `内容：${memory.value}`].join('\n')
}
```

## Agent 改用语义检索：注入的是「相关记忆 TopK」

读取侧把「全量拉取」替换为「按当前消息语义检索」：

```
之前：const memories = this.memoryStore.getAll(userId)
现在：const relatedMemories = await this.memoryService.search(userId, userMessage, 5)
```

注入 Context 时还要带上使用规则，防止模型乱用记忆：

```
1. 仅在与当前问题相关时使用；
2. 不要无缘无故向用户复述这些记忆；
3. 如果当前用户明确表达的信息与旧记忆冲突，以当前信息为准。
```

## 最终 Agent Context 与完整 Retrieval 流程

注入 Context 的已经不再是所有 Memory，而是**当前问题真正相关的 Memory**——这是本篇最大的升级：

```
System Prompt → Relevant Long-term Memory → Conversation Summary
→ Recent Conversation → Current User Message → LLM
```

端到端走一遍：数据库已存 4 条记忆（TypeScript 不用 any / NestJS 后端 / PostgreSQL 数据库 / 西安亲子旅游）。用户开全新会话问「帮我实现一个用户注册接口」——检索排序预期：NestJS / TypeScript / PostgreSQL 相关记忆排前，「西安亲子旅游」排后。**即使 conversationId 变了，只要 userId 相同，Agent 就能找回以前的长期偏好**——这才是真正意义上的 Long-term Memory。

## 今天之前 vs 今天之后

```
之前：Conversation → MemoryExtractor → Map → getAll() 全量注入 → LLM

之后（写）：User Message → MemoryExtractor → MemoryService → PostgreSQL → Embedding → pgvector
之后（读）：Current User Message → Embedding → Query Vector
            → pgvector Cosine Search → Top K Memory → ContextManager → LLM
```

Memory 不再只是「把聊天记录保存下来」，而是完整五步：**提取真正值得长期保存的信息 → 生成 Embedding → 持久化 Vector → 按当前问题语义搜索 → 只召回真正相关的 Memory**。下一章把这个能力放大到企业知识库：RAG。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/embedding/cosine-similarity.ts` | `npm run cosine` | 手写余弦相似度 |
| `code/embedding/embedding-provider.interface.ts` | （独立示例；真实 Provider 实现时引用） | EmbeddingProvider 抽象 |
| `code/embedding/in-memory-vector-store.ts` | `npm run vector-store` | 内存向量库：upsert / search TopK |

> PostgreSQL + pgvector / Prisma / 真实 Embedding API 部分依赖数据库与密钥环境，正文以示意片段呈现；检索 SQL 的同类逻辑可由第 6 篇的 `rag-retrieval.ts` 在本机验证。
