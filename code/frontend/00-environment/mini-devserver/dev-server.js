/**
 * 最小 DevServer（零依赖）：
 * 1. HTTP 静态文件服务：把 public/ 下的文件按 URL 返回
 * 2. 文件监听：public/ 下任一文件变化时，向浏览器广播 SSE "reload"
 * 3. 浏览器收到后整页刷新 —— 这就是"保存即刷新"的最小版
 *
 * 启动：npm start  （或 node dev-server.js）
 * 访问：http://localhost:5173/
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

const PORT = 5173
const ROOT = path.join(__dirname, 'public')
const bus = new EventEmitter() // 文件变化事件总线

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
}

/** 把请求 URL 映射到 public 目录下的文件，防止路径逃逸 */
function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    return file.startsWith(ROOT) ? file : null
}

http.createServer((req, res) => {
    // SSE 端点：浏览器订阅"文件变了"的信号
    if (req.url.startsWith('/__reload')) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive'
        })
        bus.on('change', name => res.write(`data: ${JSON.stringify(name)}\n\n`))
        return
    }

    const file = safePath(req.url)
    if (!file) {
        res.writeHead(403).end('Forbidden')
        return
    }
    if (!fs.existsSync(file)) {
        res.writeHead(404).end('Not Found')
        return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
    res.end(fs.readFileSync(file))
}).listen(PORT, () => console.log(`serving ${ROOT} -> http://localhost:${PORT}`))

// 监听文件变化，广播给所有连着的浏览器
fs.watch(ROOT, { recursive: true }, (_, name) => bus.emit('change', name))
