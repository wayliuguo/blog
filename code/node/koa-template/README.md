# koa-template —— Koa + TypeORM + Redis + JWT 项目模板

基于 Koa 2 的 Node.js 后端项目模板，集成了 TypeORM（MySQL）、Redis（ioredis）、JWT 认证、Joi 校验与 Winston 日志。可作为实际项目的起步骨架。

## 对应博客章节

| 项目 | 对应文档 | 说明 |
| --- | --- | --- |
| koa-template | [Koa 项目模板](../../../node/04-Express%20与%20Koa/05-Koa%20项目模板.md) | 与文档中的模板结构对应 |

## 技术栈

- 运行时：Node.js（建议 18+）
- 框架：Koa 2 + @koa/router + koa-body + @koa/cors
- ORM：TypeORM 0.3 + MySQL2
- 缓存：Redis（ioredis）
- 认证：JWT（jsonwebtoken）+ bcrypt 密码加密
- 校验：Joi
- 日志：Winston
- 配置：dotenv + reflect-metadata

## 怎么跑起来

### 1. 安装依赖

```bash
cd koa-template
npm install
```

### 2. 准备环境

项目已带 `.env` 示例，确认以下配置（按需修改）：

```ini
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=myapp
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=dev-secret-change-in-production
```

需要可用的 MySQL 与 Redis 实例；`synchronize` 默认 `false`，首次运行请用迁移建表。

### 3. 数据库初始化

```bash
npm run migration:generate -- src/migrations/InitTables   # 生成迁移
npm run migration:run                                     # 执行迁移建表
```

### 4. 启动

```bash
npm start        # node src/app.js
npm run dev      # node --watch src/app.js
```

### 5. 验证

接口统一前缀 `/api`，健康检查在根路径 `/health`。

```bash
# 注册
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhangsan@example.com","password":"123456"}'

# 登录（返回 token）
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"zhangsan@example.com","password":"123456"}'

# 携带 token 获取个人信息
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>"

# 健康检查
curl http://localhost:3000/health
# 预期：{"status":"ok","db":"connected","redis":"connected"}
```

## 目录结构

```
koa-template/
├── .env                      # 环境变量（端口、数据库、Redis、JWT 配置）
├── package.json              # 含 start / dev 与 migration:* 脚本
├── tsconfig.json             # 供 tsx 运行 TypeORM CLI 使用
└── src/
    ├── app.js               # 入口：创建 Koa、挂载全局中间件、路由、健康检查、bootstrap
    ├── config/
    │   ├── index.js         # 读取 .env，聚合 port / database / redis / jwt 配置
    │   └── database.js      # TypeORM DataSource 配置（MySQL）
    ├── controllers/
    │   └── userController.js # 注册 / 登录 / 获取个人信息 的处理
    ├── services/
    │   └── userService.js   # 业务逻辑：bcrypt 加密、JWT 签发、仓库读写
    ├── entities/
    │   ├── User.js          # 用户实体
    │   └── Product.js       # 商品实体
    ├── routes/
    │   └── users.js         # 用户路由（@koa/router，挂载校验与认证中间件）
    ├── middleware/
    │   ├── auth.js          # JWT 认证中间件，解析 token 写入 ctx.state.user
    │   ├── errorHandler.js  # 全局错误处理，区分业务错误与 500
    │   ├── logger.js        # 请求日志中间件
    │   ├── responseTime.js  # 记录并设置 X-Response-Time
    │   └── validate.js      # Joi 参数校验中间件
    └── utils/
        ├── logger.js        # Winston 日志实例
        ├── redis.js         # ioredis 客户端
        └── schemas.js       # Joi 校验规则
```

## 本模板与更完整生产方案的差异

本模板已包含认证、校验、日志、ORM 与缓存，但相比更完整的生产方案仍有可补充之处：

| 方面 | 本模板 | 更完整的生产方案通常还需 |
| --- | --- | --- |
| 认证 | 单 JWT，登录即放行 | Refresh Token / 黑名单、多设备会话、角色权限体系 |
| 校验 | Joi 手写 schema | class-validator / DTO、统一校验拦截 |
| 响应 | 各 handler 自行返回 `ctx.body` | 统一响应格式中间件 |
| 数据库 | TypeORM 单库 | 读写分离、连接池监控、多数据源 |
| 配置 | dotenv 手动读取 | 启动时配置校验（如 Joi validationSchema） |
| 文档 | 无 | Swagger / OpenAPI |
| 测试 | 无 | 单元 / 集成测试、E2E |
| 部署 | 直接 node 启动 | PM2 / 容器化、健康检查探针、CI/CD |

## 阅读建议

1. 先读博客 [Koa 项目模板](../../../node/04-Express%20与%20Koa/05-Koa%20项目模板.md) 了解整体设计。
2. 按 `app.js`（入口与中间件顺序）→ `routes/users.js`（路由与中间件挂载）→ `middleware/*`（认证 / 校验 / 错误处理）→ `services/userService.js`（业务与数据访问）的顺序阅读。
3. 重点理解 Koa 中间件「洋葱模型」在 `app.js` 中的实际堆叠顺序：cors → errorHandler → responseTime → logger → koaBody → 路由。

## 预期输出

- 前置：Node 18+、MySQL、Redis 可达；`npm install` → `npm run migration:run` 建表 → `npm start`（默认 3000）。
- 启动后监听 3000，中间件洋葱顺序：`cors → errorHandler → responseTime → logger → koaBody → 路由`。
- `POST /api/auth/login` 返回 JWT；带 Token 访问业务路由正常，缺 Token 返回 401。
- 未匹配路由返回 404；Joi 校验失败返回 400 及具体字段错误。
- 强依赖外部 MySQL/Redis，未配置或不可达时启动或首请求报错，请先保证服务可达。
