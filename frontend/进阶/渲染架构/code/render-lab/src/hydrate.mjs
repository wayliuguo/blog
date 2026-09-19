/**
 * 接管服务端已经渲染好的 DOM。
 * 判定顺序就是成本和取舍的顺序：结构对得上 → 复用；对不上 → 只重建对不上的那棵子树。
 * stats.created 就是「hydration 到底走了多少冤枉路」的量化。
 */
import { applyProps, resolve, countNodes } from './vdom.mjs'
import { createNode } from './render-dom.mjs'

export const newStats = () => ({ reused: 0, created: 0, patched: 0, mismatches: 0, discarded: 0, activated: 0 })

function replace(dom, next, stats) {
    stats.mismatches++
    stats.discarded += countNodes(dom)
    if (dom && dom.parentNode) dom.parentNode.replaceChild(next, dom)
    return next
}

export function hydrate(vnode, dom, stats) {
    stats = stats || newStats()

    if (vnode == null || vnode === false) return stats
    if (Array.isArray(vnode)) {
        vnode.forEach((child, i) => hydrate(child, dom.childNodes[i], stats))
        return stats
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        const value = String(vnode)
        if (dom && dom.nodeType === 3) {
            stats.reused++
            if (dom.data !== value) {
                dom.data = value
                stats.patched++
            }
            return stats
        }
        return replace(dom, document.createTextNode(value), stats)
    }

    const { type, props, children } = vnode
    if (typeof type === 'function') return hydrate(resolve(vnode), dom, stats)

    // 标签名不一样：这一段没有可复用的可能，整棵重建
    if (!dom || dom.nodeType !== 1 || dom.tagName.toLowerCase() !== type) return replace(dom, createNode(vnode, stats), stats)
    stats.reused++

    applyProps(dom, props, stats)
    const have = dom.childNodes
    for (let i = 0; i < children.length; i++) hydrate(children[i], have[i], stats)
    // 服务端多出来的节点要删掉，否则下次更新时会成为幽灵节点
    for (let i = have.length - 1; i >= children.length; i--) {
        stats.discarded += countNodes(have[i])
        dom.removeChild(have[i])
        stats.mismatches++
    }
    return stats
}

/**
 * 接管一个容器：容器的子节点列表才是对齐单位，而不是容器自己。
 * 少了这一层，App 的根 div 会去和挂载点 #app 认亲 —— 结构全错，整棵树都会被重建。
 */
export function hydrateRoot(container, vnode, stats) {
    stats = stats || newStats()
    const list = Array.isArray(vnode) ? vnode : [vnode]
    for (let i = 0; i < list.length; i++) hydrate(list[i], container.childNodes[i], stats)
    for (let i = container.childNodes.length - 1; i >= list.length; i--) {
        stats.discarded += countNodes(container.childNodes[i])
        container.removeChild(container.childNodes[i])
        stats.mismatches++
    }
    return stats
}
