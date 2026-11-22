// 02-insert-vectors.js：把切块后的文本连同向量一起写进 document_chunks
// 写入形态：INSERT ... VALUES ($1, $2, $3::vector)，向量要拼成 '[1,2,...]' 字符串
// 运行： npm run insert
const { pool, fakeEmbedding, toVectorLiteral, fail } = require('./lib')

// 三块知识片段：真实场景里来自"文档切块 → Embedding 模型"，这里用假向量代替
const CHUNKS = [
    'pgvector 把向量存进 VECTOR(n) 列，用 <=> 算余弦距离做 TopK 召回。',
    'JSONB 适合存结构不稳定的业务元数据，配 GIN 索引可以高效做包含查询。',
    '窗口函数 ROW_NUMBER() OVER (PARTITION BY ...) 用来取"每个用户最近一笔"。'
]

;(async () => {
    await pool.query('TRUNCATE document_chunks')
    const docId = require('node:crypto').randomUUID()

    console.log('=== 1. 写入 3 个片段（每个 1536 维）===')
    const insert = `INSERT INTO document_chunks (doc_id, content, embedding) VALUES ($1, $2, $3::vector)`
    for (const [i, content] of CHUNKS.entries()) {
        const vector = fakeEmbedding(i + 1)
        const literal = toVectorLiteral(vector)
        const res = await pool.query(insert, [docId, content, literal])
        console.log(
            '  片段',
            i + 1,
            '写入行数 =',
            res.rowCount,
            '，向量字面量长度 =',
            literal.length,
            '个字符（1536 个数）'
        )
    }

    console.log('=== 2. 回读校验 ===')
    const back = await pool.query(
        `SELECT content, pg_typeof(embedding) AS type, (embedding <=> embedding) AS self_distance
         FROM document_chunks ORDER BY content`
    )
    for (const r of back.rows) {
        console.log('  类型 =', r.type, '，与自身的余弦距离 =', r.self_distance, '（同一个向量自己比自己 = 0）')
    }
    console.log('  总数 =', (await pool.query('SELECT COUNT(*)::int AS cnt FROM document_chunks')).rows[0].cnt)
    console.log('  注意：向量列不能存长度不一致的值，VECTOR(1536) 会直接拒绝 1024 维的输入')
})()
    .catch(fail)
    .finally(() => pool.end())
