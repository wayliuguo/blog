/**
 * Hello World：五个动作起一个服务
 * require → express() → app.get('/') → res.send() → app.listen()
 */

const express = require('express')
const app = express()

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000')
})

// ===== 自测：请求一次，打印真实的响应体与 Content-Type =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 01-hello', [['GET', '/']])
