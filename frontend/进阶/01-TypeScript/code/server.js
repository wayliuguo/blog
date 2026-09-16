/**
 * 05-TypeScript 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些 TS 可视化 demo 即可
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5178/
 *
 * 说明：TypeScript 是“类型层面”的语言，运行时执行的是编译后的 JS。
 * 这些 demo 用纯 JS 模拟 TS 的类型概念并输出到页面，直观展示它们的含义。
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5178
const ROOT = path.join(__dirname, 'site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    // 防路径逃逸：解析后的绝对路径必须仍在 ROOT 内
    return file.startsWith(ROOT) ? file : null
}

http.createServer((req, res) => {
    const file = safePath(req.url)
    if (!file) return res.writeHead(403).end('Forbidden')
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
    res.end(fs.readFileSync(file))
}).listen(PORT, () => console.log(`05-TypeScript 示例 -> http://localhost:${PORT}/`))
