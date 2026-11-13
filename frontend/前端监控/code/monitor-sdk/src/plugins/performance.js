/** 取整辅助：耗时取整毫秒 */
const ms = n => Math.round(n)
/** 取整辅助：CLS 保留三位小数 */
const ratio = n => Math.round(n * 1000) / 1000
// 输入：navigation 类型的一条 PerformanceEntry
// 输出：导航阶段耗时（TTFB / DNS / TCP / 请求 / 响应 / DOM Ready / load）
// 过程：各阶段用相邻时间戳相减；loadEventEnd 尚未结束时给 0，等下一次回调覆盖
function computeNavigation(nav) {
    return {
        ttfb: ms(nav.responseStart - nav.startTime),
        dns: ms(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: ms(nav.connectEnd - nav.connectStart),
        request: ms(nav.responseStart - nav.requestStart),
        response: ms(nav.responseEnd - nav.responseStart),
        domReady: ms(nav.domContentLoadedEventEnd - nav.startTime),
        load: nav.loadEventEnd ? ms(nav.loadEventEnd - nav.startTime) : 0
    }
}
// 输入：插件配置（metrics 控制采集哪些指标）
// 输出：性能插件（setup 订阅六类条目，finalize 在隐藏时定稿终值）
// 过程：PerformanceObserver 逐类订阅 → 读数写进一个 state → finalize 一次性 emit 终值
export function createPerformancePlugin(options) {
    const enabled = new Set(options.metrics)
    let state = { cls: 0, inp: 0, tbt: 0, longTaskCount: 0, navigation: null, emitted: false }
    const observers = []
    /** 订阅一类条目：buffered 补收历史，不支持的指标静默跳过 */
    function observe(type, handler) {
        try {
            const observer = new PerformanceObserver(list => handler(list.getEntries()))
            // buffered: true 补收 init 之前就已经结束的条目，否则 FCP 恒为 0
            observer.observe({ type, buffered: true })
            observers.push(observer)
        } catch {
            /* 该指标在当前浏览器不支持：静默跳过，不影响其他指标 */
        }
    }
    return {
        name: 'performance',
        setup() {
            observe('paint', entries => {
                for (const entry of entries) {
                    if (entry.name === 'first-paint' && enabled.has('fp')) state.fp = ms(entry.startTime)
                    if (entry.name === 'first-contentful-paint' && enabled.has('fcp')) state.fcp = ms(entry.startTime)
                }
            })
            // LCP 会随页面变化持续产生候选，取最后一条；真正的终值要等页面隐藏
            observe('largest-contentful-paint', entries => {
                const last = entries[entries.length - 1]
                if (last && enabled.has('lcp')) state.lcp = ms(last.startTime)
            })
            // CLS 是累加量，hadRecentInput 的位移是用户主动交互，不能算布局抖动
            observe('layout-shift', entries => {
                for (const entry of entries) {
                    if (!entry.hadRecentInput) state.cls += entry.value
                }
            })
            // TBT：长任务超出 50ms 的部分累加，这是主线程被阻塞的总时长
            observe('longtask', entries => {
                for (const entry of entries) {
                    state.longTaskCount += 1
                    state.tbt += Math.max(0, entry.duration - 50)
                }
            })
            // INP 简化版：取所有交互事件里的最大耗时（严格口径需要按 interactionId 分组算 p98）
            if (enabled.has('inp')) {
                observe('event', entries => {
                    for (const entry of entries) state.inp = Math.max(state.inp, entry.duration)
                })
            }
            // 导航阶段同样走 Observer + buffered：同步的 getEntriesByType 在 init 过早时可能还拿不到条目
            if (enabled.has('navigation')) {
                observe('navigation', entries => {
                    const nav = entries[entries.length - 1]
                    if (nav) state.navigation = computeNavigation(nav)
                })
            }
            return () => {
                for (const observer of observers) observer.disconnect()
                observers.length = 0
            }
        },
        finalize(ctx) {
            if (state.emitted) return // 终值只能上报一次，hidden 与 pagehide 可能连续触发
            state.emitted = true
            ctx.emit({
                type: 'perf',
                subtype: 'vitals',
                message: '页面性能终值',
                data: {
                    fp: state.fp,
                    fcp: state.fcp,
                    lcp: state.lcp,
                    cls: ratio(state.cls),
                    inp: ms(state.inp),
                    tbt: ms(state.tbt),
                    longTaskCount: state.longTaskCount,
                    navigation: state.navigation
                }
            })
        }
    }
}
