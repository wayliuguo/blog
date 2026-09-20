/**
 * 场景：同一个页面模板，一轻一重，对比同一套代码读出来的指标
 * 运行：npm run metrics
 */
import { sweep, title, section, table, ms, num, bytes } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/metrics.html', [
        { name: '轻量首屏', query: { mode: 'light' }, rounds: 3 },
        { name: '未治理首屏', query: { mode: 'heavy' }, rounds: 3 }
    ])

    console.log(title('指标采集：同一套采集代码，两种页面的实测值（3 轮中位数）'))
    console.log(
        table(
            ['页面', 'TTFB', 'FCP', 'LCP', '位移', 'DOMContentLoaded', 'load', '长任务', '最长任务'],
            rows.map(({ name, report }) => {
                const m = report.metrics
                return [
                    name,
                    ms(m.ttfb),
                    ms(m.fcp),
                    ms(m.lcp),
                    num(m.clsRaw, 3),
                    ms(m.domContentLoaded),
                    ms(m.load),
                    report.longtasks.length,
                    ms(Math.max(0, ...report.longtasks.map(t => t.duration)))
                ]
            })
        )
    )

    console.log(section('被加载的资源（transferSize 是压缩后的真实字节数）'))
    for (const { name, report } of rows) {
        const total = report.resources.reduce((sum, r) => sum + r.size, 0)
        console.log(`\n[${name}] 共 ${report.resources.length} 个资源 / ${bytes(total)}`)
        console.log(
            table(
                ['资源', '类型', '开始', '耗时', '体积'],
                report.resources.map(r => [r.name, r.type, ms(r.start), ms(r.duration), bytes(r.size)])
            )
        )
    }
}
