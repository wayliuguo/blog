// 配置收敛：所有默认值与默认插件装配顺序都在这里。
// init() 只做一件事：把用户配置翻译成一份"可运行配置"，内核与插件只认它。
import { createBehaviorPlugin } from './plugins/behavior'
import { createCustomPlugin } from './plugins/custom'
import { createJsErrorPlugin } from './plugins/js-error'
import { createPerformancePlugin } from './plugins/performance'
import { createRequestPlugin } from './plugins/request'
import { createResourcePlugin } from './plugins/resource'
import { createRouterPlugin } from './plugins/router'
import { createWhiteScreenPlugin } from './plugins/whitescreen'

export const defaultConfig = {
    endpoint: '',
    release: '',
    env: 'production',
    debug: false,
    tags: {},
    // 队列与调度
    maxQueue: 200,
    batchSize: 10,
    flushInterval: 10000,
    idleTimeout: 3000,
    maxRetry: 3,
    persist: true,
    // 节流：时间窗内同指纹只放行第一条；只对 error 类生效（行为是低频主动触发，性能本身就在聚合）
    throttle: { window: 1000, types: ['error'] },
    // 采样：按类型定比例，1 = 全量
    sampleRates: {
        perf: 1,
        error: 1,
        resource: 1,
        request: 1,
        router: 1,
        behavior: 1,
        'white-screen': 1,
        custom: 1
    },
    // 插件装配：disabledPlugins 按名字裁剪；plugins 传入自定义插件，同名覆盖默认实现
    disabledPlugins: [],
    plugins: [],
    // 各插件默认参数
    performance: { metrics: ['fp', 'fcp', 'lcp', 'inp', 'navigation'] },
    request: { slowThreshold: 1000, reportSlow: true },
    behavior: {
        clickSelectors: 'a, button, [data-track], input, textarea, select, [role="button"]',
        exposeAttribute: 'data-expose',
        breadcrumbSize: 20,
        scrollDepth: 0.9
    },
    whitescreen: {
        containerSelectors: ['#app', '#root', 'body', 'html'],
        pointsPerLine: 9,
        // 0.9 而不是 0.7：移动端页面"内容不满一屏"是常态（视口下半区全是留白，实测可到 73%），
        // 0.7 会把稀疏正常页误判成白屏；真白屏与骨架屏伪装的空白占比都接近 100%，0.9 不损失检出能力
        blankRatio: 0.9,
        initialDelay: 1000,
        recheckDelay: 2000,
        safeAttribute: 'data-blank-safe',
        onRouteChange: true
    }
}

// 输入：用户配置（每个字段都可选）
// 输出：可运行配置（字段齐全，plugins 已装配完成）
// 过程：各配置段浅合并（用户只写要改的字段）→ 装配默认插件 → 自定义插件按名覆盖 → 按 disabledPlugins 裁剪
export function resolveConfig(config) {
    const merged = {
        ...defaultConfig,
        ...config,
        tags: { ...defaultConfig.tags, ...(config.tags || {}) },
        throttle: { ...defaultConfig.throttle, ...(config.throttle || {}) },
        sampleRates: { ...defaultConfig.sampleRates, ...(config.sampleRates || {}) },
        performance: { ...defaultConfig.performance, ...(config.performance || {}) },
        request: { ...defaultConfig.request, ...(config.request || {}) },
        behavior: { ...defaultConfig.behavior, ...(config.behavior || {}) },
        whitescreen: { ...defaultConfig.whitescreen, ...(config.whitescreen || {}) }
    }

    // 装配顺序就是依赖顺序：router 必须先补丁 history（赶在框架路由创建之前），request 最后包 fetch/XHR
    const defaults = [
        createRouterPlugin(),
        createPerformancePlugin(merged.performance),
        createJsErrorPlugin(),
        createResourcePlugin(),
        createRequestPlugin(merged.request),
        createBehaviorPlugin(merged.behavior),
        createWhiteScreenPlugin(merged.whitescreen),
        createCustomPlugin()
    ]
    const custom = config.plugins || []
    const overridden = new Set(custom.map(plugin => plugin.name))
    const disabled = new Set(merged.disabledPlugins)
    merged.plugins = defaults
        .filter(plugin => !overridden.has(plugin.name))
        .concat(custom)
        .filter(plugin => !disabled.has(plugin.name))
    return merged
}
