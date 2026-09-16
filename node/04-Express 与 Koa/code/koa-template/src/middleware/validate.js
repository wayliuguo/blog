module.exports = schema => {
    return async (ctx, next) => {
        const { error, value } = schema.validate(ctx.request.body, {
            abortEarly: false,
            stripUnknown: true
        })
        if (error) {
            const messages = error.details.map(d => d.message)
            ctx.status = 400
            ctx.body = { message: '请求参数校验失败', errors: messages }
            return
        }
        ctx.request.body = value
        await next()
    }
}
