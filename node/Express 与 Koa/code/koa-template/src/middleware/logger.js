const logger = require('../utils/logger')

module.exports = async (ctx, next) => {
    const start = Date.now()
    const { method, url } = ctx

    logger.debug(`--> ${method} ${url}`)

    await next()

    const duration = Date.now() - start
    logger.info(`${method} ${url} ${ctx.status} ${duration}ms`)
}
