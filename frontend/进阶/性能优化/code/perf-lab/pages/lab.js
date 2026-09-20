/**
 * 页面侧：订阅真实性能条目 + 统一回报给实验台
 * 每个实验页都在最后调用 Lab.finish({...}) 把本页测到的数字交出去
 */
window.Lab = (() => {
    const metrics = {
        fp: null,
        fcp: null,
        lcp: null,
        cls: 0,
        clsRaw: 0,
        shifts: 0,
        ttfb: null,
        domContentLoaded: null,
        load: null
    }
    const longtasks = []

    const observe = (type, cb) => {
        try {
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) cb(entry)
            }).observe({ type, buffered: true })
        } catch (err) {
            /* 浏览器不支持该条目类型时静默跳过 */
        }
    }

    observe('paint', e => (e.name === 'first-paint' ? (metrics.fp = e.startTime) : (metrics.fcp = e.startTime)))
    observe('largest-contentful-paint', e => (metrics.lcp = e.startTime))
    observe('layout-shift', e => {
        // 规范口径：位移发生在用户输入后 500ms 内属于「预期位移」，不计入 CLS
        // 无头环境里没有真实输入，hadRecentInput 却是 true，所以两个值都留着：
        // cls 是上报给监控的口径，clsRaw 是「所有位移之和」，对照实验读 clsRaw
        metrics.shifts += 1
        metrics.clsRaw += e.value
        if (!e.hadRecentInput) metrics.cls += e.value
    })
    observe('longtask', e => longtasks.push({ start: e.startTime, duration: e.duration }))

    const round = v => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)

    function resources(filter = '') {
        return performance
            .getEntriesByType('resource')
            .filter(e => !filter || e.name.includes(filter))
            .map(e => ({
                name: e.name.replace(location.origin, ''),
                start: Math.round(e.startTime),
                duration: Math.round(e.duration),
                size: e.transferSize,
                type: e.initiatorType
            }))
    }

    function time(fn) {
        const t0 = performance.now()
        const value = fn()
        return { ms: round(performance.now() - t0), value }
    }

    function snapshot() {
        const nav = performance.getEntriesByType('navigation')[0]
        if (nav) {
            metrics.ttfb = nav.responseStart
            metrics.domContentLoaded = nav.domContentLoadedEventEnd
            metrics.load = nav.loadEventEnd
        }
        const out = {}
        for (const [key, value] of Object.entries(metrics)) out[key] = round(value)
        return out
    }

    const settle = (wait = 200) => new Promise(resolve => setTimeout(resolve, wait))

    async function report(extra = {}) {
        const payload = {
            page: location.pathname,
            query: location.search,
            metrics: snapshot(),
            longtasks: longtasks.map(t => ({ start: round(t.start), duration: round(t.duration) })),
            resources: resources(),
            extra
        }
        await fetch('/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        return payload
    }

    /** 等观察器把最终值吐出来（LCP / CLS 是累积的），再回报 */
    async function finish(extra = {}, settleMs = 200) {
        await settle(settleMs)
        return report(extra)
    }

    return { metrics, longtasks, observe, resources, time, settle, report, finish, snapshot }
})()
