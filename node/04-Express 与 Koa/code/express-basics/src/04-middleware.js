/**
 * 中间件：app.use 注册的函数按注册顺序执行，只有调用 next() 才推进到下一环
 * 不带路径的是应用级中间件，带路径的是路由级中间件（只在前缀命中时执行）。
 */

const express = require('express')
const app = express()

// 应用级中间件：每个请求都会执行
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next() // 调用 next 传递给下一个中间件
})

// 路由级中间件：只对特定路由生效
app.use('/api', (req, res, next) => {
    console.log('API 请求')
    next()
})

// 两个路由，用来对比「路由级中间件只在 /api 前缀下生效」
app.get('/api/users', (req, res) => {
    res.json({ scope: '/api' })
})

app.get('/users', (req, res) => {
    res.json({ scope: 'root' })
})

app.listen(3000, () => {
    console.log('express-basics · 04-middleware 运行在 http://localhost:3000')
})

// ===== 自测：请求 /api/users 与 /users，对比服务端打出的日志 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 04-middleware', [
    ['GET', '/api/users'],
    ['GET', '/users']
])
