// 性能：PerformanceObserver 订阅 Web Vitals 全指标 + 导航明细 + 请求耗时汇总
// 指标语义是「页面生命周期结束时的最终值」——hidden 时 finalize 定稿上报，且只算一次
export function initPerformance(win) {
    const state = {
        fp: 0, // first-paint 首次绘制
        fcp: 0, // first-contentful-paint 首次内容绘制
        lcp: 0, // largest-contentful-paint 最大内容绘制
        cls: 0, // 累计布局偏移（规范口径：用户输入导致的位移豁免）
        clsRaw: 0, // 全量口径：含用户输入导致的位移，排查用（点击后页面在跳用户照样感知）
        inp: 0, // interaction to next paint 简化版：交互事件 duration 的最大值（生产建议接官方 web-vitals 库）
        tbt: 0, // total blocking time：长任务超出 50ms 门槛部分之和
        longtaskCount: 0, // 长任务次数
        finalized: false,
        requestTimes: [] // 请求耗时：exceptions 模块的 fetch/XHR 拦截写入
    }

    // 统一订阅入口：buffered: true 补收 SDK 加载前已产生的 entry（否则 FCP 恒为 0，paint 常发生在 init 之前）
    function po(type, cb) {
        try {
            new win.PerformanceObserver((list) => cb(list.getEntries())).observe({ type, buffered: true })
        } catch (e) {
            /* 浏览器不支持该 entry 类型时静默跳过，不把页面搞崩 */
        }
    }

    po('paint', (entries) => {
        for (const e of entries) {
            if (e.name === 'first-paint') state.fp = Math.round(e.startTime)
            if (e.name === 'first-contentful-paint') state.fcp = Math.round(e.startTime)
        }
    })
    po('largest-contentful-paint', (entries) => {
        const last = entries[entries.length - 1]
        if (last) state.lcp = Math.round(last.startTime) // LCP 越晚越准：hidden 定稿时的最新候选就是终值
    })
    po('layout-shift', (entries) => {
        for (const e of entries) {
            state.clsRaw += e.value
            if (!e.hadRecentInput) state.cls += e.value
        }
    })
    po('longtask', (entries) => {
        for (const e of entries) {
            state.longtaskCount++
            state.tbt += Math.max(0, e.duration - 50)
        }
    })
    po('event', (entries) => {
        for (const e of entries) {
            if (e.duration > state.inp) state.inp = Math.round(e.duration)
        }
    })

    function addRequestTime(record) {
        if (state.requestTimes.length < 50) state.requestTimes.push(record)
    }

    // finalize：页面 hidden 时定稿。重复调用直接返回 null，防止流量翻倍
    function finalize() {
        if (state.finalized) return null
        state.finalized = true
        const navigation = {}
        try {
            const entry = (win.performance.getEntriesByType('navigation') || [])[0]
            if (entry) {
                navigation.ttfb = Math.round(entry.responseStart - entry.startTime) // 首字节时间
                navigation.dns = Math.round(entry.domainLookupEnd - entry.domainLookupStart) // DNS 解析
                navigation.tcp = Math.round(entry.connectEnd - entry.connectStart) // TCP 连接
                navigation.dom = Math.round(entry.domContentLoadedEventEnd - entry.startTime) // DOM Ready
                navigation.load = Math.round(entry.loadEventEnd - entry.startTime) // 页面加载完成
            }
        } catch (e) {
            /* ignore */
        }
        // 慢请求 Top5：接口排查最高频的诉求
        const slowRequests = state.requestTimes.slice().sort((a, b) => b.duration - a.duration).slice(0, 5)
        return {
            type: 'perf',
            name: 'web-vitals',
            fp: state.fp,
            fcp: state.fcp,
            lcp: state.lcp,
            cls: round3(state.cls),
            clsRaw: round3(state.clsRaw),
            inp: state.inp,
            tbt: Math.round(state.tbt),
            longtaskCount: state.longtaskCount,
            navigation,
            slowRequests
        }
    }

    return { addRequestTime, finalize }
}

function round3(n) {
    return Math.round(n * 1000) / 1000
}
