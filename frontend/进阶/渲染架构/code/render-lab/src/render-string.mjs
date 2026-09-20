/**
 * 服务端渲染：把 vdom 变成 HTML 字符串
 * 这是 SSR / SSG / 流式三种方案的共同底座 —— 它们只差「什么时候把这段字符串交给浏览器」
 */
import { resolve } from './vdom.mjs'

const VOID = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
])

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
export const escapeHtml = value => String(value).replace(/[&<>"]/g, c => ESC[c])

/** 事件监听器不进 HTML；style 对象序列化成 css 文本；其余照写 */
export function attrsToString(props) {
    let out = ''
    for (const [key, value] of Object.entries(props)) {
        if (key === 'children' || value == null || value === false || key === 'html') continue
        if (/^on[A-Z]/.test(key)) continue
        if (key === 'style' && typeof value === 'object') {
            const css = Object.entries(value)
                .map(([prop, v]) => `${prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`)
                .join(';')
            out += ` style="${escapeHtml(css)}"`
            continue
        }
        out += value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`
    }
    return out
}

/**
 * 核心就这十几行：组件先求值，元素拼标签，文本转义。
 * 注意 children 之间不插任何空白 —— 客户端 hydrate 靠 childNodes 下标对齐，
 * 多一个换行文本节点，整棵子树就会开始错位重建。
 */
export function renderToString(vnode) {
    if (vnode == null || vnode === false) return ''
    if (Array.isArray(vnode)) return vnode.map(renderToString).join('')
    if (typeof vnode === 'string' || typeof vnode === 'number') return escapeHtml(vnode)
    const { type, props } = vnode
    if (typeof type === 'function') return renderToString(resolve(vnode))
    const open = `<${type}${attrsToString(props)}>`
    if (VOID.has(type)) return open
    return `${open}${vnode.children.map(renderToString).join('')}</${type}>`
}

/** 把浏览器端要用到的数据注进页面：SSR 的产物不是 HTML，是 HTML + 数据 */
export { serializeData } from './lib/serialize.mjs'
