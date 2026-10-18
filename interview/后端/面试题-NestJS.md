# 面试题 · NestJS

> 对齐知识体系：node 模块五·后端架构（NestJS 入门/进阶，含认证进阶-双Token与多设备会话）。
> 项目结合点：赴演记服务端（NestJS + TypeORM + JWT + WebSocket）。红线：定位全栈拓展，不吹后端专家。

## 一、架构与核心概念

### 1. NestJS 是什么？为什么选它而不是直接用 Express？

**结论：Nest 是架构级 Node 框架——模块化分层（Module/Controller/Provider）+ 装饰器路由 + 依赖注入，解决的是「大项目怎么组织代码」；底层默认跑 Express（可切 Fastify），选它买的是架构约束与生态整合，不是性能。**

- 选型话术（高级答法）
  - Express/Koa 回答「请求怎么处理」，Nest 回答「代码怎么组织」——不是一个层面的问题
  - 收益三件套：依赖关系显式化（构造函数看得见）、可测试性（注入 mock 即可单测）、生态开箱（TypeORM/校验/Swagger/配置全打通）
  - 代价也要说：学习曲线陡、概念多、小项目过度设计
- 追问：Nest 和 Angular 什么关系？
  - 架构思想（模块/DI/装饰器）一脉相承，团队有 Angular 背景几乎零成本上手

### 2. 一个请求在 NestJS 里经过什么？顺序是高频考点

**结论：中间件 → 守卫 → 拦截器（前）→ 管道 → 控制器 → 拦截器（后）→ 异常过滤器；关键顺序考点是「守卫在拦截器之前」（未授权请求不浪费业务处理）、管道在参数解析阶段、过滤器兜所有异常的底。**

- 全链路职责表

| 组件 | 职责 | 典型用途 |
| --- | --- | --- |
| Middleware | 请求入口通用逻辑 | 日志、CORS、body 解析 |
| Guard | 决定请求能不能继续 | JWT 鉴权、RBAC 权限 |
| Interceptor（前） | 包裹请求处理 | 计时、响应格式包装 |
| Pipe | 参数转换 + 校验 | DTO 校验（ValidationPipe） |
| Controller / Service | 业务处理 | — |
| Interceptor（后） | 处理返回值 | 数据映射、缓存、日志 |
| ExceptionFilter | 异常统一出口 | 错误响应结构、记日志 |

- 追问：拦截器和中间件的区别？
  - 中间件在 Express 层，拿不到 Nest 的依赖注入上下文；拦截器在 Nest 生命周期内，可注入服务、可包裹成功与失败两条路径（返回 Observable）

### 3. 依赖注入的原理？为什么不用单例导出？

**结论：启动时扫描装饰器元数据（reflect-metadata + emitDecoratorMetadata 编译出的类型信息）构建依赖图，按模块作用域实例化 Provider 并注入构造函数——收益是可替换（测试注入 mock）、依赖显式、生命周期统一管理。**

- 要点
  - `@Injectable()` 标记类可被 DI 容器管理；`@Module({ providers })` 声明模块内可用服务
  - 默认单例（Singleton 作用域），可改 `Scope.REQUEST`（每请求一实例）/ `TRANSIENT`
  - `emitDecoratorMetadata` 必须开着——构造函数参数的类型信息靠它生成，关了注入会拿 undefined
- 追问：REQUEST 作用域有什么代价？
  - 请求结束要重建实例，且它会传染（依赖它的所有链路都变 request 作用域）——能不用就不用

### 4. Module 怎么划分？Provider 的 exports 和 imports 是什么关系？

**结论：Module 是依赖图的封边单位——providers 只在模块内可见，exports 才对 import 了本模块的其他模块可见；按业务域划分（UserModule/OrderModule），不按技术分层划分。**

- 要点
  - 模块内私有：没 export 的 provider 别的模块注入不到——这是编译期可见的边界
  - 全局模块 `@Global()` 慎用（破坏显式依赖），配置/日志类才配
  - 循环依赖：`forwardRef` 解，但出现循环依赖优先反思模块边界
- 追问：动态模块 `DynamicModule` 什么时候用？
  - 需要运行时配置的通用组件（TypeOrmModule.forRootAsync、ConfigModule）——异步工厂里读配置再实例化 provider

## 二、参数校验与契约

### 5. DTO 校验怎么做？ValidationPipe 有哪些关键配置？

**结论：class-validator 装饰器声明规则 + 全局 ValidationPipe 启用；whitelist 剔除多余字段、transform 自动类型转换、forbidNonWhitelisted 对多余字段直接报 400——校验失败统一返回字段级错误信息。**

- 关键配置

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // 剔除 DTO 未声明的字段
  forbidNonWhitelisted: true, // 多余字段直接报错而非静默剔除
  transform: true,            // query/body 自动转 DTO 声明类型
}))
```

- 要点
  - DTO 类要配 `class-transformer` 的 `@Type()` 处理嵌套对象与日期
  - 错误信息结构也是契约的一部分：字段名 + 规则 + 消息统一格式
- 追问：为什么校验放管道而不是控制器里手写 if？
  - 管道统一、声明式、与 DTO 类型同步演进——控制器里手写校验必然漂移和遗漏

### 6. RESTful 接口设计规范？

**结论：资源名词化 + HTTP 动词语义 + 状态码正确使用；版本化、分页规范化、错误响应统一结构——「规范」的价值在一致性，不在教条。**

- 要点
  - 动词：GET 查 / POST 建 / PUT 全量改 / PATCH 部分改 / DELETE 删
  - 状态码：200/201 成功、400 参数错、401 未认证、403 无权限、404 不存在、409 冲突、429 限流、500 内部错
  - 版本 `/v1`；分页 `page/pageSize` 或游标；错误体 `{ code, message, details }`
- 追问：PUT 和 PATCH 的区别？
  - PUT 幂等全量替换，PATCH 部分更新——实际项目里很多团队只用 PUT+PATCH 之一，说出语义区别即可

## 三、认证与会话

### 7. JWT 鉴权流程？和 session 的区别？

**结论：登录 → 签发 token（header.payload.signature 三段，签名防篡改）→ 客户端 Authorization 携带 → 服务端验签取载荷；JWT 无状态适合分布式但难主动撤销，session 有状态可随时失效但集群要共享存储。**

- 对比表

| 维度 | JWT | Session |
| --- | --- | --- |
| 状态 | 无状态（服务端不存） | 有状态（服务端存会话） |
| 撤销 | 难（要黑名单/短过期） | 容易（删会话即失效） |
| 集群 | 天然无共享问题 | 需 Redis 共享存储 |
| 载荷 | 可读（base64，不加密！） | 在服务端 |

- 关键提醒：JWT 载荷只是 base64 编码不是加密——**别放敏感信息**；签名只防篡改不防偷看
- 追问：JWT 怎么实现「主动踢人下线」？
  - 服务端维护 Redis 黑名单（按 jti/用户维度），Guard 里验签后查黑名单；或 access token 短命 + 服务端可控的 refresh 白名单

### 8. 双 Token（access + refresh）机制？多设备会话怎么设计？

**结论：access token 短命（分钟级）随请求走，refresh token 长命（天级）只用于换新 access 且存 Redis 白名单可服务端撤销——泄露窗口短、撤销能力补齐了 JWT 的短板。**

- 要点
  - access 泄露窗口短；refresh 只出现在刷新接口、暴露面小
  - **旋转（rotation）**：每次刷新换新 refresh 并作废旧值——检测重放的基础（旧 refresh 被用第二次说明已泄露，整组作废）
  - 多设备会话：按设备维度签发 refresh（设备指纹/UA 存 Redis），单设备登出只撤销该设备的 refresh，不影响其他端
  - refresh 的 Redis 白名单就是「可撤销性」的实现载体
- 追问：刷新接口怎么防并发竞态？
  - 旋转后旧值立即可检测为「已用过」→ 触发整组作废；同一 refresh 并发刷只有一次成功，其余按重放处理

### 9. WebSocket 在 NestJS 里怎么做？鉴权放在哪一步？

**结论：升级握手后进入全双工长连接；心跳保活、断线重连、按房间/用户定向推送；NestJS 用 @WebSocketGateway 网关统一管理连接，鉴权在握手阶段（token 随握手 URL/头传）而不是每条消息。**

- 要点
  - 握手：HTTP Upgrade 请求——这时校验 token 并把用户身份挂到 socket 上，之后消息不再重复鉴权（连接级信任）
  - 心跳：服务端 ping/pong 探活，清僵尸连接；客户端断线重连带指数退避
  - 房间：`server.to(room).emit()` 定向推送；连接时按用户 ID join 个人房间
  - 横向扩容：多实例时用 Redis pub/sub 做跨实例广播（socket.io-redis adapter 思路）
- 追问：WebSocket 消息丢了吗怎么办？
  - 传输层不保证业务可靠——关键消息要业务层确认（ack/序号/重发），或降级为「推通知 + 客户端拉数据」

## 四、异常与可观测

### 10. 统一异常怎么设计？拦截器和异常过滤器的分工？

**结论：业务异常抛自定义异常类（携带错误码 + 消息）→ 全局 ExceptionFilter 统一转响应结构；拦截器管成功路径的包装，过滤器管失败路径的出口，两者覆盖请求生命周期互补。**

- 要点
  - 自定义异常：`class BizException extends HttpException`，带 code/message/数据
  - 过滤器职责：已知异常转对应状态码；未知异常兜 500、记完整堆栈 + traceId、**对外不泄漏内部细节**
  - 响应统一结构：`{ code, message, data }` 由拦截器包成功、过滤器包失败
  - 日志与 traceId：错误日志含请求上下文（用户/路径/参数摘要），与监控告警打通
- 追问：过滤器能捕获所有异常吗？
  - 能兜 Controller/Service 抛的；进程级 `uncaughtException` 归 Node 层兜底（见 Node 篇）——分层各管一段
