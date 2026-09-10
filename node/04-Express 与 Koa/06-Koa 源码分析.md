# Koa 源码分析

> Koa 的核心比 Express 更精简，只有两个关键机制：**洋葱模型中间件链** 和 **Context 封装**。
> 承上：[Koa 项目模板](./05-Koa%20项目模板) —— 先搭过真实 Koa 项目，再读源码理解洋葱模型与 Context 的底层实现
> 启下：[MySQL 基础](../05-数据库/01-MySQL%20基础) —— 用 SQL 建表、做增删改查与 INNER/LEFT JOIN，并说清主键与外键的作用

---

## 最小实现

```javascript
const http = require('http')

// ===== 最小 Koa 实现 =====

function createKoa() {
  const middlewares = []  // 中间件数组

  const app = {}

  // --- 注册中间件 ---
  app.use = (fn) => {
    middlewares.push(fn)
    return app  // 支持链式调用
  }

  // --- 洋葱模型核心：compose ---
  // 将中间件数组组合成一个嵌套的 Promise 链
  function compose(middlewareList) {
    return function (ctx) {
      let index = -1

      function dispatch(i) {
        // 防止同一个中间件中多次调用 next()
        if (i <= index) {
          return Promise.reject(new Error('next() 被多次调用'))
        }
        index = i

        const fn = middlewareList[i]
        if (!fn) {
          return Promise.resolve()  // 所有中间件执行完毕
        }

        try {
          // 关键：将 dispatch(i + 1) 作为 next 传入中间件
          // 返回 Promise，确保洋葱模型的异步执行顺序
          return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      }

      // 从第一个中间件开始执行
      return dispatch(0)
    }
  }

  // --- 创建 Context 对象 ---
  function createContext(req, res) {
    const ctx = {}

    // 原始 Node.js 对象
    ctx.req = req
    ctx.res = res

    // ---- 请求相关 ----
    ctx.method = req.method
    ctx.url = req.url
    ctx.path = req.url.split('?')[0]
    ctx.query = parseQuery(req.url)
    ctx.headers = req.headers

    // 封装 request.body（需要 koa-body 中间件支持）
    ctx.request = {
      get body() { return ctx._body },
      set body(val) { ctx._body = val },
      get headers() { return req.headers },
      get method() { return req.method },
      get url() { return req.url }
    }

    // ---- 响应相关 ----
    ctx.status = 200
    ctx.body = undefined

    ctx.set = (key, value) => {
      res.setHeader(key, value)
    }

    // 代理：设置 ctx.body 自动处理响应
    Object.defineProperty(ctx, 'body', {
      get() { return ctx._body },
      set(val) {
        ctx._body = val
        ctx._respond = true  // 标记需要发送响应
      }
    })

    ctx.params = {}

    return ctx
  }

  // --- 解析查询参数 ---
  function parseQuery(url) {
    const idx = url.indexOf('?')
    if (idx === -1) return {}
    const query = {}
    url.slice(idx + 1).split('&').forEach(pair => {
      const [key, value] = pair.split('=').map(decodeURIComponent)
      query[key] = value
    })
    return query
  }

  // --- 发送响应 ---
  function respond(ctx) {
    const { res, body, status } = ctx

    if (res.headersSent) return  // 已发送过响应

    res.statusCode = status

    // 根据 body 类型自动选择响应方式
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

    // 对象 → JSON
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  // --- 处理 HTTP 请求 ---
  app.handle = (req, res) => {
    const ctx = createContext(req, res)
    const fn = compose(middlewares)

    fn(ctx).then(() => {
      // 中间件链执行完毕，发送响应
      respond(ctx)
    }).catch((err) => {
      // 未捕获的错误 → 500
      console.error(err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ message: 'Internal Server Error' }))
    })
  }

  // --- 启动服务 ---
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

// 中间件 1：日志（演示洋葱模型）
app.use(async (ctx, next) => {
  console.log(`--> ${ctx.method} ${ctx.url}`)
  await next()
  console.log(`<-- ${ctx.status} ${ctx.url}`)
})

// 中间件 2：响应耗时
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.set('X-Response-Time', `${Date.now() - start}ms`)
})

// 中间件 3：路由模拟
app.use(async (ctx) => {
  if (ctx.url === '/users') {
    ctx.body = [{ id: 1, name: '张三' }, { id: 2, name: '李四' }]
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
10. 所有中间件执行完毕，send(ctx)
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

---

## 面试题

### Q1: Koa 的洋葱模型有什么实际应用场景？

洋葱模型最大的优势是可以在请求处理前后都执行逻辑。典型场景：请求耗时统计（进入时记录时间，返回时计算差值）、数据库事务（进入时开启事务，返回时提交/回滚）、响应格式统一包装。

### Q2: 为什么 Koa 使用 `async/await` 而 Express 使用回调？

Koa 的 `async/await` 让中间件链天然支持异步且保持顺序——`await next()` 等待后续中间件完成后再继续。Express 的回调 `next()` 无法直接等待，异步中间件的行为更难预测。这是 Koa 最核心的设计优势。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/koa-mini`。

| 文件 | 演示什么 |
| --- | --- |
| `index.js` | 180 行还原 Koa 洋葱模型（compose / dispatch / ctx） |

运行方式见 `koa-mini/README.md`。

---

## 参考

- 上一篇：[Koa 项目模板](./05-Koa%20项目模板)
- 下一篇：[MySQL 基础](../05-数据库/01-MySQL%20基础)