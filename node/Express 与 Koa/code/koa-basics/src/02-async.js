/**
 * 原生 async/await：中间件本身就是 async 函数，await 完直接赋给 ctx.body
 * 这里用一个内存假数据库顶替真实连接，脚本才能独立跑起来。
 */

const Koa = require('koa')
const app = new Koa()

// 假数据库：query() 返回 Promise，模拟一次异步查询
const database = {
    async query(sql) {
        console.log(`  查到 SQL：${sql}`)
        return [
            { id: 1, name: '张三' },
            { id: 2, name: '李四' }
        ]
    }
}

app.use(async ctx => {
    const data = await database.query('SELECT * FROM users')
    ctx.body = data
})

app.listen(3000, () => {
    console.log('koa-basics · 02-async 运行在 http://localhost:3000')
})

// ===== 自测：请求一次，看 await 的结果被自动序列化成 JSON =====
const { selfTest } = require('../lab')

selfTest(3000, 'koa-basics · 02-async', [['GET', '/users']])
