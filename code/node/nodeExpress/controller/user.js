// 引入 user model
const { User } = require('../model')
const jwt = require('../util/jwt')
const { jwtSecret } = require('../config/config.default')

//  用户登录
exports.login = async (req, res, next) => {
    try {
        // 1.数据验证
        // 2. 生成 token
        const user = req.user.toJSON()
        const token = await jwt.sign(
            {
                userId: user._id
            },
            jwtSecret,
            {
                expiresIn: '24h'
            }
        )
        // 3. 发送成功响应（包含 token 的用户信息）
        delete user.password
        res.status(200).json({
            ...user,
            token
        })
    } catch (error) {
        next(error)
    }
}

//  用户注册
exports.register = async (req, res, next) => {
    try {
        const user = new User(req.body.user)
        await user.save()
        // 4.发送成功响应
        res.status(201).json({
            user
        })
    } catch (error) {
        next(error)
    }
}

// 获取当前用户
exports.getCurrentUser = async (req, res, next) => {
    try {
        res.status(200).json({
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

// 更新当前用户
exports.updateCurrentUser = async (req, res, next) => {
    try {
        // 处理请求
        res.send('updateCurrentUser')
    } catch (error) {
        next(error)
    }
}
