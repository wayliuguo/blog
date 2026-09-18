/**
 * 03-JavaScript 核心章节示例的零依赖服务器
 * 1) 把 site/ 目录按 URL 提供出来（浏览器直接打开这些 JS demo）
 * 2) 提供两个极小的 JSON 接口，让「fetch 的超时 / 取消 / 竞态」能在本地真实复现
 *     GET /api/search?q=&delay=&status=  —— delay 毫秒后返回 { q, delay, at }
 *     GET /api/echo?msg=                 —— 原样回显，用于演示自定义请求
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5176/
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5176
const ROOT = path.join(__dirname, 'site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    return file.startsWith(ROOT) ? file : null
}

function sendJson(res, status, body) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        // 允许以 file:// 直接打开 demo 时也能请求接口
        'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify(body))
}

function handleApi(res, url) {
    const q = url.searchParams
    if (url.pathname === '/api/search') {
        const delay = Math.min(Number(q.get('delay')) || 0, 5000)
        const status = Number(q.get('status')) || 200
        const keyword = q.get('q') || ''
        setTimeout(() => {
            if (status >= 400) return sendJson(res, status, { error: 'mock failure', status })
            sendJson(res, status, { q: keyword, delay, at: Date.now(), from: 'server' })
        }, delay)
        return true
    }
    if (url.pathname === '/api/echo') {
        sendJson(res, 200, { msg: q.get('msg') || '', at: Date.now() })
        return true
    }
    return false
}

// 端口被占用时自动 +1 重试（最多 20 个），实际端口以启动日志为准
function listen(port, tries = 0) {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname.startsWith('/api/') && handleApi(res, url)) return

        const file = safePath(req.url)
        if (!file) return res.writeHead(403).end('Forbidden')
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
        res.end(fs.readFileSync(file))
    })
    server.removeAllListeners('error')
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE' || tries >= 20) throw err
        console.log(`  端口 ${port} 被占用，自动改用 ${port + 1}`)
        listen(port + 1, tries + 1)
    })
    server.listen(port, () => {
        if (port !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${port}，请以这里的为准`)
        console.log(`03-JS 示例 -> http://localhost:${port}/`)
    })
}
listen(PORT)
