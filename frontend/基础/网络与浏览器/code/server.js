/**
 * 04-网络与浏览器 章节示例的零依赖静态服务器
 * 把 site/ 目录按 URL 提供出来，浏览器直接打开这些网络/浏览器 demo 即可
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5177/
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5177
const ROOT = path.join(__dirname, 'site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

// 缓存实验：每种 mode 累计收到多少次真实请求
// 页面靠对比 /api/hits 的计数增量，来判断某次点击是否真正发起了网络请求
const hits = { maxage: 0, nocache: 0, etag: 0, lastmod: 0 }
// 内容版本：ETag / Last-Modified 依据它生成。不 bump 内容就不变，
// 从而能稳定地演示"第二次条件请求回 304"；带 bump=1 才模拟内容变更回 200。
const contentVersion = { maxage: 1, nocache: 1, etag: 1, lastmod: 1 }
let lastModifiedBase = Date.now()

function json(res, status, headers, body) {
    const h = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers }
    res.writeHead(status, h)
    res.end(JSON.stringify(body))
}

function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'index.html')
    const file = path.normalize(path.join(ROOT, name))
    return file.startsWith(ROOT) ? file : null
}

// 端口被占用时自动 +1 重试（最多 20 个），实际端口以启动日志为准
function listen(port, tries = 0) {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://x`)
        const mode = url.searchParams.get('mode')

        // ---- 缓存实验端点（前置处理，不走静态文件）----
        if (url.pathname === '/api/hits') {
            return json(res, 200, { 'Cache-Control': 'no-store' }, { hits })
        }
        if (url.pathname === '/api/resource') {
            if (!(mode in hits)) return json(res, 400, {}, { error: 'unknown mode', mode })
            hits[mode] += 1
            const n = hits[mode]
            // bump=1 表示"内容变更"，下次请求才有新 ETag / 新 Last-Modified
            if (url.searchParams.get('bump') === '1') contentVersion[mode] += 1
            const ver = contentVersion[mode]
            const etag = `"v-${ver}"`
            const lastModified = new Date(lastModifiedBase + ver * 1000).toUTCString()

            if (mode === 'maxage') {
                // 强缓存：浏览器在 max-age 内直接用本地副本，不再发请求
                return json(res, 200, { 'Cache-Control': 'max-age=60' }, { mode, times: n })
            }
            if (mode === 'nocache') {
                // no-cache：每次都带条件头去协商，服务器说没变就 304
                if (req.headers['if-none-match'] === etag) {
                    return json(res, 304, { 'Cache-Control': 'no-cache', ETag: etag }, {})
                }
                return json(res, 200, { 'Cache-Control': 'no-cache', ETag: etag }, { mode, times: n })
            }
            if (mode === 'etag') {
                // 协商缓存：ETag 指纹比对，相等返回 304 复用本地
                if (req.headers['if-none-match'] === etag) {
                    return json(res, 304, { ETag: etag }, {})
                }
                return json(res, 200, { ETag: etag }, { mode, times: n })
            }
            if (mode === 'lastmod') {
                // 协商缓存：Last-Modified 时间比对，同秒返回 304
                if (req.headers['if-modified-since'] === lastModified) {
                    return json(res, 304, { 'Last-Modified': lastModified }, {})
                }
                return json(res, 200, { 'Last-Modified': lastModified }, { mode, times: n })
            }
        }

        const file = safePath(req.url)
        if (!file) return res.writeHead(403).end('Forbidden')
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
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
        console.log(`04-网络与浏览器 示例 -> http://localhost:${port}/`)
    })
}
listen(PORT)
