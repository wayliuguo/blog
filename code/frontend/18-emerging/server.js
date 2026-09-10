/**
 * 18-新兴方向 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些新兴方向 demo 即可
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5191/
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5191
const ROOT = path.resolve(__dirname, 'site')
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
}

function safePath(url) {
    try {
        const name = decodeURIComponent(url.split('?')[0])
        if (name === '/') return path.join(ROOT, 'index.html')
        const file = path.resolve(path.join(ROOT, './', name))
        // 防路径逃逸：解析后的真实路径必须仍在 ROOT 之内
        if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null
        return file
    } catch (e) {
        return null
    }
}

http.createServer((req, res) => {
    const file = safePath(req.url)
    if (!file) {
        res.writeHead(403).end('Forbidden')
        return
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('404 Not Found')
        return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(fs.readFileSync(file))
}).listen(PORT, () => console.log(`18-新兴方向 示例 -> http://localhost:${PORT}/`))
