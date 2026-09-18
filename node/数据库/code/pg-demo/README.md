# pg-demo

《Node.js 后端知识体系》05-数据库「07-PostgreSQL 与 pgvector」的配套代码。

一句话定位：**用 `pg` 驱动把 pgvector 的「建表 → 写入 → 相似度检索」跑通**，SQL 一律放在 `sql/*.sql`
（既能在 `psql` 里直接执行，也能被脚本读入执行，正文里的 SQL 就是从这些文件里摘的）；
另外 `prisma/` 放的是正文「NestJS + Prisma 集成 PG」一节的两段 Prisma 代码出处。

---

## 环境要求

- Node.js 18+
- PostgreSQL 14+，且能安装 `pgvector` 扩展（`CREATE EXTENSION vector;`）

---

## 3 步跑起来

第一步：建库（pgvector 扩展由脚本自己创建）

```bash
createdb pg_demo
```

第二步：配置连接信息

```bash
cp .env.example .env      # 改 PGHOST / PGUSER / PGPASSWORD / PGDATABASE
```

第三步：安装依赖并依次运行

```bash
npm install
npm run schema            # 建扩展 + 建表 + 建 IVFFlat / HNSW 索引
npm run insert            # 写入 3 个 1536 维片段
npm run search            # TopK 相似度召回 + EXPLAIN
npm run distances         # 三个距离算子的取值对比
```

---

## 脚本与 SQL 清单

| 文件 | 演示什么 | 运行命令 | 正文对应小节 |
| --- | --- | --- | --- |
| `sql/01-pgvector-schema.sql` | `CREATE EXTENSION vector`、`document_chunks` 建表、IVFFlat 与 HNSW 索引 | 由 `npm run schema` 读入执行（也可 `psql -f`） | pgvector：向量相似度检索 · 建表与索引 |
| `sql/02-pgvector-search.sql` | TopK 相似度查询（`<=>` 余弦距离 + `1 - 距离` 当相似度） | 由 `npm run search` 的参数化版本执行 | pgvector：向量相似度检索 · 相似度查询（TopK 召回） |
| `sql/03-distance-ops.sql` | `<->` / `<#>` / `<=>` 三个算子在同一个向量对上的取值 | `npm run distances` | pgvector：向量相似度检索 · 距离算子与索引类型对照 |
| `src/01-schema.js` | 执行建表脚本，回读列类型 / 索引定义 / 向量维度 | `npm run schema` | 建表与索引 |
| `src/02-insert-vectors.js` | `INSERT ... $3::vector` 写入向量、回读校验（自身余弦距离 = 0） | `npm run insert` | 建表与索引（写入侧） |
| `src/03-similarity-search.js` | 参数化 `$1::vector` 做 TopK 召回、`EXPLAIN` 看是否走向量索引 | `npm run search` | 相似度查询（TopK 召回） |
| `src/04-distance-ops.js` | 读 `sql/03-distance-ops.sql` 并解释三个距离值的含义 | `npm run distances` | 距离算子与索引类型对照 |
| `src/lib.js` | `pg` 连接池、`.sql` 文件执行器、假向量与向量字面量工具 | -- | -- |
| `prisma/schema.prisma` | Prisma schema：`Unsupported("vector(1536)")?` 透传向量列 | 需要 `npx prisma generate` | 在 NestJS + Prisma 中集成 PostgreSQL（含 pgvector） |
| `prisma/chunk-vector.ts` | Prisma 侧 `$executeRaw` 写向量、`$queryRawUnsafe` 做 TopK 检索 | 需要 `@prisma/client` + 真实 PG | 同上 |

---

## `prisma/` 目录怎么用

`prisma/` 里的两份文件不属于本项目 `npm install` 的依赖范围（本项目只装 `pg` 与 `dotenv`），
它们是正文 Prisma 小节的逐字出处，要真跑需要：

```bash
npm i @prisma/client prisma
export DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/pg_demo"
npx prisma generate
npx ts-node prisma/chunk-vector.ts
```

要点复述：`CREATE EXTENSION vector;` 要在 migration 里先执行；HNSW 索引只能手写 `CREATE INDEX`；
向量的相似度计算 ORM 方法表达不了，只能 raw query。

---

## 预期输出

- 前置：PG 已启动、`pg_demo` 库已建、账号密码正确、`pgvector` 可安装、已 `npm install`。
- `npm run schema`：打印 `document_chunks` 的四个列（`embedding` 的 udt 是 `vector`）、两个索引的 `indexdef`、
  以及列上记录的维度 1536。
- `npm run insert`：3 个片段逐个打印 `rowCount = 1`；回读时每个片段与自身的余弦距离为 `0`。
- `npm run search`：按 `similarity` 从大到小列出 TopK 片段，并打印 `EXPLAIN` 的执行计划
  （数据量小的时候 PG 仍可能选 `Seq Scan`，这是规划器的正常选择，不是索引没建）。
- `npm run distances`：`[1,2,3]` 对 `[2,4,6]` —— 余弦距离约 0（方向一致）、负内积取反后为 28、L2 约 3.74。
- 若 PG 未启动：脚本会在 3 秒内以 `运行失败：connect ECONNREFUSED 127.0.0.1:5432` 退出
  （`connectionTimeoutMillis` 在控制这个等待）；若没装 pgvector，`CREATE EXTENSION vector;` 会报
  `extension "vector" is not available`，需要先安装扩展包。
