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

### 文档资料

#### 资料链接

​	[模块](https://nest.nodejs.cn/modules)

#### 全局模块

##### 作用

- 解决「重复导入」问题：当某个模块的功能（如工具类、通用服务）需要被 **整个应用的所有模块** 共享时，无需在每个模块中重复 `imports`，只需标记为全局模块，即可全局可用。
- 本质：全局模块的 `exports` 提供器会被注入到 Nest 全局容器，所有模块无需导入即可直接注入这些提供器（控制器无法全局共享，仅提供器可全局共享）。

##### 用法

通过 `@Global()` 装饰器标记模块，结合 `exports` 导出需要全局共享的提供器。

1. 用 `@Global()` 装饰器标记模块（仅需一次）；
2. 在 `exports` 中声明需要全局共享的提供器；
3. 全局模块只需在 **根模块（AppModule）** 中导入一次，其他模块无需导入即可使用其导出的提供器。

```
// src/shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service'; // 通用日志服务

@Global() // 标记为全局模块
@Module({
  providers: [LoggerService], // 注册提供器
  exports: [LoggerService],   // 导出提供器（全局可用）
})
export class SharedModule {}
```

```
// src/app.module.ts（根模块）
import { Module } from '@nestjs/common';
import { SharedModule } from './shared.module';
import { CatsModule } from './cats.module';

@Module({
  imports: [SharedModule, CatsModule], // 全局模块仅需在根模块导入一次
})
export class AppModule {}
```

```
// src/cats/cats.service.ts（其他模块直接注入全局提供器）
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../shared/logger.service';

@Injectable()
export class CatsService {
  // 无需导入 SharedModule，直接注入全局提供的 LoggerService
  constructor(private readonly logger: LoggerService) {}

  findOne(id: number) {
    this.logger.log(`Finding cat with id: ${id}`);
    return `This action returns a #${id} cat`;
  }
}
```

#### 动态模块

##### 作用

- 解决「模块配置化」问题：静态模块的 `providers`、`imports` 等属性是固定的，而动态模块允许根据 **运行时参数**（如配置、环境变量）动态生成模块的配置（如注册不同的提供器、导入不同的依赖、导出动态创建的实例）。
- 核心价值：让模块具备灵活性，支持按需配置（如数据库模块根据配置连接不同数据库、缓存模块根据参数设置过期时间）。

##### 核心概念

动态模块是一个「返回模块配置对象的函数」：模块类需实现 `register()`或`forRoot()` 或 `forFeature()` 等静态方法，该方法接收配置参数，返回一个包含 `module` 属性（模块元数据）的对象；

| 方法名         | 核心语义                 | 适用场景                                     | 常见特性                              |
| -------------- | ------------------------ | -------------------------------------------- | ------------------------------------- |
| `forRoot()`    | 全局初始化配置           | 根模块中配置全局可用的模块（如数据库、配置） | 通常返回 `global: true`，仅调用一次   |
| `forFeature()` | 局部扩展配置             | 功能模块中添加局部配置（如注册数据库实体）   | 依赖 `forRoot()` 先初始化，可多次调用 |
| `register()`   | 独立配置并注册（一次性） | 非全局、按需加载的局部模块（如第三方 API）   | 不依赖全局初始化，单独配置单独使用    |

常见组合：动态模块 + 全局模块：如 `DatabaseModule.forRoot(config)` 返回 `global: true`，既实现了动态配置，又无需在每个模块重复导入，全局可用。

##### register 例子

###### 实现动态模块

- 实现 `register()`
- 返回一个模块配置，指定了`OPTIONS`、`DbService`作为依赖器

```
// src\db\db.module.ts

import { DynamicModule, Module } from '@nestjs/common';
import { DbService } from './db.service';

export interface DbModuleOptions {
  path: string;
}

@Module({})
export class DbModule {
  static register(options: DbModuleOptions): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: 'OPTIONS',
          useValue: options,
        },
        DbService,
      ],
      exports: [DbService],
    };
  }
}
```

###### `Dbservice` 实现

依赖器`Dbservice`，根据动态模块的`OPTIONS`就可以进行配置化

```
import { Inject, Injectable } from '@nestjs/common';
import { DbModuleOptions } from './db.module';
import { access, readFile, writeFile } from 'fs/promises';

@Injectable()
export class DbService {
  @Inject('OPTIONS')
  private options: DbModuleOptions;

  async read() {
    const filePath = this.options.path;

    try {
      await access(filePath);
    } catch (e) {
      return [];
    }

    const str = await readFile(filePath, {
      encoding: 'utf-8',
    });

    if (!str) {
      return [];
    }

    return JSON.parse(str);
  }

  async write(obj: Record<string, any>) {
    await writeFile(this.options.path, JSON.stringify(obj || []), {
      encoding: 'utf-8',
    });
  }
}
```

###### 使用-user

- `user.module.ts`

```
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    DbModule.register({
      path: 'users.json',
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

- user.controller.ts

```
import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.userService.register(registerUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }
}
```

- user.service.ts

```
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { DbService } from 'src/db/db.service';
import { User } from './entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UserService {
  @Inject(DbService)
  dbService: DbService;

  async register(registerUserDto: RegisterUserDto) {
    const users: User[] = await this.dbService.read();

    const foundUser = users.find(
      (item) => item.username === registerUserDto.username,
    );

    if (foundUser) {
      throw new BadRequestException('该用户已经注册');
    }

    const user = new User();
    user.username = registerUserDto.username;
    user.password = registerUserDto.password;
    users.push(user);

    await this.dbService.write(users);
    return user;
  }

  async login(loginUserDto: LoginUserDto) {
    const users: User[] = await this.dbService.read();

    const foundUser = users.find(
      (item) => item.username === loginUserDto.username,
    );

    if (!foundUser) {
      throw new BadRequestException('用户不存在');
    }

    if (foundUser.password !== loginUserDto.password) {
      throw new BadRequestException('密码不正确');
    }

    return foundUser;
  }
}
```

###### 使用-book

```
import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [
    DbModule.register({
      path: 'books.json',
    }),
  ],
  controllers: [BookController],
  providers: [BookService],
})
export class BookModule {}
```

##### forRoot+forFeature 例子

