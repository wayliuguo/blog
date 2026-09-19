/**
 * 场景：12 张 200KB 的图，eager 与 loading="lazy" 的请求数与字节数对比
 * 运行：npm run images
 */
import { sweep, title, section, table, bytes, ms } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/images.html', [
        { name: '全部 eager', query: { mode: 'eager' } },
        { name: '首屏外 lazy', query: { mode: 'lazy' } }
    ])

    console.log(title('图片懒加载：12 张 200KB 的图，只有前几张在首屏'))
    console.log(
        table(
            ['策略', '发出图片请求', '图片字节', '已解码', 'LCP', 'load'],
            rows.map(({ name, report }) => {
                const e = report.extra
                return [name, `${e.imageRequests} / ${e.totalImages}`, bytes(e.imageBytes), `${e.decoded} / ${e.totalImages}`, ms(report.metrics.lcp), ms(report.metrics.load)]
            })
        )
    )

    console.log(section('为什么不是「一张都不多下」'))
    console.log('loading="lazy" 有约 1250px 的预加载距离（视口外还能提前一屏多开始加载），')
    console.log('所以视口附近的图仍然会请求，真正的收益是「首屏之外的 8 张不会被抢带宽」。')

    for (const { name, report } of rows) {
        console.log(`\n[${name}] 图片请求明细`)
        console.log(table(['图片', '开始', '耗时'], report.resources.filter((r) => r.name.includes('/slow')).map((r) => [r.name.split('name=')[1], ms(r.start), ms(r.duration)])))
    }
}
