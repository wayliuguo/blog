# IOC 与依赖注入

> 依赖注入（DI）是 NestJS 最核心的特性之一，理解它就能理解 NestJS 的设计思想。

---

## 为什么需要 DI

### 传统做法：手动 new 依赖

> 摘自 `./code/nestjs-basics/src/di/manual-wiring.ts`（反面示例，随项目一起 `npm run build` 编译；真实示例见下方各节）

```typescript
class UserService {
    findAll() {
        return [{ id: 1, name: '张三' }]
    }
}

class UserController {
    private userService = new UserService()  // 手动创建

    getUsers() {
        return this.userService.findAll()
    }
}
```

**问题**：
- 紧耦合：`UserController` 直接依赖 `UserService` 的具体实现
- 难测试：无法替换为 Mock 对象
- 难维护：修改构造方式要改所有地方

### DI 做法：声明依赖，框架注入

> 摘自 `./code/nestjs-basics/src/users/users.controller.ts`（运行：`npm start`）

```typescript
export class UsersController {
    constructor(private readonly usersService: UsersService) {}  // 声明依赖
// …
    findAll(): User[] {
        return this.usersService.findAll()
    }
// …
}
```

NestJS 会自动创建 `UsersService` 实例并注入到 `UsersController` 中——`this.usersService` 从来不用自己赋值。

## @Injectable 装饰器

`@Injectable()` 标记一个类可以被 NestJS 的 DI 容器管理：

> 摘自 `./code/nestjs-basics/src/users/users.service.ts`（运行：`npm start`）

```typescript
@Injectable()
export class UsersService implements OnModuleInit, OnApplicationShutdown {
// …
    findAll(): User[] {
        return this.users
    }
// …
}
```

实测输出（`npm start` 启动日志节选，`onModuleInit` 钩子被框架调用）：

```
UsersService 初始化
```

## 构造函数注入

> 摘自 `./code/nestjs-basics/src/orders/orders.service.ts`（运行：`npm start`）

```typescript
@Injectable()
export class OrdersService {
// …
    constructor(
        private readonly usersService: UsersService,                 // NestJS 自动注入
        @Inject('CONFIG') private readonly config: { port: number } // 通过 token 注入
    ) {}
// …
}
```

实测输出（`curl -H "Authorization: Bearer demo-token" http://localhost:3000/orders/stats`，`port` 来自 `@Inject('CONFIG')`、`users` 来自注入的 `UsersService`）：

```
{"code":0,"data":{"orders":0,"users":2,"port":3000},"message":"success"}
```

## 依赖注入容器原理

DI 容器简化理解：

```
容器（Container）
    ↓
发现 @Injectable 标记的类
    ↓
分析构造函数的参数类型
    ↓
递归创建依赖的实例
    ↓
注入到构造函数中
    ↓
返回创建好的实例
```

### 示例流程

上面这套流程，`nestjs-mini` 用一个 `Container.resolve` 就写完了——它读 TypeScript 编译出来的 `design:paramtypes`（构造函数参数类型的元数据），递归把依赖造出来再 `new`：

> 摘自 `./code/nestjs-mini/index.ts`（运行：`npm start`，`ts-node index.ts`）

```typescript
    resolve<T>(token: any): T {
        // 单例检查：如果已经创建过，直接返回
        // 这保证了整个应用中同一个 Provider 只有一个实例
        if (this.instances.has(token)) {
            return this.instances.get(token)
        }
// …
        // 关键步骤：读取构造函数的参数类型
        // design:paramtypes 是 TypeScript 编译时自动生成的元数据
        // 例如 constructor(userService: UserService) 会生成 [UserService]
        // 注意：只有被装饰器修饰的类才会生成这个元数据
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', token) || []
// …
        // 递归解析每个参数的依赖
        // 比如 paramTypes = [UserService, Logger]
        // 就会调用 resolve(UserService) 和 resolve(Logger)
        const args = paramTypes.map(paramType => this.resolve(paramType))
// …
        // 用解析好的依赖实例化类
        // 等价于 new token(arg1, arg2, ...)
        const instance = new token(...args)
// …
    }
```

对照开头的五步：**发现**（`@Injectable` / 装饰器让类被扫到）、**分析**（读 `design:paramtypes`）、**递归**（`paramTypes.map(...)`）、**注入并返回**（`new token(...args)` 后缓存成单例）。

实测输出（`nestjs-mini` 目录下 `npm start`，控制器能被实例化、路由能登记，就说明 `container.resolve` 把 `UserService` 造出来并注入成功了）：

```
最小 NestJS 运行在 http://localhost:3000
  GET    /users      → 查询所有用户
  GET    /users/:id  → 查询单个用户
  POST   /users      → 创建用户（body: {"name":"王五","email":"ww@test.com"}）
```

## 自定义 Provider

除了使用 `@Injectable`，还可以通过自定义 Provider 控制实例化方式。先看 `useClass` 与 `useFactory`：

> 摘自 `./code/nestjs-basics/src/app.module.ts`（运行：`npm start`）

```typescript
    providers: [
        GreetingService,
        // useClass：Token 是字符串 'GREETING'，Nest 会 new GreetingService() 后挂到这个 Token 上
        { provide: 'GREETING', useClass: GreetingService },
        // useFactory：需要运行时逻辑（或异步）时用，inject 声明工厂函数的依赖
        {
            provide: 'DB_CONNECTION',
            useFactory: (config: ConfigService) => ({ host: config.get('DB_HOST') }),
            inject: [ConfigService]
        },
// …
    ]
```

再看 `useValue`——它把一份现成的常量/配置对象挂到 Token 上：

> 摘自 `./code/nestjs-basics/src/config/config.module.ts`（运行：`npm start`）

```typescript
@Module({
    providers: [
        ConfigService,
        // useValue：注入常量或配置对象，取值要配 @Inject('CONFIG')
        { provide: 'CONFIG', useValue: { port: 3000 } }
    ],
    exports: [ConfigService, 'CONFIG']
})
export class ConfigModule {}
```

### 使用自定义 Provider

Provider 声明好了，取用方在构造函数里用 `@Inject('TOKEN')` 取值：

> 摘自 `./code/nestjs-basics/src/app.controller.ts`（运行：`npm start`）

```typescript
@Controller()
export class AppController {
    constructor(
        @Inject('GREETING') private readonly greetingService: GreetingService,
        @Inject('DB_CONNECTION') private readonly db: { host: string },
        private readonly cacheService: CacheService
    ) {}
// …
}
```

实测输出（`curl -H "Authorization: Bearer demo-token" http://localhost:3000/`，`greetingService` 就是 `useClass` 挂上去的那个实例）：

```
{"code":0,"data":"Hello, NestJS!","message":"success"}
```

## 小结

- **为什么需要 DI**：手动 `new` 紧耦合、难替换 Mock 做单测、改构造方式要改所有调用点；DI 改为在构造函数声明 `private readonly userService: UserService`，实例由容器创建并注入
- **两个装饰器与一行声明**
  - `@Injectable()` 的作用：把类登记进 DI 容器的"可注入"名单，没有它容器不认识这个类
  - 构造函数注入一行三用：`private readonly userService: UserService` 同时声明字段、类型和依赖
  - 按 Token 注入：非类依赖（如配置对象）用 `@Inject('CONFIG')` 取值
- **DI 容器装配依赖**：发现（`@Injectable` 标记）→ 分析（读构造函数参数类型）→ 递归（先创建依赖实例）→ 注入并返回（塞进构造函数）
- **三种自定义 Provider**
  1. `useClass`：`{ provide: UserService, useClass: UserService }`，Token 即类，最常用
  2. `useValue`：`{ provide: 'CONFIG', useValue: { port: 3000 } }` 注入常量或配置对象，取值配 `@Inject('CONFIG')`
  3. `useFactory`：`{ provide: 'DB_CONNECTION', useFactory: cfg => ..., inject: [ConfigService] }` 用于运行时逻辑或异步实例

---

## 配套代码

本篇的可运行示例分两个项目：`nestjs-mini` 手写 DI 容器讲"内部怎么实现"，`nestjs-basics` 用真实 `@nestjs/*` 讲"业务里怎么写"。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/nestjs-mini/index.ts` | 依赖注入容器原理 · 示例流程 | 手写 `Container.resolve`：读 `design:paramtypes` 递归构造依赖 + `instances` Map 做单例缓存 |
| `./code/nestjs-basics/src/di/manual-wiring.ts` | 为什么需要 DI（传统做法：手动 new 依赖） | 反面示例：自己 `new`、自己组装依赖链，耦合重且无法替换 Mock |
| `./code/nestjs-basics/src/users/users.controller.ts` | 为什么需要 DI（DI 做法：声明依赖，框架注入） | 构造函数一行 `private readonly usersService: UsersService` 声明依赖 |
| `./code/nestjs-basics/src/users/users.service.ts` | @Injectable 装饰器 | `@Injectable()` 标记 + `OnModuleInit` / `OnApplicationShutdown` 应用生命周期钩子 |
| `./code/nestjs-basics/src/orders/orders.service.ts` | 构造函数注入 | 普通依赖自动注入 + `@Inject('CONFIG')` 按 Token 注入，两者写法并列 |
| `./code/nestjs-basics/src/app.module.ts` | 自定义 Provider | `useClass` 把类挂到字符串 Token、`useFactory` 配 `inject` 做运行时构造 |
| `./code/nestjs-basics/src/config/config.module.ts` | 自定义 Provider · 使用自定义 Provider | `useValue` 提供 `'CONFIG'`，并用 `exports` 让它对别的模块可见 |
| `./code/nestjs-basics/src/app.controller.ts` | 使用自定义 Provider | 消费方用 `@Inject('GREETING')` / `@Inject('DB_CONNECTION')` 取值 |

运行方式见 `nestjs-mini/README.md`、`nestjs-basics/README.md`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[快速上手](./快速上手)
- 下一篇：[模块与提供器](./模块与提供器)