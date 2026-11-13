// 内核：装配插件、跑通事件流水线、收口生命周期。
// 它是唯一同时持有机队/通道的地方，插件只拿到 emit —— 谁都绕不过采样、节流与脱敏。
import { attachVue } from '../plugins/js-error'
import { createContext, touchSession, updatePage } from './context'
import { createEvent } from './event'
import { createQueue, persistEvents, restoreEvents } from './queue'
import { createSampler } from './sampler'
import { createScheduler } from './scheduler'
import { createThrottle } from './throttle'
import { createTransport } from './transport'
const RECENT_LIMIT = 10
// 输入：可运行配置（plugins 已装配完成）
// 输出：监控实例（report / captureError / flush / setUser / setTag / attachVue / teardown / cfg / stats）
// 过程：建零件 → 装配调度与插件 → 启动时补发离线事件 → 暴露薄 API
export function createKernel(cfg) {
    const context = createContext(cfg)
    const stats = {
        sent: 0,
        failed: 0,
        dropped: 0,
        sampled: 0,
        throttled: 0,
        flushCount: 0,
        lastFlushReason: '-',
        restored: 0
    }
    const log = (...args) => {
        if (cfg.debug) console.log('[monitor]', ...args)
    }
    const routeListeners = new Set()
    const queue = createQueue(cfg.maxQueue, dropped => {
        stats.dropped += dropped
        log(`队列溢出，丢弃最旧 ${dropped} 条`)
    })
    const sampler = createSampler(cfg)
    const throttle = createThrottle(cfg.throttle.window)
    const transport = createTransport(cfg)
    /** 最近上下文：给白屏这类"结果性事件"补上前因 */
    function recordRecent(event) {
        const bucket =
            event.type === 'error'
                ? context.recent.errors
                : event.type === 'resource'
                ? context.recent.resources
                : event.type === 'request'
                ? context.recent.requests
                : event.type === 'router'
                ? context.recent.routes
                : null
        if (!bucket) return
        bucket.push(`${event.subtype || event.type}: ${event.message || ''}`.slice(0, 160))
        if (bucket.length > RECENT_LIMIT) bucket.splice(0, bucket.length - RECENT_LIMIT)
    }
    // 输入：插件事件
    // 输出：无（入队并触发调度）
    // 过程：归一 → 记录上下文 → 采样 → 指纹节流 → beforeSend → 入队 → notify
    function emit(input) {
        try {
            const event = createEvent(input, context, cfg)
            recordRecent(event)
            if (!sampler(event.type)) {
                stats.sampled += 1
                return
            }
            if (cfg.throttle.types.includes(event.type) && !throttle(event.fingerprint)) {
                stats.throttled += 1
                return
            }
            let payload = event
            if (cfg.beforeSend) payload = cfg.beforeSend(event)
            if (!payload) {
                stats.dropped += 1
                return
            }
            queue.push(payload)
            touchSession(context.session)
            scheduler.notify()
        } catch (error) {
            log('emit 失败', error)
        }
    }
    let finalized = false
    /** 页面隐藏前让终值型插件（性能/资源耗时）把终值入队；只跑一次，先于 drain */
    function runFinalize() {
        if (finalized) return
        finalized = true
        for (const plugin of cfg.plugins) {
            try {
                plugin.finalize?.(pluginCtx)
            } catch (error) {
                log(`插件 ${plugin.name} finalize 失败`, error)
            }
        }
    }
    // 装配调度器：队列/通道/终值/持久化全部以回调注入，调度器自己不持有任何零件
    const scheduler = createScheduler({
        batchSize: cfg.batchSize,
        flushInterval: cfg.flushInterval,
        idleTimeout: cfg.idleTimeout,
        size: () => queue.size(),
        take: n => queue.take(n),
        putBack: events => queue.pushAll(events),
        send: async batch => {
            const ok = await transport.send(batch)
            if (ok) stats.sent += batch.length
            else stats.failed += 1
            return ok
        },
        finalize: runFinalize,
        persist: events => {
            if (cfg.persist) void persistEvents(events)
        },
        onFlush: (reason, count, ok) => {
            stats.flushCount += 1
            stats.lastFlushReason = reason
            log(`flush(${reason}) ${count} 条 ${ok ? '送达' : '失败'}`)
        }
    })
    // 插件工具包：emit 之外只给 setPage（广播路由）与 onRouteChange（订阅路由），不给队列和通道
    const pluginCtx = {
        cfg,
        context,
        emit,
        setPage(patch) {
            updatePage(context, patch)
            for (const listener of Array.from(routeListeners)) {
                try {
                    listener(context.page)
                } catch (error) {
                    log('route 订阅者异常', error)
                }
            }
        },
        onRouteChange(listener) {
            routeListeners.add(listener)
            return () => {
                routeListeners.delete(listener)
            }
        },
        log
    }
    const cleanups = []
    for (const plugin of cfg.plugins) {
        try {
            const cleanup = plugin.setup(pluginCtx)
            if (typeof cleanup === 'function') cleanups.push(cleanup)
        } catch (error) {
            // 单个插件挂掉不能拖垮整个 SDK
            log(`插件 ${plugin.name} 启动失败`, error)
        }
    }
    if (cfg.persist) {
        // 启动补发：上次没送出去的事件从 IndexedDB 捞回来重新入队
        void restoreEvents().then(events => {
            if (!events.length) return
            stats.restored += events.length
            queue.pushAll(events)
            log(`补发上次未送达的事件 ${events.length} 条`)
            scheduler.notify()
        })
    }
    const customPlugin = cfg.plugins.find(plugin => plugin.name === 'custom')
    const whiteScreenPlugin = cfg.plugins.find(plugin => plugin.name === 'white-screen')
    // 公开实例：一组薄方法，全部转发给内核内部件；cfg 可运行时改采样率，stats 是自观测
    return {
        cfg,
        stats,
        report(input) {
            customPlugin?.report(input)
        },
        captureError(error, tags) {
            // 业务 catch 到已知异常时用：source=manual 与全局兜底的三路区分开，便于统计"兜底率"
            const normalized =
                error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error))
            emit({
                type: 'error',
                subtype: 'manual',
                message: normalized.message,
                stack: normalized.stack,
                tags,
                data: { source: 'manual' }
            })
        },
        flush(reason = 'manual') {
            return scheduler.flush(reason)
        },
        getContext() {
            return context
        },
        getSession() {
            return context.session
        },
        setUser(id, extra) {
            context.session.userId = String(id)
            if (extra) {
                for (const [key, value] of Object.entries(extra)) cfg.tags[`user.${key}`] = String(value)
            }
            touchSession(context.session)
            log('用户身份已更新', context.session.userId)
        },
        setTag(key, value) {
            cfg.tags[key] = String(value)
        },
        attachVue(app) {
            attachVue(pluginCtx, app)
        },
        /** 手动白屏检测：走 manual 通道（免复检） */
        checkWhiteScreen() {
            return whiteScreenPlugin ? whiteScreenPlugin.check('manual') : Promise.resolve(null)
        },
        /** 逐个执行插件清理函数 → 清订阅 → 停调度 → 清队列 */
        teardown() {
            for (const cleanup of cleanups.splice(0)) {
                try {
                    cleanup()
                } catch (error) {
                    log('插件卸载失败', error)
                }
            }
            routeListeners.clear()
            scheduler.stop()
            queue.clear()
            log('已卸载')
        }
    }
}
