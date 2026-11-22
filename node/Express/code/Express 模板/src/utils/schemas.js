const Joi = require('joi')

exports.registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50).required()
})

exports.loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
})

exports.createProductSchema = Joi.object({
    name: Joi.string().max(100).required(),
    price: Joi.number().positive().precision(2).required(),
    stock: Joi.number().integer().min(0).default(0)
})
