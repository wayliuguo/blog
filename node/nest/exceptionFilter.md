## NestJS 异常处理基础

NestJS 带有一个内置的**异常层**，能自动处理应用程序中所有未处理的异常。当代码抛出异常时，此层会捕获它并发送适当的用户友好响应。

### 内置异常处理

默认情况下，内置异常过滤器会处理 `HttpException`及其子类。对于无法识别的异常（既不是 `HttpException`也不是继承的类），系统会返回：

```
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

### 抛出标准异常

使用 NestJS 内置的 `HttpException`类

```
import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  async findAll() {
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
}
```

客户端将收到响应：

```
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

`HttpException`构造函数参数：

- response: 定义 `JSON` 响应体，可以是字符串或对象
- status: 定义` HTTP `状态码

### 自定义响应体

要覆盖整个响应体，传递一个对象：

```
throw new HttpException({
  status: HttpStatus.FORBIDDEN,
  error: 'This is a custom message',
}, HttpStatus.FORBIDDEN);
```

响应体将变成：

```
{
  "status": 403,
  "error": "This is a custom message"
}
```

## 内置 HTTP 异常

`NestJS` 提供了一系列内置的 HTTP 异常，均继承自 `HttpException`

| 异常类                          | HTTP 状态码 | 描述             |
| ------------------------------- | ----------- | ---------------- |
| `BadRequestException`           | 400         | 错误请求         |
| `UnauthorizedException`         | 401         | 未授权           |
| `NotFoundException`             | 404         | 资源不存在       |
| `ForbiddenException`            | 403         | 禁止访问         |
| `NotAcceptableException`        | 406         | 不可接受         |
| `RequestTimeoutException`       | 408         | 请求超时         |
| `ConflictException`             | 409         | 冲突             |
| `GoneException`                 | 410         | 资源已消失       |
| `PayloadTooLargeException`      | 413         | 负载过大         |
| `UnsupportedMediaTypeException` | 415         | 不支持的媒体类型 |
| `InternalServerErrorException`  | 500         | 服务器内部错误   |
| `NotImplementedException`       | 501         | 未实现           |
| `BadGatewayException`           | 502         | 网关错误         |
| `ServiceUnavailableException`   | 503         | 服务不可用       |

使用示例：

```
throw new NotFoundException('cat not found');
// {
// "message": "Cat not found",
// "error": "Not Found",
// "statusCode": 404
// }


throw new BadRequestException('Invalid input', { cause: new Error(), description: 'Validation failed' });
// {
// "message": "Invalid input",
// "error": "Validation failed",
// "statusCode": 400
// }
```

## 创建自定义异常过滤器

当内置功能不满足需求时，可以创建自定义异常过滤器，用于记录日志或定制响应格式。

```
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

代码解释:

- `@Catch(HttpException)`: 指定过滤器捕获的异常类型
- `ArgumentsHost`: 实用程序对象，用于获取请求和响应对象
- `host.switchToHttp()`: 切换到 HTTP 上下文
- `exception.getStatus()`: 获取异常状态码

## 绑定异常过滤器

异常过滤器可以绑定在不同级别：方法范围、控制器范围或全局范围。

### 方法范围的绑定

```
@Post()
@UseFilters(new HttpExceptionFilter())
async create(@Body() createCatDto: CreateCatDto) {
  throw new ForbiddenException();
}
```

或者使用类而非实例（推荐，利于依赖注入）：

```
@Post()
@UseFilters(HttpExceptionFilter)
async create(@Body() createCatDto: CreateCatDto) {
  // ...
}
```

### 控制器范围的绑定

```
@UseFilters(new HttpExceptionFilter())
export class CatsController {
  // 所有路由处理程序都将使用此过滤器
}
```

### 全局范围的绑定

#### 方式一：main.ts（简单但不支持依赖注入）

```
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
```

#### **方式二：AppModule（推荐，支持依赖注入）**

```
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './http-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## 捕获所有异常

要捕获每个未处理的异常（无论类型如何），使用空参数 `@Catch()`

```
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
```

## 高级用法和最佳实践

### 继承基础异常过滤器

可以扩展 `BaseExceptionFilter`来重用内置逻辑。

```
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
  }
}
```

### 记录日志

结合 Winston 进行日志收集：

```
import { Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
      AllExceptionsFilter.name
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 处理特定业务异常

创建自定义业务异常：

```
export class BusinessException extends HttpException {
  constructor(code: number, message: string) {
    super({ code, message }, HttpStatus.OK);
  }
}

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  catch(exception: BusinessException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const error = exception.getResponse();

    response.status(HttpStatus.OK).send({
      data: null,
      status: error['code'],
      message: error['message'],
      success: false
    });
  }
}
```

