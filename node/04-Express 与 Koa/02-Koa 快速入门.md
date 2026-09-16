# Koa 快速入门

> Koa 由 Express 原班人马打造，更轻量、更现代。
> 承上：[Express 快速入门](./01-Express%20快速入门) —— 先掌握 Express 的路由与中间件，才能对比理解 Koa 的洋葱模型差异
> 启下：[Express 项目模板](./03-Express%20项目模板) —— 照模板搭出一个含路由、控制器、服务分层与 JWT 鉴权的 Express 项目骨架

---

## Koa 是什么

Koa 是 Express 的继任者，核心设计理念：

- 原生支持 `async/await`
- 更轻量（不内置路由、模板引擎等）
- 中间件采用洋葱模型

### Hello World

```javascript
const Koa = require('koa')
const app = new Koa()

app.use(async (ctx) => {
    ctx.body = 'Hello World'
})

app.listen(3000, () => {
    console.log('Koa server running at http://localhost:3000')
})
```

## async/await 原生支持

Koa 的中间件都是 async 函数，可以使用 await 处理异步操作：

```javascript
app.use(async (ctx) => {
    const data = await database.query('SELECT * FROM users')
    ctx.body = data
})
```

## 洋葱模型

Koa 中间件的执行顺序像洋葱一样，**请求进入时从外到内，响应返回时从内到外**。

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

app.use(async (ctx) => {
    console.log('处理请求')
    ctx.body = 'Hello'
})

// 访问时输出：
// 中间件 1 - 进入
// 中间件 2 - 进入
// 处理请求
// 中间件 2 - 返回
// 中间件 1 - 返回
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

```javascript
const Koa = require('koa')
const Router = require('@koa/router')
const koaBody = require('koa-body')
const static = require('koa-static')

const app = new Koa()
const router = new Router()

app.use(koaBody())
app.use(static('public'))

router.get('/users', (ctx) => {
    ctx.body = { users: [] }
})

app.use(router.routes())
app.listen(3000)
```

## 小结

- **Koa 的定位**：Express 原班人马打造的继任者，极简内核只给 `ctx` 封装，路由、模板引擎、静态文件、body 解析全部外置
- **Hello World 的写法**：`app.use(async ctx => { ctx.body = 'Hello World' })`，不写 `res.end`，给 `ctx.body` 赋值即完成响应
- **async/await 原生支持**：中间件都是 async 函数，`const data = await database.query(...)` 后直接 `ctx.body = data`，无需回调
- **洋葱模型的顺序**：进入按注册顺序、返回按逆序，两个中间件夹一个处理函数时输出「1 进入 → 2 进入 → 处理请求 → 2 返回 → 1 返回」
- **洋葱成立的前提是 await**：`await next()` 等待的是下游整条链 resolve；写成 `next()` 而不 await，返回段提前执行，洋葱立刻被拉平成线性模型
- **洋葱模型的价值**：请求处理前后都能介入，天然适合请求耗时统计、事务管理、统一响应包装这类跨切面逻辑
- **Express 与 Koa 的七项差异**：中间件模型（线性 / 洋葱）、异步支持（回调 / async）、体积、路由、body 解析、静态文件、社区生态
- **Koa 要额外装的中间件**：`@koa/router` 管路由、`koa-body` 管请求体、`koa-static` 管静态文件，用 `app.use(router.routes())` 挂载

---

## 配套代码

本篇的可运行示例在仓库 `node/04-Express 与 Koa/code/koa-template`。

| 文件 | 演示什么 |
| --- | --- |
| `koa-template` | 可直接跑的 Koa 项目模板 |
| `responseTime.js` | 洋葱模型中间件 |

完整目录与运行方式见 `koa-template/README.md`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Express 快速入门](./01-Express%20快速入门)
- 下一篇：[Express 项目模板](./03-Express%20项目模板)