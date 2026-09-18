// lib.js：所有脚本共用的连接工具
// 敏感信息走 .env；这里只做「连上 → 把 db 交给回调 → 无论如何都关掉连接」这一件事
require('dotenv').config()
const { MongoClient } = require('mongodb')

// 默认连本机 mongod 的 mongo_demo 库
const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'
const DB_NAME = process.env.MONGO_DB || 'mongo_demo'
// 选了 3 秒：本机没起 mongod 时立刻报错，不用等默认的 30 秒
const TIMEOUT = Number(process.env.MONGO_TIMEOUT_MS || 3000)

// 所有脚本都从这个入口进去：db 就是 client.db('mongo_demo')
async function withDb(fn) {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: TIMEOUT })
    try {
        await client.connect()
        return await fn(client.db(DB_NAME), client)
    } finally {
        await client.close()
    }
}

// 统一的失败出口：脚本报错时打印原因并以非 0 退出
function fail(err) {
    console.error('运行失败：', err.message)
    console.error('（请确认本机 mongod 已启动，或修改 .env 里的 MONGO_URI）')
    process.exit(1)
}

module.exports = { URI, DB_NAME, withDb, fail }
