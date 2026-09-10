# Express 快速入门

> Express 是 Node.js 最流行的 Web 框架，也是 NestJS 的底层依赖。
> 承上：[WebSocket 与 SSE 实时通信](../03-网络编程与实时通信/03-WebSocket%20与%20SSE%20实时通信) —— 先理解服务端如何承接 HTTP 请求与实时通信，再学框架如何把原生 `http` 写法标准化
> 启下：[Koa 快速入门](./02-Koa%20快速入门) —— 用 Koa 写出带洋葱模型中间件的服务，并说清 `await next()` 与 Express 线性中间件的执行顺序差异

---

## 先接上模块二：Express 站在哪一层

模块二里我们用 `node:http` 手写过最小服务器：

```javascript
const http = require('node:http')

const server = http.createServer((req, res) => {
  if (req.url === '/user') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ id: 1, name: 'well' }))
  } else {
    res.statusCode = 404
    res.end('Not Found')
  }
})

server.listen(3000)
```

这段代码完全能跑。但写到第三个接口你就会开始烦躁：路由靠 `if/else` 堆、取请求体要自己 `Buffer.concat`、加日志要插在每一处、出错要记得 `try/catch`。

Express 做的事，就是把上面这些重复劳动收敛成约定：

| 你在 `node:http` 里要手写的 | Express 的写法 | 对应模块二的哪一节 |
|---|---|---|
| `if (req.url === ...)` 手写路由分发 | `app.get('/user', handler)` | HTTP 与 HTTPS 深入 |
| `chunks.push(chunk)` + `Buffer.concat` 读请求体 | `express.json()` 中间件 | HTTP 与 HTTPS 深入（`req` 是可读流） |
| 每处手写日志 / 鉴权 / 跨域 | `app.use(fn)` 中间件链 | —— |
| 手动 `res.setHeader` + `res.end` | `res.json()` / `res.status()` | HTTP 与 HTTPS 深入（`res` 是可写流） |
| 手动 404 分支 | 兜底中间件 | —— |

> 心智模型：**Express 不提供新能力，它把原生 `http` 的常用写法标准化了。** 后面 `Express 源码分析` 会带你把这一层亲手实现一遍 —— 那时你会发现，Express 的核心其实就是一个"中间件数组 + 一次遍历调用"。

---

## Express 是什么

Express 是一个轻量级的 Web 框架，核心功能：

- 路由（Routing）：根据 URL 和方法分发请求
- 中间件（Middleware）：请求处理流水线
- 静态文件服务
- 模板引擎集成

### Hello World

```javascript
const express = require('express')
const app = express()

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000')
})
```

5 行代码启动一个 HTTP 服务器。

## 路由（Routing）

```javascript
// GET 请求
app.get('/users', (req, res) => {
    res.json({ users: [] })
})

// POST 请求
app.post('/users', (req, res) => {
    res.status(201).json({ id: 1 })
})

// PUT 请求
app.put('/users/:id', (req, res) => {
    res.json({ updated: true })
})

// DELETE 请求
app.delete('/users/:id', (req, res) => {
    res.json({ deleted: true })
})
```

### 路由参数

```javascript
// URL: /users/123
app.get('/users/:id', (req, res) => {
    console.log(req.params.id) // "123"
    console.log(req.query.page) // 查询参数 ?page=1
    res.json({ id: req.params.id })
})
```

## 中间件（Middleware）

中间件是 Express 的核心概念。每个请求会依次经过中间件函数，中间件可以修改请求/响应对象或终止请求。

```javascript
// 应用级中间件：每个请求都会执行
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next()  // 调用 next 传递给下一个中间件
})

// 路由级中间件：只对特定路由生效
app.use('/api', (req, res, next) => {
    console.log('API 请求')
    next()
})
```

### 常用内置中间件

```javascript
const express = require('express')
const app = express()

// 解析 JSON 请求体
app.use(express.json())

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }))

// 提供静态文件服务
app.use(express.static('public'))
```

### 第三方中间件

```javascript
const cors = require('cors')
app.use(cors())  // 允许跨域请求
```

## 错误处理中间件

错误处理中间件有 **4 个参数**，Express 通过参数数量识别它是错误处理中间件：

```javascript
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})
```

## Express 与 NestJS 的对比

| 维度 | Express | NestJS |
|------|---------|--------|
| 架构 | 无约束，自由发挥 | MVC，有规范 |
| TypeScript | 可选 | 强制 |
| 依赖注入 | 无 | 内置 |
| 模块化 | 无 | @Module |
| 适合场景 | 小型项目、学习 | 中大型项目、企业级 |

---

## 面试题

### Q1: Express 中间件中 `next()` 不调用会发生什么？

请求会一直挂起，不会返回响应。客户端会一直等待直到超时。

### Q2: 错误处理中间件为什么有 4 个参数？

Express 通过 `fn.length`（函数参数个数）来判断是否是错误处理中间件。4 个参数 `(err, req, res, next)` 告诉 Express 这是一个错误处理器。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/express-template`。

| 文件 | 演示什么 |
| --- | --- |
| `express-template` | 可直接跑的 Express 项目模板 |
| `app.js` | 中间件与路由的装配方式 |

完整目录与运行方式见 `express-template/README.md`。

---

## 参考

- 上一篇：[WebSocket 与 SSE 实时通信](../03-网络编程与实时通信/03-WebSocket%20与%20SSE%20实时通信)
- 下一篇：[Koa 快速入门](./02-Koa%20快速入门)