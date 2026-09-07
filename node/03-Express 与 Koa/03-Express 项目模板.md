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

```javascript
// src/config/index.js
require('dotenv').config()

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  database: {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'myapp',
    synchronize: process.env.NODE_ENV === 'development'
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES || '2h'
  }
}
```

## 入口文件

```javascript
// src/app.js
require('reflect-metadata')
const express = require('express')
const cors = require('cors')
const { AppDataSource } = require('./config/database')
const redisClient = require('./utils/redis')
const logger = require('./utils/logger')
const requestLogger = require('./middleware/logger')
const errorHandler = require('./middleware/errorHandler')
const userRoutes = require('./routes/users')
const productRoutes = require('./routes/products')
const config = require('./config')

const app = express()

// ===== 全局中间件 =====

app.use(cors())
app.use(requestLogger)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ===== 路由 =====

app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)

app.get('/health', async (req, res) => {
  // 检查数据库和 Redis 连接状态
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

// ===== 错误处理（必须最后注册） =====

app.use(errorHandler)

// ===== 启动 =====

async function bootstrap() {
  try {
    // 1. 初始化数据库连接
    await AppDataSource.initialize()
    logger.info('数据库连接成功')

    // 2. 验证 Redis 连接
    await redisClient.ping()
    logger.info('Redis 连接成功')

    // 3. 启动 HTTP 服务
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

```javascript
// src/config/database.js
const { DataSource } = require('typeorm')
const config = require('./index')
const User = require('../entities/User')
const Product = require('../entities/Product')

const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,  // 开发环境自动建表
  logging: config.nodeEnv === 'development',
  entities: [User, Product]
})

module.exports = { AppDataSource }
```

```javascript
// src/entities/User.js
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

```javascript
// src/entities/Product.js
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

```javascript
// src/routes/users.js
const { Router } = require('express')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validate')
const { registerSchema, loginSchema } = require('../utils/schemas')

const router = Router()

// 公开路由
router.post('/register', validate(registerSchema), userController.register)
router.post('/login', validate(loginSchema), userController.login)

// 需要认证的路由
router.get('/profile', auth, userController.getProfile)
router.put('/profile', auth, validate(registerSchema), userController.updateProfile)

module.exports = router
```

```javascript
// src/controllers/userController.js
const userService = require('../services/userService')

exports.register = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body)
    res.status(201).json({ data: { id: user.id, name: user.name, email: user.email } })
  } catch (err) {
    next(err)  // 交给错误处理中间件
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

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.userId, req.body)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}
```

## 业务逻辑层

```javascript
// src/services/userService.js
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { AppDataSource } = require('../config/database')
const config = require('../config')
const User = require('../entities/User')

const userRepo = AppDataSource.getRepository('User')

exports.createUser = async ({ name, email, password }) => {
  // 检查是否已存在
  const existing = await userRepo.findOneBy({ email })
  if (existing) {
    const err = new Error('邮箱已被注册')
    err.statusCode = 409
    err.isOperational = true
    throw err
  }

  // 密码加密
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

  // 签发 JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )

  return { token, user: { id: user.id, name: user.name, email: user.email } }
}

exports.getUserById = async (id) => {
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

```javascript
// src/middleware/auth.js
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
    req.user = decoded  // { userId: 1, role: 'user' }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌已过期' })
    }
    return res.status(401).json({ message: '无效的令牌' })
  }
}
```

```javascript
// src/middleware/validate.js
// 通用请求校验中间件，配合 Joi 使用
module.exports = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const messages = error.details.map(d => d.message)
      return res.status(400).json({ message: '请求参数校验失败', errors: messages })
    }
    req.body = value  // 使用校验后的值
    next()
  }
}
```

```javascript
// src/middleware/errorHandler.js
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

```javascript
// src/middleware/logger.js
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

```javascript
// src/utils/logger.js
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
      format: config.nodeEnv === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : undefined
    }),
    // 生产环境可写入文件
    ...(config.nodeEnv === 'production'
      ? [new winston.transports.File({ filename: 'logs/error.log', level: 'error' })]
      : [])
  ]
})

module.exports = logger
```

```javascript
// src/utils/redis.js
const Redis = require('ioredis')
const config = require('../config')

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3
})

redis.on('error', (err) => {
  console.error('Redis 连接错误:', err.message)
})

module.exports = redis
```

```javascript
// src/utils/schemas.js
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

---

## 参考

- 上一篇：[Koa 快速入门](./02-Koa%20快速入门)
- 下一篇：[Express 源码分析](./04-Express%20源码分析)