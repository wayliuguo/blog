## 什么是 AOP？

**AOP 即面向切面编程，是一种编程范式，它允许开发者将横切关注点（Cross-Cutting Concerns）从核心业务逻辑中分离出来。**

**AOP 的好处：**

- **关注点分离**：核心业务逻辑和横切关注点被清晰地分开，代码更纯净、更易于理解。
- **代码复用**：横切关注点的代码被集中在一个地方，可以被多个地方复用。
- **易于维护**：当需要修改横切逻辑（如改变日志格式）时，只需修改一个地方。
- **增强代码的可读性和可测试性**。

**核心业务逻辑**：例如，用户管理中的 “创建用户”、“查询用户”；订单管理中的 “创建订单”、“支付订单”。这些是应用的核心功能。

**横切关注点**：是那些散布在多个核心业务逻辑中的通用功能。例如：

- **日志记录**：在多个方法调用前后记录日志。
- **性能监控**：计算多个方法的执行时间。
- **安全认证 / 授权**：在执行某些方法前检查用户权限。
- **事务管理**：在方法执行前后开启 / 提交事务。
- **异常处理**：统一捕获和处理多个方法可能抛出的异常。

如果不使用 AOP，这些横切关注点的代码会散布在各个业务方法中，造成**代码冗余**和**维护困难**。



## AOP的核心概念

为了实现这种分离，AOP 引入了几个关键术语：

1. **切面 (Aspect)**：封装横切关注点的模块。例如，一个 `LoggingAspect` 类，里面包含了所有与日志相关的代码。

2. **连接点 (Join Point)**：程序执行过程中的一个特定点，如方法的调用、异常的抛出等。在 Nest.js 中，连接点通常是控制器的方法或服务的方法。

3. 通知 (Advice)

   ：切面在特定连接点执行的代码。通知定义了 “何时” 和 “做什么”。

   - **前置通知 (Before)**：在连接点执行之前执行。
   - **后置通知 (After)**：在连接点执行之后（无论成功或失败）执行。
   - **返回通知 (After Returning)**：在连接点成功执行并返回结果后执行。
   - **异常通知 (After Throwing)**：在连接点抛出异常后执行。
   - **环绕通知 (Around)**：这是最强大的通知，它包裹了连接点，可以在其之前和之后执行自定义行为，甚至可以控制连接点是否执行。

4. **切入点 (Pointcut)**：一个表达式，用于匹配哪些连接点会被通知。例如，“匹配所有 `UserController` 中的方法” 或 “匹配所有带有 `@Loggable` 装饰器的方法”。



## AOP 在 Nest.js 中的实现

Nest.js 并没有使用像 AspectJ 那样的字节码增强技术，而是巧妙地利用了**装饰器**和**拦截器**（Interceptor）、**守卫**（Guard）、**过滤器**（Filter）、**管道**（Pipe）等核心构件来实现 AOP 的思想。

- **拦截器 (Interceptor)**：这是 Nest.js 中实现 AOP 最主要的方式，特别是环绕通知。它可以在目标方法执行前后插入逻辑，并可以修改请求和响应。
- **守卫 (Guard)**：主要用于实现 “前置通知”，在方法执行前进行权限检查。
- **异常过滤器 (Exception Filter)**：用于实现 “异常通知”，统一捕获和处理应用中抛出的异常。
- **管道 (Pipe)**：用于实现 “前置通知”，在方法执行前对输入数据进行验证和转换。
- **自定义装饰器**：常常与上述构件配合使用，作为切入点的标记。例如，你可以创建一个 `@RequireAuth()` 装饰器，然后让守卫只对带有此装饰器的方法进行权限校验。

### 示例：用拦截器实现日志切面

```
// logging.interceptor.ts (切面 + 通知)
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  // intercept 方法就是环绕通知的实现
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    console.log(`[Before] ${method} ${url}...`); // 前置通知逻辑

    // next.handle() 会触发目标方法的执行
    return next.handle().pipe(
      tap(() => 
        console.log(`[After] ${method} ${url} completed in ${Date.now() - now}ms`) // 返回通知逻辑
      ),
    );
  }
}
```

### 应用切面

```
// app.module.ts (配置切入点)
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR, // 将拦截器注册为全局拦截器（切入点：所有方法）
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

## Nest AOP执行顺序

当一个请求到达 Nest.js 应用时，会按照以下顺序执行各种 AOP 组件：

1. **中间件（Middleware）**
2. **守卫（Guard）**
3. **拦截器（Interceptor）- 前置处理**
4. **管道（Pipe）**
5. **控制器（Controller）和服务（Service）**
6. **拦截器（Interceptor）- 后置处理**
7. **异常过滤器（Exception Filter）**