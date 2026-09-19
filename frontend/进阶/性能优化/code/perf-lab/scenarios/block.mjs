/**
 * 场景：同一个 200ms 的脚本，放在 head 同步 / defer / body 末尾，首屏差多少
 * 运行：npm run block
 */
import { sweep, title, section, table, ms, timeline } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/block-naive.html', [
        { name: 'head 同步', page: '/block-naive.html' },
        { name: 'head defer', page: '/block-defer.html' },
        { name: 'body 末尾', page: '/block-bottom.html' }
    ])

    console.log(title('阻塞脚本的三种放法：FCP / LCP 实测'))
    console.log(
        table(
            ['放法', 'FCP', 'LCP', 'DOMContentLoaded', 'load', 'FCP 与 DCL 之差'],
            rows.map(({ name, report }) => {
                const m = report.metrics
                return [name, ms(m.fcp), ms(m.lcp), ms(m.domContentLoaded), ms(m.load), ms(m.domContentLoaded - m.fcp)]
            })
        )
    )

    console.log(section('主线程时间线（脚本解析与首屏绘制的先后）'))
    for (const { name, report } of rows) {
        const total = Math.max(report.metrics.load, 100)
        const items = report.resources
            .filter((r) => r.type === 'script' || r.type === 'link')
            .map((r) => ({ label: r.name.replace('/slow?ms=', 'slow ms=').slice(0, 23), start: r.start, duration: r.duration }))
        console.log(`\n[${name}] FCP=${ms(report.metrics.fcp)} LCP=${ms(report.metrics.lcp)}`)
        console.log(items.length ? timeline(items, total) : '（没有阻塞型资源）')
    }

    console.log(section('读法'))
    console.log('- head 同步时，脚本是解析阻塞资源，它的下载时间被整段算进 FCP')
    console.log('- defer 之后脚本不再挡解析，FCP 只受 CSS（render-blocking）影响')
    console.log('- 挪到 body 末尾时首屏同样能先画，但 DCL 仍要等脚本执行完')
}
