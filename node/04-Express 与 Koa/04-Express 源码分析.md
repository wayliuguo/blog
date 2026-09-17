# Express 源码分析

> Express 的核心只有三件事：**路由注册**、**中间件链**、**响应封装**。下面用不到 100 行代码实现它的最小版本。
> 承上：[Express 项目模板](./03-Express%20项目模板) —— 先搭过真实 Express 项目，再读源码理解其底层运转原理
> 启下：[Koa 项目模板](./05-Koa%20项目模板) —— 照模板搭出含洋葱模型中间件（日志、耗时、错误处理）的 Koa 项目骨架

---

## 最小实现

> 摘自 `./code/express-mini/index.js`（运行：`npm start`）

```javascript
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
```

实测输出（`npm start` 起服务，另开一个终端用 `curl -i` 依次打三个接口）。先看服务端日志：

```
最小 Express 运行在 http://localhost:3000
[GET] /users
耗时: 4ms
[GET] /users/42
耗时: 1ms
[GET] /nope
耗时: 1ms
```

再看 `curl -i` 拿到的完整响应：

```
$ curl -i http://localhost:3000/users
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 51

[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]

$ curl -i http://localhost:3000/users/42
HTTP/1.1 200 OK
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 27

{"id":42,"name":"用户42"}

$ curl -i http://localhost:3000/nope
HTTP/1.1 404 Not Found
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 23

{"message":"Not Found"}
```

三条结果正好把三个分支都走了一遍：`/users` 命中列表路由返回 200；`/users/42` 命中动态路由 `'/users/:id'`，把 `:id` 匹配到的 `"42"` 经 `Number()` 转成数字 42（**不做转换的话这里会是字符串**）；`/nope` 一个路由都没命中，于是落到 `notFound()` 返回 404 JSON。

服务端那两行 `[GET] /users` 和 `耗时: 4ms` 来自脚本注册的两个中间件：前一个打印方法 + URL，后一个监听 `res.on('finish')` 统计耗时；它们对所有路由都生效，因为用的是不带路径的 `app.use`。

## 函数调用流程

```
请求到达
  │
  ▼
app.handle(req, res)
  │ 作用：http.createServer 回调，处理每个请求
  ▼
enhanceRes(res)
  │ 作用：为 res 添加 .json() / .send() / .status() 方法
  │ 逻辑：res.json = data => { setHeader('Content-Type','application/json'); end(JSON.stringify(data)) }
  ▼
executeMiddlewareChain(req, res, middlewares, callback)
  │ 作用：串联执行所有中间件，最后执行路由匹配
  │
  ├── 中间件链执行（线性递归）
  │     │
  │     ├── next()
  │     │   逻辑：从 middlewares 数组中取出当前中间件，index 递增
  │     │   调用：mw.handler(req, res, next) 把 next 传入
  │     │        中间件内调用 next() 继续链，不调用则请求挂起
  │     │
  │     ├── 中间件 1 → handler(req, res, next)
  │     │   │            └── next()  →  中间件 2 → handler(req, res, next)
  │     │   │                                          └── next()  →  ...  →  中间件 n
  │     │   │                                                                     └── next() 无更多中间件
  │     │   │
  │     │   └── 所有中间件执行完毕
  │     │
  │     └───────────────────────────────┘
  │                   │
  │                   ▼
  │         回调函数执行（路由匹配阶段）
  │                   │
  │                   ▼
  │          matchRoute(method, url)
  │           作用：遍历 routes 数组，匹配 method + url
  │           逻辑：将 /users/:id 转为正则 ^/users/([^/]+)$
  │                 执行 url.match(regex)，提取 params
  │                   │
  │         ┌─────────┴──────────┐
  │         ▼                    ▼
  │   匹配成功              匹配失败
  │         │                    │
  │         ▼                    ▼
  │  handler(req, res)    notFound(req, res)
  │  作用：执行路由处理函数   作用：返回 404 JSON
  │         │                    │
  │         ▼                    ▼
  │       响应                  404
  │
  ├── 错误处理分支
  │     └── next(err)
  │          作用：中间件内调用 next(err) 传递错误
  │          逻辑：err 有值 → 跳过剩余中间件
  │                → 直接调用 errorHandler(err, req, res, next)
  │                → 返回 500 响应
  │
  └── 核心数据结构
        middlewares = [{ path, handler }, ...]  ← app.use() 注册
        routes = [{ method, path, handler }, ...]  ← app.get()/post() 注册
```

## 核心机制解析

| 机制 | 实现方式 | 说明 |
|------|---------|------|
| 路由注册 | 存入 `routes` 数组 | 每个路由保存 `{ method, path, handler }` |
| URL 参数 | 路径转正则 | `:id` → `([^/]+)`，匹配结果存入 `req.params` |
| 中间件链 | 递归 `next()` | 每次调用 `next()` 取出下一个中间件执行 |
| 响应封装 | 增强 `res` 对象 | 添加 `res.json()`、`res.send()`、`res.status()` |
| 错误处理 | 4 参数函数 | 通过 `next(err)` 传递错误，跳过普通中间件 |

## 最小实现 vs Express 源码

| 功能 | 我们的实现 | Express 源码 |
|------|-----------|-------------|
| 中间件 | 线性数组 + 递归 next | 同左，但更精细（sub-app、路由级中间件） |
| Router | 简单数组 + 正则匹配 | `Router` 类，支持中间件栈、参数解码、多层嵌套 |
| req/res | 简单增强 | 完整的 `req.accepts()`、`res.cookie()`、`res.redirect()` 等 |
| 错误处理 | 简单 4 参数 | 支持异步错误、多层错误传播 |
| 性能 | 每次请求线性遍历 | 路由压缩（trie/radix tree）、Layer 缓存 |

## 小结

- **Express 的核心抽象**
  - **只有三件事**：路由注册、中间件链、响应封装；不到 100 行就能写出能跑的最小版本
  - **两个核心数据结构**：`middlewares = [{ path, handler }]` 由 `app.use` 填充，`routes = [{ method, path, handler }]` 由 `app.get` 等方法填充
- **注册 API 的重载设计**
  - **`app.use` 的可选路径**：靠 `handler === undefined` 区分 `app.use(fn)` 与 `app.use(path, fn)`，前者补上 `path = '/'`
- **路由匹配与参数提取**
  - **动态路由转正则**：`/users/:id` 把 `:id` 替换成 `([^/]+)` 拼成 `^/users/([^/]+)$`，`url.match(regex)` 后按顺序把捕获组写回 `req.params`
- **中间件链的执行模型（线性递归）**
  - **递归推进**：`executeMiddlewareChain` 内维护 `let index = 0`，每次 `next()` 取走 `middlewareList[index++]`；走到末尾就执行回调（路由匹配阶段）
  - **前缀匹配**：`mw.path !== '/' && !req.url.startsWith(mw.path)` 时直接 `next()` 跳过，这是最小实现里唯一的路径判断
  - **`next` 的双重语义**：`next` 既是"推进下一个中间件"，也是"错误传递通道"——`next(err)` 有值时跳过剩余中间件直接调 `errorHandler`，没注册处理器就回落 500
- **响应对象的封装**
  - **`enhanceRes` 给原生 `res` 挂三个方法**：`status(code)`（设状态码并 `return res` 支持链式）、`json(data)`（设 JSON 头 + `end`）、`send(body)`（对象走 json，其余走 text/html）
- **能力边界：最小实现 vs 真实源码**
  - **同步 `try/catch` 的边界**：普通中间件与路由 handler 都包在 `try/catch` 内并 `next(err)`，所以只能接住**同步**抛出的异常
  - **真实源码的差距**：有 `Router` 类（子路由、路由级中间件、参数解码）、Layer 缓存与路由压缩（trie / radix tree），不是每次请求线性遍历；"100 行跑通"不等于"100 行能上生产"

---

## 配套代码

本篇的代码块逐字摘自仓库 `node/04-Express 与 Koa/code/express-mini/index.js`（全文 194 行，零第三方依赖，纯 `node:http` 实现）。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/express-mini/index.js` | 最小实现 · 函数调用流程 · 核心机制解析 | 194 行还原 Express 核心：`middlewares` / `routes` 两个数组、`app.use` 的重载、`:param` 转正则、递归 `next(err)`、`enhanceRes` 响应封装 |

运行方式见 `express-mini/README.md`（`npm start` 起服务，默认监听 3000）；
建议对照本篇的讲解顺序读源码，先看 `app.use`，再看 `next` 递归。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Express 项目模板](./03-Express%20项目模板)
- 下一篇：[Koa 项目模板](./05-Koa%20项目模板)