module.exports = schema => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
        if (error) {
            const messages = error.details.map(d => d.message)
            return res.status(400).json({ message: '请求参数校验失败', errors: messages })
        }
        req.body = value
        next()
    }
}
