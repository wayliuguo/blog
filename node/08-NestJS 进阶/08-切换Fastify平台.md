# 切换 Fastify 平台

> NestJS 默认使用 Express 作为底层 HTTP 平台，也支持切换到 Fastify 获得更好的性能。
> 承上：[快速上手](../07-NestJS%20入门/01-快速上手) —— 切换平台改的就是 `main.ts` 里的 `NestFactory.create`，先会初始化项目才知道改哪
> 启下：[NestJS 源码分析](./09-NestJS%20源码分析) —— 顺着最小实现讲清装饰器如何写元数据、DI 容器如何读 `design:paramtypes` 递归注入、请求如何走完处理链

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

```typescript
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    )

    // Fastify 的 CORS 配置
    app.enableCors({
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })

    // 配置静态资源（Fastify 方式）
    app.useStaticAssets({
        root: join(__dirname, '..', 'uploads'),
        prefix: '/uploads/',
    })

    await app.listen(3000, '0.0.0.0')
    console.log(`Fastify 服务启动: http://localhost:3000`)
}
```

### 修改 main.ts（使用文件上传）

```typescript
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { contentParser } from 'fastify-multer'

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    )

    // 注册文件上传解析器
    await app.register(contentParser as any)

    await app.listen(3000)
}
```

## 适配器对比

### Express 适配器（默认）

```typescript
import { NestExpressApplication } from '@nestjs/platform-express'

const app = await NestFactory.create<NestExpressApplication>(AppModule)

// Express 特性
app.useStaticAssets(join(__dirname, 'uploads'), { prefix: '/uploads' })
app.setViewEngine('hbs')
app.use(cookieParser())
```

### Fastify 适配器

```typescript
import { NestFastifyApplication } from '@nestjs/platform-fastify'

const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
)

// Fastify 特性
app.useStaticAssets({ root: join(__dirname, 'uploads'), prefix: '/uploads' })
app.setViewEngine({
    engine: { handlebars: require('handlebars') },
    templates: join(__dirname, 'views'),
})
```

## 中间件兼容性

由于 Fastify 不兼容 Express 的 `req/res` API，部分 Express 中间件不能直接使用：

```typescript
// ❌ 不兼容 Fastify（使用 Express req/res）
app.use(cookieParser())
app.use(helmet())

// ✅ 推荐方案：使用 Fastify 插件
// 在 main.ts 中注册
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'

await app.register(fastifyCookie)
await app.register(fastifyHelmet)
```

## 性能对比测试

```typescript
// 使用 autocannon 进行压测
// npx autocannon http://localhost:3000 -c 100 -d 10

// Express 结果：约 15,000 req/s
// Fastify 结果：约 40,000 req/s
```

## 小结

- **Fastify 快 2~3 倍**：内置 JSON Schema 序列化替代 `JSON.stringify`，压测约 40000 req/s 对比 Express 的 15000 req/s
- **切换只改入口**：装 `@nestjs/platform-fastify` 后换成 `NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())`
- **静态资源写法不同**：Express 是 `useStaticAssets(path, { prefix })`，Fastify 是 `useStaticAssets({ root, prefix })`
- **文件上传要额外注册解析器**：Fastify 下需要 `app.register(contentParser)` 才能接收 multipart 请求
- **Express 中间件不能直接搬**：Fastify 不兼容 Express 的 req/res，`cookie-parser`/`helmet` 要换成 `@fastify/cookie`、`@fastify/helmet`

---

## 参考

- 本模块总结：[总结](../07-NestJS 入门/总结.md)
- 本模块面试题：[面试题](../07-NestJS 入门/面试题.md)
- 上一篇：[微服务架构](./07-微服务架构)
- 下一篇：[NestJS 源码分析](./09-NestJS%20源码分析)