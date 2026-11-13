/** sendBeacon 单次请求体积上限保守取 60KB（浏览器真实上限 64KB，留头部余量） */
const BEACON_LIMIT = 60 * 1024
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
// 输入：一批事件
// 输出：是否送达
// 过程：序列化 → sendBeacon 优先（页面关闭也能发出去）→ fetch keepalive 兜底 → 指数退避重试
export function createTransport(cfg) {
    const log = (...args) => {
        if (cfg.debug) console.log('[monitor:transport]', ...args)
    }
    /** 第一通道：sendBeacon，页面关闭也保证发出；不支持/超限/异常都返回 false 交还兜底 */
    function beacon(payload) {
        try {
            const nav = navigator
            if (typeof nav.sendBeacon !== 'function') return false
            // text/plain 是 CORS 简单请求：不触发预检，跨域也能直发
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' })
            if (blob.size > BEACON_LIMIT) return false
            return nav.sendBeacon(cfg.endpoint, blob)
        } catch {
            return false
        }
    }
    /** 兜底通道：fetch keepalive，失败返回 false 由 send 重试 */
    async function post(payload) {
        try {
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'text/plain;charset=UTF-8' },
                body: payload,
                keepalive: true // 页面卸载时请求不被取消
            })
            return res.ok
        } catch {
            return false
        }
    }
    return {
        async send(batch) {
            if (!batch.length) return true
            const payload = JSON.stringify(batch)
            if (beacon(payload)) {
                log(`beacon 送出 ${batch.length} 条 / ${payload.length}B`)
                return true
            }
            for (let attempt = 0; attempt <= cfg.maxRetry; attempt++) {
                if (await post(payload)) {
                    log(`fetch 送出 ${batch.length} 条 / ${payload.length}B`)
                    return true
                }
                if (attempt < cfg.maxRetry) await sleep(200 * Math.pow(2, attempt))
            }
            log(`发送失败 ${batch.length} 条（重试 ${cfg.maxRetry} 次）`)
            return false
        }
    }
}
