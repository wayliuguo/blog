## 什么是 IOC？

**IOC 即控制反转，是一种设计思想，它反转了程序中对象的创建、依赖管理和生命周期的控制权。**

## 传统编程模式

在传统的编程模式（我们称之为 “正转”）中，开发者需要手动创建对象并管理它们之间的依赖关系。例如：

```
// 传统方式
class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}

class UserService {
  private databaseService: DatabaseService;

  // 手动创建依赖对象
  constructor() {
    this.databaseService = new DatabaseService();
  }

  findUsers() {
    this.databaseService.connect();
    return [{ id: 1, name: '张三' }];
  }
}

// 使用时也需要手动创建
const userService = new UserService();
userService.findUsers();
```

**问题显而易见：**

- **高耦合**：`UserService` 直接依赖于 `DatabaseService` 的具体实现。如果 `DatabaseService` 的构造函数发生变化，`UserService` 也必须修改。
- **难以测试**：无法轻松地用一个模拟（mock）对象来替换 `DatabaseService` 进行单元测试。
- **职责不清晰**：一个类不仅要负责自己的核心业务逻辑，还要负责管理所有依赖的生命周期，违背了 “单一职责原则”。

## IOC 模式下的转变

```
// IOC 方式 (Nest.js 风格)
import { Injectable } from '@nestjs/common';

@Injectable() // 告诉 IOC 容器，这个类可以被管理
class DatabaseService {
  connect() {
    console.log('Connected to database');
  }
}

@Injectable()
class UserService {
  // 声明依赖，但不负责创建
  constructor(private databaseService: DatabaseService) {}

  findUsers() {
    this.databaseService.connect();
    return [{ id: 1, name: '张三' }];
  }
}
```

**核心变化：**

1. **依赖声明**：`UserService` 的构造函数不再 `new` 一个 `DatabaseService`，而是通过参数列表**声明**它需要一个 `DatabaseService` 实例。
2. **容器负责注入**：IOC 容器（在 Nest.js 中是 `INestApplication`）负责创建 `DatabaseService` 和 `UserService` 的实例，并在创建 `UserService` 时，自动将 `DatabaseService` 的实例 “注入” 到它的构造函数中。
3. **控制权反转**：控制权从开发者代码（`new UserService()`）反转到了框架的 IOC 容器手中。

## IOC 在 Nest.js 中的体现

- **`@Injectable()` 装饰器**：这是告诉 Nest.js IOC 容器 “这个类是一个可被注入的服务” 的关键。
- **构造函数注入**：这是 Nest.js 中最主要的依赖注入方式。当一个类被标记为 `@Injectable()` 后，你可以在其他类的构造函数中直接声明对它的依赖，Nest 会自动解决。
- **模块（Module）**：`@Module()` 装饰器中的 `providers` 数组，是向 IOC 容器 “注册” 服务的地方。
- **自定义提供者（Custom Providers）**：通过 `useValue`, `useFactory`, `useClass` 等方式，你可以更灵活地告诉容器如何创建一个对象。

**IOC 的好处：**

- **解耦**：组件之间只依赖于抽象（接口或类的契约），而不依赖于具体实现。
- **可测试性**：测试时可以轻松地用 mock 对象替换真实的依赖。
- **可维护性**：对象的创建和依赖关系管理被集中化，使得代码更清晰、更易于维护。
- **提高代码复用**：服务实例可以被多个组件共享（默认是单例模式）
