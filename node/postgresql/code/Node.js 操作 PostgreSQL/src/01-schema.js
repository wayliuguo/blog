// 01-schema.js：开扩展、建表、建两种向量索引
// DDL 全部写在 sql/01-pgvector-schema.sql 里，这里只负责读入执行 + 回读结果
// 运行： npm run schema
const { pool, runSqlFile, fail } = require('./lib')

;(async () => {
    console.log('=== 1. 执行建表脚本 ===')
    await runSqlFile('sql/01-pgvector-schema.sql')

    console.log('=== 2. 表结构（向量列的类型是 vector，不是 text）===')
    const cols = await pool.query(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = 'document_chunks'
         ORDER BY ordinal_position`
    )
    for (const c of cols.rows) {
        console.log('  ' + c.column_name.padEnd(10), c.data_type, '（udt =', c.udt_name + '）')
    }

    console.log('=== 3. 建好的索引 ===')
    const idx = await pool.query(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'document_chunks' ORDER BY indexname`
    )
    for (const r of idx.rows) console.log('  ' + r.indexname, '→', r.indexdef)

    console.log('=== 4. IVFFlat 与 HNSW 是同一列的两种近似索引 ===')
    console.log('  生产上留一个即可：老项目从 IVFFlat 迁到 HNSW 时执行 DROP INDEX idx_chunks_ivfflat;')
    console.log('  IVFFlat 要 WITH (lists = 100) 先划候选列表，HNSW 不用调这个参数、召回更准')
    console.log('  HNSW 的代价是建索引更慢、占内存更多——用空间与构建时间换召回')

    console.log('=== 5. 维度写进列类型里 ===')
    const dim = await pool.query(
        `SELECT atttypmod AS dim FROM pg_attribute WHERE attrelid = 'document_chunks'::regclass AND attname = 'embedding'`
    )
    console.log('  VECTOR(1536) 的维度 =', dim.rows[0].dim, '——写错维度会直接插入失败（必须和 Embedding 模型输出一致）')
})()
    .catch(fail)
    .finally(() => pool.end())
