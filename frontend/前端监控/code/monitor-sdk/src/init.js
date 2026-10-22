// 初始化：默认配置、单例、装配采集模块、暴露实例
// 模块与能力一一对应：exceptions（异常）/ performance（性能）/ declarative（声明上报）/ report（上报）
// 手动上报不经过装配：公共 report() 直接落在 report 模块，业务侧在其上做区分类型的二次封装
import { installExceptions } from './exceptions.js'
import { initPerformance } from './performance.js'
import { initDeclarative } from './declarative.js'
import { initReporter } from './report.js'

export const SDK_VERSION = '3.0.0'

const DEFAULTS = {
    endpoint: '', // 上报地址：一个 URL 描述事件发到哪
    eventPrefix: '', // 声明式事件名的平台前缀：平台.页面.行为
    commonParams: {}, // 公参：init 时静态传入，之后每条事件自动附带
    release: 'unknown',
    environment: 'development',
    sampleRate: 1, // 错误/业务事件采样率（0~1）
    tracesSampleRate: 1, // 性能事件采样率：与错误分开配置
    batchSize: 5, // 批量上报：队列满 N 条立即发送
    flushInterval: 3000, // 批量上报：最长等 3s 定时发送
    maxRetry: 2, // 发送失败最多重试次数
    maxQueue: 100, // 队列上限，溢出丢最旧
    debug: false
}

let instance = null

export function init(options = {}) {
    // 单例：多个团队各写一句 init()，同一批错误会重复上报 N 遍
    if (instance) return instance
    const cfg = { ...DEFAULTS, ...options }
    const win = window
    if (!cfg.endpoint) {
        win.console.warn('[monitor-sdk] 缺少 endpoint（上报地址），SDK 未启动')
        return null
    }
    if (cfg.debug) win.console.log('[monitor-sdk] init →', cfg.endpoint)

    // SDK 自观测：sent/retried/dropped 看送达，throttled 看节流丢弃量
    const stats = { sent: 0, retried: 0, dropped: 0, throttled: 0 }

    // 上报先创建（内部要拿原生 fetch），再装配采集模块——顺序反了 SDK 自己的上报会被请求拦截采集
    const reporter = initReporter(cfg, win, stats)

    // 性能：订阅 Web Vitals 与导航明细，请求耗时由异常模块的请求拦截写入
    const perf = initPerformance(win)

    // 异常：window error / unhandledrejection / fetch+XHR 请求拦截（接口与网络错误）
    const exceptions = installExceptions(win, {
        send: reporter.send,
        onRequestTime: perf.addRequestTime
    })

    // 声明上报：data-track 点击委托 / data-expose 曝光
    initDeclarative(cfg, win, reporter.send)

    // 生命周期收口唯一入口：先定稿性能终值入队，再发送队列（顺序反了指标就丢了）
    if (win.document && typeof win.document.addEventListener === 'function') {
        win.document.addEventListener('visibilitychange', () => {
            if (win.document.visibilityState === 'hidden') {
                const metrics = perf.finalize() // LCP/CLS 越晚越准，hidden 才是终值
                if (metrics) reporter.send(metrics)
                reporter.flush('hidden')
            }
        })
    }

    instance = {
        cfg, // 运行时可改（demo 实验室的采样率滑块）
        stats,
        attachVue: exceptions.attachVue, // Vue 工程在 app 创建后调用：errorHandler 归一
        flush: reporter.flush
    }
    return instance
}

export function getCurrentInstance() {
    return instance
}
