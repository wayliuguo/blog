/**
 * 路由参数：:id 是路径里的占位符，匹配到的值进 req.params（恒为字符串）
 * 查询串 ?page=1 进 req.query。
 */

const express = require('express')
const app = express()

// URL: /users/123
app.get('/users/:id', (req, res) => {
    console.log(req.params.id) // "123"
    console.log(req.query.page) // 查询参数 ?page=1
    res.json({ id: req.params.id })
})

app.listen(3000, () => {
    console.log('express-basics · 03-params 运行在 http://localhost:3000')
})

// ===== 自测：/users/123?page=1，看 params 与 query 各拿到什么 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 03-params', [['GET', '/users/123?page=1']])
