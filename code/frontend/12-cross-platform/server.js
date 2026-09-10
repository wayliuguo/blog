/**
 * 12-跨端开发 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些跨端 demo 即可
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5185/
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5185
const ROOT = path.join(__dirname, 'site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

function safePath(url) {
    try {
        const name = decodeURIComponent(url.split('?')[0])
        if (name === '/') return path.join(ROOT, 'index.html')
        const file = path.normalize(path.join(ROOT, name))
        // 防止路径逃逸到 site/ 之外
        return file.startsWith(ROOT) ? file : null
    } catch (err) {
        return null
    }
}

http.createServer((req, res) => {
    const file = safePath(req.url)
    if (!file) return res.writeHead(403).end('Forbidden')
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
    res.end(fs.readFileSync(file))
}).listen(PORT, () => console.log(`12-跨端开发 示例 -> http://localhost:${PORT}/`))
