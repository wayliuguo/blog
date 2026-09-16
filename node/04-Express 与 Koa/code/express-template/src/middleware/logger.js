const logger = require('../utils/logger')

module.exports = (req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`)
    })
    next()
}
