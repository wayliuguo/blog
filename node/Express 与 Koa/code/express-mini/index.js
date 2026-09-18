/**
 * 最小 Express 实现
 *
 * 核心机制：
 * 1. app.use() 注册中间件 → 存入 middlewares 数组
 * 2. app.get()/post() 注册路由 → 存入 routes 数组
 * 3. 请求到达时，先执行中间件链（递归 next），再路由匹配
 * 4. next(err) 跳过剩余中间件，直接进入错误处理
 */

const http = require('http')

function createApp() {
    const middlewares = []
    const routes = []
    let errorHandler = null

    const app = {}

    // --- 注册中间件 ---
    app.use = (path, handler) => {
        if (handler === undefined) {
            handler = path
            path = '/'
        }
        middlewares.push({ path, handler })
    }

    // --- 注册路由 ---
    const methods = ['get', 'post', 'put', 'delete', 'patch']
    methods.forEach(method => {
        app[method] = (path, handler) => {
            routes.push({ method, path, handler })
        }
    })

    // --- 封装响应对象 ---
    function enhanceRes(res) {
        res.status = function (code) {
            res.statusCode = code
            return res
        }

        res.json = function (data) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
        }

        res.send = function (body) {
            if (typeof body === 'object') {
                res.json(body)
            } else {
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.end(String(body))
            }
        }
        return res
    }

    // --- 匹配路由 ---
    function matchRoute(method, url) {
        for (const route of routes) {
            if (route.method !== method.toLowerCase()) continue

            const paramNames = []
            const regexStr = route.path.replace(/:([^/]+)/g, (_, name) => {
                paramNames.push(name)
                return '([^/]+)'
            })
            const regex = new RegExp(`^${regexStr}$`)
            const match = url.match(regex)

            if (match) {
                const params = {}
                paramNames.forEach((name, i) => {
                    params[name] = match[i + 1]
                })
                return { handler: route.handler, params }
            }
        }
        return null
    }

    // --- 中间件链执行 ---
    function executeMiddlewareChain(req, res, middlewareList, done) {
        let index = 0

        function next(err) {
            if (err) {
                if (errorHandler) {
                    return errorHandler(err, req, res, next)
                }
                res.statusCode = 500
                res.end('Internal Server Error')
                return
            }

            if (index >= middlewareList.length) {
                return done ? done(req, res) : notFound(req, res)
            }

            const mw = middlewareList[index++]
            if (mw.path !== '/' && !req.url.startsWith(mw.path)) {
                return next()
            }

            try {
                mw.handler(req, res, next)
            } catch (err) {
                next(err)
            }
        }

        next()
    }

    function notFound(req, res) {
        res.statusCode = 404
        res.json({ message: 'Not Found' })
    }

    // --- 处理请求 ---
    app.handle = (req, res) => {
        enhanceRes(res)

        executeMiddlewareChain(req, res, middlewares, (req, res) => {
            const matched = matchRoute(req.method, req.url)
            if (matched) {
                req.params = matched.params
                try {
                    matched.handler(req, res)
                } catch (err) {
                    if (errorHandler) errorHandler(err, req, res, next)
                }
            } else {
                notFound(req, res)
            }
        })
    }

    // --- 设置错误处理 ---
    app.useError = handler => {
        errorHandler = handler
    }

    // --- 启动 ---
    app.listen = (port, cb) => {
        const server = http.createServer(app.handle)
        return server.listen(port, cb)
    }

    return app
}

// ===== 使用示例 =====
const app = createApp()

app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`)
    next()
})

app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        console.log(`耗时: ${Date.now() - start}ms`)
    })
    next()
})

app.get('/users', (req, res) => {
    res.json([
        { id: 1, name: '张三' },
        { id: 2, name: '李四' }
    ])
})

app.get('/users/:id', (req, res) => {
    res.json({ id: Number(req.params.id), name: '用户' + req.params.id })
})

app.post('/users', (req, res) => {
    res.status(201).json({ message: '创建成功' })
})

app.useError((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ message: '服务器错误' })
})

app.listen(3000, () => {
    console.log('最小 Express 运行在 http://localhost:3000')
})
