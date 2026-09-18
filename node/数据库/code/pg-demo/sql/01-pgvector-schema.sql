-- 01-pgvector-schema.sql：开扩展、建知识片段表、建两种向量索引
-- 执行： psql -f sql/01-pgvector-schema.sql   或   npm run schema（由 src/01-schema.js 读入执行）

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
