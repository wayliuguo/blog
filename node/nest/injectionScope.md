## 理解注入作用域

注入作用域定义了 Provider 实例的创建、共享和销毁时机。NestJS 提供了三种作用域，帮助你根据不同场景精细化管理对象生命周期和资源状态。

**核心价值**：通过正确设置作用域，可以避免状态污染、优化资源使用，并提高应用程序的健壮性。

## 三种作用域详解

下面通过一个对比表格直观了解三种作用域的核心差异：

| 作用域类型            | 生命周期                 | 适用场景                       | 性能特点           |
| --------------------- | ------------------------ | ------------------------------ | ------------------ |
| **DEFAULT（单例）**   | 应用启动时创建，全局唯一 | 无状态服务、工具类、配置服务   | 最佳，实例复用     |
| **REQUEST（请求）**   | 每个HTTP请求创建新实例   | 需要请求上下文隔离的场景       | 有开销，但保证隔离 |
| **TRANSIENT（瞬态）** | 每次注入时创建新实例     | 有状态服务、需要实例隔离的场景 | 中等，按需创建     |

### DEFAULT（单例）作用域

单例是默认的作用域，也是最高效的选择。

**特点**：

- 应用程序启动时创建实例
- 整个应用生命周期内共享同一个实例
- 适合无状态服务

```
import { Injectable } from '@nestjs/common';

@Injectable() // 默认就是单例作用域
export class ConfigService {
  private readonly config = { apiKey: '123' };
  
  getConfig() {
    return this.config;
  }
}
```

### REQUEST（请求）作用域

为每个传入的 HTTP 请求创建专用实例，确保请求间的完全隔离。

**特点**：

- 每个请求创建新实例
- 请求处理完毕后实例被垃圾回收
- 适合需要存储请求特定数据的服务

```
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class UserContextService {
  private userId: string;
  
  setUserId(id: string) {
    this.userId = id;
  }
  
  getUserId() {
    return this.userId;
  }
}
```

### TRANSIENT（瞬态）作用域

每次注入时都会创建新的实例，确保每个消费者获得专属实例。

**特点**：

- 每次注入时创建新实例
- 实例不在消费者间共享
- 适合有内部状态的服务

```
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CalculatorService {
  private steps: number[] = []; // 每个实例有独立状态
  
  addStep(step: number) {
    this.steps.push(step);
  }
  
  calculate(base: number): number {
    return this.steps.reduce((result, step) => result + step, base);
  }
}
```

## 配置作用域的两种方式

### 使用 @Injectable() 装饰器（推荐）

这是最直接的方式，在类级别声明作用域

```
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TaskProcessor {
  // 类实现...
}
```

### 在模块中注册时指定

也可以在模块的 providers 数组中显式声明作用域

```
import { Module, Scope } from '@nestjs/common';
import { TaskProcessor } from './task.processor';

@Module({
  providers: [
    {
      provide: TaskProcessor,
      useClass: TaskProcessor,
      scope: Scope.TRANSIENT
    }
  ]
})
export class WorkerModule {}
```

## 实战场景与最佳实践

### 电商购物车案例

**问题**：购物车计算服务需要临时存储折扣信息，单例模式会导致用户间数据混乱。

**解决方案**：使用瞬态作用域确保每个用户有独立购物车实例。

```
@Injectable({ scope: Scope.TRANSIENT })
export class CartService {
  private discountSteps: number[] = []; // 每个实例独立
  
  addDiscount(ratio: number) {
    this.discountSteps.push(ratio);
  }
  
  calculateTotal(price: number): number {
    const discount = this.discountSteps.reduce((total, step) => total * step, 1);
    return price * discount;
  }
}

@Controller('orders')
export class OrderController {
  constructor(private cartService: CartService) {} // 每次注入新实例
  
  @Post('checkout')
  checkout(@Body() items: any[]) {
    this.cartService.addDiscount(0.9); // 仅影响当前实例
    this.cartService.addDiscount(0.8);
    return this.cartService.calculateTotal(100);
  }
}
```

### 身份验证上下文案例

**需求**：在请求级别存储用户认证信息。

**解决方案**：使用请求作用域确保每个请求有独立的认证上下文。

```
@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private user: User;
  
  setUser(user: User) {
    this.user = user;
  }
  
  getUser() {
    return this.user;
  }
}

@Injectable() // 单例服务
export class UserService {
  constructor(private authService: AuthService) {} // 请求作用域的依赖
  
  getCurrentUser() {
    // 每个请求有独立的认证数据
    return this.authService.getUser();
  }
}
```

## 高级主题与避坑指南

### 作用域层级约束

**重要限制**：单例服务不能直接依赖请求作用域或瞬态作用域的服务。

**错误示例**：

```
@Injectable() // 单例服务
export class ReportService {
  constructor(private authService: AuthService) {} // 错误：单例依赖请求作用域
}
```

**解决方案**：使用 `ModuleRef`动态解析依赖。

```
import { Injectable, ModuleRef } from '@nestjs/common';

@Injectable()
export class ReportService {
  constructor(private moduleRef: ModuleRef) {}
  
  async generateReport() {
    // 动态获取请求作用域实例
    const authService = await this.moduleRef.resolve(AuthService);
    // 使用实例...
  }
}
```

### 资源清理

对于需要手动释放资源（如文件句柄、数据库连接）的瞬态服务，实现 `OnModuleDestroy`接口。

```
import { Injectable, Scope, OnModuleDestroy } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class FileProcessor implements OnModuleDestroy {
  private tempFiles: string[] = [];
  
  // ...业务逻辑
  
  onModuleDestroy() {
    // 清理临时文件
    this.tempFiles.forEach(file => {
      try { fs.unlinkSync(file); } catch (e) { /* 错误处理 */ }
    });
  }
}
```

##  性能考量与选择策略

根据实际测试，瞬态作用域相比单例模式仅有轻微性能损耗（约2-4%），在大多数应用中可以忽略不计。这种微小的性能代价换来的状态隔离收益通常是值得的。

**选择策略**：

1. **优先单例**：对无状态服务使用单例，这是默认且最有效的选择
2. **状态隔离**：服务包含 `private`状态变量时考虑使用瞬态作用域
3. **请求上下文**：需要存储请求特定数据时使用请求作用域
4. **避免过度使用**：不必要的作用域化会增加内存和创建开销