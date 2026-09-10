/**
 * 13-SSR与SSG服务端渲染 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些"SSR 思想"demo 即可
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5186/
 *
 * 说明：真正的 SSR 需要 Node 服务端把组件渲染成 HTML 再返回（见正文 13-00/06 章的
 * Node 与 dev-server 思路）。这里的 demo 是"纯前端自足"的最小演示，用一段 JS 模拟
 * 服务端把字符串拼成 HTML 再插入页面的行为，从而对比 CSR 的挂载顺序、SEO 视角下
 * 首屏 HTML 里有没有正文等核心原理。
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5186
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
}).listen(PORT, () => console.log(`13-SSR与SSG 示例 -> http://localhost:${PORT}/`))
