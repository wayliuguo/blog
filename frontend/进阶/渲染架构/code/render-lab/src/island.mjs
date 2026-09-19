/**
 * 岛（Islands）：页面里只有「真的会动」的那几块需要 JavaScript，
 * 其余内容服务端渲染完就结束，浏览器连它们的代码都不用下载。
 *
 * 这个文件只管服务端那一半：给可交互子树打标记、把 props 序列化进属性。
 * 浏览器那一半在 activate.mjs —— 分开是为了让岛入口不必把组件的代码一起拉过来。
 */
import { h, resolve } from './vdom.mjs'
import { serializeData } from './lib/serialize.mjs'

/**
 * 包住一块可交互区域。
 * 标记必须落在**子树自己的根元素**上，不能再套一层 div ——
 * 套了的话激活时组件根会去和外壳认亲，整棵子树被判定为失配、全部重建。
 */
export function Island({ name, props, children }) {
    const child = children.length === 1 ? children[0] : h('div', null, children)
    const root = typeof child.type === 'function' ? resolve(child) : child
    return {
        ...root,
        props: { ...root.props, 'data-island': name, 'data-props': serializeData(props || {}) }
    }
}
