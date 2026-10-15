/**
 * 开发态彩色日志（纯浏览器，零依赖）
 * 职责：不改变 SDK 行为，只把「采」与「送」两个环节可视化——
 *   每条事件入队（enqueue）打一行「采集」、每批发送（flush）打一行「发送」。
 * 触发：init({ debug:true }) 显式开启；否则跟随 Vite 开发态 import.meta.env.DEV。
 * 用途：验证交给读者自己用 DevTools Console 看，这里负责把「到底采没采、发没发」说清楚。
 */

// 按事件类别取一段简短可读描述，方便在 console 里一眼认出
function describe(event) {
    if (!event) return '?'
    switch (event.type) {
        case 'error':
            return `${event.kind}\t${event.message || event.src || ''}${event.throttled ? '\t(频控跳过)' : ''}`
        case 'perf':
            return `perf\tLCP=${event.lcp || 0} CLS=${event.cls || 0} TBT=${event.tbt || 0}`
        case 'track':
            return `${event.name}\t${describePayload(event)}`
        default:
            return event.kind || event.name || event.type || 'event'
    }
}

function describePayload(event) {
    const { type, name, ts, appId, sessionId, anonId, ...rest } = event
    const pick = {}
    if ('id' in rest) pick.id = rest.id
    if ('url' in rest) pick.url = rest.url
    if ('keyword' in rest) pick.keyword = rest.keyword
    if ('stay' in rest) pick.stay = rest.stay
    if ('status' in rest) pick.status = rest.status
    const s = Object.entries(pick)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
    return rest.text || s || ''
}

// 事件类别的主题色：错误偏红、性能偏紫、埋点偏青
function colorOf(event) {
    if (!event) return '#64748b'
    if (event.type === 'error') return '#ef4444'
    if (event.type === 'perf') return '#a855f7'
    if (event.type === 'track') return '#06b6d4'
    return '#64748b'
}

export function createDevLogger(transport) {
    // 标记已包装，避免 init 后再次包装导致重复日志
    if (transport.__devLogger) return transport
    transport.__devLogger = true

    const line = (kind, justify, txt, color = '#334155') =>
        console.log(
            `%c[monitor]%c ${kind}${' '.repeat(Math.max(0, justify - kind.length))} ${txt}`,
            'color:#64748b',
            `color:${color};`
        )

    // 包一层 enqueue：入队成功打印「采集」，被采样跳过的打印「采样」
    const enqueue = transport.enqueue.bind(transport)
    transport.enqueue = function (event) {
        const ok = enqueue(event)
        if (ok) line('采集', 4, describe(event), colorOf(event))
        else line('采样', 4, `${describe(event)}　未入队（sampleRate 采样跳过）`, '#f59e0b')
        return ok
    }

    // 包一层 flush：打印本批条数、是否送达、发起原因
    const flush = transport.flush.bind(transport)
    transport.flush = async function (reason = 'manual') {
        const pending = this.pending().length
        const res = await flush(reason)
        const mark = res.ok ? `✓` : `✗`
        const color = res.ok ? '#16a34a' : '#dc2626'
        line(
            '发送',
            4,
            `${res.batch} 条 ${mark}（原因 ${res.reason}${!res.ok ? `，尝试 ${res.attempt + 1} 次后放弃` : ''}，余 ${
                pending - res.batch
            } 条在列）`,
            color
        )
        return res
    }

    return transport
}
