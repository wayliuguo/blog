/**
 * 场景：路由级代码分割——首屏全量加载 vs 切到哪加载哪
 * 运行：npm run lazy
 */
import { sweep, title, section, table, ms, bytes } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep('/lazy.html', [
        { name: '首屏全量', query: { mode: 'eager' }, rounds: 3 },
        { name: '按需加载', query: { mode: 'lazy' }, rounds: 3 }
    ])

    const totalOf = (report) => report.resources.filter((r) => r.name.includes('/bundle') || r.name.includes('/feature')).reduce((sum, r) => sum + r.size, 0)

    console.log(title('路由级代码分割：3 个路由 × 120KB（3 轮中位数）'))
    console.log(
        table(
            ['策略', '首屏加载到可用', '发出的 chunk 数', 'JS 传输总量'],
            rows.map(({ name, report }) => [name, ms(report.extra.loadMs), report.extra.chunks, bytes(totalOf(report))])
        )
    )

    console.log(section('两个数字分别在说什么'))
    for (const { name, report } of rows) {
        console.log(`[${name}] 首屏 ${ms(report.extra.loadMs)}，整个会话共下发 ${report.extra.chunks} 个 chunk / ${bytes(totalOf(report))}`)
    }

    console.log(section('取舍不是「懒加载一定更好」'))
    console.log('- 全量版首屏就要下完三个路由的代码，首屏更慢，但之后切路由零等待')
    console.log('- 按需版首屏只下当前路由，首屏更快；代价是切到没去过的路由时，会出现一次短暂的加载等待（需要 loading 兜底）')
    console.log('- 判断依据是这个路由的访问概率：首屏路由、高频路由不该懒加载；低频的详情页、设置页、图表页适合')
    console.log('\n注：这里每个 chunk 都是 120KB 的填充资源，把网络差异放大到肉眼可见；真实项目里单个路由 chunk 通常 10~50KB。')
}
