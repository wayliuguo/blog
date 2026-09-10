// 零依赖静态文件服务器：serve site/，端口 5189
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, 'site')
const PORT = 5189

// 常见文件类型映射（含前端实验所需的视频/音频类型）
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.ogv': 'video/ogg',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t'
}

// 防止路径逃逸：把 URL 解码后解析为绝对路径，并强制它位于 ROOT 之内
function resolveSafe(urlPath) {
    try {
        const decoded = decodeURIComponent(urlPath)
        let filePath = path.normalize(path.join(ROOT, decoded))
        const rootReal = path.resolve(ROOT)
        const fileReal = path.resolve(filePath)
        if (fileReal !== rootReal && !fileReal.startsWith(rootReal + path.sep)) {
            return null // 试图逃出根目录
        }
        return fileReal
    } catch (e) {
        return null
    }
}

const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Method Not Allowed')
        return
    }

    let urlPath = req.url.split('?')[0] // 去掉查询串
    urlPath = urlPath === '/' ? '/index.html' : urlPath

    let filePath = resolveSafe(urlPath)
    if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Forbidden')
        return
    }

    fs.stat(filePath, (err, statItem) => {
        if (err || !statItem.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('404 Not Found')
            return
        }
        const ext = path.extname(filePath).toLowerCase()
        const type = MIME[ext] || 'application/octet-stream'
        res.writeHead(200, {
            'Content-Type': type,
            'Content-Length': statItem.size,
            'Cache-Control': 'no-cache'
        })
        if (req.method === 'HEAD') {
            res.end()
            return
        }
        fs.createReadStream(filePath).pipe(res)
    })
})

server.listen(PORT, () => {
    console.log('chapter16-media server running at http://localhost:' + PORT + '/')
})
