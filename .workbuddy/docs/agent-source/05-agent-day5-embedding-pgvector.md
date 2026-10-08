# Agent Day 5：从 Embedding 到 pgvector（对应博客篇 5）

- 来源：https://mp.weixin.qq.com/s/4XcGvmWmZ9qIgSzz3gMCTg
- 作者：楠熠之 · 2026-09-14
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（原小节）
一、Embedding 是什么 → 二、为什么 Memory 需要 Embedding（ getAll 全量塞入不可行）→ 三、手写 Cosine Similarity → 四、内存版 VectorStore → 五、抽象 EmbeddingProvider → 六、真实 EmbeddingProvider（OpenAI text-embedding-3-small）→ 七、坑1 Missing credentials → 八、为什么内存 VectorStore 不够 → 九、什么是 pgvector → 十、Docker 启动 PostgreSQL+pgvector → 十一、坑2 Docker 没有端口映射 → 十二、启用 pgvector（CREATE EXTENSION vector）→ 十三、手写 Vector Search（<=> 余弦距离）→ 十四、接 Prisma → 十五、配置 DATABASE_URL → 十六、坑3 P1013 → 十七、Prisma 7 的 prisma.config.ts → 十八、坑4 P1001 → 十九、设计 UserMemory → 二十~二十一、创建/执行 Migration → 二十二、为什么 embedding 允许 NULL → 二十三、MemoryRepository → 二十四、升级 MemoryService → 二十五、修改 MemoryExtractor 保存逻辑 → 二十六、Agent 使用语义检索（删 getAll，改 search TopK=5）→ 二十七、最终 Agent Context → 二十八、完整 Retrieval 流程 → 二十九、最终架构。

## 核心概念
- Embedding = 语义 → 向量；语义越近距离越近
- Cosine Similarity（越大越像）vs pgvector <=> 是 Cosine Distance（越小越像），1 - distance 转回
- 手写 cosineSimilarity：维度校验→点积/范数→任一范数 0 返回 0
- 内存 VectorStore：upsert 按 id、search(userId, queryVector, topK=5, threshold=0) 过滤+降序+slice
- EmbeddingProvider 接口：embed/embedMany（embedMany 按 index 排序保证顺序）
- 真实 Provider：text-embedding-3-small，1536 维（先 embed('hello') 打印维度确认再写 vector(1536)）
- pgvector：vector 类型 vector(3)/vector(1536)；CREATE EXTENSION IF NOT EXISTS vector
- Prisma 7：Unsupported("vector") + $queryRaw 手写 SQL；embedding Float[] 不行（那是 PG 数组）
- $queryRaw 标签模板参数化，不用 $queryRawUnsafe
- embedding 允许 NULL：Embedding API 挂了不拖垮 Memory 保存（后续 embeddingStatus+retry）
- 检索 SQL：SELECT ..., 1 - ("embedding" <=> ${vectorText}::vector) AS "similarity" ... WHERE "embedding" IS NOT NULL ORDER BY "embedding" <=> ... LIMIT ${topK}
- 注入 system 规则：仅相关时用、不无故复述、与当前信息冲突以当前为准

## 事实性细节
- docker pull pgvector/pgvector:pg16；docker run --name agent-postgres -e POSTGRES_USER/PASSWORD=postgres -e POSTGRES_DB=agent_db -p 5432:5432 -v agent-postgres-data -d
- DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agent_db?schema=public"
- 端口映射正确态：0.0.0.0:5432->5432/tcp
- Prisma 7（明确不升 Prisma 8）；generator client provider = "prisma-client"，output ../generated/prisma
- @@unique([userId, type, key])、@@map("user_memory")；migration.sql 手工追加 CREATE EXTENSION + ADD COLUMN embedding vector(1536)
- npx prisma migrate dev --name create_user_memory --create-only
- OPENAI_API_KEY 与 DEEPSEEK_API_KEY 是两套凭证，不能混用

## 踩坑点（4 坑）
1. Missing credentials：OPENAI_API_KEY 未配置（DeepSeek Key 不能当 Embedding Key 用）
2. Docker 无端口映射：PORTS 只显示 5432/tcp → 需 -p 5432:5432
3. P1013：DATABASE_URL 格式非法，密码特殊字符需 URL Encode（@ → %40）
4. P1001：连不上 → 回溯发现仍是端口映射问题；排错链 P1013→P1001→docker ps→-p
- Cosine Distance/Similarity 方向相反；vector(1536) 别照抄先验证维度
