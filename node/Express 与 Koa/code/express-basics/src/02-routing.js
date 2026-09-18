/**
 * 路由：按 HTTP 方法 + 路径分发
 * 同一个路径 /users 上挂 GET 与 POST，靠方法区分。
 */

const express = require('express')
const app = express()

// GET 请求
app.get('/users', (req, res) => {
    res.json({ users: [] })
})

// POST 请求
app.post('/users', (req, res) => {
    res.status(201).json({ id: 1 })
})

// PUT 请求
app.put('/users/:id', (req, res) => {
    res.json({ updated: true })
})

// DELETE 请求
app.delete('/users/:id', (req, res) => {
    res.json({ deleted: true })
})

app.listen(3000, () => {
    console.log('express-basics · 02-routing 运行在 http://localhost:3000')
})

// ===== 自测：四个方法各打一枪，看状态码与响应体 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 02-routing', [
    ['GET', '/users'],
    ['POST', '/users'],
    ['PUT', '/users/7'],
    ['DELETE', '/users/7']
])
