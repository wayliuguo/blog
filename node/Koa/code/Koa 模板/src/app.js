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
