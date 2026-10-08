const { test } = require('node:test')
const assert = require('node:assert/strict')

const { h, Fragment, createElement, TEXT_ELEMENT } = require('../src/index')

test('children 被放进 props.children，文本与元素分开处理', () => {
    const vdom = createElement('ul', { className: 'list' }, h('li', null, '苹果'), '散落的文本')
    assert.equal(vdom.type, 'ul')
    assert.equal(vdom.props.className, 'list')
    assert.equal(vdom.props.children.length, 2)
    assert.equal(vdom.props.children[0].type, 'li')
    assert.equal(vdom.props.children[1].type, TEXT_ELEMENT)
})

test('文本节点带 nodeValue，且数字会被转成字符串', () => {
    const vdom = createElement('p', null, 'count = ', 1 + 1)
    assert.deepEqual(
        vdom.props.children.map(c => c.props.nodeValue),
        ['count = ', '2']
    )
    assert.equal(vdom.props.children[0].props.nodeValue, 'count = ')
})

test('key 是独立字段，不污染 props', () => {
    const vdom = createElement('li', { key: 'a', id: 'x' }, '苹果')
    assert.equal(vdom.key, 'a')
    assert.equal(vdom.props.id, 'x')
    assert.equal('key' in vdom.props, false)
})

test('数组 children 会被拍平，null / undefined / false 被过滤', () => {
    const items = ['a', 'b'].map(name => h('li', null, name))
    const vdom = createElement('ul', null, items, null, false, undefined)
    assert.equal(vdom.props.children.length, 2)
})

test('Fragment 是 Symbol 类型的逻辑节点', () => {
    const vdom = h(Fragment, null, 'x')
    assert.equal(typeof vdom.type, 'symbol')
    assert.equal(vdom.props.children.length, 1)
})
