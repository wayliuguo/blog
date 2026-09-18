/**
 * 01-HTML 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些 HTML 示例即可
 * 支持 ?delay=ms 查询参数：延迟 ms 毫秒后响应，用于模拟慢脚本下载
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5174/
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5174
const ROOT = path.join(__dirname, 'site')

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
}

function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    return file.startsWith(ROOT) ? file : null
}

function delayOf(url) {
    const qs = url.split('?')[1]
    if (!qs) return 0
    const ms = Number(new URLSearchParams(qs).get('delay'))
    return Number.isFinite(ms) && ms > 0 ? ms : 0
}

http.createServer((req, res) => {
    const file = safePath(req.url)
    if (!file) return res.writeHead(403).end('Forbidden')
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        return res.writeHead(404).end('Not Found')
    }
    const send = () => {
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(file)] || 'text/plain',
            // 延迟响应是模拟场景，禁用缓存，保证每次重新加载都真的重新下载
            ...(delay ? { 'Cache-Control': 'no-store' } : {})
        })
        res.end(fs.readFileSync(file))
    }
    const delay = delayOf(req.url)
    if (delay) setTimeout(send, delay)
    else send()
}).listen(PORT, () => console.log(`01-HTML 示例 -> http://localhost:${PORT}/`))
