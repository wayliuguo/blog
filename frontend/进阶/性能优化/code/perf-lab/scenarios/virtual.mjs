/**
 * 场景：长列表渲染——DOM 里该有多少个节点
 * 运行：npm run virtual
 */
import { sweep, title, section, table, ms, num, bytes } from '../harness/index.mjs'

const kb = v => (v == null ? '—' : `${Math.round(v / 1024)} KB`)

export default async function run() {
    const rows = await sweep('/virtual.html', [
        { name: '全量渲染', query: { mode: 'full' }, rounds: 3 },
        { name: '虚拟滚动', query: { mode: 'virtual' }, rounds: 3 }
    ])

    console.log(title('10000 行长列表：全量渲染 vs 虚拟滚动（3 轮中位数）'))
    console.log(
        table(
            ['做法', 'DOM 节点数', '实际渲染行数', '首屏渲染', '一次大跨度滚动'],
            rows.map(({ name, report }) => [
                name,
                report.extra.domNodes,
                `${report.extra.rendered} / ${report.extra.total}`,
                ms(report.extra.buildMs),
                ms(report.extra.scrollMs)
            ])
        )
    )

    console.log(section('内存占用（performance.memory.usedJSHeapSize）'))
    console.log(
        table(
            ['做法', 'JS 堆'],
            rows.map(({ name, report }) => [name, kb(report.extra.heapUsed)])
        )
    )

    console.log(section('两者付出的代价不同'))
    console.log('- 全量渲染：DOM 节点上万，首屏渲染慢、内存高，但滚动时 JS 什么都不用做')
    console.log('- 虚拟滚动：DOM 只保留可视窗口 + 缓冲，首屏快、内存低，但每次滚动都要重算窗口并重建那几十行')
    console.log(
        `\n虚拟滚动的窗口大小是 ${rows[1]?.report.extra.windowSize} 行（视口 480px / 行高 32px）+ 上下各 5 行缓冲。`
    )
    console.log(
        `结论：DOM 节点数砍掉 ${num(
            (1 - rows[1].report.extra.domNodes / rows[0].report.extra.domNodes) * 100,
            1
        )}%，首屏渲染快 ${ms(rows[0].report.extra.buildMs - rows[1].report.extra.buildMs)}，一次大跨度滚动快 ${ms(
            rows[0].report.extra.scrollMs - rows[1].report.extra.scrollMs
        )}。`
    )
}
