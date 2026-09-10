# PostgreSQL 与 pgvector

> 承上：[MySQL 进阶](./02-MySQL%20进阶) —— 先掌握索引与查询优化，才能对比理解 PG 的 GIN/部分索引与 EXPLAIN ANALYZE 差异
> 启下：[Redis 基础与数据类型](../06-Redis/01-Redis%20基础与数据类型)

会用 MySQL，甚至能熟练写 ORM，不等于"会数据库"。除了事务与查询，现代后端还要存结构化 + 半结构化混合数据、做向量检索、支撑内容推荐与相似度搜索。

PostgreSQL（下文简称 PG）正是传统后端处理混合数据负载的那座桥：

> 关系型数据库的能力 PG 都有（事务、SQL、索引、JSONB），而现代后端需要的向量检索、JSON 元数据、复杂分析，PG 又比 MySQL 更顺手。学完 MySQL 再学 PG，不是"换一个数据库"，而是"把同一份数据基础设施的能力面补齐"。

PG 在现代后端数据栈里的位置：

```txt
传统后端：  MySQL  ── 业务事务、订单、账户
                    │
数据基础设施：       ├── PostgreSQL + JSONB  ── 存业务运行记录、半结构化配置、metadata
                    ├── PostgreSQL + pgvector ── 向量检索（文档切块 → Embedding → 相似度 TopK）
                    └── 专用向量数据库（Milvus / Qdrant）── 超大规模向量场景（后期才需要）
```

核心心智模型：**中小型业务系统用 PostgreSQL + pgvector 就够用了，先别急着上专用向量数据库。**

---

## 为什么是 PostgreSQL：定位差异

| 维度 | MySQL | PostgreSQL |
|------|-------|------------|
| 设计取向 | 简单、快、稳，Web 业务首选 | 标准、严谨、可扩展，能力面更宽 |
| 数据类型 | 偏传统（INT / VARCHAR / JSON） | 强类型（UUID / JSONB / ARRAY / ENUM / 自定义类型） |
| 半结构化 | JSON 够用 | JSONB 可建 GIN 索引，查询高效 |
| 扩展生态 | 一般 | 扩展机制极强（pgvector / PostGIS / fdw） |
| 典型场景 | 业务系统、交易 | 分析、地理、JSON 文档、向量、混合负载 |

> 结论：MySQL 管"钱和订单"，PostgreSQL 管"半结构化数据与向量"。两者不是替代关系，而是后端工程师该同时掌握的两套武器。

---

## 强数据类型：UUID、JSONB、ARRAY、ENUM

MySQL 的字段类型偏传统，PG 提供了一组"更贴近业务对象"的类型，能减少应用层拼接字符串的麻烦。

```sql
-- UUID：分布式环境生成主键，避免自增 ID 被遍历
CREATE TABLE accounts (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- ARRAY：一个字段存多个值，省掉关联表
CREATE TABLE tools (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tags  TEXT[]                      -- 工具标签数组
);

INSERT INTO tools (name, tags) VALUES ('web_search', ARRAY['search','io']);
-- 包含判断：是否带 'io' 标签
SELECT * FROM tools WHERE 'io' = ANY(tags);

-- ENUM：限定取值集合，比 VARCHAR 更省空间也更安全
CREATE TYPE task_status AS ENUM ('idle', 'running', 'failed');
CREATE TABLE runs (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status task_status NOT NULL
);

-- JSONB：二进制存储的 JSON，支持索引与高效查询（见下一节）
CREATE TABLE conversations (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta JSONB                          -- 任意结构化的对话元数据
);
```

为什么用 `JSONB` 而不是 `JSON`：

| 类型 | 存储 | 查询 | 索引 |
|------|------|------|------|
| `JSON` | 文本原样存 | 每次解析，慢 | 不能高效索引 |
| `JSONB` | 解析后二进制存 | 直接取字段，快 | 可建 GIN 索引 |

---

## JSONB：半结构化业务元数据

业务系统运行时会产生大量"结构不稳定"的数据：每次接口调用的入参、缓存的派生结果、用户自定义的 metadata。用严格的表字段去建模会非常痛苦，用 `JSONB` 则刚刚好。

```sql
-- 存一次工具调用的完整上下文
INSERT INTO tool_calls (owner_id, payload) VALUES (
    'a1b2c3...',
    '{
        "tool": "sql_query",
        "args": {"table": "orders", "limit": 10},
        "model": "rule-engine",
        "cost_usd": 0.003
    }'::jsonb
);

-- 取 JSONB 里的字段（-> 返回 jsonb，->> 返回文本）
SELECT payload ->> 'tool' AS tool,
       payload -> 'args' ->> 'table' AS target_table
FROM tool_calls;

-- 按 JSONB 字段过滤：哪个工具被调用最多
SELECT payload ->> 'tool' AS tool, COUNT(*) AS cnt
FROM tool_calls
GROUP BY tool
ORDER BY cnt DESC;
```

关键能力：给 JSONB 建 **GIN 索引**，可以对任意嵌套键做高效查询。

```sql
-- GIN 索引：对整个 JSONB 建倒排索引，支持包含、键查询
CREATE INDEX idx_tool_calls_payload ON tool_calls USING GIN (payload);

-- @> 表示"包含"，走 GIN 索引
SELECT * FROM tool_calls
WHERE payload @> '{"tool": "sql_query"}';

-- 只索引某个键（更省空间，适合固定查询模式）
CREATE INDEX idx_tool_calls_tool ON tool_calls USING GIN ((payload -> 'tool'));
```

> 决策模型：字段结构稳定、要联表 → 用普通列；结构随业务演进、经常整体读写、需要灵活查询 → 用 JSONB + GIN。业务系统的工具调用日志、运行 metadata 几乎都该用 JSONB。

---

## 窗口函数、CTE 与 UPSERT

这三项是 PG（以及 MySQL 8.0）都支持、但新手最容易"看懂不会用"的能力，却是写报表和去重逻辑的核心。

**CTE（WITH）**：把子查询命名，可读性大幅提升，也方便拆步骤。

```sql
-- 每个用户最近一笔订单（CTE 写法，比嵌套子查询清晰）
WITH ranked AS (
    SELECT user_id,
           id AS order_id,
           created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM orders
)
SELECT user_id, order_id, created_at
FROM ranked
WHERE rn = 1;
```

**UPSERT（`ON CONFLICT`）**：存在则更新，不存在则插入，一条语句完成"幂等写入"。

```sql
-- 业务任务每次运行要写一条"最新状态"，重复运行就更新而非报错
INSERT INTO job_runs (run_id, status, updated_at)
VALUES ('run-001', 'running', now())
ON CONFLICT (run_id)
DO UPDATE SET status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at;
```

**窗口函数**：在不聚合行的同时算"组内排名 / 累计 / 同比"。

```sql
-- 每个用户的订单金额排名（行还在，只是多了一列排名）
SELECT user_id,
       amount,
       RANK() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rk
FROM orders;
```

> 看到"每个 X 的 Top N / 最新一条 / 累计值"这类需求，第一反应就该是窗口函数，而不是 GROUP BY 或应用层循环。

---

## 更丰富的索引类型：B-Tree / GIN / GiST / 部分索引 / 表达式索引

MySQL 几乎只有 B-Tree（加 FULLTEXT / 空间索引）。PG 的索引家族更宽，针对不同数据形态选不同索引：

| 索引 | 适用场景 | 业务相关例子 |
|------|----------|----------------|
| B-Tree | 等值、范围、排序（默认） | `WHERE user_id = ?`、`ORDER BY created_at` |
| GIN | 多值 / JSONB / 数组包含 | `payload @> '{"tool":"x"}'`、数组 tags |
| GiST | 几何、范围重叠、全文检索 | 地理范围、时间段重叠 |
| 部分索引（Partial） | 只对一部分行建索引 | 只索引 `status = 'running'` 的运行记录 |
| 表达式索引 | 对函数结果建索引 | 对 `lower(email)` 建索引做大小写无关查询 |

部分索引（PG 独有且极实用）：

```sql
-- 90% 的运行记录都是 finished，只有 running 的才常被查
-- 只对 running 建索引，体积小、写入快
CREATE INDEX idx_runs_running
    ON job_runs (created_at)
    WHERE status = 'running';
```

表达式索引：

```sql
-- 经常做大小写无关的邮箱查找
CREATE INDEX idx_users_email_lower ON users (lower(email));
SELECT * FROM users WHERE lower(email) = lower('Alice@Example.com');
```

---

## EXPLAIN ANALYZE 怎么读

PG 的 `EXPLAIN ANALYZE` 会真正执行语句并给出真实耗时，比 MySQL 的 `EXPLAIN` 信息更全。

```sql
EXPLAIN ANALYZE
SELECT * FROM tool_calls WHERE payload @> '{"tool": "sql_query"}';
```

重点看三件事：

| 指标 | 含义 | 关注点 |
|------|------|--------|
| `Seq Scan` / `Index Scan` | 全表扫描 / 索引扫描 | 大表出现 `Seq Scan` 通常是没走索引 |
| `rows` vs `actual rows` | 估算行数 vs 实际行数 | 偏差大说明统计信息过期，需 `ANALYZE` |
| `Planning Time` / `Execution Time` | 规划 / 执行耗时 | 优化目标，单位毫秒 |

```txt
Index Scan using idx_tool_calls_payload on tool_calls
  Index Cond: (payload @> '{"tool": "sql_query"}'::jsonb)
Planning Time: 0.12 ms
Execution Time: 1.84 ms
```

> 心智模型：看到 `Seq Scan` + 大表 + 慢 `Execution Time`，先问"为什么没走索引"，再问"是不是该建 GIN / 部分索引"，而不是加内存。

---

## MVCC 与 VACUUM：和 MySQL undo log 的对比

PG 和 MySQL 都用 MVCC 实现"读写不阻塞"，但回收旧版本的方式完全不同，这是理解 PG 运维的关键。

| 机制 | MySQL InnoDB | PostgreSQL |
|------|--------------|------------|
| 旧版本存放 | undo log（独立段） | 数据表本身（行里有 xmin / xmax 版本号） |
| 回收方式 | 后台 purge 线程自动清理 | 需要 `VACUUM` 回收"死元组"（dead tuples） |
| 膨胀风险 | undo log 较小，膨胀可控 | 频繁 UPDATE/DELETE 会让表膨胀，必须 VACUUM |
| 长事务影响 | 阻塞 purge | 阻塞 VACUUM，死元组堆积 |

PG 的 UPDATE 本质是"标记旧行失效 + 插入新行"，旧行变成 dead tuple，由 `VACUUM`（或 autovacuum 自动进程）回收空间和复用。

```sql
-- 手动回收死元组并更新统计信息（大批量删改后常用）
VACUUM (ANALYZE, VERBOSE) tool_calls;

-- 查看表的膨胀情况（需 pgstattuple 扩展）
SELECT * FROM pgstattuple('tool_calls');
```

> 结论：PG 的"表膨胀"是真实运维问题。高频写入的业务运行表，务必确认 autovacuum 配置合理，否则查询会越来越慢——这不是 SQL 写错了，是没做 VACUUM。

---

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

```ts
// prisma/schema.prisma（要点）
// datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model DocumentChunk {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  content   String
  // pgvector 暂无官方类型，用 Unsupported 透传
  embedding Unsupported("vector(1536)")?
}
```

```ts
// 写入向量：用 Prisma 的 $executeRaw，向量要拼成 '[1,2,...]' 字符串
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function saveChunk(content: string, vector: number[]) {
  await prisma.$executeRaw`
    INSERT INTO "document_chunks" (content, embedding)
    VALUES (${content}, ${'[' + vector.join(',') + ']'}::vector)
  `;
}

// 相似度查询：raw query 取 TopK
async function search(queryVector: number[], topK = 5) {
  const vec = '[' + queryVector.join(',') + ']';
  return prisma.$queryRawUnsafe(
    `SELECT id, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vec, topK,
  );
}
```

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

---

## 面试题

### Q1: PostgreSQL 的 JSONB 和 MySQL 的 JSON 有什么区别？为什么业务场景常用 JSONB？

JSONB 以二进制解析后存储，支持建 GIN 索引做包含查询，读取快；JSON 是文本原样存，每次查询都要解析，难以高效索引。业务系统的接口调用参数、运行 metadata 结构不稳定且需要按字段检索，JSONB + GIN 正好匹配。

### Q2: 用 pgvector 做向量检索的基本流程是什么？

文本切块（Chunk）→ 用 Embedding 模型转成向量存入 `VECTOR(1536)` → 用户查询同样转向量 → 用 `<=>` 余弦距离做相似度排序取 TopK → 把最相关文本块作为相似度结果返回。

### Q3: PG 的 MVCC 和 MySQL 有什么不同？为什么会有"表膨胀"？

MySQL 旧版本存在 undo log 里，由 purge 自动清理；PG 的旧行直接留在表里变成 dead tuple，需要 VACUUM 回收。频繁 UPDATE/DELETE 又不及时 VACUUM，dead tuple 堆积导致表膨胀、查询变慢。

### Q4: 什么时候该用 PostgreSQL 而不是 MySQL？

需要 JSONB 灵活建模、复杂窗口函数/CTE 分析、地理信息（PostGIS）、或向量检索（pgvector）时选 PG；纯交易型业务选 MySQL 即可。两者常组合使用。

### Q5: 部分索引（Partial Index）解决什么问题？

只对满足 WHERE 条件的一部分行建索引，体积更小、写入更快。适合"大部分数据不常被查、只有小部分状态热门"的场景，例如只对 `status = 'running'` 的运行记录建索引。

---

## 参考

- 上一篇：[MongoDB 进阶](./06-MongoDB%20进阶)
- 下一篇：[Redis 基础与数据类型](../06-Redis/01-Redis%20基础与数据类型)
