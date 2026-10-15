# 面试题 · Node.js 服务端（全覆盖版）

> 高频常考为主，项目结合点：赴演记（NestJS + TypeORM + MySQL + Redis + Docker）+ 监控配置脚手架（CLI/npm）。红线：定位「能独立完成服务端开发与部署的全栈拓展」，不吹后端专家。

## 一、核心机制（常考重点）

**Q1：Node 事件循环和浏览器的区别？**
- 六阶段：timers → pending callbacks → poll → check（setImmediate）→ close；微任务在阶段间与宏任务后执行
- 与浏览器差异：process.nextTick 优先级最高（阶段切换前清空）；Promise 微任务排在 nextTick 之后
- 经典题：setTimeout(fn,0) 与 setImmediate 顺序在主模块不确定，在 I/O 回调内 setImmediate 先执行

**Q2：Stream 是什么？背压怎么处理？**
- 四类流：Readable / Writable / Duplex / Transform；处理大文件不占内存、可管道组合
- 背压：消费慢于生产时，write 返回 false → 暂停读取（drain 后恢复），pipeline 自动处理
- 场景：文件上传下载、日志写入、抓取页面的落盘

**Q3：进程与集群？**
- Node 单线程事件循环，CPU 密集会阻塞 → cluster 多进程榨干多核，pm2 cluster 模式同理
- child_process：exec/execFile/spawn/fork 用途区分；进程间通信 IPC
- 守护：pm2（日志、开机自启、监控）；容器编排交给 Docker/K8s

**Q4：内存泄漏怎么排查？**
- 常见原因：意外的全局变量、闭包持有大对象、未清理的定时器/监听器、缓存无上限
- 排查：process.memoryUsage 观测 → heap snapshot 对比（devtools/clinic）→ 定位持有链
- 【项目】排行榜/热搜缓存设过期与容量上限，避免无界增长

## 二、框架与设计

**Q5：NestJS 为什么选它？核心概念？**
- 模块化分层（Module/Controller/Provider）+ 装饰器路由 + 依赖注入，大项目可维护
- 请求处理链：中间件 → 守卫 → 拦截器（前置）→ 管道 → 控制器 → 拦截器（后置）→ 异常过滤器
- 【项目】统一响应/异常结构用过滤器+拦截器；DTO + class-validator 做参数校验

**Q6：中间件模型：Koa 洋葱 vs Express 线性？**
- Express：线性依次执行，next 传递控制权；Koa：async/await 洋葱模型——进与出两段都能拦截
- 洋葱模型天然适合：耗时统计（进记时间出算差）、错误兜底、响应包装

**Q7：RESTful 设计规范？**
- 资源名词化 + HTTP 动词语义（GET/POST/PUT/DELETE）；状态码正确使用（200/201/400/401/403/404/409/429/500）
- 版本化（/v1）、分页与过滤参数规范、错误响应统一结构
- 【项目】接口文档自动生成（Swagger 装饰器），前后端契约明确

## 三、数据库与缓存

**Q8：JWT 鉴权流程？和 session 的区别？**
- 登录 → 签发 token（header.payload.signature，签名防篡改）→ 客户端 Authorization 携带 → 服务端验签
- JWT 无状态适合分布式；难主动撤销 → 短过期 + refresh token，敏感操作二次校验
- session 有状态可随时失效；集群要共享存储（Redis）
- 【项目】JWT + 守卫统一鉴权；密码 bcrypt 加盐存储

**Q9：MySQL 索引与查询优化？**
- B+ 树：最左前缀、覆盖索引回表少；索引列不做函数/运算，区分度低的列不值
- explain 看 type/rows/extra（Using filesort、Using temporary 是信号）
- 深分页：游标方式 where id > ? limit n；大事务拆小
- 【项目】列表按高频筛选建组合索引；TypeORM 查询构建器预加载关联避免 N+1

**Q10：事务怎么用？**
- TypeORM transaction 包裹多表写操作，保证原子性；注意事务内不做远程调用（长事务锁表）
- 隔离级别按需：默认 RR/RC，读多写少场景幂等 + 唯一约束兜底

**Q11：Redis 数据结构与场景？**
- String：缓存/计数器；Hash：对象缓存；List：队列；Set：去重/共同关注；ZSet：排行榜/延时队列
- 【项目】排行榜 ZSet（ZINCRBY 更新、ZREVRANGE 取榜）、热搜缓存设 TTL
- 三件套：穿透（空值缓存/布隆）、击穿（热点永不过期+互斥重建）、雪崩（过期时间加随机）

**Q12：缓存与数据库一致性？**
- 旁路缓存：先更新 DB 再删缓存；延迟双删应对读旧写并发的窗口
- 强一致不现实，按业务容忍度定策略

## 四、工程与部署

**Q13：日志怎么做？**
- 结构化 JSON 日志 + 分级 + traceId 串联请求链路；按天切割轮转控制磁盘
- 错误日志对接告警；【项目】winston 体系：分级 + 轮转 + 请求日志

**Q14：限流怎么做？**
- 算法：计数器（窗口突刺）、滑动窗口、令牌桶/漏桶（匀速）
- 单机 Throttler 中间件按路由配置；分布式用 Redis 计数
- 【项目】解析类接口（爬虫成本高）设限流防滥用，配合统一异常返回 429

**Q15：Docker 部署流程？**
- 多阶段构建（builder 装依赖编译 → runner 只拷产物）减小镜像；环境变量注入配置；健康检查
- 【项目】Docker 部署 + 配置分离；对比 PM2：单机简单用 PM2，环境一致与迁移用 Docker

**Q16：WebSocket 怎么做？**
- 升级握手后全双工；心跳保活、断线重连、按房间/用户定向推送
- 【项目】解析任务异步执行，进度实时推送，替代前端轮询

## 五、CLI 与 npm 包（脚手架项目）

**Q17：CLI 工具怎么开发发布的？**
- package.json 配 bin 字段指向入口（shebang）；commander 注册命令与选项；axios 调平台接口
- npm publish 前置：registry 指向、版本 semver（major/minor/patch）、登录凭据
- 【项目】监控配置脚手架发布 npm 包：init/create/register/rule 四命令，模板生成 + 自动注册
