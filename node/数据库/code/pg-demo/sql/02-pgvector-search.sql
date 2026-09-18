-- 02-pgvector-search.sql：TopK 相似度召回
-- 1536 维向量太长，这里用 '[0.01, -0.23, ...]' 占位；
-- 真实调用把占位符换成 Embedding 模型产出的向量即可，可运行的参数化版本见 src/03-similarity-search.js

-- 把"用户问题"的向量作为查询条件，取最相似的 5 段
-- <=> 是余弦距离，值越小越相似
SELECT id, content,
       1 - (embedding <=> '[0.01, -0.23, ...]'::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> '[0.01, -0.23, ...]'::vector
LIMIT 5;
