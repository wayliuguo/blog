# IoC 与依赖注入原理

> 你在 Controller 里写 `private readonly userService: UserService`，从不 `new`，它却能直接用。这一篇把"框架在背后到底做了什么"讲清楚——理解了它，NestJS 的 Module、Provider、`@Injectable()` 就不再是黑盒。
> 承上：[自定义装饰器](./01-自定义装饰器) —— 原理篇要从装饰器"写标签"说起，先看过如何用装饰器才懂 `design:paramtypes` 从哪来
> 启下：[环境管理与配置](../09-部署与工程化/01-环境管理与配置) —— 用 `registerAs` + `ConfigType` 把配置拆成强类型命名空间，让 `configService.get('app.port')` 返回 `number` 而非 `string`

---

## 从"为什么不需要 new"说起

假设没有 IoC，一个真实项目里的对象依赖会长成这样：

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

问题很明显：依赖之间互相缠绕，谁创建、谁先谁后、怎么共享同一个 `redis` 实例，全要人肉管理。对象一多，这张网就失控了。

> IoC（控制反转）要解决的，正是"对象创建与依赖装配的控制权该归谁"。答案是：**交给容器，而不是业务代码**。你只声明"我需要什么"，容器负责在合适的时机把它造好、装好、送过来。

## IoC 与 DI 的区别

这两个词经常被混用，但它们是不同层面的概念：

| 概念 | 角色 | 一句话 |
|------|------|--------|
| IoC（控制反转） | 思想 | 把"创建对象 + 管理依赖"的控制权，从业务代码反转给框架容器 |
| DI（依赖注入） | 实现方式 | 容器创建好依赖后，通过构造函数/属性"注入"给使用者 |

可以这样记：**IoC 是"为什么要交出去"的设计哲学，DI 是"怎么交出去"的具体技术**。NestJS 用 DI 来实现 IoC：你声明依赖，框架在启动时扫描、实例化、注入。

```typescript
// 有 NestJS：只声明，不创建
@Controller('users')
export class UserController {
    // 这行 = "我需要一个 UserService 实例"，由容器注入
    constructor(private readonly userService: UserService) {}
}
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

```typescript
// 自定义 Token（用 Symbol 或字符串）
export const CONFIG = Symbol('CONFIG')

@Module({
    providers: [
        { provide: CONFIG, useValue: { jwtSecret: 'my-secret', expiresIn: '15m' } },
    ],
})
export class AppModule {}

// 使用方必须用 @Inject 指名 Token
@Injectable()
export class AuthService {
    constructor(@Inject(CONFIG) private config: { jwtSecret: string }) {}
}
```

> 决策模型：普通类依赖用默认 Token 即可；注入配置/第三方实例/需要条件创建的对象时，用 `useValue`/`useFactory` + `@Inject()` 自定义 Token。

## Provider 作用域（Scope）

同一个 Provider 在容器里有几种"存活方式"，由 `@Injectable({ scope })` 控制：

| 作用域 | 值 | 实例生命周期 | 使用场景 |
|--------|------|--------------|----------|
| Singleton（默认） | `Scope.DEFAULT` | 整个应用一个实例，所有请求共享 | 绝大多数无状态服务（UserService 等） |
| Request | `Scope.REQUEST` | 每个请求新建一个实例 | 需要绑定请求上下文（如按租户隔离） |
| Transient | `Scope.TRANSIENT` | 每次注入都新建实例 | 有状态、不可共享的工具类 |

```typescript
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
    // 每个请求一个独立实例，可安全存当前请求的信息
}
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

```typescript
// 提供方 Module：注册 + 导出
@Module({
    providers: [XxxService],
    exports: [XxxService],
})
export class XxxModule {}

// 使用方 Module：imports 引入
@Module({
    imports: [XxxModule],
    controllers: [YyyController],
})
export class YyyModule {}
```

> 口诀：**要被用，先注册；要跨模块，先导出；要用别人，先导入**。三步走完还报错，再检查 `emitDecoratorMetadata` 是否开启、构造参数类型是否可解析（比如用了接口而非具体类却没给 Token）。

---

## 面试题

### Q1: IoC 和 DI 的区别是什么？

IoC（控制反转）是设计思想：把对象创建与依赖管理的控制权交给容器。DI（依赖注入）是实现方式：容器创建好依赖后通过构造函数注入给使用者。IoC 回答"为什么交出去"，DI 回答"怎么交出去"。

### Q2: 为什么 NestJS 必须开启 `emitDecoratorMetadata`？

只有开启它，TypeScript 才会在编译产物里生成 `design:paramtypes` 元数据，记录构造函数的参数类型。NestJS 依赖这份元数据来解析"该注入哪个类型的实例"，否则会报"无法解析依赖"。

### Q3: 为什么类上要加 `@Injectable()`？

`@Injectable()` 把类登记为"可被容器管理的 Provider"。没有它，容器不认识这个类，不会为其创建实例，注入时就会失败。

### Q4: Provider 的 Singleton / Request / Transient 作用域有什么区别？

Singleton（默认）整个应用一个实例、所有请求共享；Request 每个请求一个实例，适合绑定请求上下文；Transient 每次注入都新建实例，适合有状态不可共享的对象。Request/Transient 会增加开销且不能被 Singleton 依赖。

### Q5: 出现循环依赖导致启动失败，怎么办？

用 `forwardRef()` 打破依赖环：在相互引用的两侧用 `forwardRef(() => XxxModule)` 延迟引用，并在 Provider 构造参数用 `@Inject(forwardRef(() => XxxService))`。更优解是重构，让依赖单向化。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/nestjs-mini`。

| 文件 | 演示什么 |
| --- | --- |
| `index.ts` | Container 的 collectProviders / resolve 实现 |
| `app.module.ts` | 真实项目里的模块图 |

运行方式见 `nestjs-mini/README.md`。

---

## 参考

- 上一篇：[认证进阶：双 Token 与多设备会话](./11-认证进阶-双Token与多设备会话)
- 下一篇：[环境管理与配置](../09-部署与工程化/01-环境管理与配置)
