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
