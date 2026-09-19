const { test } = require('node:test')
const assert = require('node:assert/strict')

const { h, render, host, printTree } = require('../src/index')
const { recordOps } = require('./helper')

const fruits = [
    { id: 'a', name: '苹果' },
    { id: 'b', name: '香蕉' },
    { id: 'c', name: '橘子' }
]

// 无 key：身份退化成下标
const noKey = (items) => h('ul', null, ...items.map((it) => h('li', null, it.name)))
// 有 key：身份跟着数据走
const withKey = (items) => h('ul', null, ...items.map((it) => h('li', { key: it.id }, it.name)))

// 首屏挂载不在对比范围内，只记录"第二次渲染"产生的宿主操作
function opsOfUpdate(before, after) {
    const recorder = recordOps()
    const container = host.createInstance('div')

    render(before, container, { sync: true })
    recorder.start()
    render(after, container, { sync: true })
    recorder.stop()

    return { container, ops: recorder.ops }
}

test('无 key：删掉第一项时，剩下的元素被就地改写', () => {
    const { ops } = opsOfUpdate(noKey(fruits), noKey(fruits.slice(1)))
    assert.deepEqual(ops, [
        'remove <li> from <ul>',
        '"苹果".nodeValue = "香蕉"',
        '"香蕉".nodeValue = "橘子"'
    ])
})

test('有 key：删掉第一项只需要摘掉一个节点', () => {
    const { container, ops } = opsOfUpdate(withKey(fruits), withKey(fruits.slice(1)))
    assert.deepEqual(ops, ['remove <li> from <ul>'])
    assert.equal(printTree(container).includes('"香蕉"'), true)
    assert.equal(printTree(container).includes('"橘子"'), true)
})

test('类型不同：整棵子树重建，不尝试复用', () => {
    const { ops } = opsOfUpdate(
        h('div', null, h('p', null, '文本')),
        h('div', null, h('span', null, '文本'))
    )
    assert.deepEqual(ops, [
        'create <span>',
        'createText "文本"',
        'remove <p> from <div>',
        'append <span> → <div>',
        'append "文本" → <span>'
    ])
})

test('类型相同：只更新变化的属性，旧属性会被摘掉', () => {
    const { container } = opsOfUpdate(
        h('p', { id: 'a', title: '旧', hidden: 'true' }, 'x'),
        h('p', { id: 'a', title: '新' }, 'x')
    )
    assert.deepEqual(container.children[0].attrs, { id: 'a', title: '新' })
})

test('文本变化：只写一次 nodeValue，不动节点结构', () => {
    const { ops } = opsOfUpdate(h('p', null, 'A'), h('p', null, 'B'))
    assert.deepEqual(ops, ['"A".nodeValue = "B"'])
})

test('末尾新增：appendChild 追加到父节点末尾', () => {
    const { container, ops } = opsOfUpdate(
        h('div', null, h('a', { key: '1' })),
        h('div', null, h('a', { key: '1' }), h('b', { key: '2' }))
    )
    assert.deepEqual(ops, ['create <b>', 'append <b> → <div>'])
    assert.equal(container.children[0].children.map((c) => c.type).join(','), 'a,b')
})

test('头部插入：insertBefore 把新节点插到旧节点之前', () => {
    const { container, ops } = opsOfUpdate(
        h('div', null, h('b', { key: '2' })),
        h('div', null, h('a', { key: '1' }), h('b', { key: '2' }))
    )
    assert.deepEqual(ops, ['create <a>', 'insert <a> before <b>'])
    assert.equal(container.children[0].children.map((c) => c.type).join(','), 'a,b')
})

test('改名不改身份：key 相同就复用节点，只改属性', () => {
    const { container, ops } = opsOfUpdate(
        h('div', null, h('span', { key: 'x', title: '旧' }, '文案')),
        h('div', null, h('span', { key: 'x', title: '新' }, '文案'))
    )
    assert.deepEqual(ops, [])
    assert.equal(container.children[0].children[0].attrs.title, '新')
})
