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

```
src/
├── dynamic-database
	├── connections
		|── mysql.connection.ts
		|── postgres.connection.ts
	├── interfaces.ts
		|── db-config.interface.ts
		|── db-connection.interface.ts
	├── constants.ts
	├── dynamic-database.module.ts
	├── dynamic-database.service.ts
├── dynamic-config
	├── config.module.ts
	├── config.service.ts
├── dogs
	...
├── cats
	...
```

###### 定义核心接口和常量

```
// db-config.interface.ts
export type DbType = 'mysql' | 'postgres';

export interface DynamicDatabaseConfig {
  type: DbType;  // 数据库类型（mysql/postgres）
  host: string; // 主机
  port: number;  // 端口
  username: string;  // 用户名
  password: string; // 密码
  database: string; // 数据库名称
  synchronize?: boolean; // 是否自动同步表结构（开发环境用）
}
```

```
// db-connection.interface.ts
export interface DynamicDatabaseConnection {
  // 连接数据库
  connect(): Promise<void>;
  // 执行查询
  query(sql: string, params?: any[]): Promise<any>;
  // 执行增删改（返回影响行数）
  execute(sql: string, params?: any[]): Promise<number>;
  // 断开连接
  disconnect(): Promise<void>;
}
```

```
// constants.ts
export const DYNAMIC_DATABASE_CONFIG = Symbol('DYNAMIC_DATABASE_CONFIG'); // 数据库配置令牌
export const DYNAMIC_DATABASE_CONNECTION = Symbol(
  'DYNAMIC_DATABASE_CONNECTION',
); // 数据库连接实例令牌
```

###### 实现配置模块&服务

```
// src\dynamic-config\config.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { DynamicConfigService } from './config.service';

@Module({
  imports: [
    // 加载 .env 文件，全局可用
    NestConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [DynamicConfigService],
  exports: [DynamicConfigService], // 导出供其他模块使用
})
export class DynamicConfigModule {}

```

```
// src\dynamic-config\config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { DynamicDatabaseConfig, DbType } from "src/dynamic-database/interfaces/db-config.interface";

@Injectable()
export class DynamicConfigService {
  constructor(private nestConfigService: NestConfigService) {}

  // 获取数据库配置
  getDatabaseConfig(): DynamicDatabaseConfig {
    return {
      type: this.nestConfigService.get<DbType>('DB_TYPE', 'mysql'), // 默认 mysql
      host: this.nestConfigService.get<string>('DB_HOST', 'localhost'),
      port: this.nestConfigService.get<number>('DB_PORT', 3306), // 默认 mysql 端口
      username: this.nestConfigService.get<string>('DB_USERNAME', 'root'),
      password: this.nestConfigService.get<string>('DB_PASSWORD', '123456'),
      database: this.nestConfigService.get<string>('DB_NAME', 'nest_db'),
      synchronize: this.nestConfigService.get<boolean>('DB_SYNCHRONIZE', true), // 开发环境默认同步
    };
  }
}
```

###### 数据库连接服务

```
// src\dynamic-database\connections\mysql.connection.ts
@Injectable()
export class MySQLConnection implements DynamicDatabaseConnection {
  private isConnected = false;
  private config: DynamicDatabaseConfig;

  constructor(config: DynamicDatabaseConfig) {
    this.config = config;
  }

  // 连接数据库（模拟）
  async connect(): Promise<void> {
    // 模拟数据库连接
    console.log(
      `[MySQL] 模拟连接到 ${this.config.host}:${this.config.port}/${this.config.database} 作为 ${this.config.username}...`,
    );
    // 这里不再使用真实的MySQL客户端连接
    this.isConnected = true;
    console.log('[MySQL] 模拟连接成功。');

    // 模拟同步表结构
    if (this.config.synchronize) {
      console.log('[MySQL] 模拟表结构同步完成（cats 表）');
    }
  }

  // 检查连接状态
  private checkConnection(): void {
    if (!this.isConnected) {
      console.warn('[MySQL] 尝试使用未连接的数据库连接。');
    }
  }

  // 执行查询（SELECT）
  async query(sql: string, params?: any[]): Promise<any> {
    this.checkConnection();
    if (!this.isConnected) {
      console.warn('[MySQL] 无法执行查询，数据库未连接。');
      return sql;
    }

    console.log(`[MySQL] 模拟执行查询: ${sql}`);
    if (params && params.length > 0) {
      console.log(`[MySQL] 查询参数:`, params);
    }

    // 直接返回SQL字符串
    return sql;
  }

  // 执行增删改（INSERT/UPDATE/DELETE）
  async execute(sql: string, params?: any[]): Promise<number> {
    this.checkConnection();
    if (!this.isConnected) {
      console.warn('[MySQL] 无法执行操作，数据库未连接。');
      return 0;
    }

    console.log(`[MySQL] 模拟执行操作: ${sql}`);
    if (params && params.length > 0) {
      console.log(`[MySQL] 操作参数:`, params);
    }

    // 模拟操作成功，返回影响行数
    return 1;
  }

  // 断开连接
  async disconnect(): Promise<void> {
    // 模拟断开连接
    console.log('[MySQL] 模拟断开连接...');
    this.isConnected = false;
    console.log(`[MySQL] 模拟断开与 ${this.config.database} 的连接`);
  }
}
```

```
// src\dynamic-database\connections\postgres.connection.ts
...
```

###### 实现数据库动态模块

- `forRoot 方法`
  - 接收全局数据库配置 `DynamicDatabaseConfig`
  - 注册数据库配置提供器（此提供器注入给动态创建数据库连接器）
  - 注册动态创建数据库连接器，根据配置动态创建数据库连接实例（MySQL/PostgreSQL）
  - 将模块标记为 global: true ，使其在全局范围内可用
  - 导出连接实例和服务，供其他模块使用
- `forFeature 方法`
  - 为特定业务模块提供局部数据库配置
  - 存储模块配置到 featureConfigs 静态 Map 中
  - 创建模块专属的配置提供器（如 DOGS_DB_CONFIG 、 PIGS_DB_CONFIG ）
  - 创建模块专属的数据库服务实例
  - 使用 Scope.REQUEST 确保每个请求都有独立的实例
- 生命周期管理
  - 实现 OnModuleDestroy 接口，确保模块销毁时断开数据库连接
  - 防止资源泄漏

```
// dynamic-database.module.ts

@Module({})
export class DynamicDatabaseModule implements OnModuleDestroy {
  // 存储连接实例，用于模块销毁时断开连接
  private static connection: DynamicDatabaseConnection;
  // 存储特性配置
  private static featureConfigs = new Map<string, FeatureConfig>();

  // 动态模块核心方法：接收配置，返回动态模块
  static forRoot(config: DynamicDatabaseConfig): DynamicModule {
    // 1. 注册数据库配置提供器
    const configProvider: Provider = {
      provide: DYNAMIC_DATABASE_CONFIG,
      useValue: config,
    };

    // 2. 动态创建数据库连接提供器（核心逻辑）
    const connectionProvider: Provider = {
      provide: DYNAMIC_DATABASE_CONNECTION,
      useFactory: async (
        dbConfig: DynamicDatabaseConfig,
      ): Promise<DynamicDatabaseConnection> => {
        let connection: DynamicDatabaseConnection;

        // 根据数据库类型创建对应连接实例
        switch (dbConfig.type) {
          case 'postgres':
            connection = new PostgreSQLConnection(dbConfig);
            break;
          case 'mysql':
          default:
            connection = new MySQLConnection(dbConfig);
            break;
        }

        // 初始化连接（异步操作）
        await connection.connect();
        DynamicDatabaseModule.connection = connection; // 保存连接实例
        return connection;
      },
      inject: [DYNAMIC_DATABASE_CONFIG], // 注入配置
    };

    // 3. 返回动态模块配置
    return {
      module: DynamicDatabaseModule,
      global: true, // 全局模块：所有模块无需重复导入，直接注入
      providers: [configProvider, connectionProvider, DynamicDatabaseService],
      exports: [DYNAMIC_DATABASE_CONNECTION, DynamicDatabaseService], // 导出供其他模块使用
    };
  }

  // forFeature方法：用于特性模块配置
  static forFeature(
    moduleName: string,
    config: FeatureConfig = {},
  ): DynamicModule {
    // 存储特性模块配置
    DynamicDatabaseModule.featureConfigs.set(moduleName, config);

    // 创建特性模块配置提供器
    const featureConfigProvider: Provider = {
      provide: `${moduleName.toUpperCase()}_DB_CONFIG`,
      useValue: config,
      scope: Scope.REQUEST,
    };

    // 创建特定模块的数据库服务提供器
    const moduleDatabaseServiceProvider: Provider = {
      provide: `${moduleName}DatabaseService`,
      useFactory: (connection: DynamicDatabaseConnection) => {
        const featureConfig =
          DynamicDatabaseModule.featureConfigs.get(moduleName) || {};
        // 这里可以根据特性配置自定义服务实例
        // 简单起见，我们仍然使用基础的DynamicDatabaseService
        return new DynamicDatabaseService(connection);
      },
      inject: [DYNAMIC_DATABASE_CONNECTION],
      scope: Scope.REQUEST,
    };

    return {
      module: DynamicDatabaseModule,
      providers: [featureConfigProvider, moduleDatabaseServiceProvider],
      exports: [featureConfigProvider, moduleDatabaseServiceProvider],
    };
  }

  // 获取特性模块配置的静态方法
  static getFeatureConfig(moduleName: string): FeatureConfig {
    return this.featureConfigs.get(moduleName) || {};
  }

  // 模块销毁时断开数据库连接（Nest 生命周期钩子）
  async onModuleDestroy() {
    if (DynamicDatabaseModule.connection) {
      await DynamicDatabaseModule.connection.disconnect();
    }
  }
}

```

###### 实现数据库服务

```
@Injectable()
export class DynamicDatabaseService {
  constructor(
    @Inject(DYNAMIC_DATABASE_CONNECTION)
    private readonly connection: DynamicDatabaseConnection,
  ) {}

  // 查询（SELECT）
  async query(sql: string, params?: any[]): Promise<any> {
    return this.connection.query(sql, params);
  }
}
```

###### 使用方式-在根模块中初始化

`forRoot` 入参是调用动态配置服务的`getDatabaseConfig`获得的配置信息

```
import { ConfigModule, ConfigService } from '@nestjs/config';
...
@Module({
  imports: [
    ConfigModule.forRoot(), // nestjs 提供的配置模块
    DynamicConfigModule,
    DynamicDatabaseModule.forRoot(
      new DynamicConfigService(new ConfigService()).getDatabaseConfig(),
    ),
    DogsModule,
    PigsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

###### 使用方式-在子模块中定制特性

```
@Module({
  controllers: [PigsController],
  providers: [PigsService],
  imports: [
    // 为pigs模块添加特定的数据库配置
    DynamicDatabaseModule.forFeature('pigs', {
      tableName: 'pigs',
      prefix: 'pig_',
    }),
  ],
})
export class PigsModule {}
```

