/**
 * 外置中间件三件套：@koa/router 管路由、koa-body 管请求体、koa-static 管静态文件
 * Koa 内核不带这些，都得自己装、自己挂。静态目录是项目根下的 public/。
 */

const Koa = require('koa')
const Router = require('@koa/router')
const { koaBody } = require('koa-body')
const static = require('koa-static')

const app = new Koa()
const router = new Router()

app.use(koaBody())
app.use(static('public'))

router.get('/users', ctx => {
    ctx.body = { users: [] }
})

// 有 koa-body 在，ctx.request.body 才是解析好的对象
router.post('/users', ctx => {
    ctx.status = 201
    ctx.body = { created: ctx.request.body }
})

app.use(router.routes())
app.listen(3000, () => {
    console.log('koa-basics · 04-stack 运行在 http://localhost:3000')
})

// ===== 自测：路由、请求体、静态文件各打一枪 =====
const { selfTest } = require('../lab')

selfTest(3000, 'koa-basics · 04-stack', [
    ['GET', '/users'],
    [
        'POST',
        '/users',
        {
            body: JSON.stringify({ name: 'well' }),
            headers: { 'Content-Type': 'application/json' }
        }
    ],
    ['GET', '/hello.txt']
])
