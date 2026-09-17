// lib.js：pg 连接池 + .sql 文件执行器 + 造向量的两个小工具
// 连接信息走 .env（pg 也会自动读 PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE）
require('dotenv').config()
const fs = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')

const pool = new Pool({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'pg_demo',
    max: 10, // 池里最多 10 条连接
    idleTimeoutMillis: 30000, // 空闲 30 秒回收
    connectionTimeoutMillis: 3000 // 连不上就 3 秒放弃，不干等
})

// 整段执行一个 .sql 文件，等价于 psql -f；不带参数时 pg 走简单查询协议，可以一次塞多条语句
async function runSqlFile(relative) {
    const file = path.join(__dirname, '..', relative)
    const sql = fs.readFileSync(file, 'utf8')
    const lines = sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--')).length
    console.log('  执行', relative, '（' + lines + ' 行有效 SQL）')
    return pool.query(sql)
}

// 1536 维向量太长，用确定性公式造一个假向量：只为演示写入与检索，真实场景里来自 Embedding 模型
function fakeEmbedding(seed, dim = 1536) {
    return Array.from({ length: dim }, (_, i) => Number(Math.sin(seed + i / 37).toFixed(6)))
}

// pgvector 的参数要拼成 '[1,2,...]' 字符串字面量，再 ::vector 转型
function toVectorLiteral(vector) {
    return '[' + vector.join(',') + ']'
}

function fail(err) {
    console.error('运行失败：', err.message)
    console.error('（请确认 PG 已启动、库已建、pgvector 扩展能安装，或修改 .env 里的 PGHOST / PGPORT）')
    process.exit(1)
}

module.exports = { pool, runSqlFile, fakeEmbedding, toVectorLiteral, fail }
