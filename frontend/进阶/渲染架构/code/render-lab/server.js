/**
 * 渲染架构 · 模块配套服务（手动浏览用）
 * 启动：npm start
 * 访问：http://localhost:5191/            —— 七种交付方式的同一页面
 *       ?mode=csr / ssr / ssg / isr / stream / island / hydrate&variant=clean|price|tag|rerender
 *       &jslag=300                         —— 模拟「框架运行时在慢网下下载 + 解析」的开销
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
import http from 'node:http'
import { createHandler } from './harness/routes.mjs'

const PORT = Number(process.env.PORT || 5191)
const MODES = [
    ['csr', '客户端渲染：HTML 是空壳，内容全靠 JS'],
    ['ssr', '服务端渲染：每次请求都渲染一遍，等齐慢数据再发'],
    ['ssg', '静态生成：构建时渲染一次，运行时零成本'],
    ['isr', '增量再生成：缓存 + 过期后台重建（TTL 600ms）'],
    ['stream', '流式渲染：能发的先发，慢数据后补位'],
    ['island', '岛化：只给交互点下发 JS'],
    ['hydrate', '注水对照：variant=clean|price|tag|rerender']
]

const handler = createHandler()
await handler.warm() // 「构建时渲染」

const server = http.createServer((req, res) => {
    const started = Date.now()
    res.on('finish', () => console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - started}ms)`))
    handler.handle(req, res)
})

function listen(port, tries) {
    server.once('error', err => {
        if (err.code === 'EADDRINUSE' && tries > 0) {
            console.log(`端口 ${port} 被占用，改试 ${port + 1}`)
            listen(port + 1, tries - 1)
        } else {
            throw err
        }
    })
    server.listen(port, () => {
        console.log(`render-lab 已启动：http://localhost:${port}/`)
        for (const [mode, desc] of MODES) console.log(`  /?mode=${mode.padEnd(8)} ${desc}`)
    })
}

listen(PORT, 20)
