/**
 * 实验台服务器：静态下发 pages/，外加几个动态端点
 *   GET /asset?kb=200&name=a.js        生成指定体积的资源（体积/覆盖率实验用）
 *   GET /slow?ms=250&kb=200&name=a.svg 同上但延迟响应（模拟慢 TTFB / 慢图片）
 *   GET /bundle?n=10&kbEach=3          生成一个「全量打包」的 chunk（10 个特性打进同一文件）
 *   GET /feature?i=3&kbEach=3          生成单个特性模块（按需引入的对照）
 *   GET /report                       页面把采集到的指标回传（实验的出口）
 * 以上动态端点都支持 &kbps=1500：按 1500 kbps 带宽分片慢发，把本机「秒下」的网络差异放大到可比
 * 端口用 0 让系统分配，避免和文档里 5187 的手动浏览服务撞车
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pages')
const ROOT = path.join(PAGES, '..')
// SPA 实验要一个真 Vue：这里把 node_modules 里的 ESM 浏览器版挂到 /vendor/vue.js
const VENDOR = {
    '/vendor/vue.js': path.join(ROOT, 'node_modules/vue/dist/vue.esm-browser.prod.js')
}
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8'
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CACHEABLE = { 'Cache-Control': 'public, max-age=300' }

/** 按带宽分片慢发：kbps 为 0 时一次性发完 */
async function send(res, body, contentType, headers, kbps) {
    res.writeHead(200, { ...headers, 'Content-Type': contentType })
    if (!kbps) return res.end(body)
    const buf = Buffer.from(body)
    const slice = Math.max(1024, Math.round((kbps * 1024) / 8 / 10)) // 每 100ms 发一片
    for (let i = 0; i < buf.length; i += slice) {
        res.write(buf.subarray(i, i + slice))
        await sleep(100)
    }
    res.end()
}

/** 生成指定体积的假资源；后缀决定是不是真能渲染的图片/样式 */
function filler(name, kb) {
    const rows = Math.max(1, Math.round((kb * 1024) / 84))
    const pad = `/* ${'x'.repeat(74)} */\n`.repeat(rows)
    if (name.endsWith('.svg')) {
        // 真 SVG：有确定的内在尺寸，可以做 CLS / 图片懒加载实验
        return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><rect width="640" height="240" fill="#7b4fff"/><text x="24" y="132" fill="#ffffff" font-size="28">${name} · ${kb}KB</text><!-- ${'x'.repeat(kb * 1024)} --></svg>`
    }
    if (name.endsWith('.css')) return `/* ${name} · ${kb}KB 体积填充 */\n${pad}`
    return `/* ${name} · ${kb}KB 体积填充 */\n${pad}export default ${kb}\n`
}

/** 一个「特性模块」：导出函数 + 指定体积的填充，模拟打包产物里的一个 chunk */
function feature(index, kb) {
    const rows = Math.max(1, Math.round((kb * 1024) / 84))
    const pad = `    /* ${'x'.repeat(70)} */\n`.repeat(rows)
    return `export function f${index}() {\n${pad}    return ${index}\n}\n`
}

/** 把 n 个特性打进同一个文件，模拟「全量引入」 */
function bundle(n, kbEach) {
    const body = Array.from({ length: n }, (_, k) => feature(k + 1, kbEach)).join('\n')
    return `// 全量打包：${n} 个特性挤在同一个 chunk 里\n${body}`
}

export async function startServer(options = {}) {
    // port：默认 0（系统分配）。做缓存实验时要固定端口——HTTP 缓存按 origin 存，
    //        端口每次都变的话，上一次访问留下的缓存根本用不上
    // spaCache：给 /spa/ 下的静态资源发强缓存头，用来对照「二次访问」
    // spaLatency：给 /spa/ 下的资源加一段固定延迟，模拟真实网络的 RTT
    const { port = 0, spaCache = false, spaLatency = 0 } = options
    const reports = []
    let waiters = []
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1')
        const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

        if (req.method === 'POST' && url.pathname === '/report') {
            let body = ''
            for await (const chunk of req) body += chunk
            res.writeHead(204, headers).end()
            const payload = JSON.parse(body)
            reports.push(payload)
            const pending = waiters
            waiters = []
            for (const resolve of pending) resolve(payload)
            return
        }

        if (url.pathname === '/asset' || url.pathname === '/slow') {
            const kb = Number(url.searchParams.get('kb') || 1)
            const delay = url.pathname === '/slow' ? Number(url.searchParams.get('ms') || 0) : 0
            const name = url.searchParams.get('name') || 'asset.js'
            if (delay) await sleep(delay)
            const ext = path.extname(name)
            return send(res, filler(name, kb), MIME[ext] || MIME['.js'], headers, Number(url.searchParams.get('kbps') || 0))
        }

        if (url.pathname === '/bundle') {
            const n = Number(url.searchParams.get('n') || 10)
            const kbEach = Number(url.searchParams.get('kbEach') || 3)
            return send(res, bundle(n, kbEach), MIME['.js'], headers, Number(url.searchParams.get('kbps') || 0))
        }

        if (url.pathname === '/feature') {
            const i = Number(url.searchParams.get('i') || 1)
            const kbEach = Number(url.searchParams.get('kbEach') || 3)
            return send(res, feature(i, kbEach), MIME['.js'], headers, Number(url.searchParams.get('kbps') || 0))
        }

        if (VENDOR[url.pathname]) {
            if (spaLatency) await sleep(spaLatency)
            return send(res, fs.readFileSync(VENDOR[url.pathname]), MIME['.js'], spaCache ? CACHEABLE : headers, Number(url.searchParams.get('kbps') || 0))
        }

        const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
        const file = path.normalize(path.join(PAGES, name))
        if (!file.startsWith(PAGES)) return res.writeHead(403, headers).end('Forbidden')
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404, headers).end('Not Found')
        const cacheable = spaCache && /\.(js|css)$/.test(file) && file.includes(`${path.sep}spa${path.sep}`)
        const cache = cacheable ? CACHEABLE : headers
        // spaLatency 给 /spa/ 下的资源统一加一段延迟，模拟真实网络的 RTT
        // 本机 localhost 是「秒下」，不加上这一跳，路由懒加载的代价根本看不出来
        if (spaLatency && file.includes(`${path.sep}spa${path.sep}`)) await sleep(spaLatency)
        res.writeHead(200, { ...cache, 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
        res.end(fs.readFileSync(file))
    })

    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
    return {
        origin: `http://127.0.0.1:${server.address().port}`,
        reports,
        /** 等下一次 /report 到达 */
        nextReport(timeout = 30000) {
            return new Promise((resolve, reject) => {
                const entry = { resolve }
                const timer = setTimeout(() => {
                    waiters = waiters.filter((w) => w !== entry)
                    reject(new Error(`等页面上报超时（${timeout}ms）`))
                }, timeout)
                waiters.push((payload) => {
                    clearTimeout(timer)
                    resolve(payload)
                })
            })
        },
        close: () => new Promise((resolve) => server.close(resolve))
    }
}
