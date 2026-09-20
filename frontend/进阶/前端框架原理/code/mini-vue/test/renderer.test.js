const { test } = require('node:test')
const assert = require('node:assert/strict')

const { createRenderer, h } = require('../src/runtime-core')
const { nodeOps } = require('../src/runtime-dom/nodeOps')
const { patchProp } = require('../src/runtime-dom/patchProp')
const { document, printDom, recordNodeOps } = require('./fake-dom')

// 每个用例一份独立的宿主操作 + 一个空容器
function setup() {
    const options = { ...nodeOps, patchProp }
    const ops = recordNodeOps(options)
    const { render } = createRenderer(options)
    return { render, ops, container: document.createElement('div') }
}

test('挂载元素：属性、类名、文本都落到节点上', () => {
    const { render, container } = setup()
    render(h('div', { id: 'app', class: 'box' }, '你好'), container)
    assert.equal(
        printDom(container),
        ['<div>', '  <div id="app" class="box">', '    "你好"', '  </div>', '</div>'].join('\n')
    )
})

test('文本换数组：先清空再挂数组（否则会和新孩子叠在一起）', () => {
    const { render, ops, container } = setup()
    render(h('div', null, '纯文本'), container)
    ops.length = 0
    render(h('div', null, [h('span', null, 'a'), h('span', null, 'b')]), container)

    assert.deepEqual(ops, [
        'setElementText(<div>, "")',
        'createElement(<span>)',
        'setElementText(<span>, "a")',
        'insert(<span>, append → <div>)',
        'createElement(<span>)',
        'setElementText(<span>, "b")',
        'insert(<span>, append → <div>)'
    ])
    assert.equal(container.childNodes[0].textContent, 'ab')
})

test('事件：新函数会覆盖旧监听器，摘掉属性时监听器也要摘掉', () => {
    const { render, container } = setup()
    const clicks = []
    const first = () => clicks.push('first')
    const second = () => clicks.push('second')

    render(h('button', { onClick: first }, 'x'), container)
    const el = container.childNodes[0]
    el.dispatch('click')

    render(h('button', { onClick: second }, 'x'), container)
    el.dispatch('click')

    render(h('button', null, 'x'), container)
    el.dispatch('click')

    assert.deepEqual(clicks, ['first', 'second'])
})

test('class / value 走 DOM property，其余走 attribute', () => {
    const { render, container } = setup()
    render(h('input', { class: 'a b', value: 'hi', 'data-x': '1', checked: true }), container)
    const el = container.childNodes[0]

    assert.equal(el.className, 'a b')
    assert.equal(el.value, 'hi')
    assert.equal(el.checked, true)
    assert.equal(el.getAttribute('data-x'), '1')
})

test('属性增删：新 props 里没有的要被摘掉', () => {
    const { render, container } = setup()
    render(h('p', { id: 'a', title: '旧' }, 'x'), container)
    render(h('p', { id: 'a' }, 'x'), container)

    const el = container.childNodes[0]
    assert.equal(el.getAttribute('id'), 'a')
    assert.equal(el.getAttribute('title'), null)
})

test('render 返回数组：用一个 Fragment 包起来，没有多余的包裹节点', () => {
    const { render, container } = setup()
    render([h('a', null, '1'), h('b', null, '2')], container)
    assert.equal(
        container.childNodes
            .filter(c => c.type !== '#text') // Fragment 用两个空文本当锚点
            .map(c => c.type)
            .join(','),
        'a,b'
    )
})

test('render(null) 卸载整棵树', () => {
    const { render, container } = setup()
    render(h('div', null, [h('a', null, '1')]), container)
    assert.equal(container.childNodes.length, 1)
    render(null, container)
    assert.equal(container.childNodes.length, 0)
})
