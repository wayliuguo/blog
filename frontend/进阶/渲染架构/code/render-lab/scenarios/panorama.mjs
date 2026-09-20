/**
 * 渲染方案全景：同一个页面、四种交付方式，一次跑出每个方案的首屏时间线。
 * 两套网络条件分别对应「本机理想」与「模拟 300ms 的 JS 下载 + 解析开销」——
 * 同一份代码在两套条件下差距被放大，正好说明这个差距是谁造成的。
 */
import { withServer, bestOf, table, section, title, ms, bytes } from '../harness/index.mjs'
import { probe, segmentNames, segmentTimeline } from '../harness/probe.mjs'

const PLANS = [
    ['csr', 'CSR 客户端渲染'],
    ['ssr', 'SSR 服务端渲染'],
    ['ssg', 'SSG 静态生成'],
    ['stream', '流式渲染']
]

const jsOf = report => report.resources.filter(r => r.name.startsWith('/src/')).reduce((sum, r) => sum + r.decoded, 0)

export default async function run() {
    console.log(title('渲染方案全景：同一个页面，四种交付方式'))
    console.log('每种方案跑两轮，取 load 更小的那一轮 —— 无头 Chrome 每次冷启动的抖动能有上百毫秒')

    await withServer({}, async server => {
        const collected = {}
        for (const jslag of [300, 0]) {
            for (const [mode] of PLANS) collected[`${mode}-${jslag}`] = await bestOf(server, { mode, query: { jslag } })
        }

        for (const jslag of [300, 0]) {
            const rows = PLANS.map(([mode, label]) => {
                const report = collected[`${mode}-${jslag}`]
                const m = report.metrics
                return [
                    label,
                    ms(m.ttfb),
                    ms(m.fcp),
                    ms(report.marks.products),
                    ms(report.marks.reviews),
                    bytes(jsOf(report)),
                    ms(m.load)
                ]
            })
            console.log(section(jslag ? '模拟 300ms 的 JS 下载 + 解析开销（jslag=300）' : '本机理想网络（jslag=0）'))
            console.log(table(['方案', 'TTFB', 'FCP', '商品列表出现', '评价出现', 'JS 字节', 'load'], rows))
        }

        // 流式的分段到达：Node 侧用原生 http 客户端量，浏览器侧靠段内的自删标记脚本回报
        console.log(section('流式渲染的分段到达（服务端每写一段的时间，原生 http 客户端观测）'))
        const timeline = await probe(server.origin, '/?mode=stream')
        const rows = segmentTimeline(timeline).map(([name, at, size]) => [name, ms(at), bytes(size)])
        console.log(`响应头到达 ${ms(timeline.headAt)} · 全部完成 ${ms(timeline.total)}`)
        console.log(table(['段', '到达时刻', '该次写入字节'], rows))

        const browser = collected['stream-300']
        console.log(
            `\n浏览器侧看到的分段：` +
                browser.chunks.map(c => `${c.name}@${ms(c.at)}`).join(' → ') +
                `；入口模块 ${ms(browser.extra.entryAt)} 才开始执行`
        )

        console.log(section('读法'))
        console.log('- CSR 的 FCP 要等三条腿全走完：HTML 到达 → JS 下载解析 → 接口回来，少一条都不出内容')
        console.log('- SSR 的 FCP 贴着 TTFB：内容随 HTML 一起来，JS 只负责接管')
        console.log('- SSG 的 TTFB 只有几毫秒 —— 渲染的开销在构建时就花掉了')
        console.log('- 流式的壳几毫秒就发出去了，但注入数据的入口在最后一个慢接口之后才开始跑')
        console.log('- jslag 归零后 CSR 的差距被压缩，说明这个差距主要是网络与解析开销，不是渲染本身慢')
    })
}
