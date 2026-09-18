# advanced-lab —— NestJS 进阶配套示例

`node/08-NestJS 进阶/` 第 01~06 篇的配套脚本。每篇的正文代码都是从这些文件里**逐字摘录**的，所以文件才是唯一事实来源：改代码先改这里，再同步正文。

同目录下的 `nestjs-template/`（完整项目，依赖 MySQL + Redis）和 `microservice-demo/` 是 07~12 篇的配套，本目录只负责 01~06。

## 运行

```bash
npm install

npm run 01decorators   # 自定义装饰器
npm run 02scope        # 作用域与循环依赖
npm run 03tokens       # 双 Token（Access + Refresh）
npm run 03cookie       # HttpOnly Cookie
npm run 03wechat       # 微信小程序登录
npm run 04upload       # 文件上传
npm run 05gateway      # WebSocket
npm run 06schedule     # 定时任务
npm run 06queue        # 消息队列（Bull）

npm run typecheck      # tsc --noEmit
```

除 `06queue` 外，所有脚本都能在本机直接跑完并打印结果——每个脚本自己起服务、自己收尾，不需要外部依赖：

- `02scope` / `04upload` / `05gateway` 会起一个 Nest 应用监听随机端口，脚本结束前 `app.close()`；上传目录建在系统临时目录里，跑完删掉。
- `03wechat` 会起一个本地 stub 顶替 `api.weixin.qq.com`，所以不需要真的 appid/secret。
- `06queue` 需要本机有 Redis（`localhost:6379`），没有的话只能 `npm run typecheck` 过一遍类型。

## 文件

| 文件 | 对应正文 | 演示什么 |
| --- | --- | --- |
| `src/01-decorators.ts` | [01-自定义装饰器](../../01-自定义装饰器.md) | `createParamDecorator` / `SetMetadata` / `RolesGuard` / `applyDecorators` / `ExecutionContext`，请求四个控制器看 200 与 403 |
| `src/02-scope-and-circular.ts` | [02-作用域与循环依赖](../../02-作用域与循环依赖.md) | DEFAULT / REQUEST / TRANSIENT 的实例编号对照、`@Inject(REQUEST)`、`forwardRef` 破环、作用域传染 |
| `src/03-tokens.ts` | [03-登录注册实战](../../03-登录注册实战.md) | 同一 payload 签出 2h / 7d 两份 Token，`verify` 通过，过期后抛 `UnauthorizedException` |
| `src/03-cookie.ts` | [03-登录注册实战](../../03-登录注册实战.md) | 把 Refresh Token 写进 HttpOnly Cookie，看各选项的实际效果 |
| `src/03-wechat.ts` | [03-登录注册实战](../../03-登录注册实战.md) | 本地 stub 顶替微信服务器，跑通「code 换 openid → 查找或创建用户 → 签 JWT」 |
| `src/04-file-upload.ts` | [04-文件上传实战](../../04-文件上传实战.md) | `FileInterceptor` + `diskStorage` + `limits` + `fileFilter`、`FilesInterceptor`、`FileValidationPipe`、静态资源 |
| `src/05-websocket-gateway.ts` | [05-WebSocket 实时通信](../../05-WebSocket%20实时通信.md) | Gateway 命名空间、房间广播、连接时校验 token、`handleDisconnect` |
| `src/06-schedule.ts` | [06-定时任务与队列](../../06-定时任务与队列.md) | `@Cron` / `@Interval` / `@Timeout`、`SchedulerRegistry` 动态增删任务 |
| `src/06-queue.ts` | [06-定时任务与队列](../../06-定时任务与队列.md) | Bull 的生产者 / 消费者、重试与延迟任务（需 Redis） |

## 约定

- 脚本里的 `console.log` 就是正文「实测输出」那一段的来源，改脚本时记得同步正文。
- 标注编号（`01-` / `02-` …）与正文篇号一一对应，多份脚本共用同一编号时用单词后缀区分（`03-tokens` / `03-cookie` / `03-wechat`）。
