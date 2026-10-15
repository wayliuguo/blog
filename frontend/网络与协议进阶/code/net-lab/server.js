/**
 * 网络与协议进阶 · 模块配套服务
 * 目录：site/ 提供页面，lib/endpoints.cjs 提供缓存 / 重试 / 订单等实测端点
 * 启动：npm start
 * 访问：http://localhost:5190/site/index.html
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')
const { handle } = require('./lib/endpoints.cjs')

const PORT = 5190

const server = http.createServer((req, res) => {
    const started = Date.now()
    res.on('finish', () => {
        console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`)
    })
    handle(req, res)
})

function listen(port, tries) {
    server.once('error', err => {
        if (err.code === 'EADDRINUSE' && tries > 0) {
            console.log(`端口 ${port} 被占用，改试 ${port + 1}`)
            listen(port + 1, tries - 1)
        } else {
            throw err
        }
    })
    server.listen(port, () => {
        console.log(`net-lab 已启动：http://localhost:${port}/site/index.html`)
        console.log('页面：/site/index.html · /site/cache.html · /site/security.html')
    })
}

listen(PORT, 20)
