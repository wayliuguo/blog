/**
 * 实验台的共享路由表。
 *
 * GET /?mode=csr|ssr|ssg|isr|stream|island|hydrate[&variant=...][&jslag=300]
 *     同一个页面，七种交付方式 —— 对照实验的全部差异都收在这一处
 * GET /api/data[?reviews=1]   接口：慢数据在这里被放大到能观测
 * POST /report                页面把采集到的指标回传
 * GET /src/*  /pages/*        静态资源；jslag 只压在 /src/ 上，代表框架运行时的下载开销
 *
 * 手动浏览服务（server.js，端口 5189）与测量服务（harness/server.mjs，端口 0）共用这一份，
 * 于是「人肉打开的页面」和「无头浏览器测的页面」不可能跑偏。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { h } from '../src/vdom.mjs'
import { renderToString, serializeData } from '../src/render-string.mjs'
import { renderSections, STREAM_RUNTIME, marker, Await } from '../src/render-stream.mjs'
import { App } from '../src/app.mjs'
import { Reviews, ReviewsSkeleton } from '../src/components/reviews.mjs'
import { Recommend, RecommendSkeleton } from '../src/components/recommend.mjs'
import { loadShell, loadAll, loadReviews, loadRecommend } from '../src/data.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ISR_TTL = 600
const MODES = ['csr', 'ssr', 'ssg', 'isr', 'stream', 'island', 'hydrate']

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
}

/** 页面里那段「谁出现了就记一笔」的观察器：必须在 <head> 里同步跑起来，否则测不到首屏 */
export const MARKS = `<script>
window.__marks = {}
window.__chunks = []
window.__watch = function (selector, name) {
    if (document.querySelector(selector)) return void (window.__marks[name] = Math.round(performance.now() * 10) / 10)
    var mo = new MutationObserver(function () {
        if (!document.querySelector(selector)) return
        mo.disconnect()
        window.__marks[name] = Math.round(performance.now() * 10) / 10
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
}
;[['header', '[data-marker="header"]'], ['products', '[data-marker="products"]'], ['reviews', '[data-marker="reviews"]'], ['recommend', '[data-marker="recommend"]'], ['reviewsSkeleton', '#s-reviews']].forEach(function (p) {
    window.__watch(p[1], p[0])
})
</script>`

const CSS = `body{margin:0;font:14px/1.6 -apple-system,"Segoe UI",sans-serif;color:#1f2329;background:#fff}
#app{padding:16px 20px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:16px 0 6px}
.hd .sub,.hd .tip{margin:2px 0;color:#646a73}
ul{list-style:none;padding:0;margin:0}
.card{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #f0f0f0}
.price{color:#d4380d}.meta{color:#8c8c8c}
.skel{color:#8c8c8c;margin:6px 0}
.rv,.rec-item{padding:4px 0;color:#434343}
.like-box{display:flex;align-items:center;gap:10px;margin-top:18px}
.like{padding:6px 14px;border:1px solid #d4380d;color:#d4380d;background:#fff;border-radius:4px;cursor:pointer}
.hint{color:#8c8c8c}`

const scriptTag = (data) => `<script>window.__DATA__ = ${serializeData(data)}</script>`

/** 文档头：所有 mode 共用 */
const docHead = ({ mode, stream = false }) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>render-lab · ${mode}</title>
<style>${CSS}</style>
${MARKS}
${stream ? STREAM_RUNTIME : ''}
</head>
<body>
<div id="app">`

/** 文档尾：注水数据 + 采集脚本 + 入口模块。数据与入口都在这，正是流式「注水被推迟」的原因 */
const docTail = ({ data = '', entry }) => `</div>
${data}
<script src="/pages/lab.js"></script>
<script type="module" src="${entry}"></script>
</body>
</html>`

export function createHandler({ onReport, bodyLag = 260 } = {}) {
    const reports = []
    const shell = loadShell()

    /** 「最慢的那个决定一切」的取数形态：非流式 SSR / SSG 构建 / ISR 回源都走它 */
    const slow = (lag = bodyLag) => loadAll(lag)

    // SSG：构建时渲染一次，运行时零成本 —— 所以它在服务开始接客之前就做好了
    let ssg = { html: null, data: null }
    async function warm() {
        const data = await slow()
        ssg = { html: renderToString(App({ data })), data }
        return ssg.html
    }

    // ISR：一份带过期时间的缓存；过期后「先给旧的、后台重建」
    const isr = { html: null, data: null, builtAt: 0, rebuilding: false }
    async function isrPage() {
        if (!isr.html) {
            const data = await slow()
            isr.html = renderToString(App({ data }))
            isr.data = data
            isr.builtAt = Date.now()
            return { html: isr.html, data: isr.data, state: 'isr-miss' }
        }
        if (Date.now() - isr.builtAt > ISR_TTL) {
            if (!isr.rebuilding) {
                isr.rebuilding = true
                slow().then((data) => {
                    isr.html = renderToString(App({ data }))
                    isr.data = data
                    isr.builtAt = Date.now()
                    isr.rebuilding = false
                })
            }
            return { html: isr.html, data: isr.data, state: 'isr-stale' }
        }
        return { html: isr.html, data: isr.data, state: 'isr-hit' }
    }

    function json(res, payload, status = 200) {
        res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(payload))
    }

    function serveStatic(req, res, pathname, jslag) {
        const file = path.normalize(path.join(ROOT, pathname.replace(/^\//, '')))
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found')
            return
        }
        const body = fs.readFileSync(file)
        const send = () => {
            res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' })
            res.end(body)
        }
        // 只压 /src/：它就是「要下载并解析的 JavaScript」本身
        if (jslag) setTimeout(send, jslag)
        else send()
    }

    async function servePage(req, res, url) {
        const mode = url.searchParams.get('mode') || 'ssr'
        const variant = url.searchParams.get('variant') || 'clean'
        const jslag = Number(url.searchParams.get('jslag') || 0)
        if (jslag) res.setHeader('Set-Cookie', `jslag=${jslag}; Path=/`)
        if (!MODES.includes(mode)) return json(res, { error: `未知 mode：${mode}`, MODES }, 400)

        const started = performance.now()
        const head = { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }
        const send = (html, state) => {
            head['X-Render-Mode'] = state
            head['X-Render-Ms'] = Math.round(performance.now() - started)
            res.writeHead(200, head)
            res.end(html)
        }

        if (mode === 'csr') {
            // 壳里什么内容都没有：首屏完全押在这份 JS 上
            return send(docHead({ mode }) + docTail({ entry: '/src/entry-csr.mjs' }), 'csr')
        }

        if (mode === 'ssg') {
            if (!ssg.html) await warm()
            return send(docHead({ mode }) + ssg.html + docTail({ data: scriptTag(ssg.data), entry: '/src/entry-full.mjs' }), 'ssg')
        }

        if (mode === 'isr') {
            const { html, data, state } = await isrPage()
            return send(docHead({ mode }) + html + docTail({ data: scriptTag(data), entry: '/src/entry-full.mjs' }), state)
        }

        if (mode === 'island') {
            // 岛化不下发注水数据，但**服务端该渲染的还是要渲染**：它省的是客户端 JS，不是服务端渲染
            const data = await slow()
            return send(docHead({ mode }) + renderToString(App({ data })) + docTail({ entry: '/src/entry-islands.mjs' }), 'island')
        }

        if (mode === 'stream') {
            head['X-Render-Mode'] = 'stream'
            head['X-Render-Ms'] = Math.round(performance.now() - started)
            res.writeHead(200, head)
            res.flushHeaders() // 头先走，TTFB 才反映「多久能开始说话」，而不是「多久渲染完」
            res.write(docHead({ mode, stream: true }))

            const reviewsPromise = loadReviews(bodyLag)
            const recommendPromise = loadRecommend(Math.round(bodyLag / 2))
            const app = App({
                data: shell,
                reviewsSlot: h(Await, {
                    id: 'reviews',
                    data: () => reviewsPromise,
                    fallback: h(ReviewsSkeleton),
                    render: (reviews) => h(Reviews, { reviews })
                }),
                recommendSlot: h(Await, {
                    id: 'recommend',
                    data: () => recommendPromise,
                    fallback: h(RecommendSkeleton),
                    render: (items) => h(Recommend, { items })
                })
            })
            for await (const segment of renderSections(app)) res.write(marker(segment.name) + segment.html)

            // 注水数据只能在最后一个边界之后才完整 —— 流式把「可交互」推迟了，这是它的代价
            const data = { ...shell, reviews: await reviewsPromise, recommend: await recommendPromise }
            res.end(docTail({ data: scriptTag(data), entry: '/src/entry-full.mjs' }))
            return
        }

        // ssr / hydrate：同一个页面，入口相同，只差客户端拿哪棵树去接管
        const data = await slow()
        send(docHead({ mode }) + renderToString(App({ data })) + docTail({ data: scriptTag(data), entry: '/src/entry-full.mjs' }), mode === 'hydrate' ? `hydrate-${variant}` : 'ssr')
    }

    async function handle(req, res) {
        const url = new URL(req.url, 'http://127.0.0.1')
        const pathname = decodeURIComponent(url.pathname)
        const jslag = Number((req.headers.cookie || '').match(/(?:^|;\s*)jslag=(\d+)/)?.[1] || 0)

        if (req.method === 'POST' && pathname === '/report') {
            let body = ''
            for await (const chunk of req) body += chunk
            res.writeHead(204, { 'Cache-Control': 'no-store' }).end()
            const payload = JSON.parse(body)
            reports.push(payload)
            if (onReport) onReport(payload)
            return
        }

        if (pathname.startsWith('/src/') || pathname.startsWith('/pages/')) return serveStatic(req, res, pathname, jslag)

        if (pathname === '/api/data') {
            if (url.searchParams.get('reviews') === '1') return json(res, await slow())
            return json(res, shell)
        }

        if (pathname === '/' || pathname === '/index.html') return servePage(req, res, url)

        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found')
    }

    return { handle, warm, reports }
}
