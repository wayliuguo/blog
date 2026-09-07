const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { AppDataSource } = require('../config/database')
const config = require('../config')
const User = require('../entities/User')

const userRepo = AppDataSource.getRepository('User')

exports.createUser = async ({ name, email, password }) => {
    const existing = await userRepo.findOneBy({ email })
    if (existing) {
        const err = new Error('邮箱已被注册')
        err.statusCode = 409
        err.isOperational = true
        throw err
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = userRepo.create({ name, email, password: hashedPassword })
    return userRepo.save(user)
}

exports.login = async ({ email, password }) => {
    const user = await userRepo.findOneBy({ email })
    if (!user) {
        const err = new Error('邮箱或密码错误')
        err.statusCode = 401
        err.isOperational = true
        throw err
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        const err = new Error('邮箱或密码错误')
        err.statusCode = 401
        err.isOperational = true
        throw err
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })

    return { token, user: { id: user.id, name: user.name, email: user.email } }
}

exports.getUserById = async id => {
    const user = await userRepo.findOneBy({ id })
    if (!user) {
        const err = new Error('用户不存在')
        err.statusCode = 404
        err.isOperational = true
        throw err
    }
    return { id: user.id, name: user.name, email: user.email }
}
