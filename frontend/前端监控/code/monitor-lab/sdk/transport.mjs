/**
 * 上报传输层（纯浏览器，零依赖）
 * 职责链路：采样 → 入队 → 攒批 → sendBeacon/fetch 投递 → 失败重试 → 溢出丢弃
 * 设计要点：只认浏览器全局（window / navigator / fetch），不再做 Node 侧依赖注入——
 * 这套 demo 的边界就是「SDK 实现 + 使用（采集→采样→攒批→发送）」，后端聚合不属于它。
 */

export const DEFAULT_TRANSPORT = {
    url: '/collect',
    batchSize: 5, // 攒够 5 条就发一批
    flushInterval: 3000, // 否则最多等 3 秒
    maxRetry: 2, // 每批失败后最多再试 2 次
    sampleRate: 1, // 采样率（0~1）
    maxQueue: 100 // 队列上限，超出丢最旧的
}

export function createTransport(options = {}) {
    const cfg = { ...DEFAULT_TRANSPORT, ...options }
    const queue = []
    const stats = { accepted: 0, sampled: 0, sent: 0, dropped: 0, retried: 0, batches: 0 }
    let timer = null

    function enqueue(event) {
        // 采样放在入队口，避免不可控的采集量把网络打满
        if (Math.random() >= cfg.sampleRate) {
            stats.sampled++
            return false
        }
        queue.push(event)
        stats.accepted++
        if (queue.length > cfg.maxQueue) {
            queue.shift()
            stats.dropped++
        }
        if (queue.length >= cfg.batchSize) flush('batch-full')
        else schedule()
        return true
    }

    function schedule() {
        if (timer) return
        timer = setTimeout(() => flush('interval'), cfg.flushInterval)
    }

    async function deliver(body) {
        // 首选 sendBeacon：页面卸载时也能送达，且不阻塞主线程
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            if (navigator.sendBeacon(cfg.url, body)) return true
        }
        if (typeof fetch === 'function') {
            try {
                const res = await fetch(cfg.url, {
                    method: 'POST',
                    body,
                    keepalive: true,
                    headers: { 'Content-Type': 'application/json' }
                })
                return !res || res.ok !== false
            } catch {
                return false
            }
        }
        return false
    }

    async function flush(reason = 'manual') {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        if (!queue.length) return { reason, batch: 0, ok: true, attempt: 0 }

        const batch = queue.splice(0, queue.length)
        const body = JSON.stringify({ events: batch })
        stats.batches++

        let ok = await deliver(body)
        let attempt = 0
        while (!ok && attempt < cfg.maxRetry) {
            attempt++
            stats.retried++
            ok = await deliver(body)
        }
        if (ok) stats.sent += batch.length
        else stats.dropped += batch.length
        return { reason, batch: batch.length, ok, attempt }
    }

    return {
        enqueue,
        flush,
        size: () => queue.length,
        pending: () => [...queue],
        stats: () => ({ ...stats }),
        stop() {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
        }
    }
}
