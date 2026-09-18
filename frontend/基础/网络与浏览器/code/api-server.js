/**
 * CORS 实验用的「另一个源」上的 API —— 故意跑在 5178，
 * 与站点（5177）**端口不同就是不同源**，这样浏览器才会真的执行同源策略与 CORS 检查。
 *
 * 启动：node api-server.js（或 npm run api）
 * 页面：http://localhost:5177/cors-demo.html
 *
 * 用查询参数控制服务端返回哪些 CORS 头，方便逐个对照：
 *   mode=none         不返回任何 Access-Control-* 头
 *   mode=star         Access-Control-Allow-Origin: *
 *   mode=reflect      回显请求里的 Origin
 *   mode=credentials  回显 Origin + Access-Control-Allow-Credentials: true
 *   mode=full         回显 Origin + Allow-Credentials，并在预检里给出 Allow-Methods / Allow-Headers / Max-Age
 *   expose=1          额外返回 Access-Control-Expose-Headers: X-Api-Server
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')

const PORT = 5178

// 实际监听的端口（被占用自动 +1 后会更新）；响应体里的 from / X-Api-Server 都用它拼
let actualPort = PORT

// 预检请求的统计：用来证明"非简单请求"前面真的先发了一次 OPTIONS（页面代码里看不到这次请求）
const stats = { total: 0, preflight: 0, lastPreflight: null }

function corsHeaders(mode, req, expose) {
    const origin = req.headers.origin || ''
    const h = {}
    if (mode === 'star') h['Access-Control-Allow-Origin'] = '*'
    if (mode === 'reflect' || mode === 'credentials' || mode === 'full') {
        h['Access-Control-Allow-Origin'] = origin
        h['Vary'] = 'Origin'
    }
    // * 与 Allow-Credentials 互斥：带上凭据时只能回显具体 Origin
    if (mode === 'credentials' || mode === 'full') h['Access-Control-Allow-Credentials'] = 'true'
    // 自定义响应头默认对 JS 不可见，必须用 Expose-Headers 放行
    if (expose) h['Access-Control-Expose-Headers'] = 'X-Api-Server'
    return h
}

function send(res, status, headers, body) {
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers))
    res.end(JSON.stringify(body))
}

// 端口被占用时自动 +1 重试（最多 20 个），实际端口以启动日志为准
function listen(port, tries = 0) {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const q = url.searchParams
        const mode = q.get('mode') || 'star'
        const expose = q.get('expose') === '1'

        // 控制端点：让页面读到"服务端一共收到几次请求、几次预检"。它们本身不计入统计
        if (url.pathname === '/__log') return send(res, 200, { 'Access-Control-Allow-Origin': '*' }, stats)
        if (url.pathname === '/__reset') {
            stats.total = 0
            stats.preflight = 0
            stats.lastPreflight = null
            return send(res, 200, { 'Access-Control-Allow-Origin': '*' }, stats)
        }

        const headers = corsHeaders(mode, req, expose)
        headers['X-Api-Server'] = 'api-server@' + actualPort

        // 预检：浏览器在"非简单请求"之前**自动**发出的 OPTIONS，页面里的 fetch 只发了一次
        if (req.method === 'OPTIONS') {
            stats.preflight++
            stats.lastPreflight = {
                method: req.headers['access-control-request-method'] || '',
                headers: req.headers['access-control-request-headers'] || ''
            }
            if (mode === 'full') {
                headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                headers['Access-Control-Allow-Headers'] = 'content-type, x-demo-token'
                headers['Access-Control-Max-Age'] = '600'
            }
            res.writeHead(204, headers)
            return res.end()
        }

        stats.total++
        send(res, 200, headers, {
            path: url.pathname,
            method: req.method,
            mode,
            origin: req.headers.origin || null,
            contentType: req.headers['content-type'] || null,
            from: 'api-server@' + actualPort
        })
    })
    server.removeAllListeners('error')
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE' || tries >= 20) throw err
        console.log(`  端口 ${port} 被占用，自动改用 ${port + 1}`)
        listen(port + 1, tries + 1)
    })
    server.listen(port, () => {
        actualPort = port
        if (port !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${port}，请以这里的为准`)
        console.log(`CORS 实验用的「另一个源」 -> http://localhost:${port}/`)
    })
}
listen(PORT)
