# IoC 与依赖注入原理

> 你在 Controller 里写 `private readonly userService: UserService`，从不 `new`，它却能直接用。这一篇把"框架在背后到底做了什么"讲清楚——理解了它，NestJS 的 Module、Provider、`@Injectable()` 就不再是黑盒。

---

## 从"为什么不需要 new"说起

假设没有 IoC，一个真实项目里的对象依赖会长成这样：

> 摘自 `./code/advanced-lab2/src/12-ioc-di.ts`（运行：`npm run 12ioc`）

```typescript
// 没有 IoC：你手动 new 出整条依赖网，越写越乱
const redis = new Redis()
const userRepo = new UserRepository(redis)
const emailService = new EmailService(redis)
const userService = new UserService(userRepo, emailService)
const authService = new AuthService(userService, emailService, redis)
const userController = new UserController(userService)
// 改一个构造参数，上面全要跟着改
```

实测输出（`npm run 12ioc`）：

```
=== 1) 手动 new：整条依赖网自己拼 ===
为了拿到 userController，一共 new 了 6 个对象
redis 是同一个实例（全靠人肉传同一个变量）：true
```

"共享同一个 redis"这种事，全靠记得把同一个变量往下传；漏传一次就会多出一个连接。

问题很明显：依赖之间互相缠绕，谁创建、谁先谁后、怎么共享同一个 `redis` 实例，全要人肉管理。对象一多，这张网就失控了。

> IoC（控制反转）要解决的，正是"对象创建与依赖装配的控制权该归谁"。答案是：**交给容器，而不是业务代码**。你只声明"我需要什么"，容器负责在合适的时机把它造好、装好、送过来。

## IoC 与 DI 的区别

这两个词经常被混用，但它们是不同层面的概念：

| 概念 | 角色 | 一句话 |
|------|------|--------|
| IoC（控制反转） | 思想 | 把"创建对象 + 管理依赖"的控制权，从业务代码反转给框架容器 |
| DI（依赖注入） | 实现方式 | 容器创建好依赖后，通过构造函数/属性"注入"给使用者 |

可以这样记：**IoC 是"为什么要交出去"的设计哲学，DI 是"怎么交出去"的具体技术**。NestJS 用 DI 来实现 IoC：你声明依赖，框架在启动时扫描、实例化、注入。

> 摘自 `./code/advanced-lab2/src/12-ioc-di.ts`（运行：`npm run 12ioc`）

```typescript
// 有 NestJS：只声明，不创建
@Controller('users')
export class UserController {
    // 这行 = "我需要一个 UserService 实例"，由容器注入
    constructor(private readonly userService: UserService) {}
}
```

容器把 `UserService` 造好塞进来，`UserController` 里始终没有 `new` 的字样——脚本里直接用容器把注入结果取出来验证：

实测输出（`npm run 12ioc`）：

```
=== 2) 容器按类型注入：UserController 从没 new 过 UserService ===
app.get(UserController).userService instanceof UserService = true
```

## NestJS 怎么知道要注入 UserService

你只写了一个类型 `UserService`，NestJS 凭什么知道该 new 哪个类、往哪塞？整条链路是这样的：

```
TypeScript 装饰器(@Injectable/@Controller)
    → 编译时 emit 元数据 design:paramtypes（记录构造参数类型）
    → reflect-metadata 把元数据挂到类上
    → NestJS Dependency Scanner 启动扫描
    → IoC Container 按类型解析并实例化依赖
    → 注入到使用方
```

关键点有两个：

1. **为什么需要 `@Injectable()`**：它不只是个标记，它让这个类进入 NestJS 的"可被注入"名单。没有它，容器不认识这个类，不会为它建实例。
2. **为什么必须开启 `emitDecoratorMetadata`**：这是 `tsconfig.json` 里的编译选项。只有开启它，TypeScript 才会在编译产物里生成 `design:paramtypes` 元数据，记录构造函数参数的类型。NestJS 正是靠这份元数据，才知道 `UserController` 的构造参数第 0 个位置需要 `UserService` 类型。

```jsonc
// tsconfig.json（NestJS 默认已开，别手滑关掉）
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

> 心智模型：`@Injectable()` 告诉容器"我能当零件"，`emitDecoratorMetadata` 让容器"看得见零件的长相（类型）"。两者缺一不可，否则运行时会报"Nest can't resolve dependencies"。

## Provider Token 与四种声明方式

一个 Provider 在容器里是以"Token"为键登记的。默认情况下 Token 就是类本身，但你可以显式声明，应对接口、配置值、工厂等场景：

| 声明方式 | 写法 | 适用场景 |
|----------|------|----------|
| `useClass` | `{ provide: UserService, useClass: UserService }` | 最常用，Token 即类 |
| `useValue` | `{ provide: 'CONFIG', useValue: { secret: 'x' } }` | 注入常量/配置对象 |
| `useFactory` | `{ provide: Repo, useFactory: () => new Repo(...) }` | 需要运行时逻辑/异步/依赖其他 Provider |
| `useExisting` | `{ provide: 'Alias', useExisting: RealService }` | 给同一个实例起别名 |

当 Token 不是类（比如字符串、`Symbol`）时，使用方要用 `@Inject()` 显式指名：

> 摘自 `./code/advanced-lab2/src/12-ioc-di.ts`（运行：`npm run 12ioc`）

```typescript
// 自定义 Token（用 Symbol 或字符串）
export const CONFIG = Symbol('CONFIG')

@Module({
    providers: [
        { provide: CONFIG, useValue: { jwtSecret: 'my-secret', expiresIn: '15m' } }
    ]
})
export class AppModule {}

// 使用方必须用 @Inject 指名 Token
@Injectable()
export class AuthService {
    constructor(@Inject(CONFIG) private config: { jwtSecret: string }) {}
}
```

`useValue` 提供的是一个现成对象，所以"注入进去的"和"容器里那个"必须是同一个引用；`useExisting` 起别名也是同理：

实测输出（`npm run 12ioc`）：

```
=== 3) 自定义 Token ===
app.get(CONFIG) = {"jwtSecret":"my-secret","expiresIn":"15m"}
AuthService 注入到的是同一个对象：true
useExisting 起的别名与本体同源：true
```

> 决策模型：普通类依赖用默认 Token 即可；注入配置/第三方实例/需要条件创建的对象时，用 `useValue`/`useFactory` + `@Inject()` 自定义 Token。

## Provider 作用域（Scope）

同一个 Provider 在容器里有几种"存活方式"，由 `@Injectable({ scope })` 控制：

| 作用域 | 值 | 实例生命周期 | 使用场景 |
|--------|------|--------------|----------|
| Singleton（默认） | `Scope.DEFAULT` | 整个应用一个实例，所有请求共享 | 绝大多数无状态服务（UserService 等） |
| Request | `Scope.REQUEST` | 每个请求新建一个实例 | 需要绑定请求上下文（如按租户隔离） |
| Transient | `Scope.TRANSIENT` | 每次注入都新建实例 | 有状态、不可共享的工具类 |

> 摘自 `./code/advanced-lab2/src/12-ioc-di.ts`（运行：`npm run 12ioc`）

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
    // 每个请求一个独立实例，可安全存当前请求的信息
    private static counter = 0
    readonly seq = ++RequestContext.counter
}
```

三种作用域的差别可以直接量出来：脚本里让一个控制器同时注入两个使用方（各自依赖同一组三个 Provider），然后连请求两次 `/scope`，把实例编号打出来：

实测输出（`npm run 12ioc`，`{"default":[序号1,序号2],"request":[…],"transient":[…]}`）：

```
=== 4) 作用域：同一个接口连请求两次，看 seq 变化 ===
  第一次 /scope -> 200 {"default":[1,1],"request":[1,1],"transient":[1,2]}
  第二次 /scope -> 200 {"default":[1,1],"request":[2,2],"transient":[3,4]}
  default  两次都是同一组序号 → DEFAULT 是单例，请求间共享
  request  每次请求序号都变、但请求内两个使用方拿到同一个 → 每请求一份
  transient 同一请求内两个使用方的序号就不同 → 每次注入都新建
```

> 注意：Request/Transient 作用域会**绕过 Singleton 的复用**，在高频接口上会增加创建开销，且无法被 Singleton 依赖（否则作用域语义冲突）。默认用 Singleton，只有在确实需要"每请求一份状态"时才上 Request。

## NestJS 启动流程（文字图）

把上面串起来，一次 `NestFactory.create` 内部大致是这样：

```
main.ts
  → NestFactory.create(AppModule)
    → 扫描 Module 树（分析 imports / providers / controllers）
    → 收集所有 Provider 与 Controller 的元数据
    → 建立依赖关系图（谁依赖谁）
    → 创建 IoC Container
    → 按依赖顺序实例化 Provider（先依赖后使用方）
    → 把实例注入到 Controller / 其他 Provider
    → 绑定路由、Guard、Pipe 等
    → 启动 HTTP Server（监听端口）
```

> 这就是为什么循环依赖会直接让启动失败：依赖图里出现环，容器无法确定"先实例化谁"。遇到循环依赖要用 `forwardRef()` 打破。

## DI 报错排查三步法

运行报 `Nest can't resolve dependencies of the XxxService (???)` 时，按下面三步自查：

```
① 该 Provider 是否在 providers 里注册？
   → 没注册就加：providers: [XxxService]

② 它来自别的 Module？是否通过 exports 导出？
   → 提供方 Module 要 exports: [XxxService]

③ 使用方所在的 Module 是否 imports 了提供方 Module？
   → 使用方 Module 要 imports: [XxxModule]
```

> 摘自 `./code/advanced-lab2/src/12-ioc-di.ts`（运行：`npm run 12ioc`）

```typescript
// 提供方 Module：注册 + 导出
@Module({
    providers: [XxxService],
    exports: [XxxService]
})
export class XxxModule {}

// …

// 使用方 Module：imports 引入
@Module({
    imports: [XxxModule],
    controllers: [YyyController]
})
export class YyyModule {}
```

三步对齐之后，使用方 Module 里就能直接注入 `XxxService` 了——脚本里跑的正是这个组合：

实测输出（`npm run 12ioc`）：

```
=== 5) 跨模块注入（IocDemoModule imports XxxModule 并拿到 exports 的 XxxService）===
app.get(XxxService).tag = xxx-service
```

而三步里只要漏掉第一步（把 `UserService` 从 `providers` 里删掉），启动时立刻就是这个报错——它把三步法里的问题直接问了一遍：

实测输出（`npm run 12ioc`，脚本里注释掉 `UserService` 这一行 provider 后的启动日志；为便于阅读去掉了终端颜色码）：

```
[Nest] 10500  - 2026/09/17 15:43:20   ERROR [ExceptionHandler] UnknownDependenciesException [Error]: Nest can't resolve dependencies of the UserController (?). Please make sure that the argument UserService at index [0] is available in the IocDemoModule module.

Potential solutions:
- Is IocDemoModule a valid NestJS module?
- If UserService is a provider, is it part of the current IocDemoModule?
- If UserService is exported from a separate @Module, is that module imported within IocDemoModule?
  @Module({
    imports: [ /* the Module containing UserService */ ]
  })
```

> 口诀：**要被用，先注册；要跨模块，先导出；要用别人，先导入**。三步走完还报错，再检查 `emitDecoratorMetadata` 是否开启、构造参数类型是否可解析（比如用了接口而非具体类却没给 Token）。

## 小结

- **IoC 与 DI 的两层**：手动 new 整条依赖网，改动牵一发动全身；IoC 是"为何交控制权给容器"的思想，DI 是"怎么交出去"的实现
- **容器看得见依赖的前提**：装饰器 emit `design:paramtypes` → `reflect-metadata` 挂类 → 启动扫描 → 容器解析注入；`@Injectable()` 与 `emitDecoratorMetadata` 缺一不可，否则 `Nest can't resolve dependencies`
- **Provider 四种声明**
  1. **`useClass`**：Token 即类，最常用
  2. **`useValue`**：注入常量/配置对象
  3. **`useFactory`**：需运行时逻辑/异步/依赖其他 Provider
  4. **`useExisting`**：给同一实例起别名
  - 非类 Token(字符串/`Symbol`)须 `@Inject` 指名才能对上
- **作用域 Scope**
  1. **`DEFAULT`(Singleton)**：全应用一实例，无状态服务默认
  2. **`REQUEST`**：每请求新建，绑请求上下文(如租户隔离)
  3. **`TRANSIENT`**：每次注入新建，有状态不可共享工具类
  - 代价：绕过复用增创建开销，且不可被 Singleton 依赖
- **启动流程与循环依赖**：`NestFactory.create` 扫 Module 树→建依赖图→建容器→按序实例化注入→绑路由/Guard/Pipe→起 HTTP Server；依赖图成环启动直接失败，用 `forwardRef()` 打破
- **DI 报错三步法**：①该 Provider 是否注册 ②跨模块是否 `exports` 导出 ③使用方是否 `imports`；仍报错查 `emitDecoratorMetadata` 与构造参数类型是否可解析(接口没给 Token)

---

## 配套代码

本篇的可运行示例在仓库 `node/NestJS 入门/code/nestjs-mini`。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/advanced-lab2/src/12-ioc-di.ts` | 手动 new 的代价、容器按类型注入、自定义 Token（`useValue`/`useFactory`/`useExisting`）、三种作用域对照、跨模块注入、真实报错复现 | 从"为什么不需要 new"说起 · IoC 与 DI 的区别 · NestJS 怎么知道要注入 UserService · Provider Token 与四种声明方式 · Provider 作用域（Scope） · DI 报错排查三步法 |
| `../NestJS 入门/code/nestjs-mini/index.ts` | 手写 `Container`：读 `design:paramtypes` 递归注入 + 单例缓存 | NestJS 启动流程（文字图） |
| `./code/nestjs-template/src/app.module.ts` | 真实项目里的模块图：`ConfigModule` + `TypeOrmModule.forRootAsync` + 全局 Provider | NestJS 启动流程（文字图） |

运行方式见 `advanced-lab2/README.md`。

---

## 参考

- 本模块总结：[总结](../NestJS%20入门/总结.md)
- 本模块面试题：[面试题](../NestJS%20入门/面试题.md)
- 上一篇：[认证进阶：双 Token 与多设备会话](./认证进阶-双Token与多设备会话)
- 下一篇：[环境管理与配置](../部署与工程化/环境管理与配置)
