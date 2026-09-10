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

## 面试题

### Q1: NestJS 切换 Fastify 后，中间件和拦截器还能用吗？

NestJS 的 Guard、Interceptor、Pipe、Filter 与平台无关，可以正常使用。但 Express 风格的中间件（`req/res` 类型）不兼容，需要改用 Fastify 插件或使用 `@nestjs/platform-fastify` 提供的适配器。

### Q2: 什么情况下应该切换 Fastify？

高并发场景（如商品详情页、秒杀接口）、I/O 密集型服务。如果项目重度依赖 Express 中间件生态（如 `passport`、`multer`），建议继续使用 Express。

---

## 参考

- 上一篇：[微服务架构](./07-微服务架构)
- 下一篇：[NestJS 源码分析](./09-NestJS%20源码分析)