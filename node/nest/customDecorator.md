## 理解自定义装饰器

在 `NestJS` 中，自定义装饰器主要用于**封装和抽象通用逻辑**，例如从请求中提取特定数据、定义元数据或组合多个装饰器。

`NestJS` 提供了 `createParamDecorator`、`SetMetadata`和 `applyDecorators`等工具函数来简化创建过程。

1. **参数装饰器**通过 `createParamDecorator`创建，用于从 `ExecutionContext`（执行上下文）中提取数据。
2. **方法或类装饰器**则常用于设置元数据或组合多个装饰器逻辑，通常与 `SetMetadata`和 `applyDecorators`结合使用。
3. 从 NestJS 10.2.0 开始，还可以使用 `Reflector.createDecorator`方法快速创建装饰器。

## 参数装饰器

`Nest` 提供了一组非常实用的参数装饰器，可以结合 `HTTP` 路由处理器（`route handlers`）一起使用。下面的列表展示了`Nest` 装饰器和原生 `Express`（或 `Fastify`）中相应对象的映射。

| `@Request()，@Req()`       | `req`                              |
| -------------------------- | ---------------------------------- |
| `@Response()，@Res()`      | `res`                              |
| `@Next()`                  | `next`                             |
| `@Session()`               | `req.session`                      |
| `@Param(param?: string)`   | `req.params / req.params[param]`   |
| `@Body(param?: string)`    | `req.body / req.body[param]`       |
| `@Query(param?: string)`   | `req.query / req.query[param]`     |
| `@Headers(param?: string)` | `req.headers / req.headers[param]` |
| `@Ip()`                    | `req.ip`                           |
| `@HostParam()`             | `req.hosts`                        |

## 创建参数参数装饰器

参数装饰器通常用于从 HTTP 请求中提取特定数据，例如用户信息、分页参数或请求头。

### 基本参数装饰器

```
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // 认证守卫已附加用户信息到请求对象
  },
);
```

在控制器中这样使用：

```
@Get(':id')
findOne(
	@Param('id') id: string,
	@CurrentUser() user: User
) {
	console.log('CurrentUser', user);
	return this.pigsService.findOne(+id);
}
```

### 接收参数的装饰器

```
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// user-property.decorator.ts
export const UserProperty = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

在控制器中这样使用：

```
@Get(':id')
findOne(
	@Param('id') id: string,
	@CurrentUser() user: User,
	@UserProperty('role') role: string,
) {
	console.log('CurrentUser', user);
	console.log('userRole', role);
	return this.pigsService.findOne(+id);
}
```

### 实用场景示例

#### 统一分页参数处理

```
// pagination.decorator.ts
export const Pagination = createParamDecorator(
  (options: { defaultPage?: number; defaultLimit?: number } = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const page = Number(request.query.page) || options.defaultPage || 1;
    const limit = Number(request.query.limit) || options.defaultLimit || 10;
    return { page, limit };
  },
);

// 在控制器中使用
@Get('articles')
getArticles(@Pagination({ defaultPage: 1, defaultLimit: 20 }) pagination: PaginationParams) {
  return this.articleService.findAll(pagination);
}
```

#### 快速获取客户端语言

```
// accept-language.decorator.ts
export const AcceptLanguage = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['accept-language'] || 'en';
  },
);
```

## 创建方法和类装饰器

这类装饰器常用于为类或方法添加元数据，然后通过守卫（Guard）、拦截器（Interceptor）等机制利用这些元数据。

### 使用SetMetadata设置元数据

最直接的方式是使用 `NestJS` 内置的 `SetMetadata`函数。例如，创建一个用于角色授权的装饰器：

```
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

// 定义元数据key：'roles'
export const ROLES_KEY = Symbol('roles');
// 装饰器：@Roles('admin', 'user')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

在控制器方法上使用：

```
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
findOne(){}
```

在守卫中，可以通过 `Reflector`服务读取该元数据：

```
// role.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector, // 注入Reflector读取@Roles装饰器的元数据
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 读取当前路由需要的角色（从@Roles装饰器）
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(), // 先读方法级的@Roles
        context.getClass(), // 再读控制器级的@Roles（兜底）
      ],
    );

    // 2. 如果路由没有标记角色，直接允许访问
    if (!requiredRoles) {
      return true;
    }

    // 3. 从request中提取用户角色
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as { username: string; role: string };

    // 4. 检查用户角色是否包含在路由需要的角色中
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('你没有访问该接口的权限');
    }

    return true;
  }
}
```

### 使用applyDecorators聚合装饰器

applyDecorators函数可以将多个装饰器的效果合并到一个装饰器中，非常适合将常见的装饰器组合。

```
// auth.decorator.ts
import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { Roles } from '../guard/roles.decorator';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { RolesGuard } from '../guard/role.guard';

export function Auth(...roles: string[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(JwtAuthGuard),
    UseGuards(RolesGuard),
  );
}
```

在控制器方法上使用：

```
@Auth('user')
findOne(){}
```

### 使用 `Reflector.createDecorator`

NestJS 10.2.0 引入了 `Reflector.createDecorator`方法，这是一种更具类型安全性的创建装饰器的方式

```
// 创建装饰器
const Roles = Reflector.createDecorator<string[]>();

// 在守卫中使用
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    // ... 权限验证逻辑
  }
}

// 在控制器中使用
@Post('admin/reports')
@Roles(['admin']) // 使用新创建的装饰器
@UseGuards(RolesGuard)
createReport() {
  // ...
}
```

## 管道（Pipe）与自定义装饰器

认情况下，`ValidationPipe`不会验证使用自定义参数装饰器装饰的参数。如果需要验证，必须在 `ValidationPipe`的选项中设置 `validateCustomDecorators: true`

```
@Get()
async findOne(@User(new ValidationPipe({ validateCustomDecorators: true })) user: UserEntity) {
  // ...
}
```

