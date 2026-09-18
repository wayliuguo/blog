# Express 项目模板

基于 Express + TypeORM + Redis + JWT 的 Node.js 后端项目模板。

## 技术栈

- **运行时** Node.js 18+
- **框架** Express 4
- **ORM** TypeORM 0.3 + MySQL 2
- **缓存** Redis (ioredis)
- **认证** JWT (jsonwebtoken + bcrypt)
- **校验** Joi
- **日志** Winston

## 快速开始

### 1. 环境要求

- Node.js 18+
- MySQL 8.0+
- Redis 6+

### 2. 安装

```bash
cd express-template
npm install
```

### 3. 配置

复制 `.env` 文件并按需修改：

```ini
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=root
DB_NAME=myapp

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASS=redis123

JWT_SECRET=change-this-to-a-random-string
JWT_EXPIRES=2h
```

### 4. 数据库初始化

```bash
# 生成初始迁移文件
npm run migration:generate -- src/migrations/InitTables

# 执行迁移创建表
npm run migration:run
```

### 5. 启动

```bash
# 开发模式（带文件监听）
npm run dev

# 生产模式
npm start
```

## 项目结构

```
src/
├── app.js                 # 入口文件
├── config/
│   ├── index.js           # 配置聚合
│   └── database.js        # TypeORM DataSource 配置
├── entities/
│   ├── User.js            # 用户实体
│   └── Product.js         # 商品实体
├── controllers/
│   └── userController.js  # 用户控制器
├── services/
│   └── userService.js     # 用户业务逻辑
├── middleware/
│   ├── auth.js            # JWT 认证中间件
│   ├── validate.js        # Joi 参数校验中间件
│   ├── logger.js          # 请求日志中间件
│   └── errorHandler.js    # 全局错误处理
├── routes/
│   └── users.js           # 用户路由
├── utils/
│   ├── logger.js          # Winston 日志实例
│   ├── redis.js           # Redis 客户端实例
│   └── schemas.js         # Joi 校验规则
└── migrations/            # 数据库迁移文件
```

## API 接口

### 注册

```http
POST /api/users/register
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

### 登录

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

响应中包含 `token`，后续请求需在 Header 中携带：

```http
Authorization: Bearer <token>
```

### 获取用户信息

```http
GET /api/users/profile
Authorization: Bearer <token>
```

### 健康检查

```http
GET /health
```

## 数据库迁移

使用 TypeORM 迁移管理 schema 变更，`synchronize` 始终为 `false`。

```bash
# 修改 entity 后生成迁移文件
npm run migration:generate -- src/migrations/DescriptionOfChange

# 手动创建空白迁移文件
npm run migration:create -- src/migrations/MyNewMigration

# 执行待处理的迁移
npm run migration:run

# 回滚最后一次迁移
npm run migration:revert

# 查看迁移状态
npm run migration:show
```

## 实体定义

当前包含两个实体：

### User（users 表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int (PK, AUTO_INCREMENT) | 主键 |
| name | varchar(50) | 用户名 |
| email | varchar(100) | 邮箱（唯一） |
| password | varchar(255) | 加密密码 |
| role | varchar(20) | 角色，默认 `user` |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

### Product（products 表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int (PK, AUTO_INCREMENT) | 主键 |
| name | varchar(100) | 商品名 |
| price | decimal(10,2) | 价格 |
| stock | int | 库存，默认 0 |
| createdAt | datetime | 创建时间 |

## 预期输出

- 前置：Node 18+、MySQL 8.0+、Redis 6+；`npm install` → `npm run migration:run` 建表 → `npm start`（默认 3000）。
- 启动日志显示服务监听 `http://localhost:3000`，中间件（cors / 日志 / 认证 / 校验）按序挂载。
- `POST /api/auth/register` 注册、`POST /api/auth/login` 返回 JWT；带 Token 访问 `/api/users` 返回用户列表，未带 Token 返回 401。
- 强依赖外部 MySQL/Redis，未配置或不可达时会在启动或首次查询报连接错误，请先保证两个服务可达。