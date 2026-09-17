/**
 * 洋葱模型：进入按注册顺序，返回按逆序
 * 顺序能成立的前提是 await next()——写成 next() 不带 await，返回段会提前执行。
 */

const Koa = require('koa')
const app = new Koa()

app.use(async (ctx, next) => {
    console.log('中间件 1 - 进入')
    await next()
    console.log('中间件 1 - 返回')
})

app.use(async (ctx, next) => {
    console.log('中间件 2 - 进入')
    await next()
    console.log('中间件 2 - 返回')
})

app.use(async ctx => {
    console.log('处理请求')
    ctx.body = 'Hello'
})

app.listen(3000, () => {
    console.log('koa-basics · 03-onion 运行在 http://localhost:3000')
})

// ===== 自测：请求一次，看服务端日志里的进出顺序 =====
const { selfTest } = require('../lab')

selfTest(3000, 'koa-basics · 03-onion', [['GET', '/']])
