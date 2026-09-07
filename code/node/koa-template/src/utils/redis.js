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
