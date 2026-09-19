/**
 * 场景 E：请求层的四件常被忽略的事
 * 起一个临时服务端（可控延迟 + 请求计数），用一个自研的精简请求层实测：
 *   1) 拦截器为什么是"洋葱"：注册顺序与执行顺序的关系
 *   2) 竞态：先发的慢请求后到，把后发的快请求结果覆盖掉
 *   3) 去重：同一时刻的相同请求只该发一次
 *   4) 并发上限：20 个请求压到 4 条通道，服务端观测到的峰值
 *   5) 缓存 TTL 与 stale-while-revalidate：命中时延与后台刷新的代价
 */
import { startServer, json } from '../harness/server.mjs'
import { createPool } from '../harness/pool.mjs'
import { table, title, section, ms, sleep, num } from '../harness/table.mjs'

const DEFAULT_LATENCY = 120

function makeServer() {
    const stats = { total: 0, active: 0, peak: 0, byQuery: {} }
    async function handler(req, res) {
        const url = new URL(req.url, 'http://local')
        // 观测端点自身不计数，否则会污染读数
        if (url.pathname === '/api/stats') return json(res, { ...stats })
        if (url.pathname === '/api/stats/reset') {
            stats.total = 0
            stats.peak = 0
            stats.byQuery = {}
            return json(res, { ok: true })
        }
        const latency = Number(url.searchParams.get('ms') ?? DEFAULT_LATENCY)
        const q = url.searchParams.get('q') ?? ''
        stats.total++
        stats.active++
        stats.peak = Math.max(stats.peak, stats.active)
        stats.byQuery[q] = (stats.byQuery[q] || 0) + 1
        await sleep(latency)
        stats.active--
        return json(res, { q, latency, seq: stats.byQuery[q] })
    }
    return { handler, stats }
}

/**
 * 一个最小的请求层：拦截器（洋葱）+ 请求去重 + TTL 缓存 + stale-while-revalidate + 并发池。
 * 真实项目里这些能力都藏在 axios 封装里，这里把它们摊开成可读的几十行。
 */
function createClient(base, { limit = 4, ttl = 300, swr = false, trace = null } = {}) {
    const pool = createPool(limit)
    const inflight = new Map()
    const cache = new Map()
    const reqs = []
    const ress = []

    async function send(ctx) {
        if (trace) trace.push(`发请求 ${ctx.path}`)
        const res = await fetch(base + ctx.path)
        return { ...ctx, data: await res.json() }
    }

    /** 洋葱：最后注册的请求拦截器在最外层，最先注册的响应拦截器在最外层 */
    function buildChain(path) {
        const steps = [...reqs].reverse().concat([send]).concat(ress)
        return async () => {
            let ctx = { path }
            for (const step of steps) ctx = await step(ctx)
            return ctx
        }
    }

    function once(path) {
        const run = buildChain(path)
        return pool.run(() => run())
    }

    function shared(path, key) {
        let p = inflight.get(key)
        const reused = !!p
        if (!p) {
            p = once(path).then((ctx) => {
                cache.set(key, { value: ctx.data, at: Date.now() })
                inflight.delete(key)
                return ctx
            })
            inflight.set(key, p)
        }
        return { promise: p, reused }
    }

    async function get(path, { key = path, useCache = false, force = false } = {}) {
        if (useCache && !force) {
            const hit = cache.get(key)
            if (hit) {
                const age = Date.now() - hit.at
                if (age < ttl) return { data: hit.value, from: 'fresh', age, network: false }
                if (swr) {
                    const { promise } = shared(path, key)
                    background.push(promise)
                    return { data: hit.value, from: 'stale', age, network: false }
                }
            }
        }
        const { promise, reused } = shared(path, key)
        const ctx = await promise
        return { data: ctx.data, from: reused ? 'dedup' : 'network', age: 0, network: !reused }
    }

    const background = []
    return {
        get,
        use: (fn) => reqs.push(fn),
        after: (fn) => ress.push(fn),
        settle: () => Promise.all(background.splice(0)),
        pool,
        cache
    }
}

export default async function run() {
    const { handler, stats } = makeServer()
    const server = await startServer(handler)
    const reset = () => fetch(`${server.base}/api/stats/reset`, { method: 'POST' }).then((r) => r.json())

    // —— 1. 拦截器的洋葱模型
    console.log(title('实验设置'))
    console.log(`服务端默认延迟 ${DEFAULT_LATENCY} ms，所有数字来自本机实跑。`)

    console.log(section('一、拦截器的执行顺序'))
    const trace = []
    const c1 = createClient(server.base, { trace })
    c1.use((ctx) => {
        trace.push('请求拦截器 A：注入 token')
        return ctx
    })
    c1.use((ctx) => {
        trace.push('请求拦截器 B：加公共参数')
        return ctx
    })
    c1.use((ctx) => {
        trace.push('请求拦截器 C：埋点开始')
        return ctx
    })
    c1.after((ctx) => {
        trace.push('响应拦截器 A：解包 data')
        return ctx
    })
    c1.after((ctx) => {
        trace.push('响应拦截器 B：业务码校验')
        return ctx
    })
    c1.after((ctx) => {
        trace.push('响应拦截器 C：埋点结束')
        return ctx
    })
    await c1.get('/api/list?q=interceptor')
    console.log(trace.map((t, i) => `${i + 1}. ${t}`).join('\n'))
    console.log('\n注册顺序是 A、B、C，执行顺序是 C、B、A → 网络 → A、B、C：')
    console.log('请求拦截器后注册的先执行（新的在外层），响应拦截器先注册的先执行 ——')
    console.log('合起来正好是一个洋葱，所以"最外层"永远是最后注册的请求拦截器与最先注册的响应拦截器。')

    // —— 2. 竞态
    console.log(section('二、竞态：慢请求后到，把新结果覆盖掉'))
    const raceWrites = []
    const unguarded = await Promise.all(
        [
            ['A（用户第一次输入，服务端 200ms）', 'A', 200],
            ['B（用户改主意，服务端 50ms）', 'B', 50]
        ].map(([, q, latency], i) =>
            fetch(`${server.base}/api/list?q=${q}&ms=${latency}`)
                .then((r) => r.json())
                .then((data) => {
                    raceWrites.push({ q, order: raceWrites.length + 1, latency, data: data.q })
                    return data
                })
        )
    )
    console.log(
        table(
            ['发出的请求', '服务端耗时', '到达顺序', '无保护时对视图的写入'],
            raceWrites.map((w) => [w.q, `${w.latency} ms`, `第 ${w.order} 个`, `写入 ${w.q}`])
        )
    )
    console.log(
        `最终视图停留在「${raceWrites[raceWrites.length - 1].q}」——用户最后输入的是 B，` +
            '屏幕上却是 A。这不是时序巧合，只要网络抖动就一定复现。'
    )

    let token = 0
    const guardedWrites = []
    async function search(q, latency) {
        const mine = ++token
        const data = await fetch(`${server.base}/api/list?q=${q}&ms=${latency}`).then((r) => r.json())
        if (mine !== token) return { q, applied: false, reason: '已有更新的请求发出' }
        guardedWrites.push(q)
        return { q, applied: true, data: data.q }
    }
    const guarded = await Promise.all([search('A', 200), search('B', 50)])
    console.log(
        '\n' +
            table(
                ['请求', '是否写入视图', '原因'],
                guarded.map((g) => [g.q, g.applied ? '写入' : '丢弃', g.applied ? '它是最新的一次请求' : g.reason])
            )
    )
    console.log(`最终视图是「${guardedWrites.join('')}」。两种保护手段——`)
    console.log('① 请求序号/令牌：响应回来时比对"我是不是最新的"，不是就丢弃；')
    console.log('② AbortController：发新请求时直接 abort 掉上一条，连响应都收不到。')

    // —— 3. 去重
    console.log(section('三、去重：同一时刻的相同请求只发一次'))
    await reset()
    const c2 = createClient(server.base)
    const dupKey = '/api/list?q=dedup&ms=120'
    const results = await Promise.all(Array.from({ length: 5 }, () => c2.get(dupKey, { key: 'dedup' })))
    const afterDedup = await fetch(`${server.base}/api/stats`).then((r) => r.json())
    console.log(
        table(
            ['情形', '并发调用', '真实发出请求', '命中去重', '服务端收到'],
            [
                ['有去重（实跑）', 5, results.filter((r) => r.from === 'network').length, results.filter((r) => r.from === 'dedup').length, afterDedup.total],
                ['无去重（推演）', 5, 5, 0, 5]
            ]
        )
    )
    console.log('去重的实现就是一张 in-flight 表：key 相同就复用同一个 Promise，请求结束再删表。')
    console.log('注意它只能防"同时发生"，防不了"前后脚发生"——后者要靠缓存或业务层节流。')

    // —— 4. 并发上限
    console.log(section('四、并发上限：20 个请求压进 4 条通道'))
    const limitRows = []
    for (const limit of [1, 4]) {
        await reset()
        const client = createClient(server.base, { limit })
        const started = performance.now()
        await Promise.all(Array.from({ length: 20 }, (_, i) => client.get(`/api/list?q=limit${i}&ms=120`)))
        const elapsed = performance.now() - started
        const s = await fetch(`${server.base}/api/stats`).then((r) => r.json())
        limitRows.push([`并发上限 ${limit}`, ms(elapsed), s.peak, s.total])
    }
    console.log(table(['配置', '总耗时', '服务端观测并发峰值', '服务端收到请求数'], limitRows))
    console.log('20 × 120ms 的串行是 2400ms 量级，压到 4 条通道后变成 6 轮 ≈ 720ms；')
    console.log('峰值停在 4 而不是 20 —— 这就是"排队"与"打满"的区别。真实项目里这个数字还要考虑：')
    console.log('同域 HTTP/1.1 只有 6 条连接，超过就得排队；HTTP/2 多路复用没有连接数限制，但服务端仍有承载上限。')

    // —— 5. 缓存与 SWR
    console.log(section('五、TTL 缓存与 stale-while-revalidate'))
    await reset()
    const c3 = createClient(server.base, { ttl: 300 })
    const path3 = '/api/list?q=cache&ms=120'
    const t1 = performance.now()
    const r1 = await c3.get(path3, { key: 'cache', useCache: true })
    const d1 = performance.now() - t1
    const t2 = performance.now()
    const r2 = await c3.get(path3, { key: 'cache', useCache: true })
    const d2 = performance.now() - t2
    const s3 = await fetch(`${server.base}/api/stats`).then((r) => r.json())
    console.log(
        table(
            ['第几次取', '返回值来源', '耗时', '缓存年龄', '是否发请求'],
            [
                ['第 1 次', r1.from, `${num(d1, 1)} ms`, '—', r1.network ? '是' : '否'],
                ['第 2 次（TTL 300ms 内）', r2.from, `${num(d2, 1)} ms`, `${r2.age} ms`, r2.network ? '是' : '否']
            ]
        )
    )
    console.log(`服务端累计收到 ${s3.total} 次请求：TTL 内命中缓存，时延从 ${num(d1, 1)}ms 掉到 ${num(d2, 2)}ms，且没有走网络。`)

    await reset()
    const c4 = createClient(server.base, { limit: 4, ttl: 100, swr: true })
    const path4 = '/api/list?q=swr&ms=120'
    const t0 = performance.now()
    const f1 = await c4.get(path4, { key: 'swr', useCache: true })
    const d0 = performance.now() - t0
    await sleep(150) // 让缓存过期
    const t3 = performance.now()
    const f2 = await c4.get(path4, { key: 'swr', useCache: true })
    const d3 = performance.now() - t3
    const duringSwr = await fetch(`${server.base}/api/stats`).then((r) => r.json())
    await c4.settle()
    const afterSwr = await fetch(`${server.base}/api/stats`).then((r) => r.json())
    console.log(
        '\n' +
            table(
                ['阶段', '返回值来源', '耗时', '服务端收到的请求数'],
                [
                    ['首次', f1.from, `${num(d0, 1)} ms`, '1'],
                    ['过期后立即返回', f2.from, `${num(d3, 2)} ms`, duringSwr.total],
                    ['后台刷新完成', '—', '不阻塞调用方', afterSwr.total]
                ]
            )
    )
    console.log(`过期后那一次只用了 ${num(d3, 2)}ms 就把旧值交出去了，同时后台悄悄补了一次请求；`)
    console.log('代价是用户这次看到的是"上次的数据"，所以它适合"能容忍旧一点"的列表与详情，')
    console.log('不适合余额、库存这类一致性敏感的数据（那些应该直接走网络并且加 loading）。')

    await server.close()
    console.log(section('读法'))
    console.log('- 请求层的职责边界：只管"怎么发、怎么复用、怎么解析错误"，不含任何业务语义')
    console.log('- HTTP 状态码与业务码分开处理：前者进 catch、后者进 then，混在一起就没法统一兜底')
    console.log('- 取消信号要透传给调用方：组件卸载时 abort，否则 setState 落在已卸载的组件上')
    console.log('- 缓存一定要有失效策略：只写不删的缓存，迟早会把脏数据留在用户屏幕上')
}
