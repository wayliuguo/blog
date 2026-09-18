# Koa 快速入门

> Koa 由 Express 原班人马打造，更轻量、更现代。

---

## Koa 是什么

Koa 是 Express 的继任者，核心设计理念：

- 原生支持 `async/await`
- 更轻量（不内置路由、模板引擎等）
- 中间件采用洋葱模型

### Hello World

> 摘自 `./code/koa-basics/src/01-hello.js`（运行：`npm run hello`）

```javascript
const Koa = require('koa')
const app = new Koa()

app.use(async ctx => {
    ctx.body = 'Hello World'
})

app.listen(3000, () => {
    console.log('Koa server running at http://localhost:3000')
})
```

实测输出（`npm run hello`）：

```
Koa server running at http://localhost:3000

=== koa-basics · 01-hello ===
  GET  /
       状态码 200
       content-type: text/plain; charset=utf-8
       body: Hello World
```

对比 Express 的 Hello World 有个显眼差异：同样是 `res.send()/ctx.body` 传字符串，Express 给的是 `text/html; charset=utf-8`，Koa 给的是 `text/plain; charset=utf-8`——响应类型由框架自己推断，不写就按默认来。

## async/await 原生支持

Koa 的中间件都是 async 函数，可以使用 await 处理异步操作（配套脚本里用一个返回 Promise 的假数据库顶替真实连接，这样脚本能独立跑起来）：

> 摘自 `./code/koa-basics/src/02-async.js`（运行：`npm run async`）

```javascript
app.use(async ctx => {
    const data = await database.query('SELECT * FROM users')
    ctx.body = data
})
```

实测输出（`npm run async`）：

```
koa-basics · 02-async 运行在 http://localhost:3000

=== koa-basics · 02-async ===
  查到 SQL：SELECT * FROM users
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: [{"id":1,"name":"张三"},{"id":2,"name":"李四"}]
```

`await` 拿到的数组直接赋给 `ctx.body` 就完事了：对象/数组会被自动序列化成 JSON，不用手写 `JSON.stringify`。

## 洋葱模型

Koa 中间件的执行顺序像洋葱一样，**请求进入时从外到内，响应返回时从内到外**。

> 摘自 `./code/koa-basics/src/03-onion.js`（运行：`npm run onion`）

```javascript
app.use(async (ctx, next) => {
    console.log('中间件 1 - 进入')
    await next()
    console.log('中间件 1 - 返回')
})

app.use(async (ctx, next) => {
    console.log('中间件 2 - 进入')
    await next()
    console.log('中间件 2 - 返回')
})

app.use(async ctx => {
    console.log('处理请求')
    ctx.body = 'Hello'
})
```

实测输出（`npm run onion`，前五行是服务端日志，即访问一次 `/` 的真实执行顺序）：

```
koa-basics · 03-onion 运行在 http://localhost:3000

=== koa-basics · 03-onion ===
中间件 1 - 进入
中间件 2 - 进入
处理请求
中间件 2 - 返回
中间件 1 - 返回
  GET  /
       状态码 200
       content-type: text/plain; charset=utf-8
       body: Hello
```

### 洋葱模型 vs Express 线性模型

```
Express: 中间件A → 中间件B → 处理请求
Koa: 中间件A进入 → 中间件B进入 → 处理请求 → 中间件B返回 → 中间件A返回
```

Koa 的洋葱模型最大的优势是：**可以在请求处理前后都执行逻辑**，非常适合做请求耗时统计、事务管理等。

## Koa 与 Express 的对比

| 维度 | Express | Koa |
|------|---------|-----|
| 中间件模型 | 线性 | 洋葱模型 |
| 异步支持 | 回调 | async/await |
| 体积 | 较大（内置路由等） | 极小（需自行组合） |
| 路由 | 内置 | 需 koa-router |
| 请求体解析 | 内置 | 需 koa-body |
| 静态文件 | 内置 | 需 koa-static |
| 社区生态 | 丰富 | 较少 |

### 使用 Koa 需要额外安装的中间件

> 摘自 `./code/koa-basics/src/04-stack.js`（运行：`npm run stack`）

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const { koaBody } = require('koa-body')
const static = require('koa-static')

const app = new Koa()
const router = new Router()

app.use(koaBody())
app.use(static('public'))

router.get('/users', ctx => {
    ctx.body = { users: [] }
})
// …
app.use(router.routes())
app.listen(3000, () => {
    console.log('koa-basics · 04-stack 运行在 http://localhost:3000')
})
```

实测输出（`npm run stack`，脚本往 `/users` 打了一次 GET、POST 了一次 JSON，又取了静态文件 `public/hello.txt`）：

```
koa-basics · 04-stack 运行在 http://localhost:3000

=== koa-basics · 04-stack ===
  GET  /users
       状态码 200
       content-type: application/json; charset=utf-8
       body: {"users":[]}
  POST /users
       状态码 201
       content-type: application/json; charset=utf-8
       body: {"created":{"name":"well"}}
  GET  /hello.txt
       状态码 200
       content-type: text/plain; charset=utf-8
       body: 这是 koa-static('public') 提供的静态文件。\n
```

有 `koa-body` 在，`ctx.request.body` 才是解析好的对象（`{"created":{"name":"well"}}` 里的 `name` 来自 POST 的 JSON）；有 `koa-static` 在，`public/` 下的文件才直接可访问。这两件事 Express 是内置的，Koa 全都得自己装。

`koa-body` 从 v7 起改成了具名导出，CommonJS 里要写 `const { koaBody } = require('koa-body')`（老教程里的 `const koaBody = require('koa-body')` 在 v8 会报 `koaBody is not a function`）。

## 小结

- **Koa 的定位与最小写法**
  - 极简内核：Express 原班人马打造的继任者，只给 `ctx` 封装，路由/模板/静态/body 解析全外置
  - Hello World：`app.use(async ctx => { ctx.body = 'Hello World' })`，给 `ctx.body` 赋值即完成响应，不写 `res.end`
  - 原生 `async/await`：中间件都是 async 函数，`await` 到数组直接赋 `ctx.body`，自动序列化成 JSON
- **洋葱模型**
  - 顺序：进入按注册顺序、返回按逆序（「1 进入 → 2 进入 → 处理 → 2 返回 → 1 返回」）
  - 成立前提：`await next()` 等待下游整条链 resolve；写成 `next()` 不 await 则洋葱被拉平成线性
  - 价值：请求前后都能介入，天然适合耗时统计、事务管理、统一响应包装
- **Express 与 Koa 的对比**
  - 七项差异：中间件模型（线性/洋葱）、异步（回调/async）、体积、路由、body 解析、静态文件、社区生态
  - 需额外安装：`@koa/router`（路由）、`koa-body`（body）、`koa-static`（静态），用 `app.use(router.routes())` 挂载

---

## 配套代码

本篇每个代码块都逐字摘自仓库 `node/04-Express 与 Koa/code/koa-basics`（真实 `koa`，不是重实现），每个脚本跑完会自己打请求并打印真实结果。可落地的工程骨架在 `code/koa-template`。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/koa-basics/src/01-hello.js` | Koa 是什么 · Hello World | 给 `ctx.body` 赋值即完成响应；字符串默认 `Content-Type` 是 `text/plain` |
| `./code/koa-basics/src/02-async.js` | async/await 原生支持 | 中间件就是 async 函数，`await` 到数组直接赋 `ctx.body`，自动序列化成 JSON |
| `./code/koa-basics/src/03-onion.js` | 洋葱模型 | 三个中间件的真实进出顺序：1 进入 → 2 进入 → 处理请求 → 2 返回 → 1 返回 |
| `./code/koa-basics/src/04-stack.js` | 使用 Koa 需要额外安装的中间件 | `@koa/router` 管路由、`koa-body` 解析请求体、`koa-static` 托管静态文件 |
| `koa-template` | —— | 可直接跑的 Koa 项目模板（洋葱模型中间件见 `koa-template/src/middleware/responseTime.js`），完整目录与运行方式见 `koa-template/README.md` |

运行方式（`code/koa-basics` 目录下先 `npm install`，再按小节执行）：
`npm run hello` / `npm run async` / `npm run onion` / `npm run stack`。
每个脚本监听 3000 端口，跑完会自己退出，所以一次跑一个。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Express 快速入门](./01-Express%20快速入门)
- 下一篇：[Express 项目模板](./03-Express%20项目模板)