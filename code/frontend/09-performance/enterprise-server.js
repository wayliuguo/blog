/**
 * 09-性能优化与监控 · 企业级监控服务（零依赖）
 *
 * 这是「企业级性能与监控工程实战」的可运行 demo：
 * 演示一条完整的「前端埋点 → 上报 → 接收端聚合 → 告警」闭环。
 *
 * 角色分工：
 *   1) 静态下发 agent.html / monitor.html（前端页面）
 *   2) 接收 POST /api/collect 的性能/错误/行为上报数据
 *   3) 在内存中按「1s 时间桶」聚合出 TPS / P95 延迟 / 首屏耗时 / 错误率
 *   4) 当 P95 或错误率超过阈值时，产生一条告警记录
 *   5) 供监控页面 GET /api/report 轮询拉取聚合快照
 *
 * 启动：npm run enterprise （或 node enterprise-server.js）
 * 访问：
 *   http://localhost:5183/agent.html   前端埋点模拟页（点击产生上报）
 *   http://localhost:5183/monitor.html 聚合报表/告警页
 *
 * 依赖：零外部依赖，仅用 node 内置 http / fs / path。
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5183
const ROOT = path.join(__dirname, 'site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

/* ---------------- 接收端数据模型 ---------------- */

// 阈值为「企业告警基线」的模型约定：P95 目标 ≤120ms，错误率目标 ≤1%。
const ALERT_LIMITS = { p95: 120, errorRate: 0.01 }

// buckets：{ ts:number(秒级) -> { count, totalLatency, errCount, fpSum, lcpSum, p95List:[] } }
const buckets = new Map()

// 告警记录：{ time, metric, value, limit, message }
const alerts = []

// 为演示而内置的基准数据，让报表在无人操作时也有可读的曲线
seedBaseline()

function seedBaseline() {
    const now = Math.floor(Date.now() / 1000)
    for (let i = 59; i >= 0; i--) {
        const ts = now - i
        let bp = buckets.get(ts)
        if (!bp) { bp = makeBucket(); buckets.set(ts, bp) }
        for (let k = 0; k < 18; k++) bp.count++
        bp.totalLatency += 18 * (Math.random() * 40 + 50)
        if (Math.random() < 0.02) bp.errCount++
        bp.fpSum += 18 * (Math.random() * 120 + 220)
        bp.lcpSum += 18 * (Math.random() * 200 + 600)
    }
}

function makeBucket() {
    return { count: 0, totalLatency: 0, errCount: 0, fpSum: 0, lcpSum: 0, p95List: [] }
}

function gcBuckets(nowSec) {
    for (const key of buckets.keys()) if (key < nowSec - 120) buckets.delete(key)
}

/* ---------------- 上报路由 ---------------- */
function handleCollect(buf) {
    let body = {}
    try { body = JSON.parse(buf.toString()) } catch (e) { body = {} }

    const ts = Math.floor(Date.now() / 1000)
    let b = buckets.get(ts)
    if (!b) { b = makeBucket(); buckets.set(ts, b) }

    // metrics: { fp, fcp, lcp, ttfb, latency, ok }
    const m = body.metrics || {}
    b.count++
    if (!m.ok) b.errCount++
    b.totalLatency += Number(m.latency) || 0
    b.fpSum += Number(m.fp) || 0
    b.lcpSum += Number(m.lcp) || 0
    if (typeof m.latency === 'number') b.p95List.push(m.latency)

    // 行为/业务埋点也可在此扩展，此处仅计数

    // 到达当前上限后，立即计算该桶指标并判断是否触发告警
    evalAlerts(ts, b)
    return true
}

/* ---------------- 聚合与告警 ---------------- */
function evalAlerts(ts, b) {
    if (b.count === 0) return
    const p95 = percentile(b.p95List, 0.95)
    const errorRate = b.errCount / b.count
    if (p95 !== null && p95 > ALERT_LIMITS.p95) {
        pushAlert(ts, 'p95', Math.round(p95), ALERT_LIMITS.p95, '接口 P95 延迟超阈，存在变慢风险')
    }
    if (errorRate > ALERT_LIMITS.errorRate) {
        pushAlert(ts, 'errorRate', errorRate, ALERT_LIMITS.errorRate, `错误率超阈（${(errorRate * 100).toFixed(1)}%）`)
    }
}

function pushAlert(ts, metric, value, limit, msg) {
    // 同秒同指标准确去重，避免告警轰炸
    const already = alerts.some(a => a.ts === ts && a.metric === metric)
    if (already) return
    alerts.push({ ts, metric, value, limit, msg, time: new Date(ts * 1000).toLocaleTimeString() })
    if (alerts.length > 50) alerts.shift()
}

function percentile(arr, q) {
    if (!arr.length) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.floor(sorted.length * q)
    return sorted[Math.min(idx, sorted.length - 1)]
}

/* ---------------- 快照 ---------------- */
function makeReport() {
    gcBuckets(Math.floor(Date.now() / 1000))
    const now = Math.floor(Date.now() / 1000)
    const series = []
    const keys = [...buckets.keys()].sort((a, b) => a - b)
    for (const ts of keys.slice(-120)) {
        const b = buckets.get(ts)
        series.push({
            ts, time: new Date(ts * 1000).toLocaleTimeString(),
            tps: b.count,
            avgLatency: b.count ? Math.round(b.totalLatency / b.count) : 0,
            p95: percentile(b.p95List, 0.95),
            errorRate: b.count ? +(b.errCount / b.count).toFixed(4) : 0,
            fp: b.count ? Math.round(b.fpSum / b.count) : 0,
            lcp: b.count ? Math.round(b.lcpSum / b.count) : 0,
        })
    }
    // 最新一分钟汇总
    const last60 = series.slice(-60)
    const agg = {
        tps: last60.reduce((s, x) => s + x.tps, 0),
        avgLatency: last60.length ? Math.round(last60.reduce((s, x) => s + x.avgLatency, 0) / last60.length) : 0,
        p95: last60.length ? Math.round(last60.reduce((s, x) => s + (x.p95 || 0), 0) / last60.length) : 0,
        errorRate: last60.length ? +(last60.reduce((s, x) => s + x.errorRate, 0) / last60.length).toFixed(4) : 0,
        fp: last60.length ? Math.round(last60.reduce((s, x) => s + x.fp, 0) / last60.length) : 0,
        lcp: last60.length ? Math.round(last60.reduce((s, x) => s + x.lcp, 0) / last60.length) : 0,
    }
    return { agg, series, alerts: alerts.slice(-20).reverse(), limits: ALERT_LIMITS }
}

/* ---------------- HTTP 服务 ---------------- */
function safePath(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(ROOT, 'agent.html')
    const file = path.normalize(path.join(ROOT, name))
    return file.startsWith(ROOT) ? file : null
}

http.createServer((req, res) => {
    const url = req.url.split('?')[0]

    // 上报接口
    if (url === '/api/collect' && req.method === 'POST') {
        let chunks = []
        req.on('data', c => chunks.push(c))
        req.on('end', () => {
            handleCollect(Buffer.concat(chunks))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
        })
        return
    }

    // 报表接口
    if (url === '/api/report') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(makeReport()))
        return
    }

    // 静态资源
    const file = safePath(req.url)
    if (!file) return res.writeHead(403).end('Forbidden')
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
    res.end(fs.readFileSync(file))
}).listen(PORT, () => console.log(`09-企业级监控 demo -> http://localhost:${PORT}/agent.html`))