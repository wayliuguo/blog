# Express 快速入门

> Express 是 Node.js 最流行的 Web 框架，也是 NestJS 的底层依赖。

---

## [初级] Express 是什么

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

## [初级] 路由（Routing）

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

## [初级] 中间件（Middleware）

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

## [中级] 错误处理中间件

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

## [中级] Express 与 NestJS 的对比

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

## 参考

- 上一篇：[事件循环与错误处理](../02-Node.js%20基础/03-事件循环与错误处理)
- 下一篇：[Koa 快速入门](./02-Koa%20快速入门)