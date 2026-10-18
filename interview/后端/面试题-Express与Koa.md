# 面试题 · Express 与 Koa

> 对齐知识体系：node 模块三·Web 框架基础。
> 红线：定位全栈拓展；框架深挖（NestJS）归 NestJS 篇，本文只答两个底层框架本身。

## 一、中间件模型

### 1. Express 的中间件模型是什么样的？

**结论：Express 是线性模型——中间件按注册顺序依次执行，`next()` 显式传递控制权；不是洋葱模型（说「Express 是洋葱」会被直接扣分，洋葱是 Koa 的）。**

- 要点
  - `app.use(fn)` / `router.use(fn)` 的注册顺序 = 执行顺序
  - `next()` 必须显式调用，忘了调用请求就挂起（hang）
  - `next(err)` 跳过后续所有普通中间件，直接进错误处理中间件
- 顺序陷阱（高频）
  - 错误处理中间件必须注册在**所有路由之后**——注册在前面的错误处理永远收不到路由抛的错
  - `express.json()` / `express.urlencoded()` 必须在路由之前——否则 `req.body` 是 undefined
  - `app.use('/api', router)` 挂前缀路径，`app.use(router)` 全局
- 追问：`next()` 被调用两次会怎样？
  - 下一个中间件执行两次——Express 5 会抛 ERR_DUPLICATED_NEXT 类错误，旧版是静默错误源

### 2. Express 的错误处理中间件怎么写？有什么铁律？

**结论：四参数签名 `(err, req, res, next)`、注册在所有路由之后——少一个参数 Express 会把它当普通中间件，这是最容易翻车的两个点。**

- 标准写法

```js
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message })
})
```

- async 错误问题
  - Express 4 里 async 函数抛的 rejection **不会**自动进 `next(err)`——要么每个路由 try-catch，要么包一层 asyncHandler：`const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`
  - **Express 5 已原生支持 Promise 拒绝自动转发到错误中间件**——别把「Express 不支持 async」当现役结论讲
- 追问：`res.send` / `res.json` / `res.end` 的区别？
  - send 自动协商 Content-Type（对象→json、字符串→html/text）；json 强制 application/json 并序列化；end 是原生方法不做任何处理

### 3. Koa 的洋葱模型是什么？为什么适合做耗时统计和错误兜底？

**结论：Koa 中间件是 `async (ctx, next)`，`await next()` 把控制权交给下游、下游执行完再回来——进与出两段都能拦截，天然适合「进记时间、出算差」和 try-catch 全局兜底。**

- 洋葱示意图（口述）

```text
请求 → [中间件1进] → [中间件2进] → [业务] → [中间件2出] → [中间件1出] → 响应
```

- 与 Express 线性模型的本质差异：Express 的「出」要靠再注册一个中间件模拟；Koa 的 `await next()` 之后天然就是「出」
- ctx 对象：`ctx = ctx.request + ctx.response` 的聚合代理，`ctx.body = data` 即设响应
- 追问：Koa 的错误处理怎么做？
  - 最外层中间件 try-catch 包住 `await next()`；或监听 app 的 `error` 事件兜底
- 追问：Koa2 为什么能原生 async？
  - Koa2 依赖 Node 对 async/await 的支持，中间件返回 Promise，`compose`（koa-compose）负责把中间件数组串成洋葱链

### 4. Express、Koa、Nest 三者怎么定位？

**结论：Express 生态最全上手最快，Koa 轻量且异步模型干净（BFF/轻量 API），Nest 是架构级框架（模块化 + DI，底层默认还是 Express）；Nest 细节归下一篇，这里只答「三者不是同一层的东西」。**

| 维度 | Express | Koa2 | Nest |
| --- | --- | --- | --- |
| 中间件模型 | 线性 | 洋葱 | 中间件 + 守卫/拦截器/管道生命周期 |
| 语言 | JS | JS | TS 原生 |
| 内置能力 | 路由/静态文件等 | 极简（核心只有洋葱链） | DI/模块化/校验/Swagger |
| 学习曲线 | 低 | 中 | 高 |
| 适合 | 中小项目、生态依赖多 | 轻量 API、微服务 | 企业级、大团队 |

- 一句话加分：Nest 不是「更高级的 Express」，它解决的是架构问题——Express/Koa 解决的是「怎么处理请求」，Nest 解决的是「大项目怎么组织代码」

## 二、常用机制与安全

### 5. CORS 在 Node 服务里怎么配？预检请求怎么处理？

**结论：浏览器同源策略下的跨域放行机制——简单请求直接带 Origin，非简单请求先发 OPTIONS 预检；Express 用 cors 中间件按来源白名单配置，别用 `origin: '*'` 一放了之（带 cookie 时无效且不安全）。**

- 要点
  - 预检：`OPTIONS` 请求带 `Origin / Access-Control-Request-Method / Access-Control-Request-Headers`，服务端回 `Access-Control-Allow-*` 系列头
  - 带 cookie 必须三件套：`credentials: true`（服务端）+ `withCredentials`（客户端）+ `Allow-Origin` 为具体来源（不能是 `*`）
  - 预检缓存：`Access-Control-Max-Age` 减少 OPTIONS 次数
- 追问：为什么带 Authorization 头的请求会触发预检？
  - 非简单请求条件之一——自定义/非安全头（Authorization、Content-Type: application/json）都要预检

### 6. Express/Koa 服务怎么做安全加固？

**结论：输入校验、HTTP 安全头、限流三件套打底，依赖审计与 HTTPS 收尾——这些是「框架无关」的，任何 Node 服务都该配。**

- 清单
  - 输入：校验（Joi/zod/class-validator）、参数化查询防 SQL 注入、模板自动转义防 XSS
  - 安全头：helmet 一键（CSP、X-Frame-Options、HSTS 等）
  - 限流：express-rate-limit / koa-ratelimit，按 IP + 路由维度
  - 供应链：`npm audit`、lockfile 锁版本
  - CSRF：纯 token 鉴权（JWT in header）天然免疫，cookie 会话才需要 CSRF token
- 追问：原型污染（prototype pollution）是什么？
  - `JSON.parse` / 深合并时攻击者注入 `__proto__` 键篡改对象原型——入参键白名单校验是最可靠的防线

### 7. 文件上传（multipart/form-data）在 Express 里怎么处理？

**结论：用 multer（或 busboy 流式方案）解析 multipart；小文件 multer 内存/磁盘存储即可，大文件必须流式——req 流直接管道到磁盘或对象存储，不在内存攒全量。**

- 要点
  - `multer({ dest })` 磁盘存储、`memoryStorage` 内存存储（小文件直传 OSS 用）
  - 文件类型校验不能只看扩展名——magic number / 白名单 MIME
  - 大文件：stream-based 解析（busboy）+ 背压处理（详见 Node 篇上传场景题）
- 追问：上传时还能同时读 `req.body` 的其他字段吗？
  - multipart 里文本字段在文件字段之后时，multer 的顺序处理可能拿不到——约定字段在前，或全部走 multipart 解析结果

### 8. 场景题：给现有服务设计一个「请求日志 + 耗时统计」中间件

**结论：Koa 一个洋葱中间件就够（进记时间出打日志）；Express 要在路由前注册一个记录开始时间的中间件，再在路由后注册一个 res 的 finish 事件监听器输出日志。**

- Koa 版（体现洋葱优势）

```js
app.use(async (ctx, next) => {
  const start = Date.now()
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    logger.error({ path: ctx.path, err: err.message })
    throw err
  } finally {
    logger.info({ path: ctx.path, ms: Date.now() - start, status: ctx.status })
  }
})
```

- 要点：日志带 traceId 串联（从网关头透传或本地生成）、状态码与耗时必记、错误与正常日志分级
- 追问：为什么监听 `res.on('finish')` 而不是中间件末尾直接打？
  - 中间件末尾时响应可能还没真正发出（流式响应），finish 才是响应真正落地的时刻
