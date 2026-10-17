# 面试题 · NestJS 与 Web 框架（全覆盖版）

> 对齐知识体系：node 模块三·Web 框架基础（Express 与 Koa）+ 模块五·后端架构（NestJS 入门/进阶，含认证进阶-双Token与多设备会话）。
> 项目结合点：赴演记服务端（NestJS + TypeORM + JWT + WebSocket）。红线：定位全栈拓展，不吹后端专家。

## 一、框架与中间件模型

**Q1：中间件模型：Koa 洋葱 vs Express 线性？**
- Express：线性依次执行，next 传递控制权；Koa：async/await 洋葱模型——进与出两段都能拦截
- 洋葱模型天然适合：耗时统计（进记时间出算差）、错误兜底、响应包装
- Express 5 已原生支持 Promise 与 async 错误传递——别把「Express 不支持 async」当现役结论讲

**Q2：NestJS 为什么选它？核心概念？**
- 模块化分层（Module/Controller/Provider）+ 装饰器路由 + 依赖注入，大项目可维护
- 底层默认 Express（可切 Fastify 适配器），Nest 的价值在架构约束与生态整合（TypeORM/校验/文档开箱即用）

**Q3：一个请求在 NestJS 里经过什么？**
- 中间件 → 守卫（鉴权/权限）→ 拦截器（前置：包装响应/计时）→ 管道（转换+校验 DTO）→ 控制器 → 拦截器（后置：映射/日志）→ 异常过滤器（兜底）
- 顺序考点：守卫在拦截器之前（未授权请求不浪费业务处理）；管道在控制器方法参数阶段

**Q4：依赖注入的原理？**
- 启动时扫描装饰器元数据（reflect-metadata + emitDecoratorMetadata 编译出的类型信息）构建依赖图
- 按模块作用域实例化 Provider（默认单例，可 Request/Transient 作用域）并注入构造函数
- 收益：可替换（测试注入 mock）、可复用、依赖关系显式化——这正是面试官想听的「为什么不用单例导出」

## 二、参数校验与契约

**Q5：DTO 校验怎么做？**
- class-validator 装饰器声明规则 + ValidationPipe 全局启用（whitelist 剔除多余字段、transform 自动类型转换）
- 校验失败统一 400 返回字段级错误信息——错误信息结构也是契约的一部分

**Q6：RESTful 设计规范？**
- 资源名词化 + HTTP 动词语义（GET/POST/PUT/DELETE）；状态码正确使用（200/201/400/401/403/404/409/429/500）
- 版本化（/v1）、分页与过滤参数规范、错误响应统一结构

## 三、认证与会话（对齐「认证进阶-双Token」）

**Q7：JWT 鉴权流程？和 session 的区别？**
- 登录 → 签发 token（header.payload.signature，签名防篡改）→ 客户端 Authorization 携带 → 服务端验签
- JWT 无状态适合分布式；难主动撤销 → 短过期 + refresh token，敏感操作二次校验
- session 有状态可随时失效；集群要共享存储（Redis）

**Q8：双 Token（access + refresh）机制？**
- access token 短生命周期（分钟级）随请求携带；refresh token 长生命周期（天级）只用于换新 access
- 为什么安全：access 泄露窗口短；refresh 只出现在刷新接口，暴露面小，且可服务端撤销（存 Redis 白名单）
- 多设备会话：按设备维度签发 refresh，单设备登出只撤销该设备 refresh，不影响其他端
- 旋转（rotation）：每次刷新换新 refresh 并作废旧值——检测重放的基础

**Q9：WebSocket 怎么做？**
- 升级握手后全双工；心跳保活、断线重连、按房间/用户定向推送
- NestJS 里 @WebSocketGateway 网关统一管理连接与事件；鉴权在握手阶段（token 随握手传）

## 四、异常与可观测

**Q10：统一异常怎么设计？**
- 业务异常抛自定义异常类（携带错误码 + 消息）→ 全局异常过滤器统一转成响应结构
- 未知异常兜 500 并记日志（含堆栈 + traceId），对外不泄漏内部细节
- 与拦截器分工：拦截器管成功路径的包装，过滤器管失败路径的出口——两者覆盖请求生命周期互补
