/**
 * 页面侧：订阅真实性能条目 + 记录「内容什么时候出现在 DOM 里」+ 数 DOM 突变，最后统一回报给实验台
 * 每个实验页的入口模块都在最后调用 Lab.finish({...}) 把本页测到的数字交出去
 */
window.Lab = (() => {
    const metrics = { fp: null, fcp: null, lcp: null, ttfb: null, domContentLoaded: null, load: null }
    const longtasks = []
    const round = v => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)

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
    observe('longtask', e => longtasks.push({ start: e.startTime, duration: e.duration }))

    function resources(filter = '') {
        return performance
            .getEntriesByType('resource')
            .filter(e => !filter || e.name.includes(filter))
            .map(e => ({
                name: e.name.replace(location.origin, ''),
                start: Math.round(e.startTime),
                duration: Math.round(e.duration),
                size: e.transferSize,
                encoded: e.encodedBodySize,
                decoded: e.decodedBodySize,
                type: e.initiatorType
            }))
    }

    /** 这份 JS 一共拉了多少字节：岛化省下的就是它 */
    function scriptBytes(prefix = '/src/') {
        const list = resources(prefix)
        // 用 decoded 而不是 transferSize：命中内存缓存时 transferSize 会是 0，口径会飘
        return { files: list.length, bytes: list.reduce((sum, r) => sum + r.decoded, 0), list }
    }

    /**
     * 数 DOM 突变：执行 fn 期间容器上真实发生了多少次 childList / attributes / characterData 变更。
     * 这是「hydration 有没有白干」最直接的证据 —— 数字来自浏览器，不是自己数的。
     */
    async function observeMutations(selector, fn) {
        const target = document.querySelector(selector)
        if (!target) return { error: `找不到 ${selector}` }
        const records = []
        const mo = new MutationObserver(list => records.push(...list))
        mo.observe(target, { childList: true, subtree: true, attributes: true, characterData: true })
        const t0 = performance.now()
        const value = await fn()
        const ms = round(performance.now() - t0)
        await new Promise(resolve => setTimeout(resolve, 0)) // 让 MutationObserver 的回调跑完
        mo.disconnect()
        const count = { childList: 0, attributes: 0, characterData: 0 }
        for (const record of records) count[record.type]++
        return { value, ms, mutations: records.length, ...count, nodes: target.querySelectorAll('*').length }
    }

    function snapshot() {
        const nav = performance.getEntriesByType('navigation')[0]
        if (nav) {
            metrics.ttfb = nav.responseStart
            metrics.domContentLoaded = nav.domContentLoadedEventEnd
            metrics.load = nav.loadEventEnd
        }
        // 无头 Chrome 偶尔不会把 paint 条目推给观察器，回报前再从缓冲区捞一次兜底
        for (const entry of performance.getEntriesByType('paint')) {
            if (entry.name === 'first-paint' && metrics.fp == null) metrics.fp = entry.startTime
            if (entry.name === 'first-contentful-paint' && metrics.fcp == null) metrics.fcp = entry.startTime
        }
        const out = {}
        for (const [key, value] of Object.entries(metrics)) out[key] = round(value)
        return out
    }

    const settle = (wait = 200) => new Promise(resolve => setTimeout(resolve, wait))

    async function report(extra = {}, value) {
        const payload = {
            page: location.pathname,
            query: location.search,
            metrics: snapshot(),
            marks: window.__marks || {},
            chunks: window.__chunks || [],
            longtasks: longtasks.map(t => ({ start: round(t.start), duration: round(t.duration) })),
            resources: resources(),
            value,
            extra
        }
        await fetch('/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        return payload
    }

    /** 等观察器把最终值吐出来（LCP 是累积的），再回报 */
    async function finish(extra = {}, value, settleMs = 200) {
        await settle(settleMs)
        return report(extra, value)
    }

    return { metrics, longtasks, observe, resources, scriptBytes, observeMutations, settle, report, finish, snapshot }
})()
