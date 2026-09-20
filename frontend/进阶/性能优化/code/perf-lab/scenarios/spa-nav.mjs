/**
 * 场景：切路由的代价——全量打包 vs 分割不预取 vs 分割 + 空闲预取
 * 运行：npm run spa:nav
 *
 * 给 /spa/ 下的每个资源加 150ms 延迟模拟真实网络 RTT：
 * 本机 localhost 是「秒下」，不加上这一跳，懒加载的代价根本测不出来
 */
import { sweep, title, section, table, ms, bytes } from '../harness/index.mjs'

export default async function run() {
    const rows = await sweep(
        '/spa/index.html',
        [
            { name: '全量打包', query: { act: 'nav', n: 500 } },
            {
                name: '分割，不预取',
                page: '/spa/optimized.html',
                query: { act: 'nav', n: 500, opt: '1', prefetch: '0' }
            },
            {
                name: '分割 + 空闲预取',
                page: '/spa/optimized.html',
                query: { act: 'nav', n: 500, opt: '1', prefetch: '1' }
            }
        ],
        { server: { spaLatency: 150 }, rounds: 3 }
    )

    console.log(title('切到「详情」路由：每个资源 150ms RTT，3 轮中位数'))
    console.log(
        table(
            ['策略', '首屏关键路径 JS', '首屏 JS 体积', '切路由耗时', '切换时才下的 chunk', '会话总 JS'],
            rows.map(({ name, report }) => [
                name,
                `${report.extra.criticalJs} 个`,
                bytes(report.extra.criticalBytes),
                ms(report.extra.navMs),
                report.extra.navChunks,
                bytes(report.extra.jsBytes)
            ])
        )
    )

    console.log(section('三行数字分别在说什么'))
    console.log('- 全量打包：首屏把三个路由都下了，切换时一个 chunk 都不用下，代价是首屏最重')
    console.log('- 分割不预取：首屏最轻，代价是切过去时要现下一个 chunk，用户看到一次等待')
    console.log('- 分割 + 预取：首屏按轻的来，切换前趁空闲把 chunk 悄悄下好，两边都要到了')
    console.log('\n预取不是免费的：它占的是空闲带宽和用户流量，所以通常只给')
    console.log('「大概率会去」的一两个路由做，或者放在网络条件好（navigator.connection.effectiveType）时才做。')
}
