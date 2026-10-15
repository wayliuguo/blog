/**
 * 第一层：元素（虚拟 DOM 节点）的创建
 *
 * 这里只做一件事：把 JSX 编译后的 createElement 调用，变成一棵普通 JS 对象树。
 * 注意 children 放进 props.children —— 与 React 的真实语义一致。
 */

const TEXT_ELEMENT = 'TEXT_ELEMENT'

// key 是"元素身份"，不放进 props：它只影响 diff 的匹配，不参与属性更新
function createElement(type, config, ...children) {
    const { key = null, ...props } = config || {}
    props.children = children
        .flat(Infinity) // <ul>{items.map(...)}</ul> 会传进来数组，先拍平
        .filter(child => child !== null && child !== undefined && child !== false)
        .map(child => (typeof child === 'object' ? child : createTextElement(String(child))))
    return { type, key, props }
}

function createTextElement(text) {
    return { type: TEXT_ELEMENT, key: null, props: { nodeValue: text, children: [] } }
}

// 一个不产生真实节点的"逻辑分组"，只为避免多包一层 div
const Fragment = Symbol('Fragment')

module.exports = { createElement, createTextElement, Fragment, TEXT_ELEMENT }
