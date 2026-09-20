/**
 * 错误采集（零依赖）：脚本错误 / Promise 未处理 / 资源错误 / 接口错误
 * 统一产出结构化 error 事件，并给出「指纹」，供接收端做频控去重与聚合
 */

// 指纹 = 错误信息 + 出错位置 + 行号。同一条错误短时间内只应报一次，避免告警轰炸
// 资源/接口错误没有 message，必须把 src / url 算进指纹，否则「所有资源错误」会塌成同一条
export function fingerprintOf(e) {
    const where = e.filename || e.src || e.url || '-'
    return `${e.message || e.kind}@${where}:${e.lineno || 0}`
}

export function installErrorCapture(options = {}) {
    const win = options.win || (typeof window !== 'undefined' ? window : globalThis)
    const emit = options.emit || (() => {})
    const captured = []
    const seen = new Map() // 指纹 -> 上次上报时间，用于频控
    const throttleMs = options.throttleMs ?? 0

    function push(err) {
        const ev = { type: 'error', ts: Date.now(), ...err }
        ev.fp = fingerprintOf(ev)
        captured.push(ev)

        const last = seen.get(ev.fp)
        if (throttleMs && last && ev.ts - last < throttleMs) {
            ev.throttled = true
            return ev
        }
        seen.set(ev.fp, ev.ts)
        emit(ev)
        return ev
    }

    // 坑：资源错误不冒泡，必须在捕获阶段监听；此时 event 上没有 message，只有 target
    function onError(ev) {
        const target = ev.target
        if (target && target !== win && target.tagName) {
            return push({ kind: 'resource', tag: String(target.tagName).toLowerCase(), src: target.src || target.href })
        }
        if (typeof ev.message === 'string' && ev.message !== 'Script error.') {
            return push({
                kind: 'script',
                message: ev.message,
                filename: ev.filename,
                lineno: ev.lineno,
                colno: ev.colno,
                stack: ev.error && ev.error.stack
            })
        }
        // 跨域脚本未带 crossorigin，浏览器只给一句 "Script error."，细节全被抹掉
        return push({
            kind: 'cross-origin',
            message: ev.message || 'Script error.',
            filename: ev.filename,
            lineno: ev.lineno
        })
    }

    function onRejection(ev) {
        const r = ev.reason
        return push({ kind: 'promise', message: (r && r.message) || String(r), stack: r && r.stack })
    }

    // 接口错误：包裹 fetch，业务代码无感
    function wrapFetch(original) {
        return async function patched(input, init) {
            const started = Date.now()
            try {
                const res = await original.call(this, input, init)
                if (!res.ok)
                    push({ kind: 'http', url: String(input), status: res.status, duration: Date.now() - started })
                return res
            } catch (err) {
                push({
                    kind: 'network',
                    url: String(input),
                    message: err && err.message,
                    duration: Date.now() - started
                })
                throw err
            }
        }
    }

    win.addEventListener('error', onError, true)
    win.addEventListener('unhandledrejection', onRejection)

    function patchFetch() {
        if (typeof win.fetch === 'function' && !win.fetch.__monitored) {
            const patched = wrapFetch(win.fetch)
            patched.__monitored = true
            win.fetch = patched
        }
    }

    return {
        captured,
        push,
        patchFetch,
        uninstall() {
            win.removeEventListener('error', onError, true)
            win.removeEventListener('unhandledrejection', onRejection)
        }
    }
}
