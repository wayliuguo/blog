# Express 源码分析

> Express 的核心只有三件事：**路由注册**、**中间件链**、**响应封装**。下面用不到 100 行代码实现它的最小版本。

---

## 最小实现

```javascript
const http = require('http')

// ===== 最小 Express 实现 =====

function createApp() {
  // 存储所有中间件和路由
  const middlewares = []   // 普通中间件 [{ path, handler }]
  const routes = []        // 路由中间件 [{ method, path, handler }]
  let errorHandler = null  // 错误处理中间件

  const app = {}

  // --- 注册中间件 ---
  app.use = (path, handler) => {
    if (handler === undefined) {
      handler = path      // 用法: app.use(fn)
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

      // 将 /users/:id 转为正则 /^\/users\/([^/]+)$/
      const paramNames = []
      const regexStr = route.path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name)
        return '([^/]+)'
      })
      const regex = new RegExp(`^${regexStr}$`)
      const match = url.match(regex)

      if (match) {
        const params = {}
        paramNames.forEach((name, i) => { params[name] = match[i + 1] })
        return { handler: route.handler, params }
      }
    }
    return null
  }

  // --- 中间件链执行（线性模型） ---
  function executeMiddlewareChain(req, res, middlewareList, done) {
    let index = 0

    function next(err) {
      if (err) {
        // 有错误，交给错误处理
        if (errorHandler) {
          return errorHandler(err, req, res, next)
        }
        // 没有错误处理，返回 500
        res.statusCode = 500
        res.end('Internal Server Error')
        return
      }

      if (index >= middlewareList.length) {
        return done ? done(req, res) : notFound(req, res)
      }

      const mw = middlewareList[index++]
      // 检查路径是否匹配（中间件默认匹配 / 或匹配前缀）
      if (mw.path !== '/' && !req.url.startsWith(mw.path)) {
        return next()  // 跳过不匹配的中间件
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

  // --- 处理 HTTP 请求 ---
  app.handle = (req, res) => {
    enhanceRes(res)

    // 1. 先执行所有普通中间件
    // 2. 最后执行路由匹配
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

  // --- 设置错误处理中间件 ---
  app.useError = (handler) => {
    errorHandler = handler
  }

  // --- 启动服务 ---
  app.listen = (port, cb) => {
    const server = http.createServer(app.handle)
    return server.listen(port, cb)
  }

  return app
}

// ===== 使用示例 =====

const app = createApp()

// 中间件
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

// 路由
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: '张三' }, { id: 2, name: '李四' }])
})

app.get('/users/:id', (req, res) => {
  res.json({ id: Number(req.params.id), name: '用户' + req.params.id })
})

app.post('/users', (req, res) => {
  res.status(201).json({ message: '创建成功' })
})

// 错误处理
app.useError((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: '服务器错误' })
})

app.listen(3000, () => {
  console.log('最小 Express 运行在 http://localhost:3000')
})
```

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

---

## 面试题

### Q1: Express 中间件的 `next('route')` 和 `next('router')` 有什么区别？

`next('route')` 跳过当前路由的剩余中间件，跳转到下一个匹配的路由。`next('router')` 跳出当前 Router 实例，跳转到外层中间件。

### Q2: 为什么 Express 的错误处理中间件必须有 4 个参数？

Express 通过 `fn.length` 判断函数参数个数。4 个参数的函数被识别为错误处理中间件，只在 `next(err)` 被调用时执行。

---

## 参考

- 上一篇：[Express 项目模板](./03-Express%20项目模板)
- 下一篇：[Koa 项目模板](./05-Koa%20项目模板)