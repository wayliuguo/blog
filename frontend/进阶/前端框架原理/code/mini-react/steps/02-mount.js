/**
 * 第 2 步：把虚拟 DOM 挂到真实节点上（首次渲染）
 *
 * 这一步仍然没有 diff：整棵树全新创建、全部 PLACEMENT。
 * 渲染器只调用 host 里的 6 个操作，与"是不是浏览器"无关。
 *
 * 运行：npm run step:mount
 */
const { h, Fragment, render, host, printTree } = require('../src/index')

function Header({ title }) {
    return h('h1', { className: 'title' }, title)
}

function App() {
    return h(
        Fragment,
        null,
        h(Header, { title: '待办清单' }),
        h(
            'ul',
            null,
            h('li', { key: 'a' }, '写文档'),
            h('li', { key: 'b' }, '跑单测')
        )
    )
}

const container = host.createInstance('div')

console.log('---- 渲染前 ----')
console.log(printTree(container) || '（空容器）')

render(h(App, null), container, { sync: true })

console.log('\n---- 渲染后 ----')
console.log(printTree(container))

console.log('\n---- 观察点 ----')
console.log('1. App / Header / Fragment 都没有自己的 DOM 节点，它们的孩子直接挂到容器上')
console.log('2. 文本被包装成独立节点，所以 <h1> 下是「一个文本节点」而不是字符串')
console.log('3. 整个渲染器只用到 6 个宿主操作：createInstance / createTextInstance /')
console.log('   appendChild / insertBefore / removeChild / setProperty')
