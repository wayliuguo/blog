/**
 * 模块二里的写法：只用 node:http —— 路由靠 if/else 堆、404 靠分支补
 *
 * 留在这里当对照基线：后面每个脚本都是同一件事的 express 写法。
 */

const http = require('node:http')

const server = http.createServer((req, res) => {
    if (req.url === '/user') {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ id: 1, name: 'well' }))
    } else {
        res.statusCode = 404
        res.end('Not Found')
    }
})

server.listen(3000, () => {
    console.log('node:http 版本运行在 http://localhost:3000')
})

// ===== 自测：真打两枪，打印真实结果后退出 =====
const { selfTest } = require('../lab')

selfTest(3000, 'express-basics · 00-http-baseline（纯 node:http）', [
    ['GET', '/user'],
    ['GET', '/nope']
])
