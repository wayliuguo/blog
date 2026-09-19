const { test } = require('node:test')
const assert = require('node:assert/strict')

const { h, Fragment, render, host, printTree, printFibers } = require('../src/index')

test('首次渲染：元素、属性、文本都落到宿主节点上', () => {
    const container = host.createInstance('div')
    render(h('h1', { className: 'title' }, '你好'), container, { sync: true })
    assert.equal(
        printTree(container),
        ['<div>', '  <h1 className="title">', '    "你好"', '  </h1>', '</div>'].join('\n')
    )
})

test('函数组件与 Fragment 不产生自己的 DOM 节点', () => {
    const container = host.createInstance('div')
    function App() {
        return h(Fragment, null, h('span', null, 'a'), h('span', null, 'b'))
    }
    render(h(App, null), container, { sync: true })

    assert.equal(container.children.length, 2, '两个 span 直接挂在容器下')
    assert.equal(container.children[0].type, 'span')
    assert.equal(printFibers(container).includes('App  dom:（无）'), true)
})

test('渲染走的是宿主抽象：只有 host 的 6 个操作参与', () => {
    const names = ['createInstance', 'createTextInstance', 'appendChild', 'insertBefore', 'removeChild', 'setProperty']
    for (const name of names) assert.equal(typeof host[name], 'function', `host.${name} 必须存在`)
})

test('null 子节点被跳过，不会产生空文本节点', () => {
    const container = host.createInstance('div')
    render(h('ul', null, h('li', null, 'a'), null, false), container, { sync: true })
    assert.equal(container.children[0].children.length, 1)
})
