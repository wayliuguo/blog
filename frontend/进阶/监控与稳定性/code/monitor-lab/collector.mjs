/**
 * 采集端（纯 Node 零依赖，默认端口 5189）
 * 极简职责，只服务「SDK 实现 + 使用」的演示闭环：
 *   1. 静态下发：app/dist 的 Vite build 产物（生产形态一条命令跑起来）
 *   2. 接收上报：POST /collect → 校验批次 → 追加到 data/events.jsonl → console 打印批次摘要
 *
 * 不做聚合 / 告警 / 报表接口——那些是采集端后端的事，超出本 demo 边界。
 *
 * 使用：
 *   生产形态：npm run start（先 build 出 app/dist，再跑本服务，单一端口）
 *   开发形态：npm run dev（vite 5173，把 /collect 代理回本服务）；本服务单独用 npm run server 起
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5189)
const STATIC = path.join(__dirname, 'app', 'dist') // Vite build 产物
const DATA = path.join(__dirname, 'data')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

let total = 0 // 内存计数，配合 JSONL 落盘说明「批次可落盘可重放」

// 落盘：真实系统这里会是 Kafka / 日志采集器，演示里写 JSONL 足够说明「批次可以落盘重放」
function persist(batch) {
    fs.mkdirSync(DATA, { recursive: true })
    fs.appendFileSync(path.join(DATA, 'events.jsonl'), batch.map(e => JSON.stringify(e)).join('\n') + '\n')
}

// 校验 + 打印批次摘要
function ingest(batch) {
    const accepted = batch.filter(e => e && typeof e === 'object').map(e => ({ ...e }))
    if (accepted.length) {
        total += accepted.length
        persist(accepted)
        // 按类型粗汇总，方便服务端侧一眼确认收到了什么
        const byType = {}
        for (const e of accepted) byType[e.type] = (byType[e.type] || 0) + 1
        console.log(
            `  ▼ 收到 ${accepted.length} 条：${Object.entries(byType)
                .map(([k, v]) => `${k}×${v}`)
                .join('  ')}（累计 ${total}）`
        )
    }
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
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify(data))
}

// hash 路由静态下发：Spa 的 /xxx 路径都回退到 index.html，避免刷新 404
function resolveStatic(url) {
    let name = decodeURIComponent(url.split('?')[0])
    if (name === '/') name = '/index.html'
    const f = path.normalize(path.join(STATIC, name))
    if (!f.startsWith(STATIC)) return null
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        const idx = path.join(STATIC, 'index.html')
        return fs.existsSync(idx) ? idx : null
    }
    return f
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
            ingest(batch)
            return json(res, { accepted: batch.length, total })
        })
    }
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' })
        return res.end()
    }

    const file = resolveStatic(url)
    if (!file) return res.writeHead(404).end('Not Found')
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
        const actual = server.address().port
        if (actual !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${actual}`)
        console.log(`监控接收端 -> http://localhost:${actual}/`)
        console.log(`  静态下发 app/dist（生产形态的 SPA build 产物）`)
        console.log(`  接收 POST /collect，落盘 data/events.jsonl，每批在控制台打印摘要`)
    })
}
listen(PORT)
