/**
 * 第 1 步：createElement 产出的是什么
 *
 * JSX 只是语法糖，编译结果就是一层层的 createElement 调用。
 * 这一步不渲染，只看"虚拟 DOM 树"长什么样。
 *
 * 运行：npm run step:element
 */
const { h, Fragment, TEXT_ELEMENT } = require('../src/index')

// 等价于 JSX：
// <ul className="list">
//   <li>苹果</li>
//   <li>{1 + 1}</li>
//   <>{/* Fragment 不产生真实节点 */}</>
// </ul>
const vdom = h(
    'ul',
    { className: 'list' },
    h('li', null, '苹果'),
    h('li', null, 1 + 1),
    h(Fragment, null, h('li', null, '橘子'))
)

function describe(node, indent = 0) {
    const pad = '  '.repeat(indent)
    if (node.type === TEXT_ELEMENT) return `${pad}文本 "${node.props.nodeValue}"`
    if (typeof node.type === 'function') return `${pad}<${node.type.name} />`

    const isFragment = node.type === Fragment
    const attrs = Object.entries(node.props)
        .filter(([k]) => k !== 'children')
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    const key = node.key === null ? '' : ` key="${node.key}"`
    const tag = isFragment ? 'Fragment' : node.type
    const open = `${pad}<${tag}${isFragment ? '' : attrs}${isFragment ? '' : key}>`
    const children = node.props.children.map(child => describe(child, indent + 1))
    return [open, ...children, `${pad}</${tag}>`].join('\n')
}

console.log('---- createElement 的产物 ----')
console.log(describe(vdom))

console.log('\n---- 几个关键字段 ----')
console.log('type            :', JSON.stringify(vdom.type))
console.log('key             :', vdom.key)
console.log('props.className :', vdom.props.className)
console.log('props.children  :', vdom.props.children.length, '个子节点（文本也被包成节点）')
console.log('children[0].type:', JSON.stringify(vdom.props.children[0].type))
console.log('children[1].type:', JSON.stringify(vdom.props.children[1].type))
console.log('数字 1+1 被转成了:', JSON.stringify(vdom.props.children[1].props.children[0].props.nodeValue))
console.log('children[2].type:', String(vdom.props.children[2].type))
