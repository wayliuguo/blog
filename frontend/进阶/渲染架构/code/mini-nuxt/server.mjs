// server.mjs —— 原生 http 服务：路由匹配 → asyncData → createSSRApp → renderToString
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { renderPage, renderHtml } from './.build/server.js'

const PORT = process.env.PORT || 3014

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
    console.log(`mini-nuxt SSR on http://localhost:${PORT}`)
})
