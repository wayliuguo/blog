/**
 * 客户端渲染：把 vdom 变成真实 DOM（CSR 的入口，也是 hydrate 遇到不匹配时的兜底）
 */
import { applyProps, resolve, countNodes } from './vdom.mjs'

export function createNode(vnode, stats) {
    if (vnode == null || vnode === false) return document.createTextNode('')
    if (Array.isArray(vnode)) {
        const frag = document.createDocumentFragment()
        for (const child of vnode) frag.append(createNode(child, stats))
        return frag
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        if (stats) stats.created++
        return document.createTextNode(String(vnode))
    }
    const { type, props, children } = vnode
    if (typeof type === 'function') return createNode(resolve(vnode), stats)
    if (stats) stats.created++
    const dom = document.createElement(type)
    applyProps(dom, props, stats)
    for (const child of children) dom.append(createNode(child, stats))
    return dom
}

/** 清空容器后整棵重建 —— CSR 与「客户端重新渲染」都走这里 */
export function renderDOM(vnode, container, stats) {
    stats = stats || { created: 0, patched: 0, discarded: 0, activated: 0 }
    // 容器里原有的 DOM 会被整体丢掉，先把这笔账记上
    for (const child of container.childNodes) stats.discarded = (stats.discarded || 0) + countNodes(child)
    container.replaceChildren(createNode(vnode, stats))
    return stats
}
