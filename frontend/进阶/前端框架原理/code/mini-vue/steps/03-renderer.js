/**
 * 第 3 步：同一份 runtime-core，两个完全不同的宿主
 *
 * 这是"平台无关"最直接的证明：renderer 不知道自己在渲染到哪里。
 *   宿主 A：假 DOM（浏览器 nodeOps 的替身）→ 得到一棵节点树
 *   宿主 B：把界面拼成字符串 → 相当于服务端渲染的雏形
 *
 * 运行：npm run step:renderer
 */
const { createRenderer, h } = require('../src/runtime-core')
const { nodeOps } = require('../src/runtime-dom/nodeOps')
const { patchProp } = require('../src/runtime-dom/patchProp')
const { printDom } = require('../test/fake-dom')

const Card = {
    props: { title: String },
    setup(props) {
        return () => h('div', { class: 'card' }, [h('h2', null, props.title), h('p', null, '同一份 render，两个宿主')])
    }
}

// ---------- 宿主 B：不建节点，直接拼字符串 ----------
function stringHost() {
    return {
        createElement: tag => ({ tag, attrs: {}, children: [], text: null }),
        createText: text => ({ tag: null, text }),
        createComment: text => ({ tag: null, text, comment: true }),
        setText: (node, text) => {
            node.text = text
        },
        setElementText: (el, text) => {
            el.text = text
        },
        insert: (child, parent) => {
            parent.children.push(child)
            child.parent = parent
        },
        remove: child => {
            const at = child.parent.children.indexOf(child)
            if (at >= 0) child.parent.children.splice(at, 1)
        },
        nextSibling: () => null,
        patchProp: (el, key, prev, next) => {
            if (key === 'key') return
            el.attrs[key] = next
        }
    }
}

function serialize(node) {
    if (node.tag === null) {
        if (node.text !== null) return node.comment ? '' : node.text
        return node.children.map(serialize).join('')
    }
    const attrs = Object.entries(node.attrs)
        .filter(([k, v]) => v !== null && v !== undefined && v !== false && !k.startsWith('on'))
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    if (node.text !== null) return `<${node.tag}${attrs}>${node.text}</${node.tag}>`
    return `<${node.tag}${attrs}>${node.children.map(serialize).join('')}</${node.tag}>`
}

// ---------- 给注入的宿主操作装计数器 ----------
function countOps(options) {
    const counter = {}
    for (const key of Object.keys(options)) {
        const raw = options[key]
        counter[key] = 0
        options[key] = (...args) => {
            counter[key]++
            return raw(...args)
        }
    }
    return counter
}

// ---------- 宿主 A：真 DOM 的替身 ----------
const containerA = document.createElement('div')
const optionsA = { ...nodeOps, patchProp }
const counterA = countOps(optionsA)
createRenderer(optionsA).createApp(Card, { title: '一张卡片' }).mount(containerA)

// ---------- 宿主 B：字符串 ----------
const containerB = { tag: 'root', attrs: {}, children: [], text: null, parent: null }
const optionsB = stringHost()
const counterB = countOps(optionsB)
createRenderer(optionsB).createApp(Card, { title: '一张卡片' }).mount(containerB)

console.log('==== 宿主 A（假 DOM）产物 ====')
console.log(printDom(containerA))

console.log('\n==== 宿主 B（字符串）产物 ====')
console.log(serialize(containerB))

console.log('\n==== 两个宿主的操作次数 ====')
const keys = Object.keys(counterA)
const width = Math.max(...keys.map(k => k.length))
const pad = (s, w) => String(s).padEnd(w, ' ')
console.log(`  ${pad('操作', width)}   假 DOM   字符串`)
for (const key of keys) {
    console.log(`  ${pad(key, width)}   ${String(counterA[key]).padStart(5)}   ${String(counterB[key]).padStart(6)}`)
}

console.log('\n---- 结论 ----')
console.log('renderer 全程只调用注入进来的那 9 个函数，所以：')
console.log('  · 换成假 DOM 就是单测环境（不用 jsdom）')
console.log('  · 换成字符串拼接就是服务端渲染的雏形')
console.log('  · 官方把 runtime-core 与 runtime-dom 拆成两个包，原因就在这里')
