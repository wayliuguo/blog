/**
 * 迷你 WXML 解析 + 渲染
 *
 * 覆盖文中讨论的那几条规则：{{ }} 插值（文本 / 属性）、wx:if / wx:elif / wx:else、
 * wx:for 与 wx:key、block、hidden、组件标签到 HTML 标签的映射。
 * 不覆盖：wxs、import / include、自定义组件、事件系统（bind* / catch* 一律忽略）。
 *
 * 真机上这套规则由微信的 WXML 编译器 + 渲染层实现；这里只是把规则跑出可读的 HTML，
 * 便于对照「写法定性 → 产物差别」。
 */
const { evaluate, stringify } = require('./expr')

// 组件 → HTML 标签。只为在浏览器里看出结构；真机的渲染层用的是自己的元素，与这份映射无关。
const TAG_MAP = {
    view: 'div',
    'scroll-view': 'div',
    'cover-view': 'div',
    'rich-text': 'div',
    text: 'span',
    image: 'img',
    navigator: 'a',
    button: 'button',
    input: 'input',
    textarea: 'textarea',
    // block 只做控制流，不产出标签
    block: null
}

// 事件绑定与 wx:* 指令不落进 HTML
const DROP_ATTR = /^(?:wx:|bind|catch|capture-|mut-bind)/

let warnings = []

function warn(line, message) {
    warnings.push({ line, message })
}

/* ---------------------------------------------------------------- 解析 */

function parseAttrs(raw) {
    const attrs = {}
    const re = /([\w:@-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
    let m
    while ((m = re.exec(raw))) {
        const name = m[1]
        const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]
        attrs[name] = value === undefined ? '' : value
    }
    return attrs
}

function lineAt(source, index) {
    let line = 1
    for (let i = 0; i < index; i++) if (source[i] === '\n') line++
    return line
}

function parse(source) {
    const root = { tag: '#root', attrs: {}, children: [] }
    const stack = [root]
    const re = /<!--[\s\S]*?-->|<\/([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)>|([^<]+)/g
    let m
    while ((m = re.exec(source))) {
        if (m[0].startsWith('<!--')) continue
        const line = lineAt(source, m.index)
        if (m[5] !== undefined) {
            stack[stack.length - 1].children.push({ tag: '#text', text: m[5], line })
            continue
        }
        if (m[1]) {
            const top = stack.pop()
            if (!top || top.tag !== m[1]) throw new Error(`第 ${line} 行：</${m[1]}> 没有对应的开始标签`)
            continue
        }
        const node = { tag: m[2], attrs: parseAttrs(m[3] || ''), children: [], line }
        stack[stack.length - 1].children.push(node)
        if (m[4] !== '/') stack.push(node)
    }
    if (stack.length !== 1) {
        const top = stack[stack.length - 1]
        throw new Error(`第 ${top.line} 行的 <${top.tag}> 没有闭合`)
    }
    return root
}

/* ---------------------------------------------------------------- 渲染 */

/** 属性值：空串视为布尔属性（true）、`{{ }}` 整个包住时求真值、其余按字面量插值 */
function valueOf(raw, scope) {
    if (raw === undefined || raw === '') return true
    const whole = String(raw).match(/^\s*\{\{([\s\S]+)\}\}\s*$/)
    if (whole) return evaluate(whole[1], scope)
    return interpolate(raw, scope)
}

function truthy(raw, scope) {
    return !!valueOf(raw, scope)
}

function interpolate(text, scope) {
    return String(text).replace(/\{\{([\s\S]+?)\}\}/g, (_, expr) => stringify(evaluate(expr, scope)))
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function typeName(value) {
    if (Array.isArray(value)) return '数组'
    if (value === null) return 'null'
    return typeof value
}

function renderChildren(children, scope, sep = '') {
    const parts = []
    let chain = null // wx:if / wx:elif / wx:else 的分支链状态
    for (const child of children) {
        if (child.tag === '#text') {
            // 元素之间的空白不产出内容，这样 if / elif / else 可以紧挨着换行写
            if (!child.text.trim()) continue
            parts.push(escapeHtml(interpolate(child.text, scope)))
            continue
        }
        const attrs = child.attrs
        const hasIf = 'wx:if' in attrs
        const hasElif = 'wx:elif' in attrs
        const hasElse = 'wx:else' in attrs

        if (hasIf) chain = { taken: false }
        if (hasIf || hasElif || hasElse) {
            if (!chain) throw new Error(`第 ${child.line} 行：wx:elif / wx:else 前面没有 wx:if`)
            let ok = false
            if (chain.taken) ok = false
            else if (hasIf) ok = truthy(attrs['wx:if'], scope)
            else if (hasElif) ok = truthy(attrs['wx:elif'], scope)
            else ok = true
            if (ok) {
                chain.taken = true
                parts.push(renderElement(child, scope))
            }
            continue
        }
        chain = null
        parts.push(renderElement(child, scope))
    }
    return parts.filter(p => p !== '').join(sep)
}

function renderElement(node, scope) {
    const attrs = node.attrs

    if ('wx:for' in attrs) {
        const list = valueOf(attrs['wx:for'], scope)
        if (!Array.isArray(list)) {
            throw new Error(`第 ${node.line} 行：wx:for 的值必须是数组，实际是${typeName(list)}`)
        }
        if (!('wx:key' in attrs)) {
            warn(node.line, 'wx:for 缺少 wx:key：列表重排时无法复用节点，会整段重建')
        } else {
            const key = attrs['wx:key']
            const sample = list[0]
            if (key !== '*this' && sample !== undefined && typeof sample !== 'object') {
                warn(node.line, `wx:key="${key}" 用错了：数组元素是${typeName(sample)}，这种列表应该写 wx:key="*this"`)
            }
        }
        const itemName = attrs['wx:for-item'] || 'item'
        const indexName = attrs['wx:for-index'] || 'index'
        const rest = Object.assign({}, node, { attrs: Object.assign({}, attrs) })
        for (const name of ['wx:for', 'wx:key', 'wx:for-item', 'wx:for-index']) delete rest.attrs[name]
        return list
            .map((item, index) => {
                const inner = Object.assign({}, scope)
                inner[itemName] = item
                inner[indexName] = index
                return renderElement(rest, inner)
            })
            .join('')
    }

    // block（以及未在映射表里的自定义控制标签）只渲染内容，不产出标签
    if (node.tag === 'block' || TAG_MAP[node.tag] === null) {
        return renderChildren(node.children, scope)
    }
    const tag = TAG_MAP[node.tag] || node.tag
    const htmlAttrs = []
    let hidden = false
    let style = null

    for (const [name, raw] of Object.entries(attrs)) {
        if (DROP_ATTR.test(name)) continue
        if (name === 'hidden') {
            hidden = truthy(raw, scope)
            continue
        }
        if (name === 'style') {
            style = interpolate(raw, scope)
            continue
        }
        htmlAttrs.push(`${name}="${escapeAttr(String(valueOf(raw, scope)))}"`)
    }
    if (style !== null) htmlAttrs.push(`style="${escapeAttr(hidden ? `${style}; display:none` : style)}"`)
    else if (hidden) htmlAttrs.push('style="display:none"')

    const open = htmlAttrs.length ? `<${tag} ${htmlAttrs.join(' ')}>` : `<${tag}>`
    return `${open}${renderChildren(node.children, scope)}</${tag}>`
}

/* ---------------------------------------------------------------- 对外 */

/** 编译一段 WXML + 数据，返回 { html, warnings }；顶层节点按行输出，便于和源码对照 */
function compile(source, data) {
    warnings = []
    const root = parse(source)
    return { html: renderChildren(root.children, data, '\n'), warnings: warnings.slice() }
}

module.exports = { compile, parse, TAG_MAP }
