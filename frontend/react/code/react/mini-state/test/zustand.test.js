const { test } = require('node:test')
const assert = require('node:assert/strict')

const { zustandLike, harness, demo } = require('../src')

const { create } = zustandLike
const { mount, shallowEqual } = harness
const { selectors, initialState } = demo

const makeZustand = () => create(() => ({ ...initialState }))

test('setState 默认浅合并，未提到的键保持不动', () => {
    const store = makeZustand()
    store.setState({ cart: { items: 1 } })
    assert.deepEqual(store.getState().cart, { items: 1 })
    assert.equal(store.getState().user.name, 'Ada')
    assert.equal(store.getState().theme, 'light')
})

test('setState 逐键比较：赋同值不通知，部分键变了才通知', () => {
    const store = makeZustand()
    let notified = 0
    store.subscribe(() => {
        notified++
    })
    store.setState({ theme: 'light' })
    assert.equal(notified, 0)

    store.setState({ theme: 'light', cart: { items: 1 } })
    assert.equal(notified, 1)

    // 新对象但内容相同：这一层仍会认为"变了"（只比键，不比深层）
    const first = store.getState().cart
    store.setState({ cart: { items: 1 } })
    assert.equal(notified, 2)
    assert.notEqual(store.getState().cart, first)
})

test('选择器切片不变时跳过重渲染', () => {
    const store = makeZustand()
    const header = mount(store, selectors.header, () => {})
    const badge = mount(store, selectors.badge, () => {})
    assert.equal(header.renders, 1)
    assert.equal(badge.renders, 1)

    store.setState({ cart: { items: 1 } })
    assert.equal(header.renders, 1)
    assert.equal(badge.renders, 2)
})

test('选择器返回新对象：Object.is 失守，shallowEqual 才拦得住', () => {
    const store = makeZustand()
    const toObject = () => state => ({ name: state.user.name })
    const byReference = mount(store, toObject(), () => {})
    const byShallow = mount(store, toObject(), () => {}, shallowEqual)

    store.setState({ cart: { items: 1 } })
    store.setState({ cart: { items: 2 } })
    assert.equal(byReference.renders, 3)
    assert.equal(byShallow.renders, 1)
})

test('订阅可以取消，取消之后不再重渲染', () => {
    const store = makeZustand()
    const badge = mount(store, selectors.badge, () => {})
    badge.unsubscribe()
    store.setState({ cart: { items: 1 } })
    assert.equal(badge.renders, 1)
})
