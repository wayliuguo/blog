/**
 * 测试与脚本用的最小 DOM
 *
 * runtime-dom 是照着浏览器 API 写的，Node 里没有 document 就跑不起来。
 * 这里实现渲染器真正会用到的那几个 API，于是浏览器那份 nodeOps 也能在 Node 里被验证：
 *   createElement / createTextNode / createComment
 *   insertBefore / removeChild / parentNode / nextSibling
 *   setAttribute / removeAttribute / addEventListener / removeEventListener
 *   textContent / className / style / value / checked
 *
 * require 本文件即安装 globalThis.document。
 */

class FakeNode {
    constructor(type, text = null) {
        this.type = type // 元素是标签名，文本/注释用 '#text' / '#comment'
        this.text = text
        this.parentNode = null
        this.childNodes = []
    }

    get nextSibling() {
        if (!this.parentNode) return null
        const list = this.parentNode.childNodes
        return list[list.indexOf(this) + 1] || null
    }

    get children() {
        return this.childNodes
    }

    get textContent() {
        return this.text === null ? '' : this.text
    }
}

class FakeElement extends FakeNode {
    constructor(tag) {
        super(tag)
        this.attributes = {}
        this.style = {}
        this.className = ''
        this.value = ''
        this.checked = false
        this._listeners = {}
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value)
    }
    getAttribute(name) {
        return name in this.attributes ? this.attributes[name] : null
    }
    removeAttribute(name) {
        delete this.attributes[name]
    }
    appendChild(child) {
        insertBefore(child, this, null)
        return child
    }
    insertBefore(child, anchor) {
        return insertBefore(child, this, anchor)
    }
    removeChild(child) {
        const at = this.childNodes.indexOf(child)
        if (at >= 0) this.childNodes.splice(at, 1)
        child.parentNode = null
        return child
    }
    addEventListener(name, fn) {
        ;(this._listeners[name] || (this._listeners[name] = [])).push(fn)
    }
    removeEventListener(name, fn) {
        const list = this._listeners[name] || []
        const at = list.indexOf(fn)
        if (at >= 0) list.splice(at, 1)
    }
    // 模拟用户操作：把事件派发给自己挂的监听器
    dispatch(name) {
        for (const fn of this._listeners[name] || []) fn({ type: name, target: this })
    }

    get textContent() {
        return this.childNodes.map(c => c.textContent).join('')
    }
    set textContent(value) {
        for (const child of this.childNodes) child.parentNode = null
        this.childNodes = []
        if (value !== '') {
            const text = new FakeNode('#text', String(value))
            text.parentNode = this
            this.childNodes.push(text)
        }
    }
}

class FakeText extends FakeNode {
    constructor(text) {
        super('#text', String(text))
    }
    get nodeValue() {
        return this.text
    }
    set nodeValue(value) {
        this.text = String(value)
    }
}

function insertBefore(child, parent, anchor) {
    if (child.parentNode) child.parentNode.removeChild(child)
    const at = anchor ? parent.childNodes.indexOf(anchor) : -1
    child.parentNode = parent
    if (at < 0) parent.childNodes.push(child)
    else parent.childNodes.splice(at, 0, child)
    return child
}

const document = {
    createElement: tag => new FakeElement(tag),
    createTextNode: text => new FakeText(text),
    createComment: text => new FakeNode('#comment', String(text))
}

globalThis.document = document

// 把节点树打成可读文本
function printDom(node, indent = 0) {
    const pad = '  '.repeat(indent)
    if (node.type === '#text') return `${pad}"${node.text}"`
    if (node.type === '#comment') return `${pad}<!--${node.text}-->`

    const attrs = Object.entries(node.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    const cls = node.className ? ` class="${node.className}"` : ''
    const head = `${pad}<${node.type}${attrs}${cls}>`
    if (!node.childNodes.length) return head
    return [head, ...node.childNodes.map(c => printDom(c, indent + 1)), `${pad}</${node.type}>`].join('\n')
}

// 数"这一轮到底改了多少次宿主节点"：断言 diff 效果最直接的办法
// 传入完整的宿主操作集合（nodeOps + patchProp），返回一个会被持续写入的数组
function recordNodeOps(options) {
    const sink = []
    const push = line => sink.push(line)

    const wrap = (name, format) => {
        const raw = options[name]
        if (!raw) return
        options[name] = (...args) => {
            const line = format(...args)
            if (line) push(line)
            return raw(...args)
        }
    }

    wrap('createElement', tag => `createElement(<${tag}>)`)
    wrap('createText', text => `createText("${text}")`)
    wrap('createComment', () => `createComment()`)
    wrap('setText', (node, text) => `setText(${label(node)}, "${text}")`)
    wrap('setElementText', (el, text) => `setElementText(${label(el)}, "${text}")`)
    wrap(
        'insert',
        (child, parent, anchor) =>
            `insert(${label(child)}, ${anchor ? `before ${label(anchor)}` : `append → ${label(parent)}`})`
    )
    wrap('remove', child => `remove(${label(child)})`)
    wrap('patchProp', (el, key, prev, next) =>
        next === null || next === undefined
            ? `removeProp(${label(el)}, ${key})`
            : `patchProp(${label(el)}, ${key} = ${JSON.stringify(next)})`
    )

    return sink
}

function label(node) {
    if (!node) return 'null'
    return node.type === '#text' ? `"${node.text}"` : `<${node.type}>`
}

module.exports = { document, FakeElement, FakeText, printDom, recordNodeOps, label }
