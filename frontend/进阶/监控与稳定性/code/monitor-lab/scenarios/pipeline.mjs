/**
 * 场景 pipeline：数据管道与告警
 *   离散上报 → 秒桶聚合 → 分位值 → 阈值判警 → 收敛/恢复
 * 造 4 秒数据：前 2 秒正常、第 3 秒「事故」、第 4 秒恢复，
 * 看告警怎么被触发、怎么被静默期收敛、怎么推送恢复通知。
 * 运行：npm run pipeline
 */
import { startCollector, stopCollector, post, get, table, title, section, ms, pct, runAsMain } from '../harness.mjs'

// 固定种子的伪随机，保证每次跑出来的数字一致，便于写进文档
function rng(seed) {
    let s = seed
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
}

function makeSecond(second, { base, jitter, slowRate, errorRate, rnd, origin }) {
    const events = []
    for (let i = 0; i < 400; i++) {
        let latency = base + rnd() * jitter
        if (rnd() < slowRate) latency += 100 + rnd() * 200
        if (rnd() < slowRate / 8) latency += 500 + rnd() * 1200
        const failed = rnd() < errorRate
        events.push({
            // 时间戳必须落在「最近的滑动窗口」里，所以以当前时间为基准而不是写死常量
            ts: origin + second * 1000 + Math.floor(rnd() * 1000),
            kind: failed ? 'error' : 'request',
            ok: !failed,
            latency: Math.round(latency),
            name: 'api'
        })
    }
    return events
}

export default async function run() {
    const collector = await startCollector()
    const port = collector.port
    // 对齐到整秒，保证每一「秒」的事件正好落进同一个秒桶
    const ORIGIN = Math.floor(Date.now() / 1000) * 1000
    console.log(title(`场景 · 数据管道与告警（采集端 127.0.0.1:${port}）`))

    try {
        const rnd = rng(20260919)
        const seconds = [
            { second: 1, label: '正常', opts: { base: 45, jitter: 25, slowRate: 0.02, errorRate: 0.002 } },
            { second: 2, label: '正常', opts: { base: 46, jitter: 24, slowRate: 0.02, errorRate: 0.002 } },
            { second: 3, label: '事故', opts: { base: 180, jitter: 60, slowRate: 0.35, errorRate: 0.06 } },
            { second: 4, label: '恢复', opts: { base: 44, jitter: 22, slowRate: 0.02, errorRate: 0.002 } }
        ]

        let posted = 0
        const batchCount = []
        for (const s of seconds) {
            const events = makeSecond(s.second, { ...s.opts, rnd, origin: ORIGIN })
            // 真实 SDK 按 batchSize 攒批上报，这里同样按 50 条一批
            let batches = 0
            for (let i = 0; i < events.length; i += 50) {
                await post(port, '/collect', { events: events.slice(i, i + 50) })
                posted += Math.min(50, events.length - i)
                batches++
            }
            batchCount.push(batches)
        }

        const report = await get(port, '/api/report')
        console.log(section(`事件流：4 秒共上报 ${posted} 条（每批 50 条，共 ${posted / 50} 次 HTTP 请求）`))

        const bucketRows = report.buckets.map((b, i) => [
            `${i + 1} 秒`,
            seconds[i] ? seconds[i].label : '',
            b.count,
            b.tps,
            `${b.avg} ms`,
            `${b.p50} ms`,
            `${b.p95} ms`,
            `${b.p99} ms`,
            pct(b.errorRate, 2)
        ])
        console.log(section('秒桶聚合：每秒一个桶，桶内先计数再算分位值'))
        console.log(table(['桶', '状态', '事件数', 'TPS', 'avg', 'P50', 'P95', 'P99', '错误率'], bucketRows))

        const w = report.window
        console.log(section('滑动窗口（最近 60s）汇总'))
        console.log(
            table(
                ['样本', 'TPS', 'avg', 'P50', 'P75', 'P95', 'P99', 'max', '错误率'],
                [
                    [
                        w.samples,
                        w.tps,
                        ms(w.avg),
                        ms(w.p50),
                        ms(w.p75),
                        ms(w.p95),
                        ms(w.p99),
                        ms(w.max),
                        pct(w.errorRate, 2)
                    ]
                ]
            )
        )

        const bad = report.buckets[2]
        const ratio = bad && bad.avg ? (bad.p95 / bad.avg).toFixed(2) : '—'
        console.log(section('为什么不能只看平均值：事故那一秒 avg 看着还行，P95/P99 已经爆了'))
        console.log(
            table(
                ['指标', '事故秒的值', '说明'],
                [
                    ['avg', ms(bad.avg), '被大量快请求稀释，看不出问题'],
                    ['P95', ms(bad.p95), `是 avg 的 ${ratio} 倍——慢的那 5% 才是用户痛点`],
                    ['P99', ms(bad.p99), '最慢的 1% 样本'],
                    ['max', ms(bad.max), '单个最慢请求']
                ]
            )
        )

        console.log(section('告警流：firing 触发 / resolved 恢复'))
        console.log(
            table(
                ['发生时刻', '级别', '状态', '规则', '指标值', '阈值', '说明'],
                report.alerts.map(a => [
                    `T+${Math.floor((a.ts - ORIGIN) / 1000)}s`,
                    a.level,
                    a.state === 'firing' ? '触发' : '恢复',
                    a.id,
                    String(a.value),
                    String(a.threshold),
                    a.title
                ])
            )
        )

        const fired = report.alerts.filter(a => a.state === 'firing')
        const resolved = report.alerts.filter(a => a.state === 'resolved')
        console.log('  注：告警里的「指标值」是触发那一刻的窗口快照（事故秒只收进第一批时就算出来了），')
        console.log('     所以 p99 显示 2173ms，而事故秒整桶跑完后的 P99 是 1992ms——两者不矛盾，口径不同而已。')
        // 事故那一秒有 8 批，每批评估一次；3 条规则若无静默期会各推 8 次
        const naive = batchCount[2] * fired.length
        console.log(section('收敛效果：事故秒内评估了 8 批，静默期把重复告警压掉'))
        console.log(
            table(
                ['口径', 'firing 条数', 'resolved 条数', '说明'],
                [
                    ['有静默期（实际）', fired.length, resolved.length, '同一规则在 5000ms 内只推一次'],
                    [
                        '无静默期（假设）',
                        naive,
                        resolved.length,
                        `事故秒 ${batchCount[2]} 批次 × ${fired.length} 条规则，会各推一次`
                    ]
                ]
            )
        )
    } finally {
        stopCollector(collector)
    }
}

runAsMain(import.meta.url, run)
