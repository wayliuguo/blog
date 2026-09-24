/**
 * 采集端（零依赖 Node 服务，端口 5189）
 * 一个进程同时干三件事：
 *   1. 静态下发：site/ 下的演示页 + sdk/ 下的 SDK 模块（同源上报，省掉 CORS）
 *   2. 接收上报：POST /collect 批量入库（内存 + data/events.jsonl 落盘）
 *   3. 聚合与告警：GET /api/report 返回秒桶、分位值、KPI 与告警流
 *
 * 启动：npm start（端口被占用会自动 +1，实际端口以启动日志为准）
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bucketize, summarizeBucket, rollup } from './aggregate.mjs'
import { createAlerter, DEFAULT_RULES } from './alert.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5189)
const SITE = path.join(__dirname, 'site')
const SDK = path.join(__dirname, 'sdk')
const DATA = path.join(__dirname, 'data')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
}

const events = []
const alerter = createAlerter(DEFAULT_RULES)
let alerts = []

// 落盘：真实系统这里会是 Kafka / 日志采集器，演示里写 JSONL 足够说明「批次可以落盘重放」
function persist(batch) {
    fs.mkdirSync(DATA, { recursive: true })
    fs.appendFileSync(path.join(DATA, 'events.jsonl'), batch.map(e => JSON.stringify(e)).join('\n') + '\n')
}

function ingest(batch) {
    const accepted = []
    for (const raw of batch) {
        const ev = { kind: 'event', ts: raw.ts || Date.now(), ...raw }
        events.push(ev)
        accepted.push(ev)
    }
    persist(accepted)

    // 简化版评估：每收一批就看一眼最新秒桶，命中规则即推告警
    // 注意 evaluate 用的是「桶的时间戳」而不是服务器当前时间——告警描述的是数据，不是收包时刻
    const buckets = bucketize(events, 1000).map(summarizeBucket)
    const latest = buckets[buckets.length - 1] || {}
    const fired = alerter.evaluate(
        {
            p95: latest.p95,
            p99: latest.p99,
            errorRate: latest.errorRate,
            tps: latest.tps
        },
        latest.ts ?? Date.now()
    )
    if (fired.length) alerts = [...alerts, ...fired]
    return { accepted: accepted.length, alerts: fired.length, total: events.length }
}

function snapshot() {
    const buckets = bucketize(events, 1000).map(summarizeBucket)
    return {
        kpi: buckets[buckets.length - 1] || null,
        window: rollup(events, 60000),
        buckets,
        alerts,
        total: events.length
    }
}

function resolveStatic(url) {
    const name = decodeURIComponent(url.split('?')[0])
    if (name === '/') return path.join(SITE, 'agent.html')
    if (name.startsWith('/sdk/')) {
        const f = path.normalize(path.join(SDK, name.slice('/sdk/'.length)))
        return f.startsWith(SDK) ? f : null
    }
    const f = path.normalize(path.join(SITE, name))
    return f.startsWith(SITE) ? f : null
}

function readBody(req) {
    return new Promise(resolve => {
        let buf = ''
        req.on('data', c => {
            buf += c
        })
        req.on('end', () => resolve(buf))
    })
}

function json(res, data, code = 200) {
    res.writeHead(code, { 'Content-Type': MIME['.json'], 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify(data))
}

function handle(req, res) {
    const url = req.url || '/'

    if (req.method === 'POST' && url.startsWith('/collect')) {
        return readBody(req).then(raw => {
            let parsed = null
            try {
                parsed = JSON.parse(raw)
            } catch {
                parsed = null
            }
            const batch = Array.isArray(parsed) ? parsed : (parsed && parsed.events) || []
            json(res, ingest(batch))
        })
    }
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' })
        return res.end()
    }

    if (url.startsWith('/api/report')) return json(res, snapshot())
    if (url.startsWith('/api/events')) return json(res, { total: events.length, events })
    if (url.startsWith('/api/reset')) {
        events.length = 0
        alerts = []
        return json(res, { ok: true })
    }

    const file = resolveStatic(url)
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not Found')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' })
    res.end(fs.readFileSync(file))
}

function listen(port, tries = 0) {
    const server = http.createServer(handle)
    server.removeAllListeners('error')
    server.on('error', err => {
        if (err.code !== 'EADDRINUSE' || tries >= 20) throw err
        console.log(`  端口 ${port} 被占用，自动改用 ${port + 1}`)
        listen(port + 1, tries + 1)
    })
    server.listen(port, () => {
        // PORT=0 时由系统分配空端口，必须回读真实端口号（自动化脚本靠这一行定位服务）
        const actual = server.address().port
        if (actual !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${actual}`)
        console.log(`监控采集端 -> http://localhost:${actual}/`)
        console.log(`  单页验证台 /monitor-lab.html   （?scenario=errors|perf|track 预置对应自动化序列）`)
        console.log(`  报表 API /api/report   原始事件 /api/events`)
    })
}
listen(PORT)
