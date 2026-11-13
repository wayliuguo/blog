/** 归一任何错误源：Error / 字符串 / 其余对象，统一成 { message, stack } */
function normalize(value) {
    if (value instanceof Error) return { message: value.message || value.name, stack: value.stack }
    if (typeof value === 'string') return { message: value }
    try {
        return { message: JSON.stringify(value) }
    } catch {
        return { message: String(value) }
    }
}
// 输入：无配置
// 输出：JS 异常插件（window error 捕获 + unhandledrejection 兜底）
// 过程：资源错误在 error 监听里分流给 resource 插件，脚本错误归一后 emit；清理函数撤销两个监听
export function createJsErrorPlugin() {
    return {
        name: 'js-error',
        setup(ctx) {
            // 输入：一个 error 事件
            // 输出：脚本错误事件（资源错误直接返回，交给 resource 插件，避免同一错误报两次）
            // 过程：判 target.tagName 分流 → 归一 Error 对象 → emit
            const onError = event => {
                try {
                    const target = event.target
                    if (target && target.tagName) return
                    const normalized = normalize(event.error)
                    ctx.emit({
                        type: 'error',
                        subtype: 'js',
                        message: event.message || normalized.message || 'Script error.',
                        stack: normalized.stack,
                        data: {
                            source: 'js',
                            filename: event.filename,
                            lineno: event.lineno,
                            colno: event.colno
                        }
                    })
                } catch {
                    /* 静默 */
                }
            }
            // 资源错误不冒泡，所以这里必须用捕获阶段；脚本错误两阶段都能收到，用捕获统一处理
            window.addEventListener('error', onError, true)
            const onRejection = event => {
                try {
                    const normalized = normalize(event.reason) // reason 可能是字符串、对象、undefined
                    ctx.emit({
                        type: 'error',
                        subtype: 'promise',
                        message: normalized.message,
                        stack: normalized.stack,
                        data: { source: 'promise' }
                    })
                } catch {
                    /* 静默 */
                }
            }
            window.addEventListener('unhandledrejection', onRejection)
            return () => {
                window.removeEventListener('error', onError, true)
                window.removeEventListener('unhandledrejection', onRejection)
            }
        }
    }
}
/**
 * 框架适配口：Vue 的组件内错误不会冒泡到 window，只能挂 errorHandler。
 * 放在插件里是因为它同样是"错误采集源"，只是触发者从浏览器换成了框架。
 */
export function attachVue(ctx, app) {
    if (!app || !app.config) return
    const previous = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
        try {
            previous?.(err, instance, info) // 业务原有处理器优先保留，SDK 是补充不是替代
        } catch {
            /* 业务 handler 自己出错不能影响上报 */
        }
        try {
            const normalized = normalize(err)
            const component = instance?.$options?.name || ''
            ctx.emit({
                type: 'error',
                subtype: 'vue',
                message: normalized.message,
                stack: normalized.stack,
                data: { source: 'vue', component, info: String(info) }
            })
        } catch {
            /* 静默 */
        }
    }
}
