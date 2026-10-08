const { test } = require('node:test')
const assert = require('node:assert/strict')

const { reduxLike, zustandLike, harness, binding, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { create } = zustandLike
const { shallowEqual } = harness
const { createReduxBinding, createZustandBinding } = binding
const { initialState, userReducer, cartReducer, themeReducer, selectors } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })
const makeRedux = () => createStore(rootReducer, initialState)
const makeZustand = () => create(() => ({ ...initialState }))

test('useSelector 订阅切片：无关更新不重渲染，相关更新只重渲染一个', () => {
    const store = makeRedux()
    const redux = createReduxBinding(store)
    const { Provider, useSelector, useDispatch } = redux

    const header = Provider(() => useSelector(selectors.header))
    const badge = Provider(() => useSelector(selectors.badge))
    assert.equal(header.renders, 1)
    assert.equal(badge.renders, 1)

    useDispatch()({ type: 'cart/setItems', items: 1 })
    assert.equal(header.renders, 1)
    assert.equal(badge.renders, 2)
})

test('useSelector 的切片与新切片引用相等时不重渲染（combineReducers 短路后原样带回）', () => {
    const store = makeRedux()
    const redux = createReduxBinding(store)
    const { Provider, useSelector, useDispatch } = redux

    const header = Provider(() => useSelector(selectors.header))
    useDispatch()({ type: 'nobody/cares' })
    assert.equal(header.renders, 1)
})

test('useStore（Zustand）：订阅 + 选择器 + 引用相等，语义等价 useSyncExternalStore', () => {
    const store = makeZustand()
    const { useStore } = createZustandBinding(store)

    const h = useStore(selectors.header)
    const b = useStore(selectors.badge)
    assert.equal(h.renders, 1)
    assert.equal(b.renders, 1)

    store.setState({ cart: { items: 1 } })
    assert.equal(h.renders, 1)
    assert.equal(b.renders, 2)
})

test('useStore 赋同值：逐键 Object.is 拦下，连订阅回调都不触发', () => {
    const store = makeZustand()
    const { useStore } = createZustandBinding(store)

    const t = useStore(selectors.theme)
    store.setState({ theme: 'light' })
    assert.equal(t.renders, 1)
})

test('useStore 选择器返回新对象：默认 Object.is 失守，shallowEqual 拦下', () => {
    const store = makeZustand()
    const { useStore } = createZustandBinding(store)

    const toObject = state => ({ name: state.user.name })
    const byReference = useStore(toObject)
    const byShallow = useStore(toObject, shallowEqual)

    store.setState({ cart: { items: 1 } })
    store.setState({ cart: { items: 2 } })
    assert.equal(byReference.renders, 3)
    assert.equal(byShallow.renders, 1)
})
