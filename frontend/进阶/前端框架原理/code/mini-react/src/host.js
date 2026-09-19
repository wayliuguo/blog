/**
 * 第二层：宿主环境（host）
 *
 * 渲染器本身不认识 DOM，它只调用这 6 个操作。把这一组换掉就能换平台：
 * 浏览器换真 DOM，Node 里用下面的假 DOM，将来换 Canvas / 小程序也只需再写一份。
 */

// ---------- 浏览器宿主 ----------
function browserHost() {
    return {
        createInstance: (type) => document.createElement(type),
        createTextInstance: (text) => document.createTextNode(text),
        appendChild: (parent, child) => parent.appendChild(child),
        insertBefore: (parent, child, before) => parent.insertBefore(child, before),
        removeChild: (parent, child) => parent.removeChild(child),
        setProperty: (node, name, value) => {
            if (name === 'children') return
            if (name === 'nodeValue') {
                node.nodeValue = value
                return
            }
            if (value === null || value === undefined || value === false) node.removeAttribute(name)
            else node.setAttribute(name, value)
        }
    }
}

// ---------- Node 宿主：一个够用的假 DOM ----------
// 只有两个概念：元素节点（type + attrs）与文本节点（text）
function makeNode(type, text = null) {
    return { type, text, attrs: {}, children: [], parent: null }
}

// 文本节点用 type === '#text' 与元素区分开
const TEXT_NODE = '#text'

function nodeHost() {
    return {
        createInstance: (type) => makeNode(type),
        createTextInstance: (text) => makeNode(TEXT_NODE, text),
        appendChild: (parent, child) => {
            if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
            child.parent = parent
            parent.children.push(child)
        },
        insertBefore: (parent, child, before) => {
            if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
            const at = parent.children.indexOf(before)
            child.parent = parent
            parent.children.splice(at < 0 ? parent.children.length : at, 0, child)
        },
        removeChild: (parent, child) => {
            const at = parent.children.indexOf(child)
            if (at >= 0) parent.children.splice(at, 1)
            child.parent = null
        },
        setProperty: (node, name, value) => {
            if (name === 'children') return
            if (name === 'nodeValue') {
                node.text = value
                return
            }
            // 事件等函数型 prop 在假 DOM 里没法执行，记下来只为看得见
            if (value === null || value === undefined || value === false) delete node.attrs[name]
            else node.attrs[name] = value
        }
    }
}

const host = typeof document !== 'undefined' ? browserHost() : nodeHost()

// 把假 DOM 序列化成可读文本，供脚本打印与测试断言
function printTree(node, indent = 0) {
    const pad = '  '.repeat(indent)
    if (node.type === TEXT_NODE) return `${pad}"${node.text}"`
    const attrs = Object.entries(node.attrs)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    const head = `${pad}<${node.type}${attrs}>`
    if (!node.children.length) return head
    return [head, ...node.children.map((c) => printTree(c, indent + 1)), `${pad}</${node.type}>`].join('\n')
}

module.exports = { host, printTree, TEXT_NODE, makeNode }
