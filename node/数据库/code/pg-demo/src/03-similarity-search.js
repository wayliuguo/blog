// 03-similarity-search.js：TopK 相似度召回（参数化版本，SQL 形态与 sql/02-pgvector-search.sql 一致）
// 运行： npm run search
const { pool, fakeEmbedding, toVectorLiteral, fail } = require('./lib')

// 模拟"用户问题"被 Embedding 模型转成向量：真实场景这一步是调用 embedding 接口
const question = '向量检索怎么做 TopK 召回？'
const queryVector = fakeEmbedding(1) // 1536 维，与列定义一致

;(async () => {
    console.log('=== 1. 检索 ===')
    console.log('  问题 =', question)
    console.log('  问题向量维度 =', queryVector.length)

    // $1::vector 出现两次：一次算 similarity，一次用于 ORDER BY，参数只传一遍
    const rows = await pool.query(
        `SELECT id, content,
                1 - (embedding <=> $1::vector) AS similarity
         FROM document_chunks
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [toVectorLiteral(queryVector), 5]
    )

    console.log('=== 2. TopK 结果（similarity 从大到小）===')
    for (const row of rows.rows) {
        console.log('  similarity =', String(row.similarity).padEnd(20), row.content)
    }

    console.log('=== 3. 解释一下两个数字 ===')
    console.log('  <=> 给的是余弦距离（0~2，越小越相似）；1 - 距离 = 余弦相似度（越大越相似）')
    console.log('  ORDER BY embedding <=> $1::vector 才能用上 vector_cosine_ops 索引；')
    console.log('  写成 ORDER BY 1 - (embedding <=> ...) 这种表达式就吃不到索引了')

    console.log('=== 4. 有索引时执行计划里的 Index Scan ===')
    const plan = await pool.query(`EXPLAIN SELECT id FROM document_chunks ORDER BY embedding <=> $1::vector LIMIT 5`, [
        toVectorLiteral(queryVector)
    ])
    for (const r of plan.rows) console.log('  ' + r['QUERY PLAN'])
})()
    .catch(fail)
    .finally(() => pool.end())
