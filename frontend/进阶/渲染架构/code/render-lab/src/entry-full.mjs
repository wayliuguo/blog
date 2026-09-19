/**
 * 全量 hydration 入口：服务端已经把 HTML 发过来了，这里只把整棵树「接管」起来。
 * variant 决定拿什么树去接管 —— 结构对得上就几乎零写入，对不上就得赔上重建的代价。
 */
import { h } from './vdom.mjs'
import { App } from './app.mjs'
import { hydrateRoot, newStats } from './hydrate.mjs'
import { renderDOM } from './render-dom.mjs'
import { formatPriceLoose } from './lib/price.mjs'

const root = document.getElementById('app')
const variant = new URLSearchParams(location.search).get('variant') || 'clean'
const entryAt = Math.round(performance.now() * 10) / 10

const treeOf = () => {
    if (variant === 'price') {
        // 两端口径不一致：服务端 toFixed(2)，客户端取整 —— 每个价格节点都要改
        return App({ data: window.__DATA__, priceOf: formatPriceLoose })
    }
    if (variant === 'tag') {
        // 标签不一致：只用 div 换掉 section，整段评价子树就没有可复用的结构
        return App({ data: window.__DATA__, reviewsSlot: h('div', { class: 'reviews', 'data-marker': 'reviews' }, '评价') })
    }
    return App({ data: window.__DATA__ })
}

const { value, ...measured } = await Lab.observeMutations('#app', () => {
    if (variant === 'rerender') {
        // 对照：不做 hydration，直接把服务端渲染的 DOM 全部丢掉重建
        const stats = { created: 0, patched: 0, activated: 0 }
        renderDOM(App({ data: window.__DATA__ }), root, stats)
        return stats
    }
    return hydrateRoot(root, treeOf(), newStats())
})

// 注水到底成没成？真点一下：监听器没挂上，文案就不会变
const like = document.querySelector('.like')
const before = like && like.textContent
if (like) like.click()
const interactive = !!like && like.textContent !== before

await Lab.finish(
    { strategy: variant === 'rerender' ? 'rerender' : 'hydrate', variant, entryAt, interactive, ...measured },
    value
)
