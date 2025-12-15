## 理解 ExecutionContext 的核心

ExecutionContext接口扩展了 ArgumentsHost，这意味着它首先拥有了处理不同底层平台（HTTP, WebSockets, RPC）参数的能力 。在此基础之上，它新增了两个关键方法，让你能洞察“当前正在执行什么”：

- `getHandler(): Function`：返回一个引用，指向当前请求路由处理器（即控制器中被调用的那个方法
- `getClass<T>(): Type<T>`：返回当前控制器类的类型 

```
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 切换到HTTP上下文
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest(); // 获取Express/Fastify请求对象
    const response = httpContext.getResponse();

    // 打印当前路由信息
    console.log('当前控制器:', context.getClass().name);
    console.log('当前方法:', context.getHandler().name);

    return true; // 返回true允许访问，false拒绝
  }
}
```

## ExecutionContext 实战应用

### 在守卫中实现基于角色的授权

#### 创建自定义元数据装饰器

```
import { SetMetadata } from '@nestjs/common';

// 定义元数据key：'roles'
export const ROLES_KEY = Symbol('roles');
// 装饰器：@Roles('admin', 'user')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

#### 使用装饰器标记控制器或方法

```
// cats.controller.ts
import { Controller, Post } from '@nestjs/common';
import { Roles } from './roles.decorator';

@Controller('cats')
@Roles('admin') // 在控制器级别设置默认角色
export class CatsController {
  @Post()
  @Roles('super-admin') // 在方法级别覆盖或追加角色
  async create() {
    // ... 创建猫猫的逻辑
  }
}
```

#### 实现授权守卫

```
// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {} // 依赖注入 Reflector

  canActivate(context: ExecutionContext): boolean {
    // 使用 getAllAndOverride 合并类和方法上的元数据
    // 方法的元数据会覆盖类的元数据
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(), // 当前处理方法
      context.getClass(),   // 当前控制器类
    ]);

    // 如果没有设置角色限制，则默认允许访问
    if (!requiredRoles) {
      return true;
    }

    // 从请求对象中获取已认证的用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 检查用户是否拥有所需角色
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 在自定义参数装饰器中获取请求数据

你可以创建自己的参数装饰器，利用 `ExecutionContext`来从请求中提取特定数据。

```
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 创建一个 @User() 装饰器，用于直接获取请求中的用户对象或特定属性
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果指定了属性名，则返回该属性，否则返回整个用户对象
    return data ? user?.[data] : user;
  },
);

// 在控制器中使用
@Get('profile')
getProfile(@User() user) { // 获取整个用户对象
  return user;
}

@Get('user-id')
getUserId(@User('id') userId: number) { // 只获取用户的 id 属性
  return userId;
}
```

### 在异常过滤器中获取上下文信息

```
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // 切换为 HTTP 上下文，获取请求和响应对象
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // 记录更详细的错误日志，包含执行的方法信息
    // 注意：如果需要1在过滤器中使用 getHandler 或 getClass，需要确保传入的是 ExecutionContext
    // 这通常需要在自定义应用架构中处理
    console.error(`Error in ${request.url}:`, exception.message);

    // 返回结构化的错误响应
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message
    });
  }
}
```

## 关键要点与最佳实践

1. **执行顺序**：守卫（可以使用 `ExecutionContext`）在**所有中间件之后**、但在**任何拦截器或管道之前**执行 。

2. **上下文类型判断**：始终使用 `host.getType()`来判断当前的应用程序类型（`'http' | 'ws' | 'rpc'`），以确保你的代码能安全地运行在多种上下文中 。

3. **作用域（Scope）注意事项**：如果你在守卫、过滤器等需要访问请求特定信息的组件中注入了某个服务（例如通过 `constructor`），并且该服务需要访问请求上下文（例如使用 `@Inject(REQUEST)`），那么该服务的注入范围（Scope）可能需要设置为 `REQUEST`。这能确保为每个请求创建一个新的服务实例，避免状态污染。