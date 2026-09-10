// 最小实现·静态服务器：零依赖 serve site/ 目录，端口 5187
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, 'site')
const PORT = 5187

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
}

const server = http.createServer((req, res) => {
    // 解码并去掉查询串，/ 映射到 /index.html
    let urlPath
    try {
        urlPath = decodeURIComponent(req.url.split('?')[0])
    } catch (e) {
        urlPath = '/'
    }
    if (urlPath === '/') urlPath = '/index.html'

    // 防路径逃逸：规范化后必须仍落在 ROOT 之内
    const filePath = path.join(ROOT, path.normalize(urlPath))
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('403 Forbidden')
    }

    const ext = path.extname(filePath)
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            return res.end('404 Not Found')
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(data)
    })
})

server.listen(PORT, () => {
    console.log('chapter14-infra 运行于 http://localhost:' + PORT)
})
