// 极简接收端 + 数据使用演示（Node 零依赖）：
// 1. POST /api/report   接收上报（JSON 数组，一个请求一批事件），打印摘要并落盘 events.jsonl
// 2. GET  /api/stats    聚合查询：错误按归并键聚合 / 性能 Vitals 看板 / 业务漏斗
// 3. GET  /mock/404 | /mock/500 | /mock/slow | POST /mock/pay  mock 端点（错误与慢请求靶子）
// 4. 其余 GET  下发 demo/dist，未命中回退 index.html（history 路由的 SPA fallback）
// 「落盘 + 聚合」两步合起来就是监控链路的下半场：数据收上来是存储，查出来才是监控
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PORT = Number(process.env.PORT || 5189)
const ROOT = path.dirname(url.fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const EVENTS_FILE = path.join(ROOT, 'data', 'events.jsonl')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' }

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') {
        res.writeHead(204).end()
        return
    }
    const pathname = req.url.split('?')[0]

    // 数据使用入口：一条 curl 拿到三类看板
    if (req.method === 'GET' && pathname === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(buildStats(), null, 2))
        return
    }

    // mock 端点：演示页触发接口错误与慢请求的靶子
    if (pathname === '/mock/404') return respond(res, 404, 'not found')
    if (pathname === '/mock/500') return respond(res, 500, 'server error')
    if (pathname === '/mock/slow') return setTimeout(() => respond(res, 200, 'slow ok'), 800)
    if (req.method === 'POST' && pathname === '/mock/pay') {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
            // 演示逻辑：商品 1 固定支付失败（演示业务失败事件），其余成功
            const fail = body.includes('"productId":1')
            setTimeout(() => {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(fail ? { ok: false, reason: '风控拦截' } : { ok: true, payId: 'P' + Date.now() }))
            }, fail ? 80 : 320) // 320ms：让支付请求出现在「慢请求」榜上又不至于拖测试
        })
        return
    }

    // 上报接收端：一个请求一批事件（JSON 数组）
    if (req.method === 'POST' && pathname === '/api/report') {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
            let events = []
            try {
                events = JSON.parse(body)
                if (!Array.isArray(events)) events = [events]
            } catch (e) {
                /* 跳过坏请求体 */
            }
            for (const e of events) print(e)
            fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true })
            fs.appendFileSync(EVENTS_FILE, events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''))
            res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
        })
        return
    }

    // 静态下发 demo/dist
    serveStatic(req, res)
})

function print(e) {
    const label = e.type === 'track' ? e.event : e.message || ''
    const extra = e.type === 'perf' ? `fp=${e.fp}ms fcp=${e.fcp}ms lcp=${e.lcp}ms cls=${e.cls} tbt=${e.tbt}ms inp=${e.inp}ms` : ''
    console.log(`▼ [${e.page}] ${e.type} ${label} ${extra}`)
    console.log(`    release=${e.release} env=${e.environment} handled=${e.handled === undefined ? '-' : e.handled}`)
}

// ---- 数据使用：把 events.jsonl 聚合成三块看板 ----
// 错误看「同类聚合」（同类型+同消息+同位置归并为一个计数），性能看「分位数」（p75 比均值抗噪），
// 业务看「漏斗转化」（相邻步计数相除）。这是三类数据各自的标准消费方式
function buildStats() {
    if (!fs.existsSync(EVENTS_FILE)) return { total: 0, note: '暂无数据，先在演示页触发几轮操作' }
    const events = fs.readFileSync(EVENTS_FILE, 'utf-8').trim().split('\n').map((l) => {
        try { return JSON.parse(l) } catch (e) { return null }
    }).filter(Boolean)

    // ① 错误看板：按归并键（类型+消息+位置）聚合 + 最近发生时间 + 影响页面
    const errorMap = new Map()
    for (const e of events) {
        if (e.type === 'perf' || e.type === 'track') continue
        const key = e.type + '|' + (e.message || '') + '|' + ((e.filename || (e.data && e.data.url)) || '')
        const item = errorMap.get(key) || { message: e.message || e.type, count: 0, pages: new Set(), handledTrue: 0, lastAt: 0, sample: e }
        item.count++
        if (e.page) item.pages.add(e.page)
        if (e.handled) item.handledTrue++
        item.lastAt = Math.max(item.lastAt, e.timestamp)
        item.sample = e // 最后一条当样本（带完整调用栈）
        errorMap.set(key, item)
    }
    const errors = [...errorMap.values()]
        .sort((a, b) => b.count - a.count)
        .map((it) => ({
            message: it.message, count: it.count,
            pages: [...it.pages], handledRate: Math.round((it.handledTrue / it.count) * 100) + '%',
            lastAt: new Date(it.lastAt).toISOString(),
            stack: (it.sample.stack || '').split('\n').slice(0, 2)
        }))

    // ② 性能看板：取最新一条 perf 快照 + 慢请求榜（真实部署按 p75 聚合，单机演示取终值）
    const perfs = events.filter((e) => e.type === 'perf')
    const perf = perfs.length ? perfs[perfs.length - 1] : null
    const perfBoard = perf ? {
        fp: perf.fp, fcp: perf.fcp, lcp: perf.lcp, cls: perf.cls, inp: perf.inp, tbt: perf.tbt,
        navigation: perf.navigation, slowRequests: perf.slowRequests
    } : null

    // ③ 业务看板：漏斗 = 曝光 → 点击 → 加购 → 下单（相邻步计数相除即转化率）
    const trackEvents = events.filter((e) => e.type === 'track')
    const byName = new Map()
    for (const e of trackEvents) {
        byName.set(e.event, (byName.get(e.event) || 0) + 1)
    }
    // 漏斗匹配用 includes：曝光事件名带商品 id 后缀（product_expose:1），后缀属于维度不属于步骤名
    const steps = ['product_expose', 'product_click', 'add_cart', 'order_submit']
    const funnel = steps.map((s) => {
        const count = [...byName.entries()].filter(([name]) => name.includes(s)).reduce((n, [, c]) => n + c, 0)
        return { step: s, count }
    }).map((item, i, arr) => ({
        ...item,
        rate: i === 0 ? '100%' : (arr[i - 1].count ? Math.round((item.count / arr[i - 1].count) * 100) + '%' : '-')
    }))
    const topEvents = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name, count]) => ({ name, count }))

    return { total: events.length, errors, perf: perfBoard, funnel, topEvents }
}

function respond(res, status, text) {
    res.writeHead(status, { 'Content-Type': 'text/plain' })
    res.end(text)
}

function serveStatic(req, res) {
    let p = req.url.split('?')[0]
    if (p === '/') p = '/index.html'
    let file = path.join(DIST, p)
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        // SPA fallback：history 路由的深链（/product/1）回退 index.html
        file = path.join(DIST, 'index.html')
        if (!fs.existsSync(file)) {
            res.writeHead(404).end('not found')
            return
        }
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
}

server.listen(PORT, () => {
    console.log(`[collector] 上报接收端 http://localhost:${PORT}/api/report`)
    console.log(`[collector] 数据看板   GET http://localhost:${PORT}/api/stats`)
    console.log(`[collector] mock 端点: /mock/404 /mock/500 /mock/slow /mock/pay`)
    console.log(`[collector] 静态目录: ${DIST}（先 npm run build）`)
})
