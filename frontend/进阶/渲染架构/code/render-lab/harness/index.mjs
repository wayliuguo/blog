/**
 * 编排一次实验：起一个服务（SSG 顺带在这里完成「构建时渲染」）→ 依次用无头 Chrome 打开若干页面 → 收数
 * 同一份服务里跑所有对照，避免每次对照都重来一遍预热，也让 `ssg` 的缓存命中是真实的
 */
import { startServer } from './server.mjs'
import { openChrome } from './chrome.mjs'

export async function withServer(options, fn) {
    const server = await startServer(options)
    try {
        return await fn(server)
    } finally {
        await server.close()
    }
}

/** 打开一个页面并等它把指标交回来 */
export async function openPage(server, { mode, query = {}, flags = [], timeout = 30000 }) {
    const qs = new URLSearchParams(Object.entries({ mode, ...query }).map(([k, v]) => [k, String(v)])).toString()
    const wait = server.nextReport(timeout)
    const chrome = openChrome(`${server.origin}/?${qs}`, flags)
    try {
        return await wait
    } finally {
        chrome.kill()
    }
}

/** 同一套方案跑两轮，留下更干净的那一轮：无头 Chrome 每次冷启动的开销波动能有上百毫秒 */
export async function bestOf(server, options, rounds = 2) {
    const list = []
    for (let i = 0; i < rounds; i++) list.push(await openPage(server, options))
    return list.reduce((best, item) => {
        const score = (r) => r.metrics.load ?? Infinity
        return score(item) < score(best) ? item : best
    }, list[0])
}

export { startServer, openChrome }
export * from './table.mjs'
