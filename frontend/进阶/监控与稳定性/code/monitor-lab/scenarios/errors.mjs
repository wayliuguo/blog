/**
 * 场景 errors：错误监控
 *   1. 真实浏览器里跑 6 类错误，看 SDK 捕获后的结构化字段（headless Chrome 实跑）
 *   2. Node 里注入一个假 window，验证「指纹 + 频控」：同一条错误 3 次只出端 1 次
 * 运行：npm run errors
 */
import { installErrorCapture } from '../sdk/errors.mjs'
import {
    startCollector,
    stopCollector,
    openChrome,
    closeChrome,
    waitFor,
    table,
    title,
    section,
    runAsMain
} from '../harness.mjs'

// 极简的假 window：只实现 SDK 用到的那几个方法，用来在 Node 里复现事件语义
function fakeWindow() {
    const listeners = {}
    return {
        addEventListener(type, fn) {
            ;(listeners[type] ||= []).push(fn)
        },
        removeEventListener() {},
        dispatch(type, ev) {
            ;(listeners[type] || []).forEach(fn => fn(ev))
        },
        // 资源错误的事件对象：没有 message，只有 target.tagName
        fileError() {
            this.dispatch('error', { target: { tagName: 'IMG', src: '/a.png' } })
        },
        // 脚本错误的事件对象：target 就是 window（与资源错误区分开的关键）
        scriptError(message, lineno) {
            this.dispatch('error', {
                message,
                filename: 'app.js',
                lineno,
                colno: 5,
                target: this,
                error: new Error(message)
            })
        },
        rejection(reason) {
            this.dispatch('unhandledrejection', { reason })
        }
    }
}

export default async function run() {
    /* ---------- 1. 真实浏览器 ---------- */
    const collector = await startCollector()
    const chrome = openChrome(`http://127.0.0.1:${collector.port}/errors-lab.html`)
    console.log(title('场景 · 错误监控（headless Chrome 实跑）'))

    try {
        const data = await waitFor(collector.port, d => d.events.some(e => e.kind === 'lab-done'), { timeout: 25000 })
        const errs = data.events.filter(e => e.type === 'error')
        const fatalField = (e, keys) => keys.map(k => (e[k] === undefined ? '—' : String(e[k]))).join(' / ')

        console.log(section(`真实浏览器捕获到 ${errs.length} 条错误事件，逐条看关键字段`))
        console.log(
            table(
                ['捕获方式', 'kind', '关键字段', '指纹'],
                errs.map(e => [
                    e.kind === 'resource' ? 'error(capture)' : e.kind === 'promise' ? 'unhandledrejection' : 'error',
                    e.kind,
                    e.kind === 'resource'
                        ? fatalField(e, ['tag', 'src'])
                        : e.kind === 'http'
                        ? fatalField(e, ['url', 'status'])
                        : e.kind === 'network'
                        ? fatalField(e, ['url', 'message'])
                        : fatalField(e, ['message', 'filename', 'lineno']),
                    e.fp
                ])
            )
        )

        const perfEvent = data.events.find(e => e.kind === 'perf')
        const stayEvent = data.events.find(e => e.name === 'stay')
        console.log(section('同一个 SDK 顺带采到的其他事件（一次 flushAll 一起出端）'))
        console.log(
            table(
                ['事件', '关键字段'],
                [
                    [
                        'perf',
                        perfEvent
                            ? `fcp=${perfEvent.fcp}ms lcp=${perfEvent.lcp}ms cls=${perfEvent.cls} ttfb=${perfEvent.ttfb}ms`
                            : '—'
                    ],
                    ['track/stay', stayEvent ? `stay=${stayEvent.stay}ms` : '—']
                ]
            )
        )
    } finally {
        closeChrome(chrome)
        stopCollector(collector)
    }

    /* ---------- 2. 指纹与频控 ---------- */
    const win = fakeWindow()
    const out = []
    const cap = installErrorCapture({ win, emit: e => out.push(e), throttleMs: 5000 })

    win.fileError()
    win.scriptError('Cannot read properties of undefined', 12)
    win.scriptError('Cannot read properties of undefined', 12)
    win.scriptError('Cannot read properties of undefined', 12)
    win.scriptError('其他错误', 99)
    win.rejection(new Error('接口数据解析失败'))

    console.log(section('指纹与频控：同一条错误连触发 3 次，只有第一次出端'))
    console.log(
        table(
            ['轨迹', 'kind', '指纹', '是否出端'],
            cap.captured.map((e, i) => [`#${i + 1}`, e.kind, e.fp, e.throttled ? '被频控拦下' : '已上报'])
        )
    )
    console.log(
        table(
            ['指标', '数值'],
            [
                ['捕获条数', cap.captured.length],
                ['实际上报条数', out.length],
                ['频控拦截', cap.captured.filter(e => e.throttled).length]
            ]
        )
    )
}

runAsMain(import.meta.url, run)
