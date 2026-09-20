/**
 * 场景：Vue SPA 首屏总对照——未优化外壳 vs 优化外壳
 * 运行：npm run spa
 */
import { sweep, title, section, table, ms, num, bytes } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/spa/index.html', [
        { name: '未优化（全量打包 + 空壳）', query: { n: 2000 }, rounds: 3 },
        { name: '优化后（分割 + 骨架屏）', page: '/spa/optimized.html', query: { opt: '1', n: 2000 }, rounds: 3 }
    ])

    console.log(title('Vue SPA 首屏：2000 条订单，3 轮中位数'))
    console.log(
        table(
            ['版本', 'FCP', 'LCP', '首屏有内容', '关键路径 JS', '长任务', '最长任务', 'DOM 节点'],
            rows.map(({ name, report }) => {
                const m = report.metrics
                return [
                    name,
                    ms(m.fcp),
                    ms(m.lcp),
                    ms(report.extra.firstViewMs),
                    `${report.extra.criticalJs} 个 / ${bytes(report.extra.jsBytes)}`,
                    report.longtasks.length,
                    ms(Math.max(0, ...report.longtasks.map(t => t.duration))),
                    report.extra.domNodes
                ]
            })
        )
    )

    console.log(section('首屏各自下了哪些 JS'))
    for (const { name, report } of rows) {
        const js = report.resources.filter(r => r.name.includes('/spa/') || r.name.includes('/vendor/'))
        const critical = report.extra.criticalJs
        console.log(
            `\n[${name}] 首屏关键路径 ${critical} 个，整个会话 ${js.length} 个 / ${bytes(
                js.reduce((s, r) => s + r.size, 0)
            )}`
        )
        console.log(
            table(
                ['资源', '开始', '耗时', '体积'],
                js.map(r => [r.name, ms(r.start), ms(r.duration), bytes(r.size)])
            )
        )
    }

    console.log(section('怎么读这张表'))
    console.log('- LCP 提前不等于「能用」：优化版的 LCP 是骨架屏上的「订单数据加载中…」，')
    console.log('  真实内容要等 JS 跑完。所以这一列要和「首屏有内容」一起看，不能只看 LCP。')
    console.log('- 关键路径 JS 数：未优化版要等三个路由模块全到位才渲染；优化版只等 list 这一个 chunk，')
    console.log('  detail / about 留到空闲预取或真正切过去再下（表里「开始」明显晚于首屏的那几个就是）。')
    console.log('- 体积差距没想象中大：Vue 运行时本身就 131.5 KB，占了首屏 JS 的九成。')
    console.log('  路由级分割省的是业务代码，框架的那一大块得靠长期缓存 / CDN / 预缓存去摊。')
    console.log('- DOM 节点数差的是虚拟滚动：未优化版 2000 条全量渲染，优化版只渲染视窗内的 14 行，')
    console.log('  顺带把那个 200+ ms 的长任务也消掉了。')
}
