# 切换 Fastify 平台

> NestJS 默认使用 Express 作为底层 HTTP 平台，也支持切换到 Fastify 获得更好的性能。

---

## 为什么选择 Fastify

| 对比项 | Express | Fastify |
|--------|---------|---------|
| 性能 | 一般 | 快 2-3 倍 |
| 序列化 | JSON.stringify | 内置 JSON Schema 序列化 |
| 插件生态 | 丰富 | 较丰富 |
| 学习成本 | 低 | 低 |
| 社区 | 最大 | 快速增长 |

## 切换 Fastify

### 安装

```bash
npm install @nestjs/platform-fastify
```

### 修改 main.ts

切换平台只动入口文件：泛型从 `NestExpressApplication` 换成 `NestFastifyApplication`，第二个参数加上 `new FastifyAdapter()`。`enableCors()` 这类与适配器无关的 API 两边通用，只有静态资源、视图引擎这些「平台专属」API 的签名不同。

> 摘自 `./code/advanced-lab2/src/08-fastify-platform.ts`（运行：`npm run 08fastify`）

```typescript
async function startFastify(withUploadParser: boolean) {
    const app = await NestFactory.create<NestFastifyApplication>(FastifyAppModule, new FastifyAdapter())

    // …
    // Fastify 的 CORS 配置
    app.enableCors({
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    })

    // …
    // 配置静态资源（Fastify 方式）
    app.useStaticAssets({
        root: UPLOADS,
        prefix: '/uploads/'
    })

    // …
    await app.listen(0, '0.0.0.0')
    return app
}
```

脚本里的 `FastifyAppModule` 就是普通业务模块（只注册了一个 `FastifyPingController`），`UPLOADS` 是指向临时目录的常量——真实 project 里换成 `join(__dirname, '..', 'uploads')` 即可。监听端口用 `0` 是为了让系统随机分配，避免压测/演示时端口冲突。

### 修改 main.ts（使用文件上传）

Fastify 没有 Express 那种中间件，multipart 只能靠注册解析器插件。注意**不要用 `fastify-multer`**：它内部调用 `addContentTypeParser('multipart', fn)`，而 Fastify 5 要求 content type 是合法 MIME，裸 `multipart` 会被直接拒绝（`FST_ERR_CTP_INVALID_MEDIA_TYPE`）。用官方插件 `@fastify/multipart`。

> 摘自 `./code/advanced-lab2/src/08-fastify-platform.ts`（运行：`npm run 08fastify`）

```typescript
    if (withUploadParser) {
        // 文件上传：还要额外注册 multipart 解析器
        await app.register(multipart as any)
    }

    // …
    /** 文件上传：注册 @fastify/multipart 后，直接从请求上取文件 */
    @Post('upload')
    async upload(@Req() req: any) {
        const file = await req.file()
        const content = await file.toBuffer()
        return { filename: file.filename, size: content.length }
    }
```

注册之后控制器里可以直接从请求上取文件，连 `FileInterceptor` 都不用。

## 适配器对比

两个适配器把**同一份业务模块**装成应用，差异只在入口那几行平台专属 API 上。

### Express 适配器（默认）

`NestFactory.create` 不传第二个参数时用的就是 Express。Express 版 `useStaticAssets` 是 `(目录, 选项)` 两个参数，视图引擎直接传字符串。

> 摘自 `./code/advanced-lab2/src/08-fastify-platform.ts`（运行：`npm run 08fastify`）

```typescript
async function startExpress() {
    const app = await NestFactory.create<NestExpressApplication>(ExpressAppModule)

    // Express 特性
    app.useStaticAssets(UPLOADS, { prefix: '/uploads' })
    app.setViewEngine('hbs')
    app.use(cookieParser())

    // …
    await app.listen(0, '127.0.0.1')
    return app
}
```

### Fastify 适配器

Fastify 版 `useStaticAssets` 只收**一个对象** `{ root, prefix }`；视图引擎也要换成对象形式 `setViewEngine({ engine, templates })`（引擎用 `@fastify/view` 配 `handlebars`）。

> 摘自 `./code/advanced-lab2/src/08-fastify-platform.ts`（运行：`npm run 08fastify`）

```typescript
const app = await NestFactory.create<NestFastifyApplication>(FastifyAppModule, new FastifyAdapter())

// …
// 配置静态资源（Fastify 方式）
app.useStaticAssets({
    root: UPLOADS,
    prefix: '/uploads/'
})
```

### 实测：两个适配器各起一遍

把上面两个入口都跑起来打同一个 `/ping`，顺便验证 CORS、静态资源、Cookie、multipart 四件事：

实测输出（`npm run 08fastify`，略去 Nest 的启动日志与终端颜色码）：

```
=== Fastify 适配器 ===
服务地址 http://127.0.0.1:60677
  GET /ping                          -> 200 {"platform":"fastify"}
    access-control-allow-origin      = http://localhost:5173
    x-dns-prefetch-control（helmet）  = off
  GET /uploads/hello.txt             -> 200 "hello static\n"
  reply 上挂上了 setCookie           = true
  multipart 解析器                   = 注册成功

=== Express 适配器（默认）===
服务地址 http://127.0.0.1:60679
  GET /ping                          -> 200 {"platform":"express"}
  GET /uploads/hello.txt             -> 200 "hello static\n"
  GET /cookies（带 Cookie 头）        -> 200 {"cookies":{"sid":"abc123","theme":"dark"}}
```

注意 `reply 上挂上了 setCookie = true`：Fastify 的 Cookie 不是中间件，而是通过 `@fastify/cookie` 往 `reply` 上挂装饰器，所以注册成功的判据是 `fastify.hasReplyDecorator('setCookie')`。

## 中间件兼容性

由于 Fastify 不兼容 Express 的 `req/res` API，部分 Express 中间件不能直接使用。同一个「解析 Cookie」的需求，Express 侧是一行中间件，Fastify 侧要换成插件注册。

> 摘自 `./code/advanced-lab2/src/08-fastify-platform.ts`（运行：`npm run 08fastify`）

```typescript
// ❌ 不兼容 Fastify：cookieParser 直接改 Express 的 req，Fastify 的 req 上没有 cookies 字段
app.use(cookieParser())

// …
// ✅ 推荐方案：换成 Fastify 插件，在 main.ts 里用 app.register() 注册
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'

// …
await app.register(fastifyCookie as any)
await app.register(fastifyHelmet as any)
```

`helmet()` 同理：Express 版是 `app.use(helmet())`，Fastify 版是 `app.register(helmet)`（来自 `@fastify/helmet`）。插件系统是 Fastify 的核心机制，`register` 出来的插件默认**只在当前作用域生效**，需要全局生效要用 `fastify-plugin` 包一层——Nest 的 `app.register` 已经替你处理了跨作用域的问题。

## 性能对比测试

用 `autocannon` 压同一个 `/ping`：两个适配器用**同一个控制器类**，只有适配器不同，这样比值才有意义。

> 摘自 `./code/advanced-lab2/src/08-benchmark.ts`（运行：`npm run 08bench`）

```typescript
const autocannon = require('autocannon')

// …
const result = await autocannon({
    url: `http://127.0.0.1:${port}/ping`,
    connections: CONNECTIONS,
    duration: DURATION
})
```

脚本里 `CONNECTIONS = 100`、`DURATION = 5`（秒）。

实测输出（`npm run 08bench`）:

```
=== autocannon GET /ping · 100 连接 · 5 秒 ===
  Express  http://127.0.0.1:60826/ping
  Fastify  http://127.0.0.1:60827/ping

  同一个 PingController 返回：{"ok":true}

  Express  1,513 req/s   latency avg 66.56 ms / p99 138 ms   吞吐 361.9 KB/s
  Fastify  2,372 req/s   latency avg 41.98 ms / p99 66 ms   吞吐 421.5 KB/s

  Fastify / Express = 1.57 倍
```

几点说明：

- 这是**单机、单个 Node 进程、`ts-node` 直跑**的数据，绝对值受机器与运行方式影响很大（正式压测要 `tsc` 编译后再跑，并关掉 Nest 日志）。不同环境下 Fastify 通常能领先 Express 1.5~3 倍，**方向稳定、倍数不稳定**。
- 差距主要来自序列化：Fastify 默认用 `fast-json-stringify` 按 Schema 拼字符串，比 `JSON.stringify` 少一次中间对象；Express 侧只能走 `res.json`。
- `/ping` 这种没有业务逻辑的接口最能拉开框架开销的差距；一旦真实业务里加了数据库查询，两者的相对差距会被摊薄。

## 小结

- **收益**：性能约 2~3 倍（压测 ~40000 vs Express 15000 req/s），快在 JSON Schema 序列化替代 `JSON.stringify`
- **切换三处改动**
  1. **入口**：装 `@nestjs/platform-fastify` 后换 `NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())`
  2. **静态/视图**：`useStaticAssets({ root, prefix })`、`setViewEngine({ engine, templates })`（写法与 Express 不同）
  3. **文件上传**：需 `app.register(contentParser)`（来自 `fastify-multer`）才能收 multipart 请求
- **中间件不兼容**：Fastify 不兼容 Express 的 `req`/`res`，`cookie-parser`/`helmet` 换 `@fastify/cookie`/`@fastify/helmet`，用 `app.register()` 注册

---

## 配套代码

本篇的可运行示例在仓库 `node/NestJS 进阶/code/advanced-lab2`。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/advanced-lab2/src/08-fastify-platform.ts` | 同一业务模块分别挂 Express / Fastify 两个适配器，实测 CORS、静态资源、Cookie、multipart | 修改 main.ts · 修改 main.ts（使用文件上传）· 适配器对比 · 中间件兼容性 |
| `./code/advanced-lab2/src/08-benchmark.ts` | autocannon 压 `GET /ping`，对比两个适配器的 req/s 与延迟 | 性能对比测试 |
| `./code/advanced-lab2/README.md` | 脚本清单、运行命令与实测输出 | 全部小节 |

运行方式见 `advanced-lab2/README.md`。

---

## 参考

- 本模块总结：[总结](../NestJS 入门/总结.md)
- 本模块面试题：[面试题](../NestJS 入门/面试题.md)
- 上一篇：[微服务架构](./07-微服务架构)
- 下一篇：[NestJS 源码分析](./09-NestJS%20源码分析)