# PostgreSQL 基础

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

## 配套代码

本篇为概念与 SQL 基础，示例集中在操作篇——pgvector 向量检索与 Prisma 集成的可运行工程见 `node/postgresql/code/Node.js 操作 PostgreSQL`（下一小节的配套代码即它）。

---
