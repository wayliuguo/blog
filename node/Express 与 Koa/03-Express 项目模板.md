# Express 项目模板

> 一个接近真实生产的 Express 项目配置，集成数据库、缓存、认证、日志、校验等通用中间件。

---

## 目录结构

```
my-express-app/
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
│   │   ├── errorHandler.js     # 统一错误处理
│   │   ├── auth.js             # JWT 认证中间件
│   │   ├── validate.js         # 请求校验中间件
│   │   └── logger.js           # 请求日志
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

```json
{
  "name": "my-express-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "dev": "node --watch src/app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
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

> 摘自 `./code/express-template/src/config/index.js`（运行：`npm run start`）

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
        password: process.env.DB_PASS || 'root',
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

> 摘自 `./code/express-template/src/app.js`（运行：`npm run start`）

```javascript
require('reflect-metadata')
const express = require('express')
const cors = require('cors')
const { AppDataSource } = require('./config/database')
const redisClient = require('./utils/redis')
const logger = require('./utils/logger')
const requestLogger = require('./middleware/logger')
const errorHandler = require('./middleware/errorHandler')
const userRoutes = require('./routes/users')
const config = require('./config')

const app = express()

// ===== 全局中间件 =====
app.use(cors())
app.use(requestLogger)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ===== 路由 =====
app.use('/api/users', userRoutes)

app.get('/health', async (req, res) => {
    try {
        await AppDataSource.query('SELECT 1')
        await redisClient.ping()
        res.json({ status: 'ok', db: 'connected', redis: 'connected' })
    } catch (err) {
        res.status(503).json({ status: 'degraded', message: err.message })
    }
})

// ===== 404 处理 =====
app.use((req, res) => {
    res.status(404).json({ message: '接口不存在' })
})

// ===== 错误处理 =====
app.use(errorHandler)

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

> 摘自 `./code/express-template/src/config/database.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/entities/User.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/entities/Product.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/routes/users.js`（运行：`npm run start`）

```javascript
const { Router } = require('express')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../utils/schemas')

const router = Router()

router.post('/register', validate(registerSchema), userController.register)
router.post('/login', validate(loginSchema), userController.login)
router.get('/profile', auth, userController.getProfile)

module.exports = router
```

> 摘自 `./code/express-template/src/controllers/userController.js`（运行：`npm run start`）

```javascript
const userService = require('../services/userService')

exports.register = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body)
        res.status(201).json({ data: { id: user.id, name: user.name, email: user.email } })
    } catch (err) {
        next(err)
    }
}

exports.login = async (req, res, next) => {
    try {
        const result = await userService.login(req.body)
        res.json({ data: result })
    } catch (err) {
        next(err)
    }
}

exports.getProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.userId)
        res.json({ data: user })
    } catch (err) {
        next(err)
    }
}
```

## 业务逻辑层

> 摘自 `./code/express-template/src/services/userService.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/middleware/auth.js`（运行：`npm run start`）

```javascript
const jwt = require('jsonwebtoken')
const config = require('../config')

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未提供认证令牌' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, config.jwt.secret)
        req.user = decoded
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: '令牌已过期' })
        }
        return res.status(401).json({ message: '无效的令牌' })
    }
}
```

> 摘自 `./code/express-template/src/middleware/validate.js`（运行：`npm run start`）

```javascript
module.exports = schema => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
        if (error) {
            const messages = error.details.map(d => d.message)
            return res.status(400).json({ message: '请求参数校验失败', errors: messages })
        }
        req.body = value
        next()
    }
}
```

> 摘自 `./code/express-template/src/middleware/errorHandler.js`（运行：`npm run start`）

```javascript
const logger = require('../utils/logger')

module.exports = (err, req, res, next) => {
    logger.error(`${req.method} ${req.url} - ${err.message}`)

    const statusCode = err.statusCode || 500
    const message = err.isOperational ? err.message : '服务器内部错误'

    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
}
```

> 摘自 `./code/express-template/src/middleware/logger.js`（运行：`npm run start`）

```javascript
const logger = require('../utils/logger')

module.exports = (req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`)
    })
    next()
}
```

## 工具模块

> 摘自 `./code/express-template/src/utils/logger.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/utils/redis.js`（运行：`npm run start`）

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

> 摘自 `./code/express-template/src/utils/schemas.js`（运行：`npm run start`）

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

## 小结

- **工程骨架与依赖栈**
  - 分层目录：`src/` 下 config/controllers/entities/middleware/routes/services/utils 七目录 + `app.js`
  - 依赖栈：express/cors/dotenv/typeorm/mysql2/ioredis/jsonwebtoken/bcrypt/joi/winston；`"dev": "node --watch"` 免 nodemon 热重启
- **配置管理**：`config/index.js` 先 `dotenv.config()` 再聚合 port/database/redis/jwt，业务代码一律不直接读 `process.env`
- **应用装配与启动**
  - 中间件顺序：`cors()` → 请求日志 → `express.json()`/`urlencoded()` → 路由 → 健康检查 → 404 兜底 → `errorHandler`（必须最后）
  - 启动：先连库 `AppDataSource.initialize()`、再 `redisClient.ping()`、最后 `app.listen()`；任一步失败 `process.exit(1)`
  - 健康检查 `GET /health` 用 `SELECT 1` + `redisClient.ping()` 双探，失败返回 503
- **数据层**：TypeORM 用 `EntitySchema` 声明 User（email 唯一）/Product（price decimal(10,2)）；`synchronize` 仅开发开，生产走迁移
- **三层职责（routes/controllers/services）**
  - 划分：routes 声明路径与中间件顺序；controller 取请求调 service 再 `res.json`、出错 `next(err)`；service 只管业务规则、不碰 `req`/`res`
  - 错误约定：service 抛 `err.statusCode` + `isOperational`（409/401/404），错误处理器据此决定状态码与文案透传
- **中间件与工具**
  - 四个中间件：auth 解析 `Bearer` 写 `req.user`、validate 用 Joi 校验后 `req.body = value`、errorHandler 区分可预期/未知、logger 用 `res.on('finish')` 记耗时
  - 三个工具：Winston 日志、ioredis 客户端、Joi schemas

---

## 配套代码

本篇的可运行示例在仓库 `node/Express 与 Koa/code/express-template`。

| 文件 | 对应小节 |
| --- | --- |
| `./code/express-template/src/config/index.js` | 配置管理 |
| `./code/express-template/src/config/database.js` | 数据库配置与实体 |
| `./code/express-template/src/app.js` | 入口文件 |
| `./code/express-template/src/entities/User.js` | 数据库配置与实体 |
| `./code/express-template/src/entities/Product.js` | 数据库配置与实体 |
| `./code/express-template/src/routes/users.js` | 路由与控制器 |
| `./code/express-template/src/controllers/userController.js` | 路由与控制器 |
| `./code/express-template/src/services/userService.js` | 业务逻辑层 |
| `./code/express-template/src/middleware/auth.js` | 中间件 |
| `./code/express-template/src/middleware/validate.js` | 中间件 |
| `./code/express-template/src/middleware/errorHandler.js` | 中间件 |
| `./code/express-template/src/middleware/logger.js` | 中间件 |
| `./code/express-template/src/utils/logger.js` | 工具模块 |
| `./code/express-template/src/utils/redis.js` | 工具模块 |
| `./code/express-template/src/utils/schemas.js` | 工具模块 |

运行方式见 `express-template/README.md`。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Koa 快速入门](./02-Koa%20快速入门)
- 下一篇：[Express 源码分析](./04-Express%20源码分析)