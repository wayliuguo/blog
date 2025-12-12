## 基础概念

### 基础概念

- **作用**：在控制器方法执行之前和之后进行处理，例如日志记录、缓存、请求 / 响应转换等。
- **执行时机**：在守卫之后，管道之前执行前置逻辑。
- **特点**：
  - 使用 `next.handle()` 触发后续流程。
  - 可以修改请求参数或返回值。
- **核心功能**：
  - **方法执行前后绑定额外逻辑**（如日志记录、性能监控）
  - **转换函数返回的结果**（如统一响应格式）
  - **转换函数抛出的异常**（如统一错误处理）
  - **扩展基本功能行为**（如缓存、超时处理）
  - **根据特定条件完全重写函数**（如缓存拦截）

### 创建基本拦截器

```
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before method execution...');
    
    const now = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`After method execution... ${Date.now() - now}ms`))
    );
  }
}
```

## RxJS快速入门

### RxJS 核心构建块

1. Observable(可观察对象)：代表一个未来即将产生的值或事件的集合（数据流）。
2. Observer(观察者)：一个知道如何监听Observable提供的数据的对象，包含`next`, `error`, `complete`三个回调函数。

```
import { Observable } from 'rxjs';

// 创建简单的 Observable
const observable = new Observable(subscriber => {
  subscriber.next(1);
  subscriber.next(2);
  subscriber.next(3);
  setTimeout(() => {
    subscriber.next(4);
    subscriber.complete();
  }, 1000);
});

// 订阅 Observable
observable.subscribe({
  next: value => console.log(`Received value: ${value}`),
  error: err => console.error(`Error: ${err}`),
  complete: () => console.log('Observation complete')
});
```

### 常用 RxJS 操作符

#### map - 转换数据流

```
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

of(1, 2, 3).pipe(
  map(x => x * 2)
).subscribe(result => console.log(result)); // 输出: 2, 4, 6
```

#### tap - 执行副作用但不修改数据

```
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

of(1, 2, 3).pipe(
  tap(value => console.log(`Value: ${value}`))
).subscribe();

// Value: 1
// Value: 2
// Value: 3
```

#### cathError - 错误处理

```
import { throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

throwError(new Error('Something went wrong!')).pipe(
  catchError(err => {
    console.error('Error caught:', err.message);
    return of('Fallback value');
  })
).subscribe(result => console.log(result));

// Error caught: Something went wrong!
// Fallback value
```

#### timeout - 超时处理

```
import { interval } from 'rxjs';
import { timeout } from 'rxjs/operators';

interval(3000).pipe( // 每3秒发出一个值
  timeout(2000) // 设置2秒超时
).subscribe({
  next: value => console.log(value),
  error: err => console.error('Timeout error:', err.message)
});

// Timeout error: Timeout has occurred
```

## 拦截器在 NestJS 中的实际应用

### 统一响应格式拦截器

```
// transform-response.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

```
// http://localhost:3000/cats/1
{
    "code": 200,
    "message": "success",
    "data": "This action returns a #1 cat",
    "timestamp": "2025-12-11T14:34:47.730Z"
}
```

### 缓存拦截器

```
// cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

// 简单的内存缓存
const cache = new Map<string, any>();

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly ttl: number = 30000) {} // 默认30秒缓存

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}-${request.url}`;

    // 检查缓存是否存在且未过期
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      // 缓存命中，返回缓存数据
      console.log('Cache hit for key:', key);
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        // 将结果存入缓存
        cache.set(key, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }
}
```

应用在`cats`控制器：

```
@Controller('cats')
@UseInterceptors(TransformResponseInterceptor, new CacheInterceptor())
```

### 超时处理拦截器

```

```

### 日志记录拦截器

```
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;

        console.log(
          `${method} ${url} - ${response.statusCode} - ${delay}ms - IP: ${ip} - Agent: ${userAgent}`,
        );
      }),
    );
  }
}
```

## 拦截器的绑定方式

### 全局绑定

```
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor());
  
  await app.listen(3000);
}
bootstrap();
```

或者通过依赖注入方式（推荐）：

```
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
```

### 控制器级别

```
import { Controller, UseInterceptors } from '@nestjs/common';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { CacheInterceptor } from './interceptors/cache.interceptor';

@Controller('users')
@UseInterceptors(TransformInterceptor, CacheInterceptor)
export class UsersController {
  // 该控制器的所有路由都会应用上述拦截器
}
```

### 方法级别绑定

```
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

@Controller('users')
export class UsersController {
  
  @Get()
  @UseInterceptors(TimeoutInterceptor)
  async findAll() {
    // 这个特定路由会应用超时拦截器
    return this.usersService.findAll();
  }
}
```

### 拦截器执行顺序

```
// 执行顺序示例
global Before...      // 全局拦截器
class Before...       // 控制器级拦截器  
method Before...      // 方法级拦截器
// 方法执行逻辑
method After... 0ms   // 方法级拦截器
class After... 1ms    // 控制器级拦截器
global After... 3ms   // 全局拦截器
```

## 高级应用场景

### 用户操作日志拦截器

结合数据库记录用户操作

```
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OperationLogService } from '../services/operation-log.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly logService: OperationLogService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, params, body } = request;
    
    // 异步记录操作日志（不阻塞主响应）
    return next.handle().pipe(
      tap(async () => {
        try {
          if (user && method !== 'GET') {
            await this.logService.record({
              userId: user.id,
              action: url,
              method: method,
              params: { ...params, ...body },
              timestamp: new Date()
            });
          }
        } catch (error) {
          // 日志记录错误不应影响主流程
          console.error('操作日志记录失败:', error);
        }
      })
    );
  }
}
```

### 数据转换和清理拦截器

处理 null 值或敏感信息

```
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DataSanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.sanitizeData(data))
    );
  }
  
  private sanitizeData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeItem(item));
    }
    return this.sanitizeItem(data);
  }
  
  private sanitizeItem(item: any): any {
    if (!item || typeof item !== 'object') {
      return item === null ? '' : item; // 将 null 转为空字符串
    }
    
    // 移除敏感字段
    const { password, ...sanitizedItem } = item;
    return sanitizedItem;
  }
}
```

