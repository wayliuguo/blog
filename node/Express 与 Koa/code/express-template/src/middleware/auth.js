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
        req.user = decoded
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: '令牌已过期' })
        }
        return res.status(401).json({ message: '无效的令牌' })
    }
}
