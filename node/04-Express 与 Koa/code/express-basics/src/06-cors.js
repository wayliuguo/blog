/**
 * 第三方中间件：cors() 会给响应补上 Access-Control-Allow-Origin
 * 没有它，浏览器里跨域的 fetch 会被同源策略拦下。
 */

const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors()) // 允许跨域请求

app.get('/users', (req, res) => {
    res.json({ users: [] })
})

app.listen(3000, () => {
    console.log('express-basics · 06-cors 运行在 http://localhost:3000')
})

// ===== 自测：带 Origin 头请求，看响应里多了哪些跨域头 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 06-cors', [
    [
        'GET',
        '/users',
        {
            headers: { Origin: 'http://localhost:5173' },
            show: ['content-type', 'access-control-allow-origin']
        }
    ]
])
