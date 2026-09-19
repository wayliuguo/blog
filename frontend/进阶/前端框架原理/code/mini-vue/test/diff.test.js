const { test } = require('node:test')
const assert = require('node:assert/strict')

const { createRenderer, h } = require('../src/runtime-core')
const { nodeOps } = require('../src/runtime-dom/nodeOps')
const { patchProp } = require('../src/runtime-dom/patchProp')
const { document, recordNodeOps, printDom } = require('./fake-dom')

const fruits = [
    { id: 'a', name: '苹果' },
    { id: 'b', name: '香蕉' },
    { id: 'c', name: '橘子' }
]

const noKey = (items) => h('ul', null, items.map((it) => h('li', { 'data-id': it.id }, it.name)))
const withKey = (items) =>
    h('ul', null, items.map((it) => h('li', { key: it.id, 'data-id': it.id }, it.name)))

// 只记录"第二次渲染"产生的宿主操作
function opsOfUpdate(before, after) {
    const options = { ...nodeOps, patchProp }
    const ops = recordNodeOps(options)
    const { render } = createRenderer(options)
    const container = document.createElement('div')

    render(before, container)
    ops.length = 0
    render(after, container)
    return { ops, container }
}

test('无 key：删掉第一项 = 就地改写剩下的 + 删掉末尾', () => {
    const { ops } = opsOfUpdate(noKey(fruits), noKey(fruits.slice(1)))
    assert.deepEqual(ops, [
        'patchProp(<li>, data-id = "b")',
        'setElementText(<li>, "香蕉")',
        'patchProp(<li>, data-id = "c")',
        'setElementText(<li>, "橘子")',
        'remove(<li>)'
    ])
})

test('有 key：删掉第一项只需要摘掉一个节点', () => {
    const { ops, container } = opsOfUpdate(withKey(fruits), withKey(fruits.slice(1)))
    assert.deepEqual(ops, ['remove(<li>)'])
    assert.equal(container.childNodes[0].childNodes.length, 2)
})

test('无 key：纯重排靠"就地改写"完成（内容按位置重写）', () => {
    const reordered = [fruits[2], fruits[0], fruits[1]]
    const { ops } = opsOfUpdate(noKey(fruits), noKey(reordered))
    // 三个 <li>：每个都被改了属性 + 改了文案，节点一个都没动
    assert.equal(ops.length, 6)
    assert.equal(ops.every((line) => !line.startsWith('insert')), true)
})

test('有 key：纯重排只搬移节点，不改内容', () => {
    const reordered = [fruits[2], fruits[0], fruits[1]]
    const { ops, container } = opsOfUpdate(withKey(fruits), withKey(reordered))
    assert.equal(ops.length, 3, '三次搬移')
    assert.equal(ops.every((line) => line.startsWith('insert')), true)
    assert.equal(
        container.childNodes[0].childNodes.map((li) => li.getAttribute('data-id')).join(','),
        'c,a,b'
    )
})

test('头部新增：插到旧节点之前', () => {
    const { ops, container } = opsOfUpdate(
        h('ul', null, [h('li', { key: 'b' }, 'b')]),
        h('ul', null, [h('li', { key: 'a' }, 'a'), h('li', { key: 'b' }, 'b')])
    )
    assert.deepEqual(ops, [
        'createElement(<li>)',
        'setElementText(<li>, "a")',
        'insert(<li>, before <li>)'
    ])
    assert.equal(container.childNodes[0].childNodes.length, 2)
})

test('尾部新增与尾部删除', () => {
    const add = opsOfUpdate(
        h('ul', null, [h('li', { key: 'a' }, 'a')]),
        h('ul', null, [h('li', { key: 'a' }, 'a'), h('li', { key: 'b' }, 'b')])
    )
    assert.equal(add.ops.filter((l) => l.startsWith('insert')).length, 1)

    const del = opsOfUpdate(
        h('ul', null, [h('li', { key: 'a' }, 'a'), h('li', { key: 'b' }, 'b')]),
        h('ul', null, [h('li', { key: 'a' }, 'a')])
    )
    assert.deepEqual(del.ops, ['remove(<li>)'])
})

test('类型变了：即使 key 相同也不复用', () => {
    const { ops } = opsOfUpdate(
        h('div', null, [h('p', { key: 'x' }, '文字')]),
        h('div', null, [h('span', { key: 'x' }, '文字')])
    )
    assert.equal(ops.some((l) => l.startsWith('remove')), true, '旧节点被摘掉')
    assert.equal(ops.some((l) => l.startsWith('createElement(<span>)')), true, '新节点被创建')
    assert.equal(printDom(document.createElement('div')).length > 0, true)
})

test('同一位置换成组件：走组件挂载而不是元素 patch', () => {
    const Child = { setup: () => () => h('b', null, 'child') }
    const { ops } = opsOfUpdate(
        h('div', null, [h('i', null, 'i')]),
        h('div', null, [h(Child)])
    )
    assert.equal(ops.some((l) => l.includes('createElement(<b>)')), true)
})
