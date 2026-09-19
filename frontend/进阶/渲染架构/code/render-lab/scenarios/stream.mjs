/**
 * 流式渲染：服务端每写一段，客户端什么时候收到。
 * 同一次运行里对照「非流式 SSR」——它的第一个字节要等前面所有的慢数据都齐了才能出去。
 */
import { withServer, bestOf, table, section, title, ms, bytes } from '../harness/index.mjs'
import { probe, segmentTimeline } from '../harness/probe.mjs'

export default async function run() {
    console.log(title('流式渲染：能发的先发'))
    await withServer({}, async (server) => {
        // —— 一、分段到达（跑两轮取更快的一轮）
        let best = null
        for (let i = 0; i < 2; i++) {
            const r = await probe(server.origin, '/?mode=stream')
            if (!best || r.total < best.total) best = r
        }
        const rows = segmentTimeline(best).map(([name, at, size]) => [name, ms(at), bytes(size)])
        console.log(section('一、每一段的到达时刻（原生 http 客户端，客户端与服务端在同一台机器）'))
        console.log(`响应头 ${ms(best.headAt)} · 全部完成 ${ms(best.total)} · 总字节 ${bytes(best.size)}`)
        console.log(table(['段', '到达时刻', '该次写入字节'], rows))

        const shellAt = segmentTimeline(best)[0][1]
        console.log(`\n壳在 ${ms(shellAt)} 就交出去了，而评价要等到 ${ms(best.total)} ——`)
        console.log(`中间那 ${ms(best.total - shellAt)} 是「慢接口还没回来」，不是「服务端在忙」。`)

        // —— 二、与非流式 SSR 对照
        const ssr = await probe(server.origin, '/?mode=ssr')
        const stream = best
        console.log(section('二、与非流式 SSR 的首字节对照'))
        console.log(
            table(
                ['交付方式', '响应头到达', '首个内容段到达', '完成', 'HTML 字节'],
                [
                    ['非流式 SSR', ms(ssr.headAt), ms(ssr.firstAt), ms(ssr.total), bytes(ssr.size)],
                    ['流式渲染', ms(stream.headAt), ms(stream.firstAt), ms(stream.total), bytes(stream.size)]
                ]
            )
        )
        console.log(`流式的第一个字节早了 ${ms(ssr.firstAt - stream.firstAt)}，代价是 HTML 多了 ${bytes(stream.size - ssr.size)}：`)
        console.log('占位 div、装真内容的 template、补位脚本、以及 head 里那段运行时，都是流式的开销。')

        // —— 三、乱序补位
        const order = segmentTimeline(best).map((row) => row[0])
        console.log(section('三、补位顺序由「谁先好」决定，不是由「谁在前面」决定'))
        console.log(`实际顺序：${order.join(' → ')}`)
        console.log('推荐位在页面里排在评价之后，但它 130ms 就好了、评价要 260ms，所以它先补位。')
        console.log('这正是流式渲染比「一次发完整 HTML」更复杂的地方：每一段都要能独立定位、独立替换。')

        // —— 四、浏览器侧的 FCP
        const browserStream = await bestOf(server, { mode: 'stream', query: { jslag: 300 } })
        const browserSsr = await bestOf(server, { mode: 'ssr', query: { jslag: 300 } })
        console.log(section('四、浏览器侧的首屏（jslag=300，模拟 JS 下载开销）'))
        console.log(
            table(
                ['交付方式', 'FCP', '商品列表出现', '评价出现', '入口模块开始执行'],
                [
                    ['非流式 SSR', ms(browserSsr.metrics.fcp), ms(browserSsr.marks.products), ms(browserSsr.marks.reviews), ms(browserSsr.extra.entryAt)],
                    ['流式渲染', ms(browserStream.metrics.fcp), ms(browserStream.marks.products), ms(browserStream.marks.reviews), ms(browserStream.extra.entryAt)]
                ]
            )
        )
        console.log('\n注意最后两列：流式的首屏更早，但入口模块开始执行得更晚 ——')
        console.log('全量 hydration 要等注水数据完整，而流式的数据要在最后一个边界之后才凑齐。')
        console.log('要连可交互时间也一起提前，就得让注水数据也分段下发，或者改成岛化。')

        console.log(section('读法'))
        console.log('- 流式不是让服务端更快，而是让「已经就绪的部分」先走，把等待摊开给浏览器用')
        console.log('- 分段的边界应该是「数据来源」的边界，不是「组件层级」的边界')
        console.log('- 分段比整份 HTML 多了占位、模板与补位脚本，网络越差这份开销越值，网络越好越不值')
        console.log('- 流式与全量 hydration 天然别扭：数据到齐才知道要注什么，可交互时间因此被拽到最后一段之后')
    })
}
