// 零依赖 http 静态服务器：serve site/，端口 5190
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5190
const ROOT = path.join(__dirname, 'site')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
}

const server = http.createServer((req, res) => {
    // 仅处理 GET / HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end()
        return
    }

    // 解析出相对路径并做路径逃逸防护
    let urlPath
    try {
        urlPath = decodeURIComponent(req.url.split('?')[0])
    } catch {
        res.writeHead(400).end()
        return
    }

    // '/' 指到登录页
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'

    // 规整化并禁止跳出 ROOT
    const safe = path.normalize(urlPath).replace(/^([/\\])+/, '')
    const filePath = path.join(ROOT, safe)
    if (!filePath.startsWith(ROOT) || path.extname(filePath) === '') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('404 Not Found')
        return
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('404 Not Found')
            return
        }
        const type = MIME[path.extname(filePath)] || 'application/octet-stream'
        const stream = fs.createReadStream(filePath)
        res.writeHead(200, { 'Content-Type': type })
        if (req.method === 'HEAD') {
            res.end()
        } else {
            stream.pipe(res)
        }
    })
})

server.listen(PORT, () => {
    console.log('chapter17-game server running at http://localhost:' + PORT)
})
