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

---

## 面试题

### Q1: 解释 Koa 的洋葱模型？

Koa 中间件通过 `await next()` 将控制权交给下一个中间件，执行完后再返回继续执行当前中间件的剩余代码。这种"进入→处理→返回"的模型像洋葱一样层层穿透。

### Q2: Express 和 Koa 的核心区别？

Express 中间件是线性的，功能更丰富（内置路由、静态文件等）；Koa 中间件是洋葱模型，原生支持 async/await，更轻量但需要自行组装中间件。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/koa-template`。

| 文件 | 演示什么 |
| --- | --- |
| `koa-template` | 可直接跑的 Koa 项目模板 |
| `responseTime.js` | 洋葱模型中间件 |

完整目录与运行方式见 `koa-template/README.md`。

---

## 参考

- 上一篇：[Express 快速入门](./01-Express%20快速入门)
- 下一篇：[Express 项目模板](./03-Express%20项目模板)