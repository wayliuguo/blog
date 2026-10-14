// server.mjs —— 原生 http 服务：路由匹配 → load 取数 → renderToString → 模板组装
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { renderPage, renderHtml } from './.build/server.js'

const PORT = process.env.PORT || 3013

createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    if (url.pathname === '/client.js') {
        res.setHeader('content-type', 'text/javascript; charset=utf-8')
        res.end(readFileSync('.build/client.js'))
        return
    }

    const t0 = performance.now()
    const result = await renderPage(url.pathname)
    const ms = (performance.now() - t0).toFixed(1)

    res.setHeader('X-Render-Ms', ms)
    res.setHeader('content-type', 'text/html; charset=utf-8')
    if (!result) {
        res.statusCode = 404
        res.end(renderHtml('<h1>404</h1><p>页面不存在</p>', {}, ''))
        return
    }
    res.end(renderHtml(result.html, result.props, '/client.js'))
}).listen(PORT, () => {
    console.log(`mini-next SSR on http://localhost:${PORT}`)
})
