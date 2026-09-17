/**
 * 错误处理中间件：必须写满 4 个参数，Express 靠 fn.length === 4 认出它
 * 链上任意位置 next(err)，都会跳过后面剩下的普通中间件，直奔这里。
 */

const express = require('express')
const app = express()

// 正常路由：证明挂了错误处理中间件也不影响正常请求
app.get('/ok', (req, res) => {
    res.json({ ok: true })
})

// 故意出错的业务路由：把错误交给 next() 往下传
app.get('/boom', (req, res, next) => {
    next(new Error('故意炸一个'))
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

app.listen(3000, () => {
    console.log('express-basics · 07-error 运行在 http://localhost:3000')
})

// ===== 自测：先跑正常路由，再触发一次错误 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 07-error', [
    ['GET', '/ok'],
    ['GET', '/boom']
])
