# IOC 与依赖注入

> 依赖注入（DI）是 NestJS 最核心的特性之一，理解它就能理解 NestJS 的设计思想。
> 承上：[快速上手](./01-快速上手) —— 先跑起一个项目，否则无法直观感受"为什么不用 new"
> 启下：[模块与提供器](./03-模块与提供器) —— 用 `@Module` 的 imports/exports 把多个业务模块拆开，并让一个模块的服务被另一个模块复用

---

## 为什么需要 DI

### 传统做法：手动 new 依赖

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

```typescript
class UserController {
    constructor(private readonly userService: UserService) {}  // 声明依赖

    getUsers() {
        return this.userService.findAll()
    }
}
```

NestJS 会自动创建 `UserService` 实例并注入到 `UserController` 中。

## @Injectable 装饰器

`@Injectable()` 标记一个类可以被 NestJS 的 DI 容器管理：

```typescript
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserService {
    findAll() {
        return [{ id: 1, name: '张三' }]
    }
}
```

## 构造函数注入

```typescript
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService,  // NestJS 自动注入
        @Inject('CONFIG') private config: any,      // 通过 token 注入
    ) {}

    @Get()
    findAll() {
        return this.userService.findAll()
    }
}
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

```typescript
// 1. 容器发现 UserController 需要 UserService
// 2. 检查 UserService 是否有 @Injectable
// 3. 创建 UserService 实例
// 4. 将 UserService 注入到 UserController
// 5. 返回 UserController 实例
```

## 自定义 Provider

除了使用 `@Injectable`，还可以通过自定义 Provider 控制实例化方式：

```typescript
// useClass：指定类
{
    provide: UserService,
    useClass: UserService
}

// useValue：指定值
{
    provide: 'CONFIG',       // 使用字符串 token
    useValue: { port: 3000 }
}

// useFactory：使用工厂函数
{
    provide: 'DB_CONNECTION',
    useFactory: (config: ConfigService) => {
        return createConnection(config.get('db'))
    },
    inject: [ConfigService]
}
```

### 使用自定义 Provider

```typescript
@Module({
    providers: [
        UserService,
        { provide: 'CONFIG', useValue: { port: 3000 } }
    ]
})
export class AppModule {}

// 使用
@Controller()
export class AppController {
    constructor(@Inject('CONFIG') private config: { port: number }) {}
}
```

---

## 面试题

### Q1: 依赖注入的好处是什么？

降低耦合度（类不直接创建依赖，只声明需要什么）、提高可测试性（可以注入 Mock 对象）、提高代码可维护性（修改依赖实现方式不影响使用者）。

### Q2: `@Injectable()` 和 `@Controller()` 的区别？

`@Controller()` 标记一个类为控制器，负责处理请求和返回响应，它本身也是一个 Provider。`@Injectable()` 标记一个类为普通的 Provider，可以被注入到其他类中。两者最终都由 DI 容器管理。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/nestjs-mini`。

| 文件 | 演示什么 |
| --- | --- |
| `index.ts` | DI 容器的最小实现 |
| `app.module.ts` | 真实模块装配 |

运行方式见 `nestjs-mini/README.md`。

---

## 参考

- 上一篇：[快速上手](./01-快速上手)
- 下一篇：[模块与提供器](./03-模块与提供器)