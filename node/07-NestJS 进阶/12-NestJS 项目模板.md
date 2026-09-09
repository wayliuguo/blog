# NestJS 项目模板

> 一个接近真实生产的 NestJS 项目配置，基于 NestJS CLI 生成，但整理了清晰的目录结构和最佳实践。参考 show-track-server 真实项目整理。

---

## 目录结构

```
my-nest-app/
├── src/
│   ├── common/               # 公共代码
│   │   ├── decorators/       # 自定义装饰器
│   │   ├── dto/              # 公共 DTO（分页等）
│   │   ├── entity/           # 公共实体基类
│   │   ├── exceptions/       # 自定义异常
│   │   ├── filters/          # 异常过滤器
│   │   ├── interceptors/     # 全局拦截器
│   │   └── model/            # 响应模型
│   ├── config/               # 配置管理
│   │   ├── platforms/       # 多平台配置（可选）
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── index.ts
│   ├── constants/            # 常量定义
│   ├── migrations/           # TypeORM 迁移文件
│   ├── modules/             # 功能模块（按业务划分）
│   │   ├── auth/             # 认证模块
│   │   │   ├── decorators/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── guards/
│   │   │   ├── services/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   └── auth.service.ts
│   │   ├── user/            # 用户模块
│   │   │   ├── dto/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.entity.ts
│   │   │   ├── user.module.ts
│   │   │   └── user.service.ts
│   │   ├── product/         # 商品模块
│   │   └── health/          # 健康检查模块
│   ├── shared/              # 共享模块（提供第三方服务）
│   │   ├── database/        # 数据库模块
│   │   ├── logger/          # 日志模块
│   │   ├── redis/           # Redis 缓存模块
│   │   └── shared.module.ts
│   ├── app.module.ts        # 根模块
│   └── main.ts              # 入口文件
├── .env                      # 环境变量
├── .env.example              # 环境变量模板
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

## package.json

```json
{
  "name": "my-nest-app",
  "version": "1.0.0",
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate src/migrations/$npm_config_name -d src/config/data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/jwt": "^10.1.0",
    "@nestjs/passport": "^10.0.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "ioredis": "^5.3.0",
    "mysql2": "^3.0.0",
    "typeorm": "^0.3.0",
    "winston": "^3.8.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/passport-jwt": "^3.0.8",
    "ts-node": "^10.9.0",
    "typescript": "^5.1.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

## 配置管理

### 表结构

#### 环境变量定义

| 变量名 | 说明 | 默认值 |
|:---|:---|:---|
| `PORT` | 服务端口 | 3000 |
| `NODE_ENV` | 环境 | development |
| `DB_HOST` | 数据库地址 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USER` | 数据库用户名 | root |
| `DB_PASS` | 数据库密码 |  |
| `DB_NAME` | 数据库名 | myapp |
| `REDIS_HOST` | Redis 地址 | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `REDIS_PASS` | Redis 密码 |  |
| `JWT_SECRET` | JWT 密钥 | dev-secret |
| `JWT_EXPIRES` | JWT 过期时间 | 2h |

### 配置代码

```typescript
// src/config/index.ts
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'myapp',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASS || undefined,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES || '2h',
  },
};
```

```typescript
// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import config from './index';
import { join } from 'path';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  synchronize: config.nodeEnv === 'development', // 开发环境自动同步
  logging: config.nodeEnv === 'development',
};
```

## 根模块与入口

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { databaseConfig } from './config/database.config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HttpExceptionFilter } from './common/filters/any-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    SharedModule,
    AuthModule,
    UserModule,
    HealthModule,
  ],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 全局响应拦截器（统一格式）
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
```

```typescript
// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import config from './config/index';
import { Logger } from 'winston';
import { winstonLogger } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // 自动去除未定义的属性
      transform: true,       // 自动类型转换
      forbidNonWhitelisted: true, // 禁止未声明的属性
    }),
  );

  // 开启 CORS
  app.enableCors();

  // 全局前缀
  app.setGlobalPrefix('api');

  // Swagger 文档（开发环境）
  if (config.nodeEnv === 'development') {
    const document = new DocumentBuilder()
      .setTitle('API 文档')
      .setDescription('后端接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, document);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(config.port);
  const logger = app.get(Logger);
  logger.info(`服务启动成功：http://localhost:${config.port}`);
  if (config.nodeEnv === 'development') {
    logger.info(`Swagger 文档：http://localhost:${config.port}/docs`);
  }
}

bootstrap();
```

## 实体示例

### 用户实体

| id | name | email | password | role | createdAt | updatedAt |
|:---|:---|:---|:---|:---|:---|:---|
| `number` 主键自增 | `varchar(50)` | `varchar(100)` 唯一 | `varchar(255)` | `varchar(20)` 默认 user | `datetime` 创建时间 | `datetime` 更新时间 |

```typescript
// src/modules/user/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 255, select: false }) // 不默认查询密码
  password: string;

  @Column({ length: 20, default: 'user' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 刷新令牌实体

| id | userId | token | expiresAt | createdAt |
|:---|:---|:---|:---|:---|
| `number` 主键自增 | `number` 外键 | `text` | `datetime` | `datetime` |

```typescript
// src/modules/auth/entities/refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column('text')
  token: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

## 模块定义示例

### Auth 模块

```typescript
// src/modules/auth/dto/auth.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
```

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import config from '../../config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 检查邮箱是否已注册
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('邮箱已被注册');
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // 创建用户
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });
    await this.userRepo.save(user);

    return { id: user.id, name: user.name, email: user.email };
  }

  async login(dto: LoginDto) {
    // 查找用户
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 access token 和 refresh token
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 保存 refresh token
    await this.saveRefreshToken(user, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign(
      { userId: user.id, role: user.role },
      { secret: config.jwt.secret, expiresIn: config.jwt.expiresIn },
    );
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  private async saveRefreshToken(user: User, token: string) {
    // 删除过期的刷新令牌
    await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < NOW()')
      .execute();

    // 保存新的刷新令牌
    const rt = this.refreshTokenRepo.create({
      user,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepo.save(rt);
  }
}
```

```typescript
// src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import config from '../../config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

## 公共基础设施

### 统一响应格式

```typescript
// src/common/model/response.model.ts
export class ResponseModel<T = any> {
  code: number;
  message: string;
  data: T;

  constructor(data: T, message = 'success', code = 0) {
    this.code = code;
    this.message = message;
    this.data = data;
  }
}
```

### 全局响应拦截器

```typescript
// src/common/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseModel } from '../model/response.model';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseModel<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseModel<T>> {
    return next.handle().pipe(
      map(data => new ResponseModel(data)),
    );
  }
}
```

### 全局异常过滤器

```typescript
// src/common/filters/any-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`${request.method} ${request.url} - ${message}`, {
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      code: status,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    });
  }
}
```

### 共享 Redis 模块

```typescript
// src/shared/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import config from '../../config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          retryStrategy: times => Math.min(times * 50, 2000),
        });
        client.on('error', err => {
          console.error('Redis 连接错误:', err.message);
        });
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
```

### 健康检查模块

```typescript
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Inject } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: '健康检查' })
  async check() {
    const results: Record<string, any> = { status: 'ok' };

    // 检查数据库连接
    try {
      await this.dataSource.query('SELECT 1');
      results.db = 'connected';
    } catch (err) {
      results.status = 'degraded';
      results.db = 'disconnected';
      results.dbError = (err as Error).message;
    }

    // 检查 Redis 连接
    try {
      await this.redis.ping();
      results.redis = 'connected';
    } catch (err) {
      results.status = 'degraded';
      results.redis = 'disconnected';
      results.redisError = (err as Error).message;
    }

    return results;
  }
}
```

## .env 配置示例

```bash
# .env
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=myapp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=

# JWT
JWT_SECRET=change-this-to-a-random-secret-key
JWT_EXPIRES=2h
```

## 使用方式

```bash
# 1. 使用 Nest CLI 创建项目
npx @nestjs/cli new my-nest-app

# 2. 安装依赖
npm install @nestjs/typeorm @nestjs/jwt @nestjs/passport @nestjs/swagger typeorm mysql2 ioredis winston bcrypt class-validator class-transformer reflect-metadata

# 3. 复制环境变量
cp .env.example .env

# 4. 修改配置，确保 MySQL 和 Redis 已运行

# 5. 开发启动
npm run start:dev

# 6. 生产构建
npm run build
npm run start:prod
```

## 最佳实践总结

1. **按功能模块划分目录**：每个业务功能一个模块，controller/service/entity/dto 都在模块内
2. **共享模块**：数据库、Redis、日志等跨模块依赖放到 `shared/`
3. **公共基础设施**：过滤器、拦截器、装饰器、DTO 放到 `common/`
4. **依赖注入**：Nest 的核心思想，接口与实现分离，易于测试
5. **全局校验**：使用 `ValidationPipe` 统一处理参数校验
6. **统一响应格式**：通过拦截器统一包装返回，前后端交互更清晰
7. **全局异常处理**：统一捕获异常，日志记录，友好返回

---

## 参考

- 上一篇：[数据库集成](../06-NestJS%20入门/06-数据库集成)
- 下一篇：[NestJS 源码分析](./11-NestJS%20源码分析)
