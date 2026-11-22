/**
 * 最小 Koa 实现
 *
 * 核心机制：
 * 1. compose() 将中间件数组组合成嵌套的 Promise 链
 * 2. dispatch(i) 递归调用，每次传入 dispatch(i+1) 作为 next
 * 3. await next() 等待后续中间件完成，形成洋葱模型
 * 4. ctx.body 赋值后由 respond() 自动决定 Content-Type 和序列化
 */

const http = require('http')

function createKoa() {
    const middlewares = []

    const app = {}

    // --- 注册中间件 ---
    app.use = fn => {
        middlewares.push(fn)
        return app
    }

    // --- compose：洋葱模型核心 ---
    function compose(middlewareList) {
        return function (ctx) {
            let index = -1

            function dispatch(i) {
                if (i <= index) {
                    return Promise.reject(new Error('next() 被多次调用'))
                }
                index = i

                const fn = middlewareList[i]
                if (!fn) {
                    return Promise.resolve()
                }

                try {
                    return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
                } catch (err) {
                    return Promise.reject(err)
                }
            }

            return dispatch(0)
        }
    }

    // --- 创建 Context ---
    function createContext(req, res) {
        const ctx = {}
        ctx.req = req
        ctx.res = res
        ctx.method = req.method
        ctx.url = req.url
        ctx.path = req.url.split('?')[0]
        ctx.query = parseQuery(req.url)
        ctx.headers = req.headers
        ctx.status = 200
        ctx.body = undefined

        ctx.set = (key, value) => {
            res.setHeader(key, value)
        }

        Object.defineProperty(ctx, 'body', {
            get() {
                return ctx._body
            },
            set(val) {
                ctx._body = val
                ctx._respond = true
            }
        })

        ctx.params = {}
        return ctx
    }

    function parseQuery(url) {
        const idx = url.indexOf('?')
        if (idx === -1) return {}
        const query = {}
        url.slice(idx + 1)
            .split('&')
            .forEach(pair => {
                const [key, value] = pair.split('=').map(decodeURIComponent)
                query[key] = value
            })
        return query
    }

    // --- 发送响应 ---
    function respond(ctx) {
        const { res, body, status } = ctx
        if (res.headersSent) return

        res.statusCode = status

        if (body === null || body === undefined) {
            res.statusCode = 204
            res.end()
            return
        }

        if (typeof body === 'string') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(body)
            return
        }

        if (Buffer.isBuffer(body)) {
            res.end(body)
            return
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
    }

    // --- 处理请求 ---
    app.handle = (req, res) => {
        const ctx = createContext(req, res)
        const fn = compose(middlewares)

        fn(ctx)
            .then(() => {
                respond(ctx)
            })
            .catch(err => {
                console.error(err)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ message: 'Internal Server Error' }))
            })
    }

    // --- 启动 ---
    app.listen = (port, cb) => {
        const server = http.createServer((req, res) => {
            app.handle(req, res)
        })
        return server.listen(port, cb)
    }

    return app
}

// ===== 使用示例 =====
const app = createKoa()

app.use(async (ctx, next) => {
    console.log(`--> ${ctx.method} ${ctx.url}`)
    await next()
    console.log(`<-- ${ctx.status} ${ctx.url}`)
})

app.use(async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.set('X-Response-Time', `${Date.now() - start}ms`)
})

app.use(async ctx => {
    if (ctx.url === '/users') {
        ctx.body = [
            { id: 1, name: '张三' },
            { id: 2, name: '李四' }
        ]
    } else if (ctx.url === '/health') {
        ctx.body = { status: 'ok' }
    } else {
        ctx.status = 404
        ctx.body = { message: 'Not Found' }
    }
})

app.listen(3000, () => {
    console.log('最小 Koa 运行在 http://localhost:3000')
})
