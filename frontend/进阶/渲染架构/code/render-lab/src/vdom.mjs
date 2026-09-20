/**
 * 极简 vdom：整棵页面树只用它描述
 * 服务端把它变成字符串，客户端把它变成 DOM / 接管已有 DOM —— 同一棵树，三种出口
 * 零依赖，Node 与浏览器都能直接 import
 */

/** 创建元素（含组件）：h('div', { class: 'a' }, '文本', h('b')) */
export function h(type, props, ...children) {
    return {
        type,
        props: props || {},
        children: children.flat(Infinity).filter(c => c != null && c !== false)
    }
}

/** 只是给 children 一个名字，渲染时直接展开 */
export function Fragment(props) {
    return props.children
}

/**
 * 求值一个函数组件：children 挂在 vnode 上，得手动塞进 props 才传得进去。
 * 漏了这一步，所有带子节点的组件都会渲染成空 —— 这是自研渲染器最容易踩的一脚。
 */
export function resolve(vnode) {
    return vnode.type({ ...vnode.props, children: vnode.children })
}

/** 数一棵真实 DOM 子树有多少个节点：要重建一段时，先得知道扔掉的代价有多大 */
export function countNodes(dom) {
    if (!dom) return 0
    let total = 1
    for (const child of dom.childNodes) total += countNodes(child)
    return total
}

const EVENT_RE = /^on[A-Z]/
/** 只读属性：只能通过 DOM 属性设置，没有对应特性 */
const PROP_ONLY = new Set(['value', 'checked', 'selected', 'disabled'])

/**
 * 把 props 落到真实 DOM 上。
 * 关键是「先比再写」：hydrate 时若每次都 setAttribute，即使值没变，
 * MutationObserver 也会记一笔 —— 那 hydration 的开销就被自己吹大了。
 */
export function applyProps(dom, props, stats) {
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || value == null || value === false) continue
        if (EVENT_RE.test(key)) {
            dom.addEventListener(key.slice(2).toLowerCase(), value)
            if (stats) stats.activated++
            continue
        }
        if (key === 'html') {
            dom.innerHTML = value
            if (stats) stats.patched++
            continue
        }
        if (key === 'style' && typeof value === 'object') {
            for (const [prop, v] of Object.entries(value)) {
                const css = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
                dom.style.setProperty(css, v)
            }
            if (stats) stats.patched++
            continue
        }
        if (PROP_ONLY.has(key) && typeof value !== 'string') {
            if (dom[key] !== value) {
                dom[key] = value
                if (stats) stats.patched++
            }
            continue
        }
        const next = value === true ? '' : String(value)
        if (dom.getAttribute(key) !== next) {
            dom.setAttribute(key, next)
            if (stats) stats.patched++
        }
    }
}
