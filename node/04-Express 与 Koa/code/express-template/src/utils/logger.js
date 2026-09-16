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
