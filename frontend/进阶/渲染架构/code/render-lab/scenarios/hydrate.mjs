/**
 * 注水（hydration）：结构对得上就几乎零写入，对不上就得赔上重建。
 * 四个变体共用同一份服务端产物，只换客户端拿哪棵树去接管：
 *   clean    两端一致（对照组）
 *   price    两端口径不一致：服务端 toFixed(2)、客户端取整
 *   tag      标签不一致：section 换成 div
 *   rerender 不做注水，直接丢掉服务端 DOM 重建
 * 数字有两套：hydrate 内部账（复用 / 新建 / 丢弃 / 改写 / 失配）+ 浏览器 MutationObserver 数到的真实突变
 */
import { withServer, bestOf, table, section, title, ms } from '../harness/index.mjs'

const VARIANTS = [
    ['clean', '两端一致'],
    ['price', '价格口径不一致'],
    ['tag', '标签不一致'],
    ['rerender', '不做注水，直接重建']
]

export default async function run() {
    console.log(title('Hydration：接管服务端 DOM 的代价'))
    await withServer({}, async server => {
        const rows = []
        const details = []
        for (const [variant, label] of VARIANTS) {
            const report = await bestOf(server, { mode: 'hydrate', query: { variant } })
            const stats = report.value || {}
            const mut = report.extra || {}
            rows.push([
                label,
                stats.reused ?? 0,
                stats.created ?? 0,
                stats.discarded ?? 0,
                stats.patched ?? 0,
                stats.mismatches ?? 0,
                `${mut.childList ?? 0} / ${mut.attributes ?? 0} / ${mut.characterData ?? 0}`,
                ms(mut.ms)
            ])
            details.push({ variant, label, stats, mut })
        }

        console.log(section('一、四个变体逐项对照'))
        console.log(
            table(['客户端拿到的树', '复用', '新建', '丢弃', '改写', '失配', '突变 child/attr/char', '耗时'], rows)
        )
        console.log('\n前五列是 hydrate 自己的账：「丢弃」= 服务端渲染出来却用不上、被整段扔掉的节点；')
        console.log('后三列是浏览器 MutationObserver 数到的真实 DOM 突变（childList / attributes / characterData）。')

        console.log(section('二、每个变体到底发生了什么'))
        const explain = {
            clean: d =>
                `复用 ${d.stats.reused} 个节点，新建 0 个、丢弃 0 个，DOM 突变 ${d.mut.mutations} 次；挂上 ${d.stats.activated} 个监听器，按钮点得动：${d.mut.interactive}`,
            price: d =>
                `复用 ${d.stats.reused} 个节点，但改写 ${d.stats.patched} 处文本：8 件商品的价格两端写法不同，被逐个改成客户端口径`,
            tag: d =>
                `评价那段标签不一致，整段子树被丢弃（${d.stats.discarded} 个节点）后重建（新建 ${d.stats.created} 个）；其余 ${d.stats.reused} 个节点照旧复用`,
            rerender: d =>
                `服务端渲染的 DOM 整体被丢弃（${d.stats.discarded} 个节点）、全量重建 ${d.stats.created} 个 —— 这就是「不做注水也能跑」的代价`
        }
        for (const d of details) {
            console.log(`\n[${d.label}]`)
            console.log(`  ${explain[d.variant](d)}`)
            console.log(
                `  真实突变明细：childList ${d.mut.childList} · attributes ${d.mut.attributes} · characterData ${d.mut.characterData} · 共 ${d.mut.mutations} 条`
            )
        }

        const [clean, price, tag, rerender] = details
        console.log(section('三、结论'))
        console.log(
            `- 两端一致：${clean.mut.mutations} 次 DOM 突变，${clean.stats.reused} 个节点全部复用，只挂监听器、只点得动`
        )
        console.log(`- 一处格式化口径不一致：${price.stats.patched} 个文本被静默改写 —— 不报错、只是白干，最难发现`)
        console.log(
            `- 一处标签写错：丢弃 ${tag.stats.discarded} 个节点、重建 ${tag.stats.created} 个，代价比一次文本改写大一个量级`
        )
        console.log(
            `- 直接重建：丢弃 ${rerender.stats.discarded} 个、重建 ${rerender.stats.created} 个，服务端那份 HTML 只剩「先看一眼」的价值`
        )

        console.log(section('读法'))
        console.log('- hydration 不是「把 HTML 再渲染一遍」，而是「把事件与状态接到已有 DOM 上」')
        console.log('- 失配不一定会报错：文本不一致只静默改写，标签不一致才整段重建；两者都不报，只有代价不同')
        console.log('- 时区、货币、日期格式、随机数、不稳定的排序，是同构项目最经典的五个失配来源')
        console.log('- 想把失配钉死，就把「注水期不应有任何 DOM 写入」当硬指标来卡 —— 本实验台的 clean 变体是 0')
    })
}
