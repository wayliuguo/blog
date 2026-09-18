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
