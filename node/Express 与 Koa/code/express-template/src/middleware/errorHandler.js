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
