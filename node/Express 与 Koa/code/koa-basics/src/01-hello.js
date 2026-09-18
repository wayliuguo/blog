/**
 * Hello World：不用写 res.end，给 ctx.body 赋值就完成了响应
 */

const Koa = require('koa')
const app = new Koa()

app.use(async ctx => {
    ctx.body = 'Hello World'
})

app.listen(3000, () => {
    console.log('Koa server running at http://localhost:3000')
})

// ===== 自测：请求一次，打印真实的响应体与 Content-Type =====
const { selfTest } = require('../lab')

selfTest(3000, 'koa-basics · 01-hello', [['GET', '/']])
