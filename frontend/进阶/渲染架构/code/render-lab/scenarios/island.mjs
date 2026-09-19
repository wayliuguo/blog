/**
 * 岛化：同一个页面、同一份服务端产物，只换客户端入口 ——
 * 全量 hydration 要认识整棵树，于是它必须下载所有组件；岛只认识那几个标记，于是只下载交互点那几行。
 * 这里把「省掉哪些模块」逐个列出来，省下的字节不是估的，是浏览器自己报的 decodedBodySize。
 */
import { withServer, bestOf, table, section, title, ms, bytes, pct } from '../harness/index.mjs'

const scriptsOf = (report) => {
    const list = report.resources.filter((r) => r.name.startsWith('/src/')).sort((a, b) => b.decoded - a.decoded)
    return { files: list.length, bytes: list.reduce((sum, r) => sum + r.decoded, 0), list }
}

export default async function run() {
    console.log(title('岛化：只给交互点下发 JavaScript'))
    await withServer({}, async (server) => {
        const full = await bestOf(server, { mode: 'ssr', query: { jslag: 300 } })
        const island = await bestOf(server, { mode: 'island', query: { jslag: 300 } })
        const f = scriptsOf(full)
        const i = scriptsOf(island)
        const iNames = new Set(i.list.map((x) => x.name))
        const fBytes = new Map(f.list.map((x) => [x.name, x.decoded]))
        // 两侧的并集：只被岛加载的模块（如激活逻辑）也要出现在表里
        const union = [...new Set([...f.list, ...i.list].map((x) => x.name))]
            .map((name) => ({ name, full: fBytes.get(name) ?? 0, island: iNames.has(name) }))
            .sort((a, b) => b.full - a.full)

        console.log(section('一、整页对照'))
        console.log(
            table(
                ['客户端入口', 'JS 文件数', 'JS 字节', '复用节点', '新建节点', '挂上的监听器', '按钮点得动', '入口开始执行', 'FCP'],
                [
                    [
                        '全量 hydration',
                        f.files,
                        bytes(f.bytes),
                        full.value.reused,
                        full.value.created,
                        full.value.activated,
                        full.extra.interactive,
                        ms(full.extra.entryAt),
                        ms(full.metrics.fcp)
                    ],
                    [
                        '岛激活',
                        i.files,
                        bytes(i.bytes),
                        island.value.reused,
                        island.value.created,
                        island.value.activated,
                        island.extra.interactive,
                        ms(island.extra.entryAt),
                        ms(island.metrics.fcp)
                    ]
                ]
            )
        )
        console.log(`\n岛化少下载 ${bytes(f.bytes - i.bytes)}，是整份客户端的 ${pct(1 - i.bytes / f.bytes)}；`)
        console.log('两者挂上的监听器数量相同、按钮都点得动 —— 省掉的是「不会被用到的那部分代码」，不是功能。')

        console.log(section('二、逐个模块看：哪些在岛化后不再下载了（客户端视角）'))
        console.log(
            table(
                ['模块', '全量 hydration 下载', '岛化是否下载', '它服务什么'],
                union.map((item) => [
                    item.name.replace('/src/', ''),
                    item.full ? bytes(item.full) : '不下载',
                    item.island ? '仍然要' : '不再要',
                    NOTE[item.name.replace('/src/', '')] || ''
                ])
            )
        )

        console.log(section('三、为什么岛能省下这些'))
        console.log('- 全量 hydration 必须能算出整棵树，所以每个组件的代码都得在客户端有一份')
        console.log('- 岛只按 data-island 的名字去注册表取组件，页面里没有的组件根本不进这份图谱')
        console.log('- 于是「静态内容越多、交互点越少」的页面，岛化的收益越大；反过来，整页都是交互的场景收益接近零')

        console.log(section('读法'))
        console.log('- 岛的粒度不是「组件」，而是「需要 JavaScript 的区域」：一个筛选器、一个点赞、一个图表')
        console.log('- 选岛的判据是交互密度，不是页面大小；一个仅有的按钮不值得为它拉一套框架运行时')
        console.log('- 岛之间无法直接共享状态，需要显式通过属性或全局事件通信 —— 这会改变组件的写法')
        console.log('- 本实验台的应用很小，所以省下的是几 KB；真实项目里省下的往往是框架运行时与业务包的大头')
    })
}

/** 每个模块在页面里的角色，供第二张表读起来不费劲 */
const NOTE = {
    'vdom.mjs': '创建元素、挂属性与事件（两端都要）',
    'hydrate.mjs': '接管已有 DOM（全量 hydration 与岛激活共用）',
    'activate.mjs': '岛激活入口：按标记找组件（只有岛用）',
    'render-dom.mjs': '客户端建 DOM（兜底重建用）',
    'app.mjs': '整棵页面树',
    'island.mjs': '岛的服务端那一半：给子树打标记（只在服务端用）',
    'components/header.mjs': '静态页头',
    'components/product-list.mjs': '静态商品列表',
    'components/reviews.mjs': '静态评价',
    'components/recommend.mjs': '静态推荐位',
    'components/like-button.mjs': '唯一的交互点（岛也一样要）',
    'lib/cities.mjs': '50 个站点的静态字典',
    'lib/serialize.mjs': '把 props 序列化到属性里（服务端用）',
    'lib/price.mjs': '价格格式化',
    'entry-full.mjs': '全量 hydration 入口',
    'entry-islands.mjs': '岛入口',
    'entry-csr.mjs': 'CSR 入口（本场景不涉及）'
}
