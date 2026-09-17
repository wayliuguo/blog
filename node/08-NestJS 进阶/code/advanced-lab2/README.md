# advanced-lab2 —— NestJS 进阶（07~12 篇）配套脚本

`node/08-NestJS 进阶/` 下 07~12 篇正文里引用的可运行脚本都在这里。每个脚本都不依赖 MySQL / Redis，装完依赖直接 `npm run <script>` 就能跑；正文里贴的输出就是它们的真实输出（已去掉终端颜色码）。

需要完整项目形态的读者，另见同目录的 `../nestjs-template`（完整模板，需要 MySQL + Redis）与 `../microservice-demo`（三个进程的微服务示例）。

## 安装与运行

```bash
cd "node/08-NestJS 进阶/code/advanced-lab2"
npm install
npm run typecheck     # tsc --noEmit，全部脚本零类型错误
```

## 脚本清单

| 命令 | 文件 | 对应篇目 · 小节 | 说明 | 耗时 |
| --- | --- | --- | --- | --- |
| `npm run 07transports` | `src/07-transports.ts` | 07-微服务架构 · RabbitMQ 传输 / Redis 传输 | 打印 TCP / RMQ / Redis 三种传输的 `transport` 与 `options`（只构造配置，不连 broker） | <1s |
| `npm run 08fastify` | `src/08-fastify-platform.ts` | 08-切换Fastify平台 · 修改 main.ts / 适配器对比 / 中间件兼容性 | 同一业务模块分别挂 Express 与 Fastify 适配器，实测 CORS、静态资源、Cookie、multipart | ~2s |
| `npm run 08bench` | `src/08-benchmark.ts` | 08-切换Fastify平台 · 性能对比测试 | autocannon 压同一个 `GET /ping`，两个适配器各 100 连接 × 5 秒 | ~15s |
| `npm run 09decorators` | `src/09-decorator-basics.ts` | 09-NestJS 源码分析 · 前置知识 | 四类装饰器签名、`reflect-metadata` API、`design:paramtypes` 生成条件 | <1s |
| `npm run 10entity` | `src/10-refresh-token.entity.ts` | 10-NestJS 项目模板 · 实体示例 | RefreshToken 实体 + 用 `getMetadataArgsStorage()` 反查建表元数据 | <1s |
| `npm run 10infra` | `src/10-common-infra.ts` | 10-NestJS 项目模板 · 公共基础设施 | 统一响应 / 统一异常 / 全局校验的最小可跑应用（含 422、500 降级） | ~1s |
| `npm run 11refresh` | `src/11-refresh-token.ts` | 11-认证进阶 · 全部小节 | 内存版 AuthSession：bcrypt 72 字节截断、SHA-256 入库、多设备、轮换、登出 | ~1s |
| `npm run 12ioc` | `src/12-ioc-di.ts` | 12-IoC 与依赖注入原理 · 全部小节 | 真实 Nest 应用：类型注入、自定义 Token、`useExisting`、跨模块、三种作用域 | ~1s |

`src/10-user.entity.ts` 不是独立脚本，它是 `10entity` 引用的 User 实体（与 `nestjs-template` 同源，供 `@ManyToOne` 关系使用）。

## 关键实测输出

### 07transports

```
=== 各传输方式的 transport 与 options ===
TCP   服务端  transport = 0 (TCP)
    options = {"host":"127.0.0.1","port":3001}
RMQ   服务端  transport = 5 (RMQ)
    options = {"urls":["amqp://localhost:5672"],"queue":"user_queue","queueOptions":{"durable":false}}
REDIS 服务端  transport = 1 (REDIS)
    options = {"host":"localhost","port":6379}

=== Transport 枚举里可直接用的传输类型 ===
TCP, REDIS, NATS, MQTT, GRPC, RMQ, KAFKA
```

### 08fastify

```
=== Fastify 适配器 ===
  GET /ping                          -> 200 {"platform":"fastify"}
    access-control-allow-origin      = http://localhost:5173
    x-dns-prefetch-control（helmet）  = off
  GET /uploads/hello.txt             -> 200 "hello static\n"
  reply 上挂上了 setCookie           = true
  multipart 解析器                   = 注册成功

=== Express 适配器（默认）===
  GET /ping                          -> 200 {"platform":"express"}
  GET /cookies（带 Cookie 头）        -> 200 {"cookies":{"sid":"abc123","theme":"dark"}}
```

> 踩坑记录：`fastify-multer` 的 `contentParser` 内部是 `addContentTypeParser('multipart', fn)`，Fastify 5 要求 content type 是合法 MIME，裸 `multipart` 会被拒（`FST_ERR_CTP_INVALID_MEDIA_TYPE`）。脚本改用官方 `@fastify/multipart`。

### 08bench

```
=== autocannon GET /ping · 100 连接 · 5 秒 ===
  同一个 PingController 返回：{"ok":true}

  Express  1,513 req/s   latency avg 66.56 ms / p99 138 ms   吞吐 361.9 KB/s
  Fastify  2,372 req/s   latency avg 41.98 ms / p99 66 ms   吞吐 421.5 KB/s

  Fastify / Express = 1.57 倍
```

绝对值随机器变化很大（这里是 `ts-node` 直跑、单进程）；方向稳定——Fastify 更快，倍数不稳定。

### 09decorators

```
=== 1) 类装饰器 ===
注册控制器: UserController, 前缀: /users

=== 2) 方法装饰器 ===
注册路由: getUsers → GET /list

=== 3) 参数装饰器 ===
@Body() 标记在 create 的第 0 个参数上

=== 4) reflect-metadata 核心 API ===
/users
DemoController 上的普通属性 _prefix = undefined

=== 5) design:paramtypes ===
[ [class Logger] ]
没有装饰器的类 → undefined
```

最后一行是重点：**没有装饰器的类不会生成 `design:paramtypes`**，容器也就不知道要注入什么。

### 10entity

```
=== @Entity('refresh_tokens') → 表 refresh_tokens ===
  id         type=Number
  tokenHash  type=varchar length=64
  deviceId   type=varchar length=64
  expiresAt  type=datetime
  revoked    type=boolean default=false
  createdAt  name=created_at
  user       many-to-one → User

=== 从元数据能反推出什么 ===
  refresh_tokens 列数        = 6
  refresh_tokens 上的索引列   = tokenHash
```

（TypeORM 0.3 的 `ColumnOptions` 类型里没有 `index` 字段，`@Column({ index: true })` 能跑但过不了 `tsc`，所以代码里用独立的 `@Index()`。）

### 10infra

```
=== 统一响应格式（TransformInterceptor）===  [NODE_ENV=development]
  GET /demo/ok           -> 200 {"data":{"id":1,"username":"张三"},"code":0,"message":"success"}
  GET /demo/empty        -> 200 {"data":null,"code":0,"message":"success"}

=== 统一异常（AllExceptionsFilter）===
  GET /demo/boom         -> 400 {"code":400,"message":"参数不合法","data":null}
  GET /demo/crash        -> 500 {"code":500,"message":"数据库连接失败：ECONNREFUSED 127.0.0.1:3306","data":null}

=== 全局校验管道（ValidationPipe，校验失败 422）===
  POST /demo/users       -> 422 {"code":422,"message":"邮箱格式不正确","data":null}
  POST /demo/users       -> 201 {"data":{"id":2,"email":"zhangsan@example.com","username":"张三"},"code":0,"message":"success"}

=== 同一个 500，把 isDev 切成 false（相当于 NODE_ENV=production）===
  GET /demo/crash        -> 500 {"code":500,"message":"服务繁忙，请稍后再试","data":null}
```

### 11refresh

```
=== 1) bcrypt 的 72 字节截断：两个不同的 Token 被判成同一个 ===
  公共前缀长度                      = 79 字节（> 72）
  bcrypt.compare(B, bcrypt.hash(A)) = true   ← 校验被绕过
  两个 SHA-256 相等吗               = false

=== 2) 登录：明文只给客户端一次，库里只存 SHA-256 ===
  Set-Cookie           = refresh_token=<JWT>; Max-Age=604800; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict
  库里有明文 Token 吗    = false

=== 4) 轮换：刷新后旧 Refresh Token 立即失效 ===
  拿旧 Token 再刷一次  = Refresh Token 无效或已被使用
  device-B 被牵连了吗  = revoked: false

=== 5) 登出 ===
  单设备登出后 device-A 活跃会话数 = 0
  device-B 仍然活跃               = 1
  全设备登出后活跃会话数          = 0
```

脚本把 Token 值替换成了占位符，不往日志里落敏感串。另外它顺带验证了一个容易漏的点：Refresh Token 的 payload 里必须带随机 `jti`，否则同一秒内两次登录会签出逐字节相同的 Token。

### 12ioc

```
=== 1) 手动 new：整条依赖网自己拼 ===
为了拿到 userController，一共 new 了 6 个对象
redis 是同一个实例（全靠人肉传同一个变量）：true

=== 2) 容器按类型注入：UserController 从没 new 过 UserService ===
app.get(UserController).userService instanceof UserService = true

=== 3) 自定义 Token ===
useExisting 起的别名与本体同源：true

=== 4) 作用域：同一个接口连请求两次，看 seq 变化 ===
  第一次 /scope -> 200 {"default":[1,1],"request":[1,1],"transient":[1,2]}
  第二次 /scope -> 200 {"default":[1,1],"request":[2,2],"transient":[3,4]}
```

## 依赖

运行期：`@nestjs/common`、`@nestjs/core`、`@nestjs/microservices`、`@nestjs/platform-express`、`@nestjs/platform-fastify`、`@nestjs/swagger`、`fastify`、`@fastify/cookie`、`@fastify/cors`、`@fastify/helmet`、`@fastify/multipart`、`@fastify/static`、`cookie-parser`、`cookie`、`bcryptjs`、`jsonwebtoken`、`class-validator`、`class-transformer`、`reflect-metadata`、`rxjs`、`typeorm`。

开发期：`typescript`、`ts-node`、`@types/node`、`@types/jsonwebtoken`、`autocannon`。

> 注意：`@fastify/*` 这几个不是可选项——`app.enableCors()` 需要 `@fastify/cors`、`useStaticAssets()` 需要 `@fastify/static`、`@fastify/cookie` 与 `@fastify/helmet` 是本篇示例显式注册的插件。反过来，**不要**装 `fastify-multer`：它和 Fastify 5 不兼容（见上文踩坑记录）。
