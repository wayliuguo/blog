/**
 * 常用内置中间件：express.json / express.urlencoded / express.static
 * 静态目录用项目根下的 public/，所以请在项目根目录执行本脚本。
 */

const express = require('express')
const app = express()

// 解析 JSON 请求体
app.use(express.json())

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }))

// 提供静态文件服务
app.use(express.static('public'))

// 把解析到的请求体原样回显，方便看出中间件到底做了什么
app.post('/echo', (req, res) => {
    res.json({ body: req.body })
})

app.listen(3000, () => {
    console.log('express-basics · 05-builtin 运行在 http://localhost:3000')
})

// ===== 自测：三种内置中间件各打一枪 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 05-builtin', [
    [
        'POST',
        '/echo',
        {
            body: JSON.stringify({ name: 'well' }),
            headers: { 'Content-Type': 'application/json' }
        }
    ],
    [
        'POST',
        '/echo',
        {
            body: 'name=well&age=18',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
    ],
    ['GET', '/hello.txt']
])
