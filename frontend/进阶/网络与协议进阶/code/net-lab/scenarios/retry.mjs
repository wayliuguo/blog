/**
 * 场景：弱网下的重试——重试什么、退避多久、什么情况下重试是错的
 * 运行：npm run retry
 *
 * 四件事：
 *   1. 同一组失败请求，四种策略的尝试次数与总耗时
 *   2. 超时与取消：不设超时的「等」和设了超时的「断」
 *   3. 重试风暴：固定间隔 vs 退避 + 抖动，重试时刻会不会挤在同一刻
 *   4. 幂等：服务端已处理但回包失败时，重试会不会多下一单
 */
import { startHttp1, table, title, section, ms, sleep } from '../harness/index.mjs'

/** 重试策略：attempt 返回 true 表示成功 */
const STRATEGIES = [
    {
        name: '不重试',
        max: 1,
        backoff: () => 0
    },
    {
        name: '固定间隔 200ms',
        max: 4,
        backoff: () => 200
    },
    {
        name: '指数退避 100ms×2ⁿ',
        max: 4,
        backoff: n => 100 * 2 ** n
    },
    {
        name: '指数退避 + 抖动',
        max: 4,
        backoff: n => 100 * 2 ** n * (0.5 + Math.random())
    }
]

async function runStrategy(base, strategy, key) {
    const waits = []
    const started = performance.now()
    for (let n = 0; n < strategy.max; n++) {
        const res = await fetch(`${base}/api/flaky?key=${key}&fail=2`)
        if (res.ok) return { ok: true, attempts: n + 1, waits, total: performance.now() - started }
        if (n === strategy.max - 1) break
        const wait = strategy.backoff(n)
        waits.push(Math.round(wait))
        await sleep(wait)
    }
    return { ok: false, attempts: strategy.max, waits, total: performance.now() - started }
}

/** 20 个客户端同时按同一策略重试，看重试时刻的分布 */
async function storm(base, { jitter, clients = 20, rounds = 3 }) {
    const t0 = performance.now()
    const stamps = []
    await Promise.all(
        Array.from({ length: clients }, (_, i) =>
            (async () => {
                let delay = 100
                for (let n = 0; n < rounds; n++) {
                    await fetch(`${base}/api/flaky?key=storm-${i}-${Date.now()}-${n}&fail=99`)
                    const wait = jitter ? delay * (0.5 + Math.random()) : delay
                    stamps.push(performance.now() - t0 + wait)
                    await sleep(wait)
                    delay *= 2
                }
            })()
        )
    )
    // 按 50ms 分桶，最大的桶 = 最拥挤那一刻里挤在一起的重试数
    const buckets = new Map()
    for (const s of stamps) {
        const b = Math.floor(s / 50)
        buckets.set(b, (buckets.get(b) || 0) + 1)
    }
    return { maxBucket: Math.max(...buckets.values()), total: stamps.length, buckets: buckets.size }
}

export default async function run() {
    const h1 = await startHttp1()
    const base = `http://127.0.0.1:${h1.port}`
    const reset = () => fetch(base + '/api/reset').then(r => r.text())

    try {
        await reset()
        const rows = []
        for (const [i, s] of STRATEGIES.entries()) {
            rows.push([s.name, await runStrategy(base, s, 'strategy-' + i)])
        }
        console.log(title('前两次必失败（503 + Retry-After）、之后成功，四种策略对照'))
        console.log(
            table(
                ['策略', '尝试次数', '各次等待', '总耗时', '结果'],
                rows.map(([name, r]) => [
                    name,
                    r.attempts,
                    r.waits.length ? r.waits.join(' / ') + ' ms' : '—',
                    ms(r.total),
                    r.ok ? '成功' : '放弃'
                ])
            )
        )
        console.log(section('读法'))
        console.log('- 「不重试」直接失败：偶发 5xx 对用户就是一次可见的错误')
        console.log('- 固定间隔最快拿到结果，但所有客户端会同时醒来（见下面第三条）')
        console.log('- 指数退避把压力往后摊，代价是总耗时变长；抖动让同一批客户端错开')
        console.log('- 服务端每次 503 都带了 Retry-After: 1（秒），上面四种策略一个都没采纳它')
        console.log('  忽略 Retry-After 是很多自研重试的常见毛病：客户端比服务端更着急，只会把故障拖长')

        // —— 超时与取消
        const timeoutRows = []
        for (const [name, limit] of [
            ['不设超时', null],
            ['80ms 超时', 80]
        ]) {
            const started = performance.now()
            let outcome
            try {
                const res = await fetch(`${base}/api/slow?ms=200`, limit ? { signal: AbortSignal.timeout(limit) } : {})
                await res.text()
                outcome = '完成 ' + res.status
            } catch (err) {
                outcome = err.name
            }
            timeoutRows.push([name, limit ? limit + ' ms' : '∞', outcome, ms(performance.now() - started)])
        }
        console.log(title('同一个 200ms 的后端，设不设超时'))
        console.log(table(['客户端设置', '限定等待', '结果', '实际耗时'], timeoutRows))
        console.log(section('取消只发生在客户端'))
        console.log('- `AbortSignal.timeout(ms)` 到期抛 TimeoutError，请求从客户端视角结束，但服务端该算还是算完了')
        console.log('- 所以「前端超时了」不等于「服务端没执行」，写操作必须靠幂等键兜底，不能靠超时')

        // —— 重试风暴
        const stormRows = []
        for (const jitter of [false, true]) {
            const r = await storm(base, { jitter })
            stormRows.push([jitter ? '退避 + 抖动' : '固定间隔（无抖动）', r.total, r.maxBucket, r.buckets])
        }
        console.log(title('20 个客户端 × 3 轮重试，按 50ms 分桶看重试时刻是否撞车'))
        console.log(
            table(
                ['重试方式', '样本数', '最拥挤窗口内的重试数', '不同时间窗口数'],
                stormRows.map(([name, total, max, buckets]) => [name, total, max, buckets])
            )
        )
        console.log(section('没有抖动的重试会把故障放大'))
        console.log('- 服务端刚恢复的一瞬间，所有客户端同时回来，等于给自己补了一次流量洪峰')
        console.log('- 抖动（jitter）不是为了看起来随机，而是把重试摊开；配合熔断与限流才完整')

        // —— 幂等
        const idemRows = []
        for (const withKey of [false, true]) {
            await reset()
            const key = 'K-' + Date.now()
            const seen = []
            let total = null
            for (let n = 0; n < 2; n++) {
                try {
                    const res = await fetch(`${base}/api/flaky-order?key=idem-${withKey}&fail=1`, {
                        method: 'POST',
                        headers: withKey ? { 'Idempotency-Key': key } : {},
                        body: JSON.stringify({ sku: 'A1', qty: 1 })
                    })
                    const data = await res.json()
                    seen.push(data.orderId)
                    total = data.total
                } catch {
                    seen.push('连接断开（结果未知）')
                }
            }
            idemRows.push([withKey ? '带 Idempotency-Key' : '不带幂等键', seen.join(' → '), total])
        }
        console.log(title('服务端「已落库但回包失败」，客户端重试一次'))
        console.log(table(['客户端', '两次请求的结果', '服务端最终订单数'], idemRows))
        console.log(section('结论'))
        console.log('- 不带幂等键：重试就是重复下单（这里的订单数就是证据）')
        console.log('- 带幂等键：第二次命中同一键，服务端把上次的结果回放，订单数不变')
        console.log('- 只对「安全的」操作做自动重试：GET/PUT/DELETE 与带幂等键的 POST；普通 POST 不能无脑重试')
    } finally {
        h1.close()
    }
}
