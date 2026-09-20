/**
 * 实验台的共享路由表（CJS，供 server.js 与场景脚本共同复用）
 *
 *   GET  /site/*                       静态页面（模块 demo 目录）
 *   GET  /api/slow?ms=200&bytes=10      延迟响应，用于多路复用与队头阻塞对照
 *   GET  /api/cache/immutable/app.js    强缓存：max-age=31536000, immutable（内容哈希资源）
 *   GET  /api/cache/etag/doc.json       协商缓存：no-cache + ETag，带 If-None-Match 时回 304
 *   GET  /api/cache/swr/feed.json       过期可用：max-age=60, stale-while-revalidate=600
 *   GET  /api/cache/html                no-store：压根不落盘
 *   GET  /api/flaky?key=a&fail=2        前 fail 次返回 503 + Retry-After，之后 200（重试对照）
 *   POST /api/order                     下单计数；带 Idempotency-Key 时同 key 只产生一次副作用
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const SITE = path.join(__dirname, '..', 'site')
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
}

/** 前 fail 次失败：按 key 记尝试次数，多个场景互不干扰 */
const flakyAttempts = new Map()
/** 已消费的幂等键 → 订单号，重复请求直接回同一个 */
const idempotency = new Map()
let orderSeq = 0

const sleep = ms => new Promise(r => setTimeout(r, ms))
const etagOf = body => '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"'

/** 一份体积稳定的 JSON，用于让「200 vs 304」的字节差异可比 */
function docBody() {
    const rows = []
    for (let i = 0; i < 24; i++) rows.push({ id: i, title: `文档 ${i}`, tags: ['net', 'cache'] })
    return JSON.stringify({ version: 7, rows }, null, 2)
}

/**
 * 处理一个请求，命中则返回 true。
 * 返回值让调用方（http1 / h2c 两个服务器）共用同一套路由。
 */
async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const p = url.pathname
    const q = url.searchParams

    if (p === '/api/slow') {
        const ms = Number(q.get('ms') || 200)
        const size = Number(q.get('bytes') || 10)
        await sleep(ms)
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('x'.repeat(size))
        return true
    }

    if (p === '/api/cache/immutable/app.js') {
        const body = `console.log('app bundle v7')  // ${'x'.repeat(300)}\n`
        res.writeHead(200, {
            'Content-Type': MIME['.js'],
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: etagOf(body)
        })
        res.end(body)
        return true
    }

    if (p === '/api/cache/etag/doc.json') {
        const body = docBody()
        const tag = etagOf(body)
        // 协商缓存：命中就回 304 且不带正文
        if (req.headers['if-none-match'] === tag) {
            res.writeHead(304, { 'Cache-Control': 'no-cache', ETag: tag })
            res.end()
            return true
        }
        res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-cache', ETag: tag })
        res.end(body)
        return true
    }

    if (p === '/api/cache/swr/feed.json') {
        // Age 由查询参数模拟：age > max-age 表示已过期，落在 stale-while-revalidate 窗口内
        const age = Number(q.get('age') || 0)
        res.writeHead(200, {
            'Content-Type': MIME['.json'],
            'Cache-Control': 'max-age=60, stale-while-revalidate=600',
            Age: String(age)
        })
        res.end(JSON.stringify({ feed: ['a', 'b'], age }))
        return true
    }

    if (p === '/api/cache/html') {
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' })
        res.end('<!doctype html><title>no-store</title><p>这个页面不会被缓存</p>')
        return true
    }

    if (p === '/api/flaky') {
        const key = q.get('key') || 'default'
        const fail = Number(q.get('fail') || 2)
        const n = (flakyAttempts.get(key) || 0) + 1
        flakyAttempts.set(key, n)
        if (n <= fail) {
            await sleep(20)
            res.writeHead(503, { 'Content-Type': MIME['.json'], 'Retry-After': '1' })
            res.end(JSON.stringify({ error: 'busy', attempt: n }))
            return true
        }
        res.writeHead(200, { 'Content-Type': MIME['.json'] })
        res.end(JSON.stringify({ ok: true, attempt: n }))
        return true
    }

    if (p === '/api/order' && req.method === 'POST') {
        const body = await readBody(req)
        const idem = req.headers['idempotency-key']
        if (idem && idempotency.has(idem)) {
            res.writeHead(200, { 'Content-Type': MIME['.json'], 'Idempotent-Replay': 'true' })
            res.end(JSON.stringify({ orderId: idempotency.get(idem), created: false, total: orderSeq }))
            return true
        }
        orderSeq += 1
        const orderId = 'ORD-' + orderSeq
        if (idem) idempotency.set(idem, orderId)
        res.writeHead(201, { 'Content-Type': MIME['.json'] })
        res.end(JSON.stringify({ orderId, created: true, total: orderSeq, body: body.length }))
        return true
    }

    if (p === '/api/flaky-order' && req.method === 'POST') {
        // 前 fail 次「服务端已经落库但回包失败」：幂等键才能救回来的典型场景
        const idem = req.headers['idempotency-key']
        const key = q.get('key') || 'order'
        const fail = Number(q.get('fail') || 1)
        const n = (flakyAttempts.get(key) || 0) + 1
        flakyAttempts.set(key, n)
        if (idem && idempotency.has(idem)) {
            res.writeHead(201, { 'Content-Type': MIME['.json'], 'Idempotent-Replay': 'true' })
            res.end(JSON.stringify({ orderId: idempotency.get(idem), created: false, total: orderSeq }))
            return true
        }
        orderSeq += 1
        const orderId = 'ORD-' + orderSeq
        if (idem) idempotency.set(idem, orderId)
        await readBody(req)
        if (n <= fail) {
            res.destroy() // 断连：请求已被处理，但客户端拿不到结果
            return true
        }
        res.writeHead(201, { 'Content-Type': MIME['.json'] })
        res.end(JSON.stringify({ orderId, created: true, total: orderSeq }))
        return true
    }

    if (p === '/api/reset') {
        flakyAttempts.clear()
        idempotency.clear()
        orderSeq = 0
        res.writeHead(200, { 'Content-Type': MIME['.json'] })
        res.end(JSON.stringify({ ok: true }))
        return true
    }

    if (p.startsWith('/site/') || p === '/') {
        return serveSite(p, res)
    }

    res.writeHead(404, { 'Content-Type': MIME['.json'] })
    res.end(JSON.stringify({ error: 'not found', path: p }))
    return true
}

function readBody(req) {
    return new Promise(resolve => {
        let data = ''
        req.on('data', c => (data += c))
        req.on('end', () => resolve(data))
    })
}

/** 静态下发 site/；security.html 每次生成新的 CSP nonce */
function serveSite(p, res) {
    const rel = p === '/' ? 'index.html' : p.replace(/^\/site\//, '')
    const file = path.join(SITE, rel)
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { 'Content-Type': MIME['.json'] })
        res.end(JSON.stringify({ error: 'not found', path: p }))
        return true
    }
    const ext = path.extname(file)
    let body = fs.readFileSync(file)
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' }
    if (rel === 'security.html') {
        const nonce = crypto.randomBytes(8).toString('base64')
        // vendor.js 的 SRI 哈希本该由构建期算好写进 HTML，这里由服务端代劳，保证与文件内容永远一致
        const integrity =
            'sha384-' +
            crypto
                .createHash('sha384')
                .update(fs.readFileSync(path.join(SITE, 'vendor.js')))
                .digest('base64')
        // 带 nonce 的内联脚本合法；页面里另一段没有 nonce 的内联脚本会被 CSP 拦下
        body = Buffer.from(
            body
                .toString('utf8')
                .replace(/__NONCE__/g, nonce)
                .replace(/__INTEGRITY__/g, integrity)
        )
        headers[
            'Content-Security-Policy'
        ] = `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.example.com; object-src 'none'; base-uri 'self'`
        headers['X-Content-Type-Options'] = 'nosniff'
        headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        headers['X-Frame-Options'] = 'DENY'
    }
    res.writeHead(200, headers)
    res.end(body)
    return true
}

module.exports = { handle, SITE, MIME }
