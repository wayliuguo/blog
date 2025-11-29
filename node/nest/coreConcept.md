## 模块（Module）

### 设计意图

- 将应用划分为逻辑单元，每个模块负责特定功能
- 提高代码的可复用性和可维护性

### 用法

Nest 应用由多个模块组成，每个模块是一个独立的功能单元。

- 根模块 `AppModule` 是应用的入口点
- 使用 `@Module()` 装饰器定义模块

```
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [], // 导入其他模块
  controllers: [AppController], // 该模块的控制器
  providers: [AppService], // 服务提供者（可注入）
  exports: [], // 导出供其他模块使用的提供者
})
export class AppModule {}
```

## 控制器



