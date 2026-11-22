# Node.js 操作 PostgreSQL

## pgvector：向量相似度检索

向量相似度检索的本质，是把文本（或图片特征）转成向量后做最近邻查询，找出与输入最相近的若干条记录——例如语义搜索里把用户问题向量化，再取最相似的文档片段。向量检索要做的事，PG 用 `pgvector` 扩展就能做。

### 完整流程

```txt
原始文档
  → 切块 Chunk（按段落切分，一般 200~1000 字一段）
  → Embedding 模型把每段文本转成向量（如通用 embedding 模型 → 1536 维）
  → 存进 PG 的 VECTOR(1536) 列
  → 用户查询同样转成向量
  → 用 <=> （余弦距离）算相似度，取 TopK 最相近的 Chunk
  → 返回最相近的若干片段，供业务侧使用
```

### 建表与索引

> 摘自 `./code/Node.js 操作 PostgreSQL/sql/01-pgvector-schema.sql`（运行：`npm run schema`）

```sql
-- 开启向量扩展（每个数据库只需一次）
CREATE EXTENSION IF NOT EXISTS vector;

-- 知识片段表
CREATE TABLE document_chunks (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id    UUID NOT NULL,                 -- 来自哪篇文档
    content   TEXT NOT NULL,                 -- 原始文本块
    embedding VECTOR(1536)                   -- 1536 维向量（与 Embedding 模型维度一致）
);

-- 索引方式 1：IVFFlat（适合百万级以内，需先设置候选列表数）
CREATE INDEX idx_chunks_ivfflat
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 索引方式 2：HNSW（PG 0.5+，召回更准、构建更快，推荐新项目直接用）
CREATE INDEX idx_chunks_hnsw
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

### 相似度查询（TopK 召回）

> 摘自 `./code/Node.js 操作 PostgreSQL/sql/02-pgvector-search.sql`（运行：`npm run search`）

```sql
-- 把"用户问题"的向量作为查询条件，取最相似的 5 段
-- <-> 是余弦距离，值越小越相似
SELECT id, content,
       1 - (embedding <=> '[0.01, -0.23, ...]'::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> '[0.01, -0.23, ...]'::vector
LIMIT 5;
```

把召回到的 `content` 作为相似度结果返回，或直接展示给用户：

```txt
最相关的资料片段（按 similarity 降序）：

资料1：{chunk_1.content}
资料2：{chunk_2.content}
资料3：{chunk_3.content}
```

### 距离算子与索引类型对照

| 算子 | 含义 | 配合的索引 ops |
|------|------|----------------|
| `<->` | 欧氏距离（L2） | `vector_l2_ops` |
| `<#>` | 内积 | `vector_ip_ops` |
| `<=>` | 余弦距离 | `vector_cosine_ops` |

> 决策模型：先做"切块 embedding 维度"对齐（如 1536 维），再选距离算子（语义相似度用余弦 `<=>`），小数据用 IVFFlat、新项目直接 HNSW。中小型业务系统用 PostgreSQL + pgvector 已经足够，不必一开始就上专用向量数据库；只有当数据量到千万级、QPS 很高、需要独立扩缩容时，再考虑 Milvus / Qdrant。

---

## 在 NestJS + Prisma 中集成 PostgreSQL（含 pgvector）

Prisma 官方 schema 对 `VECTOR` 没有原生类型，但可以用 `Unsupported` 或 `String` 旁路，向量检索多用 raw query。

> 本节两段代码逐字摘自配套工程 `Node.js 操作 PostgreSQL` 的 `prisma/` 目录（见 `./code/Node.js 操作 PostgreSQL/README.md`）。它们要连上装了 pgvector 的 PG 才能跑，**本机没有 PostgreSQL 服务，未实跑**。本页其它 `sql` 片段同样出自 `Node.js 操作 PostgreSQL/sql/`，都是可直接在 `psql` 里执行的形态。

> 摘自 `./code/Node.js 操作 PostgreSQL/prisma/schema.prisma`（需 `npx prisma generate`，DATABASE_URL 指向装了 pgvector 的 PG）

```ts
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
// …
model DocumentChunk {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  content   String
  // pgvector 暂无官方类型，用 Unsupported 透传
  embedding Unsupported("vector(1536)")?

  @@map("document_chunks")
}
```

（本机无 PostgreSQL 服务，以上脚本未实跑）

> 摘自 `./code/Node.js 操作 PostgreSQL/prisma/chunk-vector.ts`（需 `@prisma/client` + 装了 pgvector 的 PG）

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 写入向量：用 Prisma 的 $executeRaw，向量要拼成 '[1,2,...]' 字符串
async function saveChunk(content: string, vector: number[]) {
    await prisma.$executeRaw`
    INSERT INTO "document_chunks" (content, embedding)
    VALUES (${content}, ${'[' + vector.join(',') + ']'}::vector)
  `
}

// 相似度查询：raw query 取 TopK
async function search(queryVector: number[], topK = 5) {
    const vec = '[' + queryVector.join(',') + ']'
    return prisma.$queryRawUnsafe(
        `SELECT id, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
        vec,
        topK
    )
}
```

（本机无 PostgreSQL 服务，以上脚本未实跑）

关键点：

1. `DATABASE_URL` 用 `postgresql://` 协议，Prisma Client 指向 PG。
2. 建表时先 `CREATE EXTENSION vector;`（可用 migration 的 `execute` 语句）。
3. 向量的"相似度"计算必须走 raw query，Prisma 的 ORM 方法表达不了 `<=>`。
4. HNSW 索引在 migration 里手动 `CREATE INDEX`，Prisma 当前不支持声明式定义。

> 心智模型：Prisma 负责"事务与 CRUD"，pgvector 负责"相似度检索"。两者职责清晰，不要试图把向量运算塞进 ORM——raw query 才是正确位置。

---

## PostgreSQL vs MySQL 选型决策表

| 维度 | 选 MySQL | 选 PostgreSQL |
|------|----------|---------------|
| 核心业务 / 交易 / 账户 | 首选（生态成熟、运维简单） | 也可，但收益不明显 |
| 半结构化数据（metadata / 参数） | 勉强用 JSON | JSONB + GIN，更合适 |
| 复杂分析 / 窗口函数 / CTE | 8.0 后够用但偏弱 | 强，分析友好 |
| 地理信息 | 一般 | PostGIS 生态完善 |
| 向量检索 / 相似度搜索 | 不支持 | pgvector 原生扩展 |
| 团队熟悉度 | 大多更熟 | 需要学习成本 |
| 生态 / 招聘 | 极广 | 广但略窄 |

> 决策模型：纯业务系统、强一致性交易 → MySQL；需要 JSONB 灵活建模、复杂分析或向量相似度检索 → PostgreSQL。一个常见后端组合是"MySQL 管账户与订单 + PostgreSQL 管业务运行数据与文档向量"。

## 配套代码

本篇的示例在仓库 `node/postgresql/code/Node.js 操作 PostgreSQL`（`pg` 驱动 + `dotenv`）。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/Node.js 操作 PostgreSQL/sql/01-pgvector-schema.sql` | `CREATE EXTENSION vector`、`document_chunks` 建表、IVFFlat 与 HNSW 索引 | pgvector · 建表与索引 |
| `./code/Node.js 操作 PostgreSQL/sql/02-pgvector-search.sql` | TopK 相似度查询（`<=>` 余弦距离 + `1 - 距离` 当 similarity） | pgvector · 相似度查询（TopK 召回） |
| `./code/Node.js 操作 PostgreSQL/sql/03-distance-ops.sql` | `<->` / `<#>` / `<=>` 三个算子在同一个向量对上的取值 | pgvector · 距离算子与索引类型对照 |
| `./code/Node.js 操作 PostgreSQL/src/01-schema.js` | 执行建表脚本，再回读列类型 / 索引定义 / 向量维度 | pgvector · 建表与索引 |
| `./code/Node.js 操作 PostgreSQL/src/02-insert-vectors.js` | `INSERT ... $3::vector` 写入向量，回读校验（自身余弦距离 = 0） | pgvector · 建表与索引（写入侧） |
| `./code/Node.js 操作 PostgreSQL/src/03-similarity-search.js` | 参数化 `$1::vector` 做 TopK 召回，用 `EXPLAIN` 看是否走向量索引 | pgvector · 相似度查询（TopK 召回） |
| `./code/Node.js 操作 PostgreSQL/src/04-distance-ops.js` | 读 `sql/03-distance-ops.sql` 并解释三个距离值的含义 | pgvector · 距离算子与索引类型对照 |
| `./code/Node.js 操作 PostgreSQL/src/lib.js` | `pg` 连接池、`.sql` 文件执行器、假向量与向量字面量工具 | -- |
| `./code/Node.js 操作 PostgreSQL/prisma/schema.prisma` | Prisma schema：`Unsupported("vector(1536)")?` 透传向量列 | 在 NestJS + Prisma 中集成 PostgreSQL |
| `./code/Node.js 操作 PostgreSQL/prisma/chunk-vector.ts` | Prisma 侧 `$executeRaw` 写向量、`$queryRawUnsafe` 做 TopK 检索 | 在 NestJS + Prisma 中集成 PostgreSQL |
| `./code/Node.js 操作 PostgreSQL/README.md` | 工程说明、环境要求与预期输出 | -- |

运行方式（在 `code/Node.js 操作 PostgreSQL` 目录下，先建库、`cp .env.example .env` 再 `npm install`）：`npm run schema` / `insert` / `search` / `distances`；`prisma/` 下两份文件不属于 `npm install` 的依赖范围，需要 `npm i @prisma/client prisma && npx prisma generate`。**本机没有 PostgreSQL 服务，以上均未实跑。**

---
