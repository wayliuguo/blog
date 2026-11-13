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
const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
}

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
        req.on('data', c => (body += c))
        req.on('end', () => {
            // 演示逻辑：商品 1 固定支付失败（演示业务失败事件），其余成功
            const fail = body.includes('"productId":1')
            setTimeout(
                () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(
                        JSON.stringify(fail ? { ok: false, reason: '风控拦截' } : { ok: true, payId: 'P' + Date.now() })
                    )
                },
                fail ? 80 : 320
            ) // 320ms：让支付请求出现在「慢请求」榜上又不至于拖测试
        })
        return
    }

    // 上报接收端：一个请求一批事件（JSON 数组）
    if (req.method === 'POST' && pathname === '/api/report') {
        let body = ''
        req.on('data', c => (body += c))
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
            fs.appendFileSync(EVENTS_FILE, events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''))
            res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}')
        })
        return
    }

    // 静态下发 demo/dist
    serveStatic(req, res)
})

function print(e) {
    const data = e.data || {}
    const extra =
        e.type === 'perf'
            ? `fp=${data.fp} fcp=${data.fcp} lcp=${data.lcp} cls=${data.cls} inp=${data.inp} tbt=${data.tbt}`
            : e.type === 'white-screen'
            ? `blank=${data.blank}/${data.total} ratio=${data.ratio}`
            : e.type === 'request'
            ? `status=${data.status} ${data.duration}ms`
            : ''
    console.log(
        `▼ [${(e.page && e.page.path) || '-'}] ${e.type}${e.subtype ? '/' + e.subtype : ''} ${e.message || ''} ${extra}`
    )
    console.log(`    release=${e.release} env=${e.env} session=${((e.session && e.session.id) || '').slice(0, 8)}`)
}

// ---- 数据使用：把 events.jsonl 聚合成四块看板 ----
// 错误看「同类聚合」（指纹相同归并为一个计数）、性能看「终值与分位」、
// 请求看「慢与失败」、业务看「漏斗转化」。这是四类数据各自的标准消费方式
function buildStats() {
    if (!fs.existsSync(EVENTS_FILE)) return { total: 0, note: '暂无数据，先在演示页触发几轮操作' }
    const events = fs
        .readFileSync(EVENTS_FILE, 'utf-8')
        .trim()
        .split('\n')
        .map(l => {
            try {
                return JSON.parse(l)
            } catch (e) {
                return null
            }
        })
        .filter(Boolean)

    // ① 错误看板：按指纹（类型+子类型+消息+栈顶帧）聚合。
    // resource 只有 load-error 才算错误，timing 是性能汇总不是异常
    const errorMap = new Map()
    for (const e of events) {
        const isError = e.type === 'error' || (e.type === 'resource' && e.subtype === 'load-error')
        if (!isError) continue
        const key = e.fingerprint || `${e.type}|${e.message || ''}`
        const item = errorMap.get(key) || {
            message: e.message || e.type,
            type: e.type,
            source: (e.data && e.data.source) || '-',
            count: 0,
            pages: new Set(),
            lastAt: 0,
            sample: e
        }
        item.count++
        if (e.page && e.page.path) item.pages.add(e.page.path)
        item.lastAt = Math.max(item.lastAt, e.timestamp)
        item.sample = e
        errorMap.set(key, item)
    }
    const errors = [...errorMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(it => ({
            message: it.message,
            type: it.type,
            source: it.source,
            count: it.count,
            pages: [...it.pages],
            lastAt: new Date(it.lastAt).toISOString(),
            stack: (it.sample.stack || '').split('\n').slice(0, 2)
        }))

    // ② 性能看板：取最新一条 perf 终值（真实部署按 p75 聚合，单机演示取终值）
    const perfs = events.filter(e => e.type === 'perf')
    const perf = perfs.length ? perfs[perfs.length - 1] : null
    const perfBoard = perf ? { page: perf.page && perf.page.path, ...perf.data } : null

    // ③ 请求看板：慢请求榜 + 失败列表
    const requests = events.filter(e => e.type === 'request')
    const slowRequests = requests
        .filter(e => e.data && e.subtype === 'slow')
        .sort((a, b) => (b.data.duration || 0) - (a.data.duration || 0))
        .slice(0, 5)
        .map(e => ({ url: e.data.url, duration: e.data.duration, method: e.data.method }))
    const failedRequests = requests
        .filter(e => e.data && e.data.success === false)
        .slice(-10)
        .map(e => ({
            url: e.data.url,
            status: e.data.status,
            subtype: e.subtype,
            at: new Date(e.timestamp).toISOString()
        }))

    // ④ 业务看板：漏斗 = 曝光 → 点击 → 加购 → 下单。
    // 曝光/声明式点击来自 behavior（subtype + selector），手动埋点来自 custom（data.name），两者都要计入
    const customs = events.filter(e => e.type === 'custom')
    const behaviors = events.filter(e => e.type === 'behavior')
    const byName = new Map()
    for (const e of customs) {
        const name = (e.data && e.data.name) || e.message || ''
        byName.set(name, (byName.get(name) || 0) + 1)
    }
    for (const e of behaviors) {
        const label = (e.data && e.data.selector) || e.message || ''
        const name = `${e.subtype}:${label}`
        byName.set(name, (byName.get(name) || 0) + 1)
    }
    const steps = ['product_expose', 'product_click', 'add_cart', 'order_submit']
    const funnel = steps
        .map(step => {
            const count = [...byName.entries()].filter(([name]) => name.includes(step)).reduce((n, [, c]) => n + c, 0)
            return { step, count }
        })
        .map((item, i, arr) => ({
            ...item,
            rate: i === 0 ? '100%' : arr[i - 1].count ? Math.round((item.count / arr[i - 1].count) * 100) + '%' : '-'
        }))
    const topEvents = [...byName.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))

    // ⑤ 稳定性看板：白屏与路由
    const whiteScreens = events.filter(e => e.type === 'white-screen')
    const routes = events.filter(e => e.type === 'router')
    const routeCount = new Map()
    for (const e of routes) routeCount.set(e.data.route, (routeCount.get(e.data.route) || 0) + 1)

    return {
        total: events.length,
        errors,
        perf: perfBoard,
        requests: { slow: slowRequests, failed: failedRequests },
        funnel,
        topEvents,
        whiteScreen: {
            count: whiteScreens.length,
            last: whiteScreens.length ? whiteScreens[whiteScreens.length - 1].data : null
        },
        routes: [...routeCount.entries()].sort((a, b) => b[1] - a[1]).map(([route, count]) => ({ route, count }))
    }
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
