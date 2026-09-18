const userService = require('../services/userService')

exports.register = async ctx => {
    const user = await userService.createUser(ctx.request.body)
    ctx.status = 201
    ctx.body = { data: { id: user.id, name: user.name, email: user.email } }
}

exports.login = async ctx => {
    const result = await userService.login(ctx.request.body)
    ctx.body = { data: result }
}

exports.getProfile = async ctx => {
    const user = await userService.getUserById(ctx.state.user.userId)
    ctx.body = { data: user }
}
