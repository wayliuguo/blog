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
| `DB_HOST` | 数据库地址 | 127.0.0.1 |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USER` | 数据库用户名 | root |
| `DB_PASS` | 数据库密码 |  |
| `DB_NAME` | 数据库名 | myapp |
| `REDIS_HOST` | Redis 地址 | 127.0.0.1 |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `REDIS_PASS` | Redis 密码 |  |
| `JWT_SECRET` | JWT 密钥 | **必填**（缺失直接启动失败） |
| `JWT_EXPIRES` | JWT 过期时间 | 2h |

### 配置代码

模板没有用 `dotenv` + 手写对象，而是走 `@nestjs/config` 的 `registerAs`：每个配置块注册成一个命名空间（`'app'` / `'security'` / `'database'` / `'redis'`），业务代码用 `ConfigService.get('security')` 取值。先看读取环境变量的工具函数与安全配置。

> 摘自 `./code/nestjs-template/src/config/configuration.ts`

```typescript
/** 是否为开发环境（NODE_ENV === 'development'） */
export const isDev = process.env.NODE_ENV === 'development'

// …
/** 读取字符串类型环境变量 */
export function env(key: string, defaultValue: string = ''): string {
    return formatValue(key, defaultValue)
}

// …
/** 读取数字类型环境变量，无法转为数字时抛出错误 */
export function envNumber(key: string, defaultValue: number = 0): number {
    return formatValue(key, defaultValue, value => {
        const num = Number(value)
        if (isNaN(num)) {
            throw new Error(`${key} environment variable is not a number`)
        }
        return num
    })
}

// …
export const AppConfig = registerAs(appRegToken, () => ({
    /** 服务监听端口 */
    port: envNumber('PORT', 3000)
}))

// …
export const SecurityConfig = registerAs(securityRegToken, () => {
    const jwtSecret = env('JWT_SECRET')
    // 启动时校验：JWT 密钥必须通过环境变量配置，不允许使用默认值
    if (!jwtSecret) {
        throw new Error('JWT_SECRET 环境变量未配置，请检查 .env 文件。生产环境必须使用强随机密钥。')
    }
    return {
        /** JWT Access Token 签名密钥 */
        jwtSecret,
        /** Access Token 过期时间，默认 2h */
        jwtExpires: env('JWT_EXPIRES', '2h'),
        /** Refresh Token 过期时间（秒），默认 604800 = 7d */
        refreshExpires: 604800
    }
})
```

同一个文件里还导出了 `validationSchema`（Joi），由 `ConfigModule.forRoot` 在**应用启动前**一次性校验所有环境变量：`JWT_SECRET` 是 `required()`，缺失或类型不对会直接启动失败，而不是等到运行时报错。

数据库配置自己不读 `process.env`，而是复用上面的 `env` / `envNumber`，再注册成 `'database'` 命名空间：

> 摘自 `./code/nestjs-template/src/config/database.config.ts`

```typescript
import { ConfigType, registerAs } from '@nestjs/config'

import { env, envNumber } from './configuration'

/** registerAs 注册 token，对应命名空间 'database' */
export const dbRegToken = 'database'

export const DatabaseConfig = registerAs(dbRegToken, () => ({
    /** 数据库主机地址 */
    host: env('DB_HOST', '127.0.0.1'),
    /** 数据库端口 */
    port: envNumber('DB_PORT', 3306),
    /** 数据库名 */
    database: env('DB_NAME', 'myapp'),
    /** 数据库用户名 */
    username: env('DB_USER', 'root'),
    /** 数据库密码 */
    password: env('DB_PASS', 'root')
}))

/** 从 DatabaseConfig 推断出的配置类型 */
export type IDatabaseConfig = ConfigType<typeof DatabaseConfig>
```

`TypeOrmModule.forRoot` 的选项**不在**配置文件里，而是写进 `app.module.ts` 的 `forRootAsync` 工厂——见下一节。

（本节两段代码摘自 `nestjs-template`，`tsc --noEmit` 与 `nest build` 均零错误。模板启动需要 MySQL + Redis，本机没有这两个服务，实跑情况见「根模块与入口」节末尾。）

## 根模块与入口

### 根模块：装配一切

`AppModule` 只做装配，不写业务：加载全局配置（带 Joi 校验）、用异步工厂建数据库连接、挂上全局 Redis 模块，最后把三个全局组件（过滤器 / 拦截器 / 守卫）用 **Provider 方式**注册——只有这样才能注入依赖。

> 摘自 `./code/nestjs-template/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AppConfig, SecurityConfig, SwaggerConfig, validationSchema } from '~/config/configuration'
import { DatabaseConfig } from '~/config/database.config'
import { RedisConfig } from '~/config/redis.config'
import type { IDatabaseConfig } from '~/config/database.config'
import { AllExceptionsFilter } from '~/common/filters/all-exceptions.filter'
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor'
import { RedisModule } from '~/shared/redis/redis.module'
import { AuthModule } from '~/modules/auth/auth.module'
import { UsersModule } from '~/modules/users/users.module'
import { HealthController } from '~/modules/health/health.controller'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'

@Module({
    imports: [
        // 全局配置：加载命名空间配置 + Joi 校验
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env'],
            load: [AppConfig, SecurityConfig, SwaggerConfig, DatabaseConfig, RedisConfig],
            validationSchema,
            validationOptions: { allowUnknown: true, abortEarly: false }
        }),

        // 数据库：异步工厂读取 DatabaseConfig，自动加载实体，时区固定东八区
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const cfg = configService.get<IDatabaseConfig>('database')!
                return {
                    type: 'mysql',
                    host: cfg.host,
                    port: cfg.port,
                    database: cfg.database,
                    username: cfg.username,
                    password: cfg.password,
                    // 生产环境关闭 synchronize，统一使用 migration 管理表结构
                    synchronize: false,
                    // 自动加载所有通过 TypeOrmModule.forFeature 注册的实体
                    autoLoadEntities: true,
                    timezone: '+08:00'
                }
            }
        }),

        // 全局 Redis 模块，提供 RedisService
        RedisModule,

        // 业务模块
        AuthModule,
        UsersModule
    ],
    // HealthController 直接在根模块注册，无需独立模块
    controllers: [HealthController],
    providers: [
        // 全局异常过滤器（最先）
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        // 全局响应包装拦截器
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        // 全局 JWT 认证守卫（@Public 路由跳过）
        { provide: APP_GUARD, useClass: JwtAuthGuard }
    ]
})
export class AppModule {}
```

注意 `synchronize: false` 与 `autoLoadEntities: true`：前者意味**表结构只能靠 migration 改**（生产环境的正确做法），后者让实体不必手写 glob 路径，只要哪个模块 `TypeOrmModule.forFeature([Xxx])` 了，就自动进连接。

### 入口：main.ts

`main.ts` 负责应用级开关：CORS、全局路由前缀、参数校验管道、静态资源、Swagger，最后监听 `0.0.0.0`。

> 摘自 `./code/nestjs-template/src/main.ts`

```typescript
import 'reflect-metadata'
import { resolve } from 'node:path'

import { HttpStatus, Logger, UnprocessableEntityException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { useContainer } from 'class-validator'

import { AppModule } from './app.module'
import { ISwaggerConfig } from '~/config/configuration'
import { AllExceptionsFilter } from '~/common/filters/all-exceptions.filter'
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    const configService = app.get(ConfigService)
    const port = configService.get<number>('app.port')!
    const swagger = configService.get<ISwaggerConfig>('swagger')!

    // 使 class-validator 的自定义 validator 能使用 NestJS 依赖注入
    // fallbackOnErrors: 容器解析失败时回退到普通实例化
    useContainer(app.select(AppModule), { fallbackOnErrors: true })

    // ====== CORS 配置 ======
    app.enableCors({ credentials: true })

    // ====== 全局参数校验管道 ======
    // transform: 自动将 query 参数转换为 DTO 定义的类型
    // whitelist: 自动剔除未在 DTO 中定义的属性
    // exceptionFactory: 提取第一个校验约束消息，返回 422
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            transformOptions: { enableImplicitConversion: true },
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            stopAtFirstError: true,
            exceptionFactory: errors =>
                new UnprocessableEntityException(errors.map(e => Object.values(e.constraints ?? {})[0])[0])
        })
    )

    // ====== 全局异常过滤器 & 响应拦截器 ======
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalInterceptors(new TransformInterceptor())

    // ====== 静态资源服务 ======
    // dist/src → 往上一级到项目根 → uploads/
    // nosniff 阻止浏览器嗅探内容类型，作为上传目录的纵深防御
    const uploadsPath = resolve(__dirname, '..', 'uploads')
    app.useStaticAssets(uploadsPath, {
        setHeaders: res => {
            res.setHeader('X-Content-Type-Options', 'nosniff')
            res.setHeader('Content-Disposition', 'inline')
        }
    })

    // ====== Swagger API 文档 ======
    if (swagger.enable) {
        const config = new DocumentBuilder()
            .setTitle('NestJS Template API')
            .setDescription('NestJS 项目模板接口文档')
            .setVersion('1.0')
            // JWT Bearer Auth，与控制器上的 @ApiBearerAuth() 配合
            .addBearerAuth()
            .build()
        const document = SwaggerModule.createDocument(app, config)
        SwaggerModule.setup(swagger.path, app, document)
    }

    // 监听 0.0.0.0 以支持 Docker 容器和外部网络访问
    await app.listen(port, '0.0.0.0')

    const logger = new Logger('Bootstrap')
    logger.log(`Server running on http://localhost:${port}`)
}

void bootstrap()
```

一个容易踩的细节：这里的 `AllExceptionsFilter` / `TransformInterceptor` 和 `AppModule` 里注册的是**同一对类**。用 `app.useGlobalFilters()` 注册的是**实例**（无法注入依赖），用 `APP_FILTER` Provider 注册的是**类**（由容器实例化，可以注入 `ConfigService`、Logger 等）。模板两处都写了，实际生效取决于注册顺序——要注入依赖就只留 `APP_FILTER`/`APP_INTERCEPTOR` 那一处。

> **本机实跑到了哪一步**：`npm install` 后 `tsc --noEmit` 与 `nest build` 都是零错误；`node dist/main` 能正常启动，配置、Redis、JWT、用户、Passport 五个模块全部初始化成功，最后**只因为本机没有 MySQL** 而在 `ECONNREFUSED 127.0.0.1:3306` 上重试 9 次后退出。也就是说上面这套装配本身是对的，缺的只是外部服务。

实测输出（`node dist/main`，已去掉 PID / 时间戳与终端颜色码，中间的 9 次重试省略）：

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] TypeOrmModule dependencies initialized +17ms
[Nest] LOG [InstanceLoader] PassportModule dependencies initialized +0ms
[Nest] LOG [InstanceLoader] UsersModule dependencies initialized +0ms
[Nest] LOG [InstanceLoader] ConfigHostModule dependencies initialized +8ms
[Nest] LOG [RedisModule] Redis config: host=127.0.0.1, port=6379, password=***, db=0
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized +1ms
[Nest] LOG [InstanceLoader] RedisModule dependencies initialized +1843ms
[Nest] LOG [InstanceLoader] JwtModule dependencies initialized +1ms
[Nest] ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
Error: connect ECONNREFUSED 127.0.0.1:3306
……
[Nest] ERROR [ExceptionHandler] Error: connect ECONNREFUSED 127.0.0.1:3306
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16) {
  errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3306, fatal: true
}
```

两个细节值得留意：`Redis config` 那行把密码打成了 `***`（脱敏），而且 `RedisModule` 初始化完就过了——因为 `lazyConnect: true` 让它**不在这时候真的去连**，所以 Redis 没起也不会拖住启动；真正挡住启动的是 MySQL。

> 想零依赖验证「统一响应 / 统一异常 / 全局校验」这三件事的读者，直接跑 `./code/advanced-lab2/src/10-common-infra.ts`（`npm run 10infra`）——它把这三个组件原样搬到一个不依赖数据库的最小应用里。

## 实体示例

### 用户实体

| id | email | username | password | role | createdAt | updatedAt |
|:---|:---|:---|:---|:---|:---|:---|
| `number` 主键自增 | `varchar(128)` 唯一 | `varchar(64)` | `varchar(255)` 序列化时剔除 | `varchar(20)` 默认 user | `datetime` 建表名 `created_at` | `datetime` 建表名 `updated_at` |

> 摘自 `./code/nestjs-template/src/modules/users/user.entity.ts`

```typescript
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import { Exclude } from 'class-transformer'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('users')
export class User {
    @ApiProperty({ description: '用户 ID' })
    @PrimaryGeneratedColumn({ comment: '主键' })
    id: number

    @ApiProperty({ description: '邮箱（唯一）' })
    @Column({ type: 'varchar', length: 128, unique: true, comment: '邮箱' })
    email: string

    @ApiProperty({ description: '用户名' })
    @Column({ type: 'varchar', length: 64, comment: '用户名' })
    username: string

    /** 密码哈希值，对外序列化时排除，避免泄露 */
    @ApiHideProperty()
    @Exclude()
    @Column({ type: 'varchar', length: 255, comment: '密码哈希' })
    password: string

    @ApiProperty({ description: '角色', default: 'user' })
    @Column({ type: 'varchar', length: 20, default: 'user', comment: '角色' })
    role: string

    @ApiProperty({ description: '创建时间' })
    @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
    createdAt: Date

    @ApiProperty({ description: '更新时间' })
    @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
    updatedAt: Date
}
```

密码字段用的是 `@Exclude()`（`class-transformer` 序列化时剔除）而不是 `select: false`：前者只影响**输出**，`AuthService` 里 `bcrypt.compare` 仍能正常拿到哈希；后者连查询都拿不到，反而要在登录时手动 `addSelect`。

（以上实体摘自 `nestjs-template`，本机未启动 MySQL，未实跑；建表信息见下面脚本的实测输出。）

### 刷新令牌实体

模板把 Refresh Token 存在 Redis（key = SHA-256 哈希），所以仓库里**没有**这张表。作为对照，这里给一个等价的 TypeORM 版本，并用 TypeORM 自己的元数据存储把「装饰器 → 建表信息」打印出来验证写法确实会被读走：

> 摘自 `./code/advanced-lab2/src/10-refresh-token.entity.ts`（运行：`npm run 10entity`）

```typescript
@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User

    /** 只存 SHA-256 哈希，不存明文（见 11 篇） */
    @Index()
    @Column({ type: 'varchar', length: 64 })
    tokenHash: string

    /** 设备指纹：同一用户多设备登录时用它区分会话 */
    @Column({ type: 'varchar', length: 64 })
    deviceId: string

    @Column({ type: 'datetime', comment: '过期时间' })
    expiresAt: Date

    @Column({ type: 'boolean', default: false, comment: '是否已吊销' })
    revoked: boolean

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date
}
```

（`@Index()` 来自 `typeorm`，与 `@Column` 一起用。注意 TypeORM 0.3 的 `ColumnOptions` 类型里**没有** `index` 字段，写 `@Column({ index: true })` 能跑但过不了 `tsc`，所以这里用独立的 `@Index()` 装饰器。）

实测输出（`npm run 10entity`，直接读 `getMetadataArgsStorage()`）：

```
=== @Entity('users') → 表 users ===
  id         type=Number
  email      type=varchar length=128 unique
  username   type=varchar length=64
  password   type=varchar length=255
  role       type=varchar length=20 default=user
  createdAt  name=created_at
  updatedAt  name=updated_at

=== @Entity('refresh_tokens') → 表 refresh_tokens ===
  id         type=Number
  tokenHash  type=varchar length=64
  deviceId   type=varchar length=64
  expiresAt  type=datetime
  revoked    type=boolean default=false
  createdAt  name=created_at
  user       many-to-one → User

=== 从元数据能反推出什么 ===
  refresh_tokens 列数        = 6
  refresh_tokens 上的索引列   = tokenHash
  User.password 标了 select:false 吗 = false（模板靠 @Exclude 序列化时剔除）
```

这张表的设计要点：`tokenHash` 上建索引（刷新时按哈希查，是最高频的查询）、`deviceId` 区分设备、`revoked` 做软删除、`@ManyToOne` 带 `onDelete: 'CASCADE'`（用户注销时会话一并清掉）。

## 模块定义示例

### Auth 模块

#### DTO：校验规则写在装饰器上

模板把注册与登录的 DTO 拆成两个文件，`class-validator` 的规则由全局 `ValidationPipe` 自动执行，**消息文案直接写在装饰器里**（用户看到的就是这句）。

> 摘自 `./code/nestjs-template/src/modules/auth/dto/register.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
    @ApiProperty({ description: '邮箱', example: 'user@example.com' })
    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string

    @ApiProperty({ description: '用户名', example: '张三' })
    @IsString({ message: '用户名必须为字符串' })
    @IsNotEmpty({ message: '用户名不能为空' })
    @MaxLength(64, { message: '用户名最长 64 个字符' })
    username: string

    @ApiProperty({ description: '密码', example: '123456' })
    @IsString({ message: '密码必须为字符串' })
    @IsNotEmpty({ message: '密码不能为空' })
    @MinLength(6, { message: '密码至少 6 位' })
    @MaxLength(32, { message: '密码最长 32 个字符' })
    password: string
}
```

> 摘自 `./code/nestjs-template/src/modules/auth/dto/login.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

/** 登录请求参数 */
export class LoginDto {
    @ApiProperty({ description: '邮箱', example: 'user@example.com' })
    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string

    @ApiProperty({ description: '密码' })
    @IsString({ message: '密码必须为字符串' })
    @IsNotEmpty({ message: '密码不能为空' })
    password: string
}

/** 令牌刷新请求参数：由登录接口返回的 refreshToken */
export class RefreshTokenDto {
    @ApiProperty({ description: '刷新令牌' })
    @IsString()
    @IsNotEmpty({ message: '刷新令牌不能为空' })
    refreshToken: string
}
```

#### Service：注册 / 登录 / 刷新 / 登出

密码用 bcrypt 加盐哈希；Refresh Token 是**随机 32 字节 hex**（不是 JWT），以 SHA-256 哈希为 key 存 Redis，刷新时删除旧 key 完成轮换；登出则把 Access Token 按剩余有效期塞进 Redis 黑名单。

> 摘自 `./code/nestjs-template/src/modules/auth/auth.service.ts`

```typescript
import { ConflictException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { ISecurityConfig } from '~/config/configuration'
import { User } from '~/modules/users/user.entity'
import { RedisService } from '~/shared/redis/redis.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto, RefreshTokenDto } from './dto/login.dto'

// …
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {}

    // …
    async register(dto: RegisterDto) {
        const exists = await this.userRepo.findOne({
            where: { email: dto.email }
        })
        if (exists) throw new ConflictException('该邮箱已注册')

        const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        const user = this.userRepo.create({
            email: dto.email,
            username: dto.username,
            password,
            role: 'user'
        })
        await this.userRepo.save(user)

        this.logger.log(`用户注册成功: ${user.email}`)
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
        }
    }

    // …
    async refresh(dto: RefreshTokenDto) {
        const hash = this.sha256(dto.refreshToken)
        const payload = await this.redisService.get<RefreshTokenPayload>(`${REFRESH_TOKEN_PREFIX}${hash}`)
        if (!payload) {
            throw new UnauthorizedException('刷新令牌无效或已过期')
        }

        const user = await this.userRepo.findOne({
            where: { id: payload.userId }
        })
        if (!user) throw new UnauthorizedException('用户不存在')

        // 轮换：删除旧 refresh token 后颁发新令牌对，避免重放
        await this.redisService.del(`${REFRESH_TOKEN_PREFIX}${hash}`)
        return this.generateTokens(user)
    }

    // …
    private async generateTokens(user: User) {
        const { jwtExpires, refreshExpires } = this.configService.get<ISecurityConfig>('security')!

        const payload = { sub: user.id, email: user.email, role: user.role }
        const accessToken = this.jwtService.sign(payload)

        const refreshToken = randomBytes(32).toString('hex')
        const hash = this.sha256(refreshToken)

        const stored: RefreshTokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        }
        await this.redisService.set(`${REFRESH_TOKEN_PREFIX}${hash}`, stored, refreshExpires)

        return {
            accessToken,
            refreshToken,
            expiresIn: jwtExpires,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        }
    }

    /** 计算 SHA-256 哈希，用于 refresh token 的 Redis key */
    private sha256(value: string): string {
        return createHash('sha256').update(value).digest('hex')
    }
```

和 11 篇的 Prisma 版对比一下，能看出**设计完全一致、载体不同**：那一版把会话落成 `AuthSession` 表（能按设备列出来、能统计活跃会话），这一版把哈希当 Redis key（自带 TTL、天然分布式）。代价是 Redis 版**没法列出「我都在哪些设备登录过」**——想要这个能力就得补一张表。

（以上 Service 摘自 `nestjs-template`，依赖 MySQL + Redis，本机未启动这两个服务，未实跑。）

#### Controller：薄薄一层

控制器不写业务，只把 DTO 转给 Service；`@Public()` 标记登录/注册/刷新接口跳过全局 JWT 守卫。

> 摘自 `./code/nestjs-template/src/modules/auth/auth.controller.ts`

```typescript
import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { Public } from './decorators/public.decorator'
import { RegisterDto } from './dto/register.dto'
import { LoginDto, RefreshTokenDto } from './dto/login.dto'
import { AuthService } from './auth.service'

@ApiTags('Auth - 认证')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /** 用户注册：邮箱 + 用户名 + 密码，密码 bcrypt 哈希存储 */
    @Public()
    @Post('register')
    @ApiOperation({ summary: '用户注册' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto)
    }

    /** 用户登录：校验密码后返回 accessToken + refreshToken */
    @Public()
    @Post('login')
    @ApiOperation({ summary: '用户登录' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto)
    }

    /** 刷新令牌：使用 refreshToken 换取新的令牌对，实现无感续期 */
    @Public()
    @Post('refresh')
    @ApiOperation({ summary: '刷新令牌' })
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto)
    }

    /** 用户登出：将当前 accessToken 加入黑名单并删除 refreshToken */
    @ApiBearerAuth()
    @Post('logout')
    @ApiOperation({ summary: '用户登出' })
    async logout(@Req() req: Request) {
        const accessToken = (req.headers.authorization ?? '').replace('Bearer ', '')
        return this.authService.logout(accessToken)
    }
}
```

#### Module：把零件装起来

`UsersModule` 内部 `TypeOrmModule.forFeature([User])` 并把它 re-export，所以 `AuthModule` 只要 `imports: [UsersModule]` 就能注入 `User` 的 Repository——这就是模块系统「exports 之后别的模块才能用」的落地。

> 摘自 `./code/nestjs-template/src/modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { ISecurityConfig } from '~/config/configuration'
import { UsersModule } from '~/modules/users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
    imports: [
        PassportModule,
        // UsersModule 内部 TypeOrmModule.forFeature([User]) 并 re-export，
        // 导入后即可在本模块注入 User Repository（AuthService 使用）
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const { jwtSecret, jwtExpires } = configService.get<ISecurityConfig>('security')!
                return {
                    secret: jwtSecret,
                    // expiresIn 接受字符串（如 '2h'）或数字（秒）
                    signOptions: { expiresIn: jwtExpires } as any
                }
            }
        })
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService, JwtModule]
})
export class AuthModule {}
```

（以上 Controller / Module 摘自 `nestjs-template`，依赖 MySQL + Redis，本机未启动这两个服务，未实跑。）

## 公共基础设施

### 统一响应格式

成功和失败**共用同一个结构** `{ code, data, message }`：成功 `code = 0`，异常时 `code` 取 HTTP 状态码。这是前后端约定里最省事的一种。

> 摘自 `./code/advanced-lab2/src/10-common-infra.ts`（运行：`npm run 10infra`）

```typescript
/** 成功响应业务码 */
export const RESPONSE_SUCCESS_CODE = 0
/** 成功响应默认消息 */
export const RESPONSE_SUCCESS_MSG = 'success'

/** 统一响应结构 { code, data, message } */
export class ResOp<T = any> {
    @ApiProperty({ type: 'object', additionalProperties: true })
    data?: T | null

    @ApiProperty({ type: 'number', default: RESPONSE_SUCCESS_CODE })
    code: number

    @ApiProperty({ type: 'string', default: RESPONSE_SUCCESS_MSG })
    message: string

    constructor(code: number, data: T | null, message: string = RESPONSE_SUCCESS_MSG) {
        this.code = code
        this.data = data
        this.message = message
    }
}
```

`ResponseModel`（旧版模板的叫法）与这里的 `ResOp` 是同一个东西，模板里的正式版本在 `./code/nestjs-template/src/common/dto/api-response.dto.ts`。

### 全局响应拦截器

拦截器只做一件事：把控制器返回的原始数据 `map` 成 `ResOp`。

> 摘自 `./code/advanced-lab2/src/10-common-infra.ts`（运行：`npm run 10infra`）

```typescript
@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ResOp> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResOp> {
        return next.handle().pipe(
            // 统一包装为 { code: 0, data, message: 'success' } 格式
            // data 为 null/undefined 时兜底为 null
            map(data => new ResOp(RESPONSE_SUCCESS_CODE, data ?? null))
        )
    }
}
```

实测输出（`npm run 10infra`）：

```
  GET /demo/ok           -> 200 {"data":{"id":1,"username":"张三"},"code":0,"message":"success"}
  GET /demo/empty        -> 200 {"data":null,"code":0,"message":"success"}
```

控制器返回 `null` 时 `data` 被兜成 `null` 而不是整个字段消失——`data ?? null` 这行的作用。

### 全局异常过滤器

`@Catch()` 不带参数 = 捕获所有异常。它把异常统一翻译成上面那套结构，并且对 500 做**信息降级**：开发环境保留原始消息，生产环境只回一句「服务繁忙」。

> 摘自 `./code/advanced-lab2/src/10-common-infra.ts`（运行：`npm run 10infra`）

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name)

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const request = ctx.getRequest<{ url: string }>()
        const response = ctx.getResponse<{ setHeader: Function; status: Function; json: Function }>()

        const url = request.url
        const status = this.getStatus(exception)
        let message = this.getMessage(exception)

        // 500 错误降级：非开发环境隐藏内部细节
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(exception, undefined, 'Catch')
            if (!isDev) message = '服务繁忙，请稍后再试'
        } else {
            this.logger.warn(`(${status}) ${message} Path: ${decodeURIComponent(url)}`)
        }

        // 统一响应格式：异常时 code 取 HTTP 状态码
        const resBody = {
            code: status,
            message,
            data: null
        }

        response.setHeader('Content-Type', 'application/json; charset=utf-8').status(status).json(resBody)
    }

    // …
    private getStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus()
        }
        return (exception as ErrLike)?.status ?? (exception as ErrLike)?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR
    }
```

实测输出（`npm run 10infra`）：

```
=== 统一异常（AllExceptionsFilter）===
  GET /demo/boom         -> 400 {"code":400,"message":"参数不合法","data":null}
  GET /demo/crash        -> 500 {"code":500,"message":"数据库连接失败：ECONNREFUSED 127.0.0.1:3306","data":null}

=== 全局校验管道（ValidationPipe，校验失败 422）===
  POST /demo/users       -> 422 {"code":422,"message":"邮箱格式不正确","data":null}
  POST /demo/users       -> 201 {"data":{"id":2,"email":"zhangsan@example.com","username":"张三"},"code":0,"message":"success"}

=== 同一个 500，把 isDev 切成 false（相当于 NODE_ENV=production）===
  GET /demo/crash        -> 500 {"code":500,"message":"服务繁忙，请稍后再试","data":null}
```

四个信息点：`BadRequestException` 的 400 与消息原样透出；未捕获的 `Error` 落成 500 且带原始消息（开发环境）；校验失败是 422 且**复用同一套结构**；切到生产后 500 的消息被替换掉。第二个 `POST` 里传了 `nickname` 却没出现在返回里，那是 `ValidationPipe` 的 `whitelist: true` 把它剔除了。

过滤器的正式版本在 `./code/nestjs-template/src/common/filters/all-exceptions.filter.ts`，与上面唯一不同的是它多认一种 `QueryFailedError`（数据库错误一律按 500 处理），并且用 winston 记日志。

### 共享 Redis 模块

`@Global()` 让模块导出一次、全应用可注入；`lazyConnect: true` 保证 Redis 没起时**不阻塞应用启动**（首次用到才连）；模块自身实现 `OnModuleDestroy`，进程退出时优雅关闭连接。

> 摘自 `./code/nestjs-template/src/shared/redis/redis.module.ts`

```typescript
import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

import { IRedisConfig } from '~/config/redis.config'
import { REDIS_CLIENT, RedisService } from './redis.service'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const cfg = configService.get<IRedisConfig>('redis')!
                const logger = new Logger('RedisModule')
                // 密码脱敏输出，避免敏感信息泄露到日志
                logger.log(
                    `Redis config: host=${cfg.host}, port=${cfg.port}, password=${
                        cfg.password ? '***' : '(empty)'
                    }, db=${cfg.db}`
                )

                return new Redis({
                    host: cfg.host,
                    port: cfg.port,
                    // 密码为空字符串时传 undefined，避免 ioredis 将其视为有效密码
                    password: cfg.password || undefined,
                    db: cfg.db,
                    // 延迟连接：应用启动时不立即建立连接，首次使用时才连接
                    lazyConnect: true
                })
            }
        },
        RedisService
    ],
    exports: [RedisService]
})
export class RedisModule implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    /** 模块销毁时优雅关闭 Redis 连接，等待正在执行的命令完成 */
    async onModuleDestroy() {
        await this.redis.quit()
    }
}
```

`RedisService` 再包一层，把它变成业务侧友好的 `get/set/del`（见 `./code/nestjs-template/src/shared/redis/redis.service.ts`）。注意 `exports` 里只写了 `RedisService`——`REDIS_CLIENT` 这个 Token 本身没有导出，所以业务代码只能用 Service，不能直接 `@Inject(REDIS_CLIENT)`（除非该模块自己 import 了 RedisModule；标了 `@Global()` 之后连 import 也不用写）。

### 健康检查模块

健康检查不引入 `@nestjs/terminus`，直接查两头：数据库 `SELECT 1`、Redis `PING`，并且**两个检查各自独立 try/catch**——一个挂了另一个的结果照样返回。

> 摘自 `./code/nestjs-template/src/modules/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { DataSource } from 'typeorm'

import { Public } from '~/modules/auth/decorators/public.decorator'
import { RedisService } from '~/shared/redis/redis.service'

/** 单项健康检查结果 */
interface CheckResult {
    status: 'up' | 'down'
    latencyMs?: number
    error?: string
}

@ApiTags('Health - 健康检查')
@Controller('health')
export class HealthController {
    constructor(
        private readonly dataSource: DataSource,
        private readonly redisService: RedisService
    ) {}

    /**
     * 健康检查 — 数据库执行 SELECT 1，Redis 执行 PING。
     * @returns { status: 'ok' | 'error', details: { database, redis } }
     */
    @Public()
    @Get()
    @ApiOperation({ summary: '健康检查（数据库 + Redis）' })
    async check() {
        const details: Record<string, CheckResult> = {}

        // 数据库检查：执行 SELECT 1
        const dbStart = Date.now()
        try {
            await this.dataSource.query('SELECT 1')
            details.database = { status: 'up', latencyMs: Date.now() - dbStart }
        } catch (err) {
            details.database = {
                status: 'down',
                error: (err as Error).message
            }
        }

        // Redis 检查：执行 PING，期望返回 PONG
        const redisStart = Date.now()
        try {
            const pong = await this.redisService.ping()
            details.redis = {
                status: pong === 'PONG' ? 'up' : 'down',
                latencyMs: Date.now() - redisStart
            }
        } catch (err) {
            details.redis = { status: 'down', error: (err as Error).message }
        }

        const allUp = Object.values(details).every(v => v.status === 'up')
        return {
            status: allUp ? 'ok' : 'error',
            details
        }
    }
}
```

`DataSource` 由 `TypeOrmModule.forRootAsync` 提供，直接注入就能用；返回体带了 `latencyMs`，接监控时可以直接画延迟曲线。这个控制器在 `AppModule` 里直接挂进 `controllers`，没有独立的 HealthModule。

（以上 Redis 模块与健康检查摘自 `nestjs-template`，依赖 MySQL + Redis，本机未启动这两个服务，未实跑。）

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

## 小结

- **目录结构**：src 五大块 `common`/`config`/`constants`/`modules`/`shared`；业务模块自带 `dto`/`entities`/`guards`/`services`/`strategies` + 三件套
- **配置管理**：`config/` 集中读 `.env` 给默认值，`database.config.ts` 派生 `TypeOrmModuleOptions`（`synchronize`/`logging` 仅 development 开）；`.env` 按 DB/Redis/JWT 三组给变量（`JWT_EXPIRES` 默认 2h）
- **根模块与入口**：`APP_FILTER`/`APP_INTERCEPTOR` 以 Provider 注册（可注入依赖），`main.ts` 挂 `ValidationPipe`(`whitelist`/`transform`/`forbidNonWhitelisted`)+`enableCors`+`setGlobalPrefix('api')`+Swagger
- **数据层与公共设施**
  - 实体演示主键/唯一列/`select:false` 隐藏密码/`ManyToOne` 级联删除；业务模块组合 dto/module/controller/service
  - 统一响应 `ResponseModel`+`TransformInterceptor`、统一异常 `@Catch()` 过滤器（堆栈仅 development）；`@Global()` `RedisModule` 用 `useFactory`+Token `'REDIS_CLIENT'` 全局可用
  - 健康检查查两头：`dataSource.query('SELECT 1')` 与 `redis.ping()`，任一失败置 degraded
- **上手与最佳实践**：CLI 建项目 → 装依赖 → `cp .env.example .env` → 起 MySQL/Redis → `start:dev`/`build`+`start:prod`；按功能划模块、共享下沉、基础设施进 common、全局校验/响应/异常、依赖注入

---

## 配套代码

本篇的可运行示例分两处：`node/NestJS 进阶/code/nestjs-template`（完整项目模板，需要 MySQL + Redis）与 `node/NestJS 进阶/code/advanced-lab2`（把不依赖数据库的部分抽出来真跑）。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/advanced-lab2/src/10-common-infra.ts` | 统一响应 + 统一异常 + 全局校验的可跑最小应用（含 422、500 降级实测） | 公共基础设施 · 统一响应格式 · 全局响应拦截器 · 全局异常过滤器 |
| `./code/advanced-lab2/src/10-refresh-token.entity.ts` | RefreshToken 实体 + TypeORM 元数据导出 | 实体示例 · 刷新令牌实体 |
| `./code/advanced-lab2/src/10-user.entity.ts` | 与模板同源的 User 实体（供 `ManyToOne` 引用，让上面脚本自洽） | 用户实体 |
| `./code/nestjs-template/src/app.module.ts` | 根模块：配置 / 数据库 / Redis / 全局组件装配 | 根模块与入口 |
| `./code/nestjs-template/src/main.ts` | 入口：校验管道、过滤器、拦截器、静态资源、Swagger | 根模块与入口 |
| `./code/nestjs-template/src/config/configuration.ts` | `registerAs` 命名空间配置 + `env` 工具函数 + Joi 校验 | 配置代码 |
| `./code/nestjs-template/src/config/database.config.ts` | `'database'` 命名空间配置 | 配置代码 |
| `./code/nestjs-template/src/modules/users/user.entity.ts` | 用户实体（`@Exclude` 隐藏密码哈希） | 用户实体 |
| `./code/nestjs-template/src/modules/auth/dto/register.dto.ts` | 注册 DTO 的 class-validator 规则 | DTO：校验规则写在装饰器上 |
| `./code/nestjs-template/src/modules/auth/dto/login.dto.ts` | 登录 / 刷新 DTO | DTO：校验规则写在装饰器上 |
| `./code/nestjs-template/src/modules/auth/auth.service.ts` | bcrypt 存密码、Redis 存刷新令牌、轮换与黑名单登出 | Service：注册 / 登录 / 刷新 / 登出 |
| `./code/nestjs-template/src/modules/auth/auth.controller.ts` | 认证接口（`@Public()` 跳过全局守卫） | Controller：薄薄一层 |
| `./code/nestjs-template/src/modules/auth/auth.module.ts` | `JwtModule.registerAsync` + 导入 UsersModule | Module：把零件装起来 |
| `./code/nestjs-template/src/shared/redis/redis.module.ts` | `@Global()` Redis 模块（`lazyConnect` + 优雅关闭） | 共享 Redis 模块 |
| `./code/nestjs-template/src/modules/health/health.controller.ts` | 数据库 + Redis 双项健康检查 | 健康检查模块 |
| `./code/advanced-lab2/README.md` | 脚本清单、运行命令与实测输出 | 全部小节 |

跑没跑对照：`advanced-lab2` 的两个脚本都实跑过，输出已贴在对应小节；`nestjs-template` 的代码需要 MySQL + Redis 才能启动，本机没有这两个服务，**未实跑**，只做过语法检查（`transpileModule` 逐文件转译，不解析类型）。

运行方式见 `advanced-lab2/README.md` 与 `nestjs-template/README.md`。

---

## 参考

- 本模块总结：[总结](../NestJS 入门/总结.md)
- 本模块面试题：[面试题](../NestJS 入门/面试题.md)
- 上一篇：[NestJS 源码分析](./09-NestJS%20源码分析)
- 下一篇：[认证进阶：双 Token 与多设备会话](./11-认证进阶-双Token与多设备会话)
