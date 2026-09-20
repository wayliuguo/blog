/**
 * SSR / SSG / ISR 三条交付路径的服务端账：
 *   每次请求都要重新渲染多少、渲染的开销最终落在哪一刻、注水数据让 HTML 涨了多少
 * 全程用原生 http 客户端量，不经过浏览器
 */
import { withServer, table, section, title, ms, bytes, pct, num } from '../harness/index.mjs'
import { probe } from '../harness/probe.mjs'
import { renderToString } from '../src/render-string.mjs'
import { App } from '../src/app.mjs'
import { loadShell } from '../src/data.mjs'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export default async function run() {
    console.log(title('SSR 与同构实现：服务端那份账'))
    await withServer({}, async server => {
        // —— 一、三条路径的服务端耗时
        const rows = []
        const ssrRuns = []
        for (let i = 0; i < 3; i++) {
            const r = await probe(server.origin, '/?mode=ssr')
            ssrRuns.push(r)
            rows.push([`SSR 第 ${i + 1} 次`, r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])
        }
        for (let i = 0; i < 3; i++) {
            const r = await probe(server.origin, '/?mode=ssg')
            rows.push([`SSG 第 ${i + 1} 次`, r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])
        }
        let r = await probe(server.origin, '/?mode=isr')
        rows.push(['ISR 首次（回源）', r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])
        r = await probe(server.origin, '/?mode=isr')
        rows.push(['ISR 立刻再来（命中）', r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])
        await sleep(700)
        r = await probe(server.origin, '/?mode=isr')
        rows.push(['ISR 过期后（返回旧内容）', r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])
        await sleep(320)
        r = await probe(server.origin, '/?mode=isr')
        rows.push(['ISR 后台重建完成后', r.mode, ms(r.renderMs), ms(r.headAt), bytes(r.size)])

        console.log(section('一、三条路径各自的服务端耗时（X-Render-Ms 是服务端自己记的）'))
        console.log(table(['路径', 'X-Render-Mode', '服务端耗时', '响应头到达', 'HTML 字节'], rows))
        console.log(`\nSSR 连着三次的响应头到达：${ssrRuns.map(x => ms(x.headAt)).join(' / ')} —— 一次都没省下，`)
        console.log('因为它每次都要把同样的树再渲染一遍、把慢接口再等一遍。SSG 与 ISR 命中省掉的正是这一段。')

        // —— 二、HTML 里有多少是数据
        const ssrPage = await probe(server.origin, '/?mode=ssr')
        const islandPage = await probe(server.origin, '/?mode=island')
        const payload = (ssrPage.body.match(/window\.__DATA__ = (.*?)<\/script>/) || [])[1] || ''
        const dataBytes = Buffer.byteLength(payload)
        const markupBytes = ssrPage.size - dataBytes
        console.log(section('二、SSR 的产物不是 HTML，是 HTML + 数据'))
        console.log(
            table(
                ['页面', '总字节', '结构（标记）', '注水数据', '数据占比'],
                [
                    [
                        'SSR（下发数据）',
                        bytes(ssrPage.size),
                        bytes(markupBytes),
                        bytes(dataBytes),
                        pct(dataBytes / ssrPage.size)
                    ],
                    ['岛化（不下发数据）', bytes(islandPage.size), bytes(islandPage.size), bytes(0), pct(0)]
                ]
            )
        )
        console.log(
            `同一份标记，多带 1.2 KB 数据：相比不下发数据的版本涨了 ${num(
                ((ssrPage.size - islandPage.size) / islandPage.size) * 100,
                1
            )}%。`
        )
        console.log('它换来的是「客户端不必再请求一次接口」——这个交换是否划算，取决于数据量与接口的往返成本。')

        // —— 三、renderToString 的产物长什么样
        const html = renderToString(App({ data: { ...loadShell(), reviews: [], recommend: [] } }))
        console.log(section('三、renderToString 的产物（截取前 320 字符，评价与推荐传空数组以便看结构）'))
        console.log(html.slice(0, 320) + ' …')
        console.log(
            `\n产物总长 ${bytes(Buffer.byteLength(html))}，其中不含任何事件监听器 —— 事件是客户端 hydrate 时挂的。`
        )

        console.log(section('读法'))
        console.log('- SSR 的「快」不是快在服务端，而是快在浏览器能立刻拿到内容；服务端反而更累')
        console.log('- SSG 把这份累挪到构建时，代价是内容不会随请求变化')
        console.log('- ISR 是两者的折中：命中时像 SSG，过期后先给旧内容再后台重建')
        console.log('- 注水数据是 SSR 的隐性成本，它可以和 HTML 一起传，也可以让客户端再去问一次接口')
    })
}
