/**
 * Monitor SDK 入口（零依赖）：单例 + 插件化组装
 * 分工：插件只负责「采」（errors / perf / track），传输层只负责「送」（transport）
 * 好处：加一类采集 = 加一个插件，不用碰传输与生命周期
 */
import { createTransport } from './transport.mjs'
import { installErrorCapture } from './errors.mjs'
import { createPerfCollector, ratePerf } from './perf.mjs'
import { createTracker } from './track.mjs'

export const DEFAULTS = {
    appId: 'default',
    url: '/collect',
    sampleRate: 1,
    throttleMs: 3000, // 同一条错误 3 秒内只报一次
    autoErrors: true,
    autoPerf: true,
    autoTrack: true
}

let instance = null

export function init(options = {}) {
    // 单例：业务里可能多处 init，重复初始化只会重复绑监听、重复上报
    if (instance) return instance
    const cfg = { ...DEFAULTS, ...options }
    const win = cfg.win || (typeof window !== 'undefined' ? window : globalThis)

    const transport = createTransport({ url: cfg.url, sampleRate: cfg.sampleRate, env: win, ...(cfg.transport || {}) })
    const emit = event => transport.enqueue({ appId: cfg.appId, ts: event.ts ?? Date.now(), ...event })

    const errors = cfg.autoErrors ? installErrorCapture({ win, emit, throttleMs: cfg.throttleMs }) : null
    const perf = cfg.autoPerf ? createPerfCollector({ win }) : null
    const track = cfg.autoTrack ? createTracker({ win, emit }) : null
    const plugins = []

    // 生命周期收口：LCP / CLS 这类指标只有在页面离开时才定稿
    function flushAll(reason = 'lifecycle') {
        if (perf) {
            const metrics = perf.finalize()
            emit({ type: 'perf', kind: 'perf', ...metrics, rate: ratePerf(metrics) })
        }
        if (track) track.pageLeave()
        return transport.flush(reason)
    }

    if (win.document && typeof win.addEventListener === 'function') {
        if (errors) errors.patchFetch()
        if (perf) perf.observeAll()
        win.addEventListener('visibilitychange', () => {
            if (win.document.visibilityState === 'hidden') flushAll('hidden')
        })
    }

    function use(plugin) {
        plugins.push(plugin)
        if (plugin && typeof plugin.install === 'function') plugin.install({ track, emit, transport, win, flushAll })
        return instance
    }

    instance = { config: cfg, transport, errors, perf, track, emit, use, flushAll, plugins }
    return instance
}

export function getInstance() {
    return instance
}
export function reset() {
    instance = null
} // 供单测/多轮演示重置单例
