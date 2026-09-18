# NestJS 项目模板

基于 NestJS 11 + TypeORM + MySQL + Redis + JWT + Swagger 的 Node.js 后端项目模板。

## 技术栈

- **运行时** Node.js 20+
- **框架** NestJS 11（TypeScript）
- **ORM** TypeORM 0.3 + MySQL2
- **缓存** Redis（ioredis 封装的 RedisService）
- **认证** JWT（@nestjs/jwt + passport-jwt + bcrypt）
- **校验** class-validator / class-transformer
- **文档** @nestjs/swagger
- **配置校验** Joi（@nestjs/config validationSchema）
- **日志** Winston

## 快速开始

### 1. 环境要求

- Node.js 20+
- MySQL 8.0+
- Redis 6+

### 2. 安装依赖

```bash
cd nestjs-template
npm install
```

### 3. 配置环境变量

编辑 `.env` 文件按需修改（数据库连接、Redis、JWT 密钥等）：

```ini
APP_PORT=3000
GLOBAL_PREFIX=api

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=nest_template
DB_SYNCHRONIZE=true

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=change-this-to-a-random-secret
```

### 4. 启动

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build && npm run start:prod
```

启动后访问：

- 接口基础路径：`http://localhost:3000/api`
- Swagger 文档：`http://localhost:3000/api-docs`
- 健康检查：`http://localhost:3000/api/health`

## 项目结构

```
src/
├── main.ts                          # 启动入口（Swagger、全局管道/拦截器/过滤器、静态资源）
├── app.module.ts                    # 根模块（聚合各模块与全局组件）
├── config/
│   ├── configuration.ts             # 环境变量工具 + app/security/swagger 配置 + Joi 校验
│   ├── database.config.ts           # TypeORM 数据库配置
│   └── redis.config.ts              # Redis 配置
├── common/
│   ├── filters/all-exceptions.filter.ts   # 全局异常过滤器
│   ├── interceptors/transform.interceptor.ts # 统一响应格式拦截器
│   └── dto/api-response.dto.ts            # 统一响应模型 ResOp
├── shared/
│   └── redis/
│       ├── redis.module.ts          # Redis 全局模块（ioredis 封装）
│       └── redis.service.ts         # Redis 服务（get/set/del/缓存预热）
└── modules/
    ├── auth/                        # 认证模块
    │   ├── auth.module.ts
    │   ├── auth.controller.ts       # 注册 / 登录 / 刷新令牌 / 登出
    │   ├── auth.service.ts          # JWT 签发、bcrypt 加密、Refresh Token
    │   ├── decorators/public.decorator.ts
    │   ├── dto/register.dto.ts
    │   ├── dto/login.dto.ts
    │   ├── guards/jwt-auth.guard.ts
    │   └── strategies/jwt.strategy.ts
    ├── users/                       # 用户模块
    │   ├── user.entity.ts           # User 实体（TypeORM）
    │   └── users.module.ts
    └── health/
        └── health.controller.ts     # 健康检查（数据库 + Redis）
```

## 统一响应格式

所有接口（成功与异常）均返回以下结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code`：`0` 表示成功；异常时为 HTTP 状态码（如 401/422/500）。
- `data`：业务数据，无数据时为 `null`。

## 认证机制

- 注册 `POST /api/auth/register` → 创建用户（bcrypt 哈希存储密码）
- 登录 `POST /api/auth/login` → 返回 `accessToken` + `refreshToken`
- 刷新 `POST /api/auth/refresh` → 用 refreshToken 换取新令牌对
- 登出 `POST /api/logout` → accessToken 加入 Redis 黑名单

后续需认证的请求在 Header 携带：

```http
Authorization: Bearer <accessToken>
```

- 登录/注册/刷新/健康检查接口使用 `@Public()` 装饰器跳过认证。
- 其他接口默认受全局 `JwtAuthGuard` 保护。

## 实体定义

### User（users 表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int (PK, AUTO_INCREMENT) | 主键 |
| email | varchar(128) | 邮箱（唯一） |
| username | varchar(64) | 用户名 |
| password | varchar(255) | bcrypt 哈希（序列化时排除） |
| role | varchar(20) | 角色，默认 `user` |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

> 开发阶段 `DB_SYNCHRONIZE=true` 可自动建表；生产环境请设为 `false` 并使用 TypeORM migration 管理表结构。

## 预期输出

- 前置：Node 20+、MySQL 8.0+、Redis 6+；`npm install` → `npm run migration:run`（或 `DB_SYNCHRONIZE=true` 自动建表）→ `npm run start:dev`（默认 3000，`/api` 前缀）。
- 启动后 Swagger 文档在 `http://localhost:3000/api/docs`；`POST /api/auth/login` 返回 JWT。
- 带 Token 访问 `GET /api/users` 返回用户列表；`GET /api/health` 返回健康状态；缺 Token 返回 401。
- 强依赖外部数据库/缓存，未配置或不可达时启动或首请求报错，请先保证服务可达。
