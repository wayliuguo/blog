# Koa 源码分析

> Koa 的核心比 Express 更精简，只有两个关键机制：**洋葱模型中间件链** 和 **Context 封装**。

---

## 最小实现

> 摘自 `./code/koa-mini/index.js`（运行：`npm start`）

```javascript
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
```

实测输出（`npm start` 起服务，另开一个终端用 `curl -i` 依次打三个接口）。先看服务端日志：

```
最小 Koa 运行在 http://localhost:3000
--> GET /users
<-- 200 /users
--> GET /health
<-- 200 /health
--> GET /unknown
<-- 404 /unknown
```

再看 `curl -i` 拿到的完整响应：

```
$ curl -i http://localhost:3000/users
HTTP/1.1 200 OK
X-Response-Time: 0ms
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 51

[{"id":1,"name":"张三"},{"id":2,"name":"李四"}]

$ curl -i http://localhost:3000/health
HTTP/1.1 200 OK
X-Response-Time: 0ms
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 15

{"status":"ok"}

$ curl -i http://localhost:3000/unknown
HTTP/1.1 404 Not Found
X-Response-Time: 0ms
Content-Type: application/json
Date: Thu, 17 Sep 2026 05:47:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 23

{"message":"Not Found"}
```

服务端日志里 `--> GET /users` 与 `<-- 200 /users` 这一对就是洋葱模型最直接的证据：第一个中间件在 `await next()` 之前打 `-->`、之后打 `<--`，两条都落进日志说明"回程"真的执行了。

`X-Response-Time: 0ms` 这个响应头是第二个中间件在 `await next()` 之后用 `ctx.set()` 加上的——它同样在回程里跑。三个请求的状态码分别是 200 / 200 / 404：`/users` 命中列表分支，`/health` 命中健康检查分支，`/unknown` 两个分支都不中，于是 `ctx.status = 404` 配 `ctx.body = { message: 'Not Found' }`，由 `respond()` 统一发出去。

## 函数调用流程

```
请求到达
  │
  ▼
app.handle(req, res)
  │ 作用：http.createServer 回调
  ▼
createContext(req, res)
  │ 作用：创建 ctx 对象，代理 req/res
  │ 逻辑：ctx.body 赋值时自动标记需要发送响应
  │       ctx.set() 设置响应头
  │       ctx.status 控制状态码
  ▼
fn = compose(middlewares)
  │ 作用：将中间件数组组合成嵌套的 Promise 链
  │ 返回：function(ctx) 启动中间件链
  ▼
fn(ctx).then(respond).catch(500)
  │ 逻辑：所有中间件 resolve → respond(ctx) 发送响应
  │       任何中间件 reject → .catch() → 500
  ▼
dispatch(0)  ← 启动递归
  │
  ├── dispatch(i) 核心逻辑
  │   ├── let index = -1         防止同一个中间件内多次调用 next()
  │   ├── if (i <= index) throw  多次调用检测
  │   ├── index = i              记录当前执行的 dispatch 编号
  │   ├── const fn = middlewareList[i]  取出第 i 个中间件
  │   ├── if (!fn) return Promise.resolve()  没有更多中间件，终止递归
  │   └── return Promise.resolve( fn(ctx, () => dispatch(i + 1)) )
  │                               ↑ 核心：将下一个 dispatch 作为 next 传入
  │
  ├── dispatch(0) → 中间件 A
  │   │ fn = middlewares[0]
  │   │ return Promise.resolve( A(ctx, () => dispatch(1)) )
  │   │
  │   ├── A 执行前半段（进入洋葱）
  │   │   └── await next()  →  调用 dispatch(1)  →  等待 Promise 完成
  │   │                                              │
  │   │                                              ▼
  │   │                                       dispatch(1) → 中间件 B
  │   │                                         │ fn = middlewares[1]
  │   │                                         │ return Promise.resolve( B(ctx, () => dispatch(2)) )
  │   │                                         │
  │   │                                         ├── B 执行前半段
  │   │                                         │   └── await next()  →  调用 dispatch(2)
  │   │                                         │                         │
  │   │                                         │                         ▼
  │   │                                         │                  dispatch(2) → 中间件 C
  │   │                                         │                    │ fn = middlewares[2]
  │   │                                         │                    │ return Promise.resolve( C(ctx, () => dispatch(3)) )
  │   │                                         │                    │
  │   │                                         │                    ├── C 执行
  │   │                                         │                    │   └── ctx.body = ...  (无 next()，直接返回)
  │   │                                         │                    │
  │   │                                         │                    └── dispatch(3) → Promise.resolve()  ← 递归终止
  │   │                                         │                                         │
  │   │                                         │                                         ▼
  │   │                                         │                               C 的 Promise resolve
  │   │                                         │                                         │
  │   │                                         └── B 继续执行 next() 后的代码 ←─────────┘
  │   │                                                      │
  │   │                                                      ▼
  │   │                                              B 的 Promise resolve
  │   │                                                      │
  │   └── A 继续执行 next() 后的代码 ←────────────────────────┘
  │                │
  │                ▼
  │        A 的 Promise resolve
  │                │
  └────────────────┘
                   │
                   ▼
             respond(ctx)
              作用：根据 ctx.body 类型自动选择响应方式
              逻辑：string → text/html
                    object → application/json
                    null   → 204
                    Buffer → 直接写入
                   │
                   ▼
                 响应
```

## 核心机制解析

| 机制 | 实现方式 | 说明 |
|------|---------|------|
| 洋葱模型 | `compose` 函数 | 递归 `dispatch(i)`，每次 `await next()` 调用 `dispatch(i+1)` |
| 异步中间件 | Promise 链 | 每个中间件返回 Promise，确保 `await next()` 等待后续中间件完成 |
| Context 封装 | `createContext` | 将 `req/res` 封装为 `ctx`，提供 `ctx.body`、`ctx.status` 等便捷属性 |
| 自动响应 | `respond` 函数 | 根据 `ctx.body` 类型自动判断 Content-Type 和序列化方式 |
| 错误传播 | Promise `.catch` | 任何中间件抛出错误，都会被 `fn(ctx).catch()` 捕获 |

## compose 执行流程详解

```
中间件: [A, B, C]

执行顺序:
1. dispatch(0) → A(ctx, () => dispatch(1))
2.                └─ A 内部 await next()
3.                   └─ dispatch(1) → B(ctx, () => dispatch(2))
4.                                  └─ B 内部 await next()
5.                                     └─ dispatch(2) → C(ctx, () => dispatch(3))
6.                                                    └─ dispatch(3) → Promise.resolve()
7.                                     C 执行完毕，返回
8.                                  B 继续执行 next() 后面的代码
9.                   A 继续执行 next() 后面的代码
10. 所有中间件执行完毕，respond(ctx)
```

## 最小实现 vs Koa 源码

| 功能 | 我们的实现 | Koa 源码 |
|------|-----------|---------|
| 中间件组合 | 手写 `compose` | `koa-compose` 包，支持更多边界检查 |
| Context | 简单封装 `req/res` | 完整的 `ctx` 委托（request/response 对象），大量属性代理 |
| 错误处理 | Promise `.catch` + 500 | `ctx.onerror`、`app.on('error')` 事件 |
| 流式响应 | 不支持 | 支持 stream 作为 `ctx.body` |
| 文件上传 | 不支持 | 通过 `koa-body` 中间件 |
| 路由 | 手动 if/else | 需 `@koa/router`，支持 RESTful 参数 |

## 小结

- **Koa 的核心抽象**
  - 只有两件事：洋葱模型中间件链（`compose`）与 Context 封装（`createContext`），比 Express 更精简
  - `app.use` 链式：`middlewares.push(fn)` 后 `return app`，可连续 `app.use(...).use(...)`
- **洋葱模型：compose 与 dispatch**
  - `compose` 返回 `function(ctx)`，从 `dispatch(0)` 启动；`middlewareList[i]` 为空时 `Promise.resolve()` 是递归终点
  - `dispatch` 把下个自己当 `next`：`Promise.resolve(fn(ctx, () => dispatch(i+1)))`——`await next()` 能等下游完成全靠这句
  - `index` 防重入：同一中间件写两个 `await next()` 会因 `i <= index` 直接 reject，而非重跑下游
  - `await next()` 决定回程：A、B 的返回段只能在内层 C 结束后才开始
- **Context 封装（`createContext`）**：挂 method/url/path(`?`前)/query/headers/status/body 与 `ctx.set()`；`ctx.body` setter 赋值时标记 `_respond`
- **响应自动生成（`respond`）**：string→text/html；对象→application/json+JSON.stringify；Buffer→原样 end；null/undefined→状态码改 **204** 且不发 body
- **错误传播**：统一靠 `fn(ctx).then(respond).catch(...)`，任意中间件 reject 都落同一 catch 返回 500
- **能力边界 vs Koa 源码**：真源码用 `koa-compose`、ctx 双层属性委托、`ctx.onerror` 与 `app.on('error')`、支持 stream 作 `ctx.body` 与文件上传，路由交 `@koa/router`

---

## 配套代码

本篇的代码块逐字摘自仓库 `node/Express 与 Koa/code/koa-mini/index.js`（全文 183 行，零第三方依赖，纯 `node:http` 实现）。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/koa-mini/index.js` | 最小实现 · 函数调用流程 · 核心机制解析 · compose 执行流程详解 | 183 行还原 Koa 核心：`compose` 把中间件数组变成嵌套 Promise 链、`dispatch(i)` 递归并把 `dispatch(i+1)` 当作 `next`、`index` 防重入、`ctx.body` 的 setter 标记 `_respond`、`respond` 按 body 类型自动出响应 |

运行方式见 `koa-mini/README.md`（`npm start` 起服务，默认监听 3000）；
建议先读 `compose` 与 `dispatch`，再读 `createContext` 与 `respond`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Koa 项目模板](./05-Koa%20项目模板)
- 下一篇：[MySQL 基础](../数据库/01-MySQL%20基础)