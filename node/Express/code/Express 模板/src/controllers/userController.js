const userService = require('../services/userService')

exports.register = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body)
        res.status(201).json({ data: { id: user.id, name: user.name, email: user.email } })
    } catch (err) {
        next(err)
    }
}

exports.login = async (req, res, next) => {
    try {
        const result = await userService.login(req.body)
        res.json({ data: result })
    } catch (err) {
        next(err)
    }
}

exports.getProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.userId)
        res.json({ data: user })
    } catch (err) {
        next(err)
    }
}
