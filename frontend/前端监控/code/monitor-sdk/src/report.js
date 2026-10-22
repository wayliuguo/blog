// 上报：SDK 唯一上报通道。公共 report() 是手动上报入口（异常自动采集内部也走同一条 send）
// 通道职责：公共字段补全 → 采样 → 节流（相同错误 1 秒一条）→ beforeSend → 批量发送
// 投递：sendBeacon 优先（判断支持即调用，页面卸载也能送达），fetch keepalive 兜底，重试有上限
const SDK_VERSION = '3.0.0'

// 节流只作用于错误类事件：track/perf 每条都是有效样本，不能节流
const ERROR_TYPES = ['runtime', 'promise', 'resource', 'http', 'network', 'message']

// 当前上报器：init 装配时注册，公共 report() 从这里发
let active = null

// 手动上报：SDK 唯一的手动入口。业务侧区分上报类型的二次封装（demo 的 useReport）都落在这一句上
export function report(event) {
    if (!active) {
        console.warn('[monitor-sdk] report() 需在 init() 之后调用')
        return
    }
    active.send(event)
}

export function initReporter(cfg, win, stats) {
    // 在任何请求拦截器包装之前拿原生 fetch：SDK 自己的上报不进拦截，避免自我采集
    const nativeFetch = win.fetch ? win.fetch.bind(win) : null
    const queue = []
    let timer = null
    let sending = false

    // 归并键 = 类型 + 消息 + 位置（文件行号或请求 url）。
    // 没有它，一次渲染死循环产生的错误风暴就能打爆队列
    const lastSeen = new Map()
    function throttleKey(event) {
        if (!ERROR_TYPES.includes(event.type)) return null
        return [event.type, event.message, event.filename || (event.data && event.data.url) || ''].join('|')
    }

    function send(event) {
        // Error 实例归一：手动上报直接传 error 对象即可，SDK 负责拆出 message/stack
        const { error, ...rest } = event
        if (error instanceof win.Error) {
            if (!rest.message) rest.message = error.message
            if (!rest.stack) rest.stack = error.stack
        }

        // 公共字段：先展开采集模块产出的事件再补全——事件自带的 tags/extra 不会被覆盖
        const full = {
            ...rest,
            event_id: uuid(),
            sdk: { name: 'monitor-sdk', version: SDK_VERSION },
            timestamp: Date.now(),
            environment: cfg.environment,
            release: cfg.release, // release 贯穿每条事件：sourcemap 对齐、按版本分桶的前提
            page: rest.page || win.location.pathname, // 发生页面：未传则取当前路径
            // 公参：init 时静态传入，每条事件自动附带（漏斗/留存分析全靠它）
            params: { ...cfg.commonParams, ...(rest.params || {}) }
        }

        // 采样：错误/业务与性能分开配置（错误量小要全量，性能每页一条也要控量）
        const rate = full.type === 'perf' ? cfg.tracesSampleRate : cfg.sampleRate
        if (Math.random() >= rate) return

        // 节流：相同错误 1 秒内只报一条，丢弃量记 stats.throttled
        const key = throttleKey(full)
        if (key) {
            const now = Date.now()
            if (now - (lastSeen.get(key) || 0) < 1000) {
                stats.throttled++
                return
            }
            if (lastSeen.size > 200) lastSeen.clear()
            lastSeen.set(key, now)
        }

        // beforeSend：治理唯一收口——脱敏、过滤、丢弃（返回 null 即丢弃）
        if (typeof cfg.beforeSend === 'function') {
            const result = cfg.beforeSend(full)
            if (result === null || result === undefined) return
        }
        enqueue(full)
    }

    // 批量上报：队列满 batchSize 立即发，或 flushInterval 超时兜底发——
    // 高频操作靠满量、低频操作靠超时，两头都不等太久
    function enqueue(event) {
        if (queue.length >= cfg.maxQueue) {
            queue.shift() // 溢出丢最旧：内存可控比多留几条旧事件重要
            stats.dropped++
        }
        queue.push(event)
        if (queue.length >= cfg.batchSize) flush('batch-full')
        else schedule()
    }

    function schedule() {
        if (timer) return
        timer = setTimeout(() => {
            timer = null
            flush('interval')
        }, cfg.flushInterval)
    }

    async function flush(reason) {
        if (sending || !queue.length) return
        sending = true // 防重入：hidden 触发 flush 时可能又有批次在途
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        const batch = queue.splice(0, queue.length)
        let ok = await deliver(batch)
        if (!ok) {
            // 重试有上限：监控数据不值得无限重试，重试本身也消耗用户带宽
            for (let i = 0; i < cfg.maxRetry && !ok; i++) {
                stats.retried++
                ok = await deliver(batch)
            }
        }
        if (ok) {
            stats.sent += batch.length
            if (cfg.debug) win.console.log('[monitor-sdk] 发送 ' + batch.length + ' 条 ✓（' + reason + '）')
        } else {
            stats.dropped += batch.length
            if (cfg.debug) win.console.warn('[monitor-sdk] 发送失败已放弃 ' + batch.length + ' 条（' + reason + '）')
        }
        sending = false
    }

    async function deliver(batch) {
        const body = JSON.stringify(batch) // 一个请求一批事件：JSON 数组
        // 首选 sendBeacon：判断支持即调用。页面卸载时也能送达且不阻塞；
        // Blob 用 text/plain 跨域不触发预检
        if (win.navigator && typeof win.navigator.sendBeacon === 'function') {
            if (win.navigator.sendBeacon(cfg.endpoint, new win.Blob([body], { type: 'text/plain' }))) return true
        }
        // 兜底 fetch + keepalive：有响应回调，但请求体有 64KB 上限
        if (!nativeFetch) return false
        try {
            const res = await nativeFetch(cfg.endpoint, { method: 'POST', body, keepalive: true })
            return !res || res.ok !== false
        } catch (e) {
            return false
        }
    }

    active = { send, flush, pendingCount: () => queue.length }
    return active
}

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}
