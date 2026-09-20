/**
 * 场景：性能预算卡口——给每个页面定一条线，超了就 fail 退出
 * 这就是 CI 里卡住劣化的做法，退出码非 0 时流水线直接红
 * 运行：npm run budget
 */
import { sweep, title, section, table, ms, bytes, num } from '../harness/index.mjs'

/** 预算：每个页面的上限。改这里就等于改卡口标准 */
const BUDGET = {
    ttfb: 900,
    fcp: 1500,
    lcp: 2500,
    clsRaw: 0.1,
    jsBytes: 300 * 1024,
    longtasks: 2
}

export default async function run() {
    const rows = await sweep('/metrics.html', [
        { name: '轻量首屏', query: { mode: 'light' }, rounds: 3 },
        { name: '未治理首屏', query: { mode: 'heavy' }, rounds: 3 }
    ])

    const results = []
    for (const { name, report } of rows) {
        const m = report.metrics
        const js = report.resources.filter(r => r.type === 'script').reduce((sum, r) => sum + r.size, 0)
        const items = [
            ['TTFB', m.ttfb, BUDGET.ttfb, ms],
            ['FCP', m.fcp, BUDGET.fcp, ms],
            ['LCP', m.lcp, BUDGET.lcp, ms],
            ['CLS（全量位移）', m.clsRaw, BUDGET.clsRaw, v => num(v, 3)],
            ['JS 字节', js, BUDGET.jsBytes, bytes],
            ['长任务数', report.longtasks.length, BUDGET.longtasks, String]
        ]
        results.push({ name, items })
    }

    console.log(title('性能预算卡口（3 轮中位数，超线即 FAIL）'))
    for (const { name, items } of results) {
        console.log(section(name))
        console.log(
            table(
                ['指标', '实测', '预算', '结论'],
                items.map(([label, value, limit, fmt]) => [
                    label,
                    fmt(value),
                    fmt(limit),
                    value <= limit ? 'PASS' : 'FAIL'
                ])
            )
        )
    }

    const all = results.flatMap(r => r.items.map(([label, value, limit]) => ({ page: r.name, label, value, limit })))
    const failed = all.filter(i => i.value > i.limit)

    console.log(section('汇总'))
    console.log(`${all.length - failed.length} / ${all.length} 项在预算内，${failed.length} 项超线。`)
    for (const f of failed) console.log(`  FAIL  ${f.page} · ${f.label}：实测 ${f.value} > 预算 ${f.limit}`)

    if (failed.length) {
        console.log('\n退出码 1 —— 在 CI 里这一步会让流水线失败，PR 不允许合并。')
        process.exitCode = 1
    } else {
        console.log('\n全部通过，退出码 0。')
    }

    console.log(section('预算该怎么定'))
    console.log('- 起点不是「理想值」而是「当前值」：先把现状当基线，再定一个「不许更差」的线，然后逐步收紧')
    console.log('- 分级：首屏路由严（如 LCP ≤2.5s），次要页面松；体积按路由单独设上限，而不是全站一个数')
    console.log('- 只卡「用户能感觉到」的指标：LCP / INP / CLS / 首屏 JS 体积，别把「总分」当卡口')
}
