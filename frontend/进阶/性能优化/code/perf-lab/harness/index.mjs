/**
 * 编排一次实验：起服务器 → 开无头 Chrome → 等页面回报 → 收工
 * measure() 跑单页，sweep() 跑多套对照（同一页面不同 query，实验的标准形态）
 */
import { startServer } from './server.mjs'
import { openChrome } from './chrome.mjs'
import { median } from './table.mjs'

/** 多轮结果取中位数：数值逐项取中位，数组类的（longtasks / resources）取最后一轮 */
function medianDeep(list) {
    const first = list[0]
    if (Array.isArray(first)) return list[list.length - 1]
    if (first && typeof first === 'object') {
        const out = {}
        for (const key of Object.keys(first)) out[key] = medianDeep(list.map((item) => item[key]))
        return out
    }
    if (typeof first === 'number') return median(list.map((item) => Number(item) || 0))
    return first
}

/**
 * options.server 会原样传给 startServer()：
 *   { port: 5192 } 固定端口（缓存实验要靠它命中上一次访问留下的磁盘缓存）
 *   { spaCache: true } 给 /spa/ 下的静态资源发强缓存头
 */
export async function measure(page, options = {}) {
    const { query = {}, rounds = 1, timeout = 30000, flags = [] } = options
    const srv = await startServer(options.server)
    try {
        const collected = []
        for (let round = 0; round < rounds; round++) {
            const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString()
            const wait = srv.nextReport(timeout)
            const chrome = openChrome(srv.origin + page + (qs ? `?${qs}` : ''), flags)
            try {
                collected.push(await wait)
            } finally {
                chrome.kill()
            }
        }
        return rounds === 1 ? collected[0] : medianDeep(collected)
    } finally {
        await srv.close()
    }
}

/** variants: [{ name, page?, query?, rounds?, flags? }] → [{ name, report }]，逐套串行跑 */
export async function sweep(page, variants, options = {}) {
    const out = []
    for (const variant of variants) {
        const report = await measure(variant.page || page, { ...options, ...variant })
        out.push({ name: variant.name, report })
    }
    return out
}

export { startServer, openChrome, median }
export * from './table.mjs'
