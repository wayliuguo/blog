export const nodeOps = {
    // createElement, 不同的平台创建元素方式不同
    createElement: tagName => document.createElement(tagName),
    // 移除元素
    remove: child => {
        // 先找到其父元素
        const parent = child.parentNode
        if (parent) {
            parent.removeChild(child)
        }
    },
    // 如果参照物anchor为空，相当于appendChild
    insert: (child, parent, anchor = null) => {
        parent.insertBefore(child, anchor)
    },
    // 查询
    querySelector: selector => document.querySelector(selector),
    // 设置元素文本
    setElementText: (el, text) => (el.textContent = text),
    // 创建文本
    createText: text => document.createTextNode(text),
    // 设置节点内容
    setText: (node, text) => (node.nodeValue = text)
}
