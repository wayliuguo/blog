/**
 * 性能优化模块 · 手动浏览用静态服务（零依赖）
 * 把 pages/ 目录按 URL 提供出来，可以用真浏览器打开、配合 DevTools 面板逐项对照
 * 启动：npm start   访问：http://localhost:5187/
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5187
const ROOT = path.join(__dirname, 'pages')
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
}
// SPA 实验页要一个真 Vue：把 node_modules 里的 ESM 浏览器版挂到 /vendor/vue.js
const VENDOR = {
    '/vendor/vue.js': path.join(__dirname, 'node_modules/vue/dist/vue.esm-browser.prod.js')
}

function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (VENDOR[name]) return VENDOR[name]
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    // 防止路径逃逸出 pages/ 目录
    return file.startsWith(ROOT) ? file : null
}

// 端口被占用时自动 +1 重试（最多 20 个），实际端口以启动日志为准
function listen(port, tries = 0) {
    const server = http.createServer((req, res) => {
        const file = safePath(req.url)
        if (!file) return res.writeHead(403).end('Forbidden')
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' })
        res.end(fs.readFileSync(file))
    })
    server.removeAllListeners('error')
    server.on('error', err => {
        if (err.code !== 'EADDRINUSE' || tries >= 20) throw err
        console.log(`  端口 ${port} 被占用，自动改用 ${port + 1}`)
        listen(port + 1, tries + 1)
    })
    server.listen(port, () => {
        if (port !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${port}，请以这里的为准`)
        console.log(`性能优化 实验台 -> http://localhost:${port}/`)
    })
}
listen(PORT)
