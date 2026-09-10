# nestjs-mini —— 约 400 行还原 NestJS 核心

教学用最小实现，用 TypeScript + reflect-metadata 重写 NestJS 的五大核心机制（装饰器、DI 容器、请求处理链、路由匹配、模块系统）。它不是生产可用的框架，仅用于理解 NestJS 内部是如何把装饰器与依赖注入串起来的。

## 对应博客章节

| 项目 | 对应文档 | 说明 |
| --- | --- | --- |
| nestjs-mini | [NestJS 源码分析](../../../node/08-NestJS%20进阶/09-NestJS%20源码分析.md) | 配合源码逐行理解装饰器 / DI / 处理链 |

延伸阅读：[IoC 与依赖注入原理](../../../node/08-NestJS%20进阶/12-IoC%20与%20依赖注入原理.md)、[自定义装饰器](../../../node/08-NestJS%20进阶/01-自定义装饰器.md)

## 它实现了什么

- 装饰器体系：
  - 类装饰器 `@Module` / `@Controller` / `@Injectable`：把模块配置、路由前缀、可注入标记写入类的 reflect-metadata。
  - 方法装饰器 `@Get` / `@Post` / `@Put` / `@Delete`：由 `createMethodDecorator` 工厂生成，把路由定义（method / path / handlerName）数组挂到类上。
  - 参数装饰器 `@Body` / `@Param` / `@Query`：由 `createParamDecorator` 工厂生成，按参数位置记录参数来源。
- DI 容器 `Container`：读取 TypeScript 编译生成的 `design:paramtypes` 元数据，递归解析构造函数依赖；用 `instances` Map 做单例缓存。
- 请求处理链 `executeRequestChain`：按 `Guard(canActivate)` → 参数解析 → `Pipe(transform)` → `Interceptor(intercept)` → `Handler` 顺序执行，每个环节通过方法名探测、均为可选。
- 路由匹配：扫描 Controller 的 `ROUTE_METADATA`，拼接 `prefix + 方法路径`，用正则把 `:param` 动态段提取到 `req.params`。
- 模块系统：`collectControllers` / `collectProviders` 递归读取 `@Module` 的 `imports`，收集所有子模块的 controller 与 provider。
- `NestFactory.create(ModuleClass)`：创建容器 → 注册 provider → 实例化 controller（自动注入）→ 生成路由表 → 创建 HTTP 服务器。
- `res` 增强：`res.status()` 链式、`res.json()` 输出；解析请求体 JSON 与 query 参数。

## 怎么跑起来

脚本来自 `package.json` 的 `scripts`（依赖 `ts-node` 与 `typescript`）：

```bash
npm install        # 安装 ts-node / typescript / reflect-metadata 等开发依赖
npm start          # ts-node index.ts
# 或开发模式
npm run dev        # ts-node --watch index.ts
```

`tsconfig.json` 已开启 `experimentalDecorators` 与 `emitDecoratorMetadata`，这是装饰器元数据能被读取的前提。

启动后默认监听 3000 端口，用 curl 验证：

```bash
curl http://localhost:3000/users
```

预期输出：

```json
[{"id":1,"name":"张三","email":"zhangsan@test.com"},{"id":2,"name":"李四","email":"lisi@test.com"}]
```

动态路由与创建：

```bash
curl http://localhost:3000/users/42
# 预期：{"id":42,"name":"用户42","email":"user42@test.com"}

curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"王五","email":"ww@test.com"}'
# 预期：{"id":<时间戳>,"name":"王五","email":"ww@test.com"}
```

## 目录结构

```
nestjs-mini/
├── index.ts        # 全部实现 + 使用示例（装饰器、Container、请求处理链、NestFactory、UserController/UserService/AppModule）
├── package.json    # 含 start / dev 脚本，依赖 reflect-metadata，devDeps 含 ts-node / typescript / @types/node
├── tsconfig.json   # TypeScript 配置（开启装饰器与 emitDecoratorMetadata）
└── .vscode/
    └── launch.json # VS Code 调试配置
```

## 和真实框架的差异

| 能力 | 真实 NestJS | 本最小实现 |
| --- | --- | --- |
| Guard | `@Injectable()` 类实现 `CanActivate`，`@UseGuards()` 按方法 / 全局挂载，可注入依赖 | 仅在 Controller 实例上定义 `canActivate` 方法，无独立类、无法按方法区分、无法注入 |
| Pipe | `@Injectable()` 类（ParseIntPipe / ValidationPipe 等），按参数单独配置 | 仅在 Controller 上定义 `transform`，对所有参数统一处理，无 DTO 校验 |
| Interceptor | 独立类，`@UseInterceptors()` 注册，基于 RxJS Observable（缓存 / 超时 / 响应映射） | 仅单个 `intercept` 方法，无 Observable、无响应映射 |
| 模块 / Provider | `exports` 跨模块共享、`useFactory` / `useValue` / `useClass`、自定义 token、scope（request / transient）、循环依赖 `@Inject` 前向引用 | 单层 `imports` 递归收集，单例容器，无上述高级特性 |
| 平台适配 | `PlatformExpress` / `PlatformFastify` 抽象 | 直接耦合 `http` 模块 |
| 异常处理 | `@Catch()` ExceptionFilter，全局 / 方法级 | 仅 try/catch 返回 500 |
| 元数据 | `Reflector` / `MetadataScanner` 读取自定义元数据 | 无 |
| 执行上下文 | `ExecutionContext` 跨平台抽象 | 仅 `{ req, res, handlerName }` 简单对象 |
| 生命周期 | `OnModuleInit` / `OnApplicationBootstrap` 等钩子 | 无 |
| 装饰器 | `@Headers` / `@Req` / `@Res` / `@Session` 等丰富参数装饰器 | 仅 `@Body` / `@Param` / `@Query` |
| 路由 | 完整路由树、通配、正则、版本管理 | 单层正则简单转换 |

## 预期输出

- 前置：`npm install` 安装 ts-node / typescript / reflect-metadata；`npm start`（`ts-node index.ts`）启动后监听 3000 端口。
- `curl http://localhost:3000/users` 返回带 email 的用户列表，如 `{"id":1,"name":"张三","email":"zhangsan@test.com"}`。
- `curl http://localhost:3000/users/42` 返回对应单用户；`POST /users` 创建用户并回显新记录。
- 装饰器 / DI 容器 / Guard / Pipe / Interceptor 请求处理链按文档顺序生效，关键路由可正常响应。

## 阅读建议

1. 先读博客 [NestJS 源码分析](../../../node/08-NestJS%20进阶/09-NestJS%20源码分析.md) 与 [IoC 与依赖注入原理](../../../node/08-NestJS%20进阶/12-IoC%20与%20依赖注入原理.md)。
2. 按「第一部分 装饰器（@Module / @Controller / @Injectable / @Get / @Body）→ 第二部分 Container.resolve → 第三部分 请求处理链接口 → 第四部分 NestFactory.create / collectControllers / executeRequestChain → 第五部分 使用示例」顺序阅读 `index.ts`。
3. 重点理解：`@Injectable()` 是触发 `design:paramtypes` 元数据生成的关键，没有它 DI 容器就无法知道构造函数依赖。
