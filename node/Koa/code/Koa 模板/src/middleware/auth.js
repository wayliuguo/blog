const jwt = require('jsonwebtoken')
const config = require('../config')

module.exports = async (ctx, next) => {
    const authHeader = ctx.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401
        ctx.body = { message: '未提供认证令牌' }
        return
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, config.jwt.secret)
        ctx.state.user = decoded
        await next()
    } catch (err) {
        ctx.status = 401
        ctx.body = { message: err.name === 'TokenExpiredError' ? '令牌已过期' : '无效的令牌' }
    }
}
