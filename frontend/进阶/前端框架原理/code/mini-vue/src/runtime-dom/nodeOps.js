/**
 * runtime-dom 的宿主操作：runtime-core 需要的 10 个动作
 *
 * 与 runtime-core 的区别只有这一点——这里用的是真实 DOM API。
 * 平台相关的部分被完整地关在这个文件里。
 */

const nodeOps = {
    createElement: (tag) => document.createElement(tag),
    createText: (text) => document.createTextNode(text),
    createComment: (text) => document.createComment(text),
    setText: (node, text) => {
        node.nodeValue = text
    },
    setElementText: (el, text) => {
        el.textContent = text
    },
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    remove: (child) => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
    nextSibling: (node) => node.nextSibling
}

module.exports = { nodeOps }
