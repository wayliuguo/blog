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

## 小结

- **Express 的定位与心智模型**
  - **不提供 `node:http` 之外的新能力**：只把路由分发、请求体读取、响应封装收敛成约定，手写 `if (req.url === ...)` 变成 `app.get('/user', handler)`
  - **Hello World 的五个动作**：`require('express')` → `express()` 建应用 → `app.get('/')` 注册路由 → `res.send()` 输出 → `app.listen(3000)`，5 行起服务
- **路由匹配规则**
  - **两个维度**：`app.get/post/put/delete(path, handler)` 按 HTTP 方法与路径分发，`:id` 是路径里的占位符
  - **`app.use` 与 `app.get` 的匹配差异**：`use` 匹配所有方法且路径是前缀匹配（`/user` 命中 `/user/123`），`get` 只匹配 GET 且路径精确匹配
- **请求数据的三个来源**
  1. **`req.params`**：路径占位符的值，恒为字符串——`/users/123` 命中 `/users/:id` 后 `req.params.id === '123'`，当数字用必须先 `Number()` 转换
  2. **`req.query`**：查询串自动解析，`?page=1` 进 `req.query.page`
  3. **`req.body`**：必须挂了 `express.json()` / `urlencoded()` 才存在，`multipart/form-data` 要另上 multer
- **中间件的执行模型**
  - **签名与推进**：`app.use(fn)` 注册的中间件每个请求都会执行，签名 `(req, res, next)`，只有调用 `next()` 才推进到下一环，否则请求挂起
  - **错误处理中间件必须 4 参数**：靠 `fn.length === 4` 识别，链上任意位置 `next(err)` 会跳过后面全部普通中间件，直奔错误处理器
- **中间件生态**
  - **内置**：`express.json()` 解析 JSON 请求体、`urlencoded({ extended: true })` 解析 URL 编码请求体、`static('public')` 提供静态文件服务
  - **第三方**：`cors()` 等跨域、鉴权、限流都要第三方包
- **框架选型（Express 与 NestJS）**：Express 无架构约束、TS 可选、无依赖注入，适合小型项目与学习；NestJS 强制 MVC / TypeScript / DI / `@Module`，适合中大型长期项目

---

## 配套代码

本篇的可运行示例在仓库 `node/04-Express 与 Koa/code/express-template`。

| 文件 | 演示什么 |
| --- | --- |
| `express-template` | 可直接跑的 Express 项目模板 |
| `app.js` | 中间件与路由的装配方式 |

完整目录与运行方式见 `express-template/README.md`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[WebSocket 与 SSE 实时通信](../03-网络编程与实时通信/03-WebSocket%20与%20SSE%20实时通信)
- 下一篇：[Koa 快速入门](./02-Koa%20快速入门)