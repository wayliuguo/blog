# Express 快速入门

> Express 是 Node.js 最流行的 Web 框架，也是 NestJS 的底层依赖。

---

## 先接上模块二：Express 站在哪一层

模块二里我们用 `node:http` 手写过最小服务器（下面这段逐字摘自配套脚本 `code/express-basics`，本篇代码块均为 CommonJS 写法）：

> 摘自 `./code/express-basics/src/00-http-baseline.js`（运行：`npm run http`）

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

server.listen(3000, () => {
    console.log('node:http 版本运行在 http://localhost:3000')
})
```

实测输出（`npm run http`）：

```
node:http 版本运行在 http://localhost:3000

=== express-basics · 00-http-baseline（纯 node:http） ===
  GET  /user
       状态码 200
       content-type: application/json
       body: {"id":1,"name":"well"}
  GET  /nope
       状态码 404
       body: Not Found
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

> 摘自 `./code/express-basics/src/01-hello.js`（运行：`npm run hello`）

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

实测输出（`npm run hello`）：

```
Server running at http://localhost:3000

=== express-basics · 01-hello ===
  GET  /
       状态码 200
       content-type: text/html; charset=utf-8
       body: Hello World
```

5 行代码启动一个 HTTP 服务器。`res.send()` 收到字符串时会自动补上 `Content-Type: text/html; charset=utf-8`。

## 路由（Routing）

> 摘自 `./code/express-basics/src/02-routing.js`（运行：`npm run routing`）

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

实测输出（`npm run routing`）：

```
express-basics · 02-routing 运行在 http://localhost:3000

=== express-basics · 02-routing ===
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"users":[]}
  POST /users
       状态码 201
       content-type: application/json; charset=utf-8
       body: {"id":1}
  PUT  /users/7
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"updated":true}
  DELETE /users/7
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"deleted":true}
```

同一个路径 `/users` 上挂 `GET` 与 `POST` 互不干扰——先按方法过滤，再比路径。`res.status(201).json(...)` 链式调用把状态码设成 201。

### 路由参数

> 摘自 `./code/express-basics/src/03-params.js`（运行：`npm run params`）

```javascript
// URL: /users/123
app.get('/users/:id', (req, res) => {
    console.log(req.params.id) // "123"
    console.log(req.query.page) // 查询参数 ?page=1
    res.json({ id: req.params.id })
})
```

实测输出（`npm run params`，脚本里两行 `console.log` 打在服务端，后五行是请求结果）：

```
express-basics · 03-params 运行在 http://localhost:3000

=== express-basics · 03-params ===
123
1
  GET  /users/123?page=1
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"id":"123"}
```

注意响应体是 `{"id":"123"}` 而不是 `{"id":123}`：`req.params` 里的值**恒为字符串**，`:id` 匹配到的是 `"123"` 而不是数字 123，要当数字用必须先 `Number()` 转换。

## 中间件（Middleware）

中间件是 Express 的核心概念。每个请求会依次经过中间件函数，中间件可以修改请求/响应对象或终止请求。

> 摘自 `./code/express-basics/src/04-middleware.js`（运行：`npm run middleware`）

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

实测输出（`npm run middleware`，脚本里两个 `console.log` 打在服务端，交替出现的请求结果在后面）：

```
express-basics · 04-middleware 运行在 http://localhost:3000

=== express-basics · 04-middleware ===
GET /api/users
API 请求
  GET  /api/users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"scope":"/api"}
GET /users
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"scope":"root"}
```

访问 `/users` 那次**只打了一条** `GET /users`：带路径的 `app.use('/api', fn)` 只在 URL 以 `/api` 开头时才执行，这就是路由级中间件与应用级中间件的区别。

### 常用内置中间件

> 摘自 `./code/express-basics/src/05-builtin.js`（运行：`npm run builtin`）

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

实测输出（`npm run builtin`，脚本往 `/echo` POST 了 JSON 与表单两种请求体，再取了一次 `public/hello.txt`）：

```
express-basics · 05-builtin 运行在 http://localhost:3000

=== express-basics · 05-builtin ===
  POST /echo
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"body":{"name":"well"}}
  POST /echo
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"body":{"name":"well","age":"18"}}
  GET  /hello.txt
       状态码 200
       content-type: text/plain; charset=utf-8
       body: 这是 express.static('public') 提供的静态文件。\n
```

`req.body` 不是天生就有的：挂了 `express.json()` 才解析 `application/json`，挂了 `express.urlencoded()` 才解析表单。注意表单那条里 `age` 是字符串 `"18"`——URL 编码没有类型信息，只能还原出字符串；而 `express.json()` 会保留 JSON 里原本的类型。

### 第三方中间件

> 摘自 `./code/express-basics/src/06-cors.js`（运行：`npm run cors`）

```javascript
const cors = require('cors')
// …
app.use(cors())  // 允许跨域请求
```

实测输出（`npm run cors`，脚本带上 `Origin` 头请求了一次）：

```
express-basics · 06-cors 运行在 http://localhost:3000

=== express-basics · 06-cors ===
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       access-control-allow-origin: *
       body: {"users":[]}
```

多出来的 `access-control-allow-origin: *` 就是 `cors()` 加的——没有它，浏览器里的跨域 `fetch` 会被同源策略拦下。

## 错误处理中间件

错误处理中间件有 **4 个参数**，Express 通过参数数量识别它是错误处理中间件：

> 摘自 `./code/express-basics/src/07-error.js`（运行：`npm run error`）

```javascript
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})
```

实测输出（`npm run error`，脚本先打正常路由 `/ok`，再打一个 `next(new Error(...))` 的 `/boom`）：

```
express-basics · 07-error 运行在 http://localhost:3000

=== express-basics · 07-error ===
  GET  /ok
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"ok":true}
  GET  /boom
       状态码 500
       content-type: application/json; charset=utf-8
       body: {"message":"服务器内部错误"}
```

`err.stack` 那一行走 stderr 打出了栈帧（下面路径是本机的，读者机器上会不同）：

```
Error: 故意炸一个
    at E:\working\blog\node\Express 与 Koa\code\express-basics\src\07-error.js:16:10
    at Layer.handleRequest (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\lib\layer.js:152:17)
    at next (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\lib\route.js:117:3)
    at handle (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\index.js:435:11)
    at Layer.handleRequest (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\lib\layer.js:152:17)
    at E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\index.js:295:15
    at processParams (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\index.js:582:12)
    at next (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\index.js:291:5)
    at Function.handle (E:\working\blog\node\Express 与 Koa\code\express-basics\node_modules\router\index.js:186:3)
```

响应体里只有 `message`、没有 `error` 字段：本机没设 `NODE_ENV=development`，三元的另一支是 `undefined`，而 `JSON.stringify` 会把值为 `undefined` 的键直接丢掉——这正好是"开发环境才回显错误详情"的开关。

## Express 与 NestJS 的对比

| 维度 | Express | NestJS |
|------|---------|--------|
| 架构 | 无约束，自由发挥 | MVC，有规范 |
| TypeScript | 可选 | 强制 |
| 依赖注入 | 无 | 内置 |
| 模块化 | 无 | @Module |
| 适合场景 | 小型项目、学习 | 中大型项目、企业级 |

## 配套代码

本篇每个代码块都逐字摘自仓库 `node/Express 与 Koa/code/express-basics`（真实 `express`，不是重实现），每个脚本跑完会自己打请求并打印真实结果。可落地的工程骨架在 `code/express-template`。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/express-basics/src/00-http-baseline.js` | 先接上模块二：Express 站在哪一层 | 模块二那份纯 `node:http` 服务器：路由靠 `if/else`、404 靠分支，作为对照基线 |
| `./code/express-basics/src/01-hello.js` | Express 是什么 · Hello World | 五个动作起服务：`express()` → `app.get('/')` → `res.send()` → `app.listen(3000)` |
| `./code/express-basics/src/02-routing.js` | 路由（Routing） | `app.get/post/put/delete` 四类路由，实测状态码 200 / 201 / 200 / 200 |
| `./code/express-basics/src/03-params.js` | 路由参数 | `req.params.id` 与 `req.query.page` 各拿到什么（响应体里的 `id` 是字符串 `"123"`） |
| `./code/express-basics/src/04-middleware.js` | 中间件（Middleware） | 应用级 `app.use(fn)` 每个请求都跑，路由级 `app.use('/api', fn)` 只在 `/api` 前缀下跑 |
| `./code/express-basics/src/05-builtin.js` | 常用内置中间件 | `express.json()` / `urlencoded()` / `static('public')` 三种内置中间件 |
| `./code/express-basics/src/06-cors.js` | 第三方中间件 | `cors()` 给响应补上 `access-control-allow-origin` |
| `./code/express-basics/src/07-error.js` | 错误处理中间件 | 4 参数错误处理中间件接住 `next(err)`，返回 500 且 `error` 字段被 `JSON.stringify` 丢掉 |
| `express-template` | —— | 可直接跑的 Express 项目模板，完整目录与运行方式见 `express-template/README.md` |

运行方式（`code/express-basics` 目录下先 `npm install`，再按小节执行）：
`npm run http` / `npm run hello` / `npm run routing` / `npm run params` / `npm run middleware` / `npm run builtin` / `npm run cors` / `npm run error`。
每个脚本监听 3000 端口，跑完会自己退出，所以一次跑一个。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[WebSocket 与 SSE 实时通信](../网络编程与实时通信/WebSocket%20与%20SSE%20实时通信)
- 下一篇：[Koa 快速入门](./Koa%20快速入门)