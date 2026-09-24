# Koa 项目模板

## 目录结构

```
my-koa-app/
├── src/
│   ├── config/
│   │   └── index.js            # 配置统一管理
│   ├── controllers/
│   │   ├── userController.js   # 用户控制器
│   │   └── productController.js# 商品控制器
│   ├── entities/
│   │   ├── User.js             # 用户实体
│   │   └── Product.js          # 商品实体
│   ├── middleware/
│   │   ├── errorHandler.js     # 统一错误处理（洋葱模型最外层）
│   │   ├── auth.js             # JWT 认证中间件
│   │   ├── validate.js         # 请求校验中间件
│   │   ├── logger.js           # 请求日志（洋葱模型演示）
│   │   └── responseTime.js     # 响应耗时统计
│   ├── routes/
│   │   ├── users.js            # 用户路由
│   │   └── products.js         # 商品路由
│   ├── services/
│   │   ├── userService.js      # 用户业务逻辑
│   │   └── productService.js   # 商品业务逻辑
│   ├── utils/
│   │   ├── logger.js           # Winston 日志实例
│   │   └── redis.js            # Redis 客户端
│   └── app.js                  # 入口文件
├── .env                        # 环境变量
├── .env.example                # 环境变量模板
└── package.json
```

## package.json

> 示意片段（无配套脚本）

```json
{
  "name": "my-koa-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "dev": "node --watch src/app.js"
  },
  "dependencies": {
    "koa": "^2.14.0",
    "@koa/router": "^12.0.0",
    "koa-body": "^6.0.0",
    "@koa/cors": "^5.0.0",
    "dotenv": "^16.0.0",
    "reflect-metadata": "^0.1.13",
    "typeorm": "^0.3.0",
    "mysql2": "^3.0.0",
    "ioredis": "^5.3.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "joi": "^17.9.0",
    "winston": "^3.8.0"
  }
}
```

## 配置管理

> 摘自 `./code/koa-template/src/config/index.js`（运行：`npm run start`）

```javascript
require('dotenv').config()

module.exports = {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'myapp',
        synchronize: false
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASS || undefined
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES || '2h'
    }
}
```

## 入口文件

> 摘自 `./code/koa-template/src/app.js`（运行：`npm run start`）

```javascript
require('reflect-metadata')
const Koa = require('koa')
const Router = require('@koa/router')
const { koaBody } = require('koa-body')
const cors = require('@koa/cors')
const { AppDataSource } = require('./config/database')
const redisClient = require('./utils/redis')
const logger = require('./utils/logger')
const requestLogger = require('./middleware/logger')
const responseTime = require('./middleware/responseTime')
const errorHandler = require('./middleware/errorHandler')
const userRoutes = require('./routes/users')
const config = require('./config')

const app = new Koa()
const api = new Router({ prefix: '/api' })

// ===== 全局中间件（洋葱模型） =====
app.use(cors())
app.use(errorHandler)
app.use(responseTime)
app.use(requestLogger)
app.use(koaBody())

// ===== 路由 =====
api.use(userRoutes.routes())
app.use(api.routes())
app.use(api.allowedMethods())

// ===== 健康检查 =====
app.use(async ctx => {
    if (ctx.path === '/health' && ctx.method === 'GET') {
        try {
            await AppDataSource.query('SELECT 1')
            await redisClient.ping()
            ctx.body = { status: 'ok', db: 'connected', redis: 'connected' }
        } catch (err) {
            ctx.status = 503
            ctx.body = { status: 'degraded', message: err.message }
        }
    }
})

// ===== 启动 =====
async function bootstrap() {
    try {
        await AppDataSource.initialize()
        logger.info('数据库连接成功')

        await redisClient.ping()
        logger.info('Redis 连接成功')

        app.listen(config.port, () => {
            logger.info(`服务器运行在 http://localhost:${config.port}`)
        })
    } catch (err) {
        logger.error('启动失败:', err)
        process.exit(1)
    }
}

bootstrap()
```

## 数据库配置与实体

> 摘自 `./code/koa-template/src/config/database.js`（运行：`npm run start`）

```javascript
const { DataSource } = require('typeorm')
const config = require('./index')

const AppDataSource = new DataSource({
    type: 'mysql',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.database.synchronize,
    logging: config.nodeEnv === 'development',
    entities: [__dirname + '/../entities/*.js'],
    migrations: [__dirname + '/../migrations/*.{js,ts}'],
    migrationsTableName: '_migrations_history'
})

module.exports = { AppDataSource }
```

> 摘自 `./code/koa-template/src/entities/User.js`（运行：`npm run start`）

```javascript
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: { primary: true, type: 'int', generated: 'increment' },
        name: { type: 'varchar', length: 50 },
        email: { type: 'varchar', length: 100, unique: true },
        password: { type: 'varchar', length: 255 },
        role: { type: 'varchar', length: 20, default: 'user' },
        createdAt: { type: 'datetime', createDate: true },
        updatedAt: { type: 'datetime', updateDate: true }
    }
})
```

> 摘自 `./code/koa-template/src/entities/Product.js`（运行：`npm run start`）

```javascript
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
    name: 'Product',
    tableName: 'products',
    columns: {
        id: { primary: true, type: 'int', generated: 'increment' },
        name: { type: 'varchar', length: 100 },
        price: { type: 'decimal', precision: 10, scale: 2 },
        stock: { type: 'int', default: 0 },
        createdAt: { type: 'datetime', createDate: true }
    }
})
```

## 路由与控制器

> 摘自 `./code/koa-template/src/routes/users.js`（运行：`npm run start`）

```javascript
const Router = require('@koa/router')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../utils/schemas')

const router = new Router()

router.post('/users/register', validate(registerSchema), userController.register)
router.post('/users/login', validate(loginSchema), userController.login)
router.get('/users/profile', auth, userController.getProfile)

module.exports = router
```

> 摘自 `./code/koa-template/src/controllers/userController.js`（运行：`npm run start`）

```javascript
const userService = require('../services/userService')

exports.register = async ctx => {
    const user = await userService.createUser(ctx.request.body)
    ctx.status = 201
    ctx.body = { data: { id: user.id, name: user.name, email: user.email } }
}

exports.login = async ctx => {
    const result = await userService.login(ctx.request.body)
    ctx.body = { data: result }
}

exports.getProfile = async ctx => {
    const user = await userService.getUserById(ctx.state.user.userId)
    ctx.body = { data: user }
}
```

## 业务逻辑层

> 摘自 `./code/koa-template/src/services/userService.js`（运行：`npm run start`）

```javascript
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { AppDataSource } = require('../config/database')
const config = require('../config')
const User = require('../entities/User')

const userRepo = AppDataSource.getRepository('User')

exports.createUser = async ({ name, email, password }) => {
    const existing = await userRepo.findOneBy({ email })
    if (existing) {
        const err = new Error('邮箱已被注册')
        err.statusCode = 409
        err.isOperational = true
        throw err
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = userRepo.create({ name, email, password: hashedPassword })
    return userRepo.save(user)
}

exports.login = async ({ email, password }) => {
    const user = await userRepo.findOneBy({ email })
    if (!user) {
        const err = new Error('邮箱或密码错误')
        err.statusCode = 401
        err.isOperational = true
        throw err
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        const err = new Error('邮箱或密码错误')
        err.statusCode = 401
        err.isOperational = true
        throw err
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })

    return { token, user: { id: user.id, name: user.name, email: user.email } }
}

exports.getUserById = async id => {
    const user = await userRepo.findOneBy({ id })
    if (!user) {
        const err = new Error('用户不存在')
        err.statusCode = 404
        err.isOperational = true
        throw err
    }
    return { id: user.id, name: user.name, email: user.email }
}
```

## 中间件

> 摘自 `./code/koa-template/src/middleware/auth.js`（运行：`npm run start`）

```javascript
const jwt = require('jsonwebtoken')
const config = require('../config')

module.exports = async (ctx, next) => {
    const authHeader = ctx.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401
        ctx.body = { message: '未提供认证令牌' }
        return
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, config.jwt.secret)
        ctx.state.user = decoded
        await next()
    } catch (err) {
        ctx.status = 401
        ctx.body = { message: err.name === 'TokenExpiredError' ? '令牌已过期' : '无效的令牌' }
    }
}
```

> 摘自 `./code/koa-template/src/middleware/validate.js`（运行：`npm run start`）

```javascript
module.exports = schema => {
    return async (ctx, next) => {
        const { error, value } = schema.validate(ctx.request.body, {
            abortEarly: false,
            stripUnknown: true
        })
        if (error) {
            const messages = error.details.map(d => d.message)
            ctx.status = 400
            ctx.body = { message: '请求参数校验失败', errors: messages }
            return
        }
        ctx.request.body = value
        await next()
    }
}
```

> 摘自 `./code/koa-template/src/middleware/errorHandler.js`（运行：`npm run start`）

```javascript
const logger = require('../utils/logger')

module.exports = async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        logger.error(`${ctx.method} ${ctx.url} - ${err.message}`)

        const statusCode = err.statusCode || err.status || 500
        ctx.status = statusCode
        ctx.body = {
            message: err.isOperational ? err.message : '服务器内部错误',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
        ctx.app.emit('error', err, ctx)
    }
}
```

> 摘自 `./code/koa-template/src/middleware/logger.js`（运行：`npm run start`）

```javascript
const logger = require('../utils/logger')

module.exports = async (ctx, next) => {
    const start = Date.now()
    const { method, url } = ctx

    logger.debug(`--> ${method} ${url}`)

    await next()

    const duration = Date.now() - start
    logger.info(`${method} ${url} ${ctx.status} ${duration}ms`)
}
```

> 摘自 `./code/koa-template/src/middleware/responseTime.js`（运行：`npm run start`）

```javascript
module.exports = async (ctx, next) => {
    const start = Date.now()
    await next()
    ctx.set('X-Response-Time', `${Date.now() - start}ms`)
}
```

## 工具模块

> 摘自 `./code/koa-template/src/utils/logger.js`（运行：`npm run start`）

```javascript
const winston = require('winston')
const config = require('../config')

const logger = winston.createLogger({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format:
                config.nodeEnv === 'development'
                    ? winston.format.combine(winston.format.colorize(), winston.format.simple())
                    : undefined
        }),
        ...(config.nodeEnv === 'production'
            ? [new winston.transports.File({ filename: 'logs/error.log', level: 'error' })]
            : [])
    ]
})

module.exports = logger
```

> 摘自 `./code/koa-template/src/utils/redis.js`（运行：`npm run start`）

```javascript
const Redis = require('ioredis')
const config = require('../config')

const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
})

redis.on('error', err => {
    console.error('Redis 连接错误:', err.message)
})

module.exports = redis
```

> 摘自 `./code/koa-template/src/utils/schemas.js`（运行：`npm run start`）

```javascript
const Joi = require('joi')

exports.registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50).required()
})

exports.loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
})

exports.createProductSchema = Joi.object({
    name: Joi.string().max(100).required(),
    price: Joi.number().positive().precision(2).required(),
    stock: Joi.number().integer().min(0).default(0)
})
```

## .env 配置

```bash
# .env  /  .env.example
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
JWT_SECRET=change-this-to-a-random-string
JWT_EXPIRES=2h
```

## 使用方式

```bash
# 1. 安装
npm install

# 2. 复制环境变量
cp .env.example .env

# 3. 确保 MySQL 和 Redis 已运行，修改 .env 配置

# 4. 启动
npm run dev
```

## 配套代码

本篇的可运行示例在仓库 `node/Express 与 Koa/code/koa-template`。

| 文件 | 对应小节 |
| --- | --- |
| `./code/koa-template/src/config/index.js` | 配置管理 |
| `./code/koa-template/src/config/database.js` | 数据库配置与实体 |
| `./code/koa-template/src/app.js` | 入口文件 |
| `./code/koa-template/src/entities/User.js` | 数据库配置与实体 |
| `./code/koa-template/src/entities/Product.js` | 数据库配置与实体 |
| `./code/koa-template/src/routes/users.js` | 路由与控制器 |
| `./code/koa-template/src/controllers/userController.js` | 路由与控制器 |
| `./code/koa-template/src/services/userService.js` | 业务逻辑层 |
| `./code/koa-template/src/middleware/auth.js` | 中间件 |
| `./code/koa-template/src/middleware/validate.js` | 中间件 |
| `./code/koa-template/src/middleware/errorHandler.js` | 中间件 |
| `./code/koa-template/src/middleware/logger.js` | 中间件 |
| `./code/koa-template/src/middleware/responseTime.js` | 中间件 |
| `./code/koa-template/src/utils/logger.js` | 工具模块 |
| `./code/koa-template/src/utils/redis.js` | 工具模块 |
| `./code/koa-template/src/utils/schemas.js` | 工具模块 |

运行方式见 `koa-template/README.md`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Express 源码分析](./Express%20源码分析)
- 下一篇：[Koa 源码分析](./Koa%20源码分析)