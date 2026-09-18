# nestjs-basics —— 用真实 @nestjs/* 写一遍「入门篇」

`nestjs-mini` 是**手写的框架内核**（用来讲清装饰器 / DI / 请求处理链"内部怎么实现"）；
`nestjs-basics` 是**真实 NestJS 写出来的应用**（用来说清"业务代码该怎么写"）。

两者分工明确：讲**机制与原理**的代码块摘自 `nestjs-mini/index.ts`，讲**真实写法**的代码块摘自本目录。

## 目录结构

```
nestjs-basics/
├── src/
│   ├── main.ts                             # 应用入口：全局管道 / 守卫 / 拦截器 / 过滤器、原生中间件、监听端口
│   ├── app.module.ts                       # 根模块：imports + 自定义 Provider + APP_* 全局组件 + 中间件配置
│   ├── app.controller.ts                   # 根控制器：消费自定义 Provider（'GREETING' / 'DB_CONNECTION'）
│   ├── cache/
│   │   ├── cache.module.ts                 # 动态模块：forRoot / forRootAsync + DynamicModule
│   │   ├── cache.options.ts                # 动态模块的配置类型
│   │   └── cache.service.ts                # 内存缓存实现（无外部依赖，能真跑）
│   ├── common/                             # 请求处理链的各个组件
│   │   ├── auth.guard.ts                   # Guard：ExecutionContext、getHandler()、写 request.user
│   │   ├── roles.guard.ts                  # Guard：Reflector 读取 @Roles 元数据
│   │   ├── roles.decorator.ts              # SetMetadata 写标签
│   │   ├── logger.middleware.ts            # 类式中间件 + 函数式中间件
│   │   ├── logging.interceptor.ts          # Interceptor：tap 打印前后
│   │   ├── transform.interceptor.ts        # Interceptor：map 统一响应格式
│   │   ├── timing.interceptor.ts           # Interceptor：耗时统计
│   │   ├── parse-id.pipe.ts                # Pipe：自定义管道（只处理 :id 路径参数）
│   │   ├── http-exception.filter.ts        # Filter：@Catch(HttpException)
│   │   └── all-exceptions.filter.ts        # Filter：@Catch() 兜全部
│   ├── config/
│   │   ├── config.module.ts                # @Global() + useValue 提供 'CONFIG'
│   │   └── config.service.ts               # 读环境变量
│   ├── database/
│   │   ├── database.module.ts              # TypeOrmModule.forRoot（需要本地 MySQL，未接入 AppModule）
│   │   └── database.options.ts             # dev / prod 两套 DataSourceOptions（synchronize 的区别）
│   ├── greeting/greeting.service.ts        # useClass 绑定的那个类
│   ├── orders/
│   │   ├── orders.module.ts                # imports UsersModule / CacheModule + 函数式中间件
│   │   ├── orders.controller.ts            # 订单路由
│   │   ├── orders.service.ts               # 构造函数注入 + @Inject('CONFIG') + 复用 UsersService
│   │   └── order-transaction.service.ts    # QueryRunner 事务（需要数据库，未接入 AppModule）
│   ├── relations/relations.entity.ts       # 实体关系速查：一对多 / 多对一 / 多对多
│   └── users/
│       ├── users.module.ts                 # providers / exports
│       ├── users.controller.ts             # @Controller + 参数装饰器 + @HttpCode + @Redirect + @Use*
│       ├── admin.controller.ts             # @Roles('admin') + @UseGuards(RolesGuard)
│       ├── users.service.ts                # @Injectable + 应用生命周期钩子
│       ├── users.repository.module.ts      # TypeOrmModule.forFeature（需要数据库，未接入 AppModule）
│       ├── dto/create-user.dto.ts          # class-validator 声明式校验
│       ├── dto/update-user.dto.ts
│       └── entities/user.entity.ts         # TypeORM 实体
├── package.json
└── tsconfig.json
```

## 怎么跑起来

```bash
npm install     # 安装 @nestjs/* / typeorm / class-validator 等依赖
npm start       # ts-node src/main.ts，监听 3000
npm run build   # tsc 类型检查 + 产出 dist/
```

`tsconfig.json` 必须开启 `experimentalDecorators` 与 `emitDecoratorMetadata`——后者是 DI 容器能读到
`design:paramtypes` 的前提。

所有请求都要带 `Authorization` 头（`AuthGuard` 是全局守卫）：

```bash
curl http://localhost:3000/users
# → 403 {"code":403,"message":"Forbidden resource",...}

curl -H "Authorization: Bearer demo-token" http://localhost:3000/users
# → 200 {"code":0,"data":[{"id":1,"name":"张三",...}],"message":"success"}
```

## 预期行为（实测）

| 请求 | 结果 |
| --- | --- |
| `GET /`（无 Authorization） | `403 Forbidden resource`（全局 `AuthGuard` 拦下） |
| `GET /`（带 token） | `200 {"code":0,"data":"Hello, NestJS!","message":"success"}`（`TransformInterceptor` 统一包装） |
| `GET /users` | `200`，返回内存里的两个用户 |
| `GET /users/1` | `200`，单个用户 |
| `GET /users/999` | `404 {"code":404,"message":"用户 999 不存在",...}`（Service 抛 `NotFoundException`，被 Filter 统一成标准错误体） |
| `GET /users/abc` | `400 {"code":400,"message":"ID 必须是正整数",...}`（`ParseIdPipe` 校验失败） |
| `GET /users/1/detail?page=2` | `200`，回显 `@Param` / `@Query` / `@Headers` / `@Ip` |
| `GET /admin/users` | `200`（`@Roles('admin')` + `RolesGuard` 放行） |
| `POST /users` 合法体 | `201`（`@HttpCode(201)`），DTO 通过校验 |
| `POST /users` 带 `role` 字段 | `400 ["property role should not exist"]`（`forbidNonWhitelisted: true`） |
| `POST /users` 姓名字符过短 | `400 ["姓名至少 2 个字符"]`（class-validator 消息） |
| `POST /users` 邮箱格式错误 | `400 ["邮箱格式不正确"]` |
| `GET /orders/stats` | `200`，`OrdersService` 复用了 `UsersModule` 导出的 `UsersService` |
| `GET /users/legacy` | `301 Moved Permanently`（`@Redirect('/users', 301)`） |

## 哪些文件没有接入 AppModule

`src/database/`、`src/users/users.repository.module.ts`、`src/orders/order-transaction.service.ts` 需要
**本地 MySQL**，`TypeOrmModule.forRoot` 连不上会直接让应用启动失败，所以它们没有写进 `AppModule`。
它们的代码本身是完整可复制的：配好数据库后，把 `DatabaseModule`、`UsersRepositoryModule` 加进
`AppModule` 的 `imports` 即可。

`users.service.ts` 因此先用内存数组演示业务逻辑，接上数据库后把这一层换成注入 `Repository<User>` 即可。

## 和 nestjs-mini 的对照

| 能力 | nestjs-mini（手写内核） | nestjs-basics（真实框架） |
| --- | --- | --- |
| 装饰器 | 自己用 `Reflect.defineMetadata` 实现 `@Module` / `@Get` | 直接用 `@nestjs/common` 的装饰器 |
| DI 容器 | 手写 `Container.resolve` 递归解析 `design:paramtypes` | `@Injectable` + 构造函数注入，容器由框架提供 |
| 请求处理链 | 手写 `executeRequestChain`，靠方法名探测 | Guard / Pipe / Interceptor / Filter 各自独立成类，用装饰器或 `APP_*` 注册 |
| 路由 | `prefix + path` 拼字符串 + 正则匹配 | `RouterExplorer` 扫描元数据生成路由表 |
| 运行 | `npm start` → 单个 `index.ts` | `npm start` → `ts-node src/main.ts` |
