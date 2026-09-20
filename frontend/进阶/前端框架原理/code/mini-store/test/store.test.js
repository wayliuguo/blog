const { test } = require('node:test')
const assert = require('node:assert/strict')

const { reduxLike, zustandLike, signal, harness, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { create } = zustandLike
const { reactive, effect, signal: signalBox, computed } = signal
const { mount, shallowEqual } = harness
const { initialState, userReducer, cartReducer, themeReducer, selectors } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })
const makeRedux = () => createStore(rootReducer, initialState)
const makeZustand = () => create(() => ({ ...initialState }))

test('reducer 是纯函数：不改入参，不认领的 action 返回原引用', () => {
    const before = { items: 0 }
    const next = cartReducer(before, { type: 'cart/setItems', items: 5 })
    assert.notEqual(next, before)
    assert.deepEqual(before, { items: 0 })
    assert.equal(next.items, 5)
    assert.equal(cartReducer(before, { type: 'other' }), before)
})

test('combineReducers：所有切片都没变时返回原引用', () => {
    const store = makeRedux()
    const before = store.getState()
    store.dispatch({ type: 'nobody/cares' })
    assert.equal(store.getState(), before)

    store.dispatch({ type: 'cart/setItems', items: 1 })
    const after = store.getState()
    assert.notEqual(after, before)
    assert.equal(after.user, before.user) // 没碰到的切片原样带过去
    assert.notEqual(after.cart, before.cart)
})

test('dispatch 一律通知订阅者，哪怕这次更新与它无关', () => {
    const store = makeRedux()
    let notified = 0
    store.subscribe(() => {
        notified++
    })
    store.dispatch({ type: 'nobody/cares' })
    assert.equal(notified, 1)
    store.dispatch({ type: 'cart/setItems', items: 1 })
    assert.equal(notified, 2)
})

test('原地改 state 不会产生任何通知', () => {
    const store = makeRedux()
    let notified = 0
    store.subscribe(() => {
        notified++
    })
    store.getState().cart.items = 99
    assert.equal(notified, 0)
    assert.equal(store.getState().cart.items, 99)
})

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

test('effect 只依赖它读过的字段', () => {
    const state = reactive({ a: 1, b: 1 })
    let runs = 0
    effect(() => {
        runs++
        return state.a
    })
    assert.equal(runs, 1)
    state.b = 2
    assert.equal(runs, 1)
    state.a = 2
    assert.equal(runs, 2)
})

test('cleanup：分支切换后旧依赖失效', () => {
    const state = reactive({ flag: true, a: 'a', b: 'b' })
    let runs = 0
    effect(() => {
        runs++
        return state.flag ? state.a : state.b
    })
    state.b = 'B'
    assert.equal(runs, 1)
    state.flag = false
    assert.equal(runs, 2)
    state.a = 'A2'
    assert.equal(runs, 2) // a 已不在依赖里
    state.b = 'B2'
    assert.equal(runs, 3)
})

test('computed：惰性求值 + 缓存 + 无关字段不重算', () => {
    const state = reactive({ price: 10, qty: 2, noise: 0 })
    const total = computed(() => state.price * state.qty)
    assert.equal(total.value, 20)
    assert.equal(total.evaluations, 1)
    assert.equal(total.value, 20)
    assert.equal(total.evaluations, 1)

    state.price = 20
    assert.equal(total.evaluations, 1) // 只置脏
    assert.equal(total.value, 40)
    assert.equal(total.evaluations, 2)

    state.noise = 1
    assert.equal(total.value, 40)
    assert.equal(total.evaluations, 2)
})

test('signal 赋同值不触发', () => {
    const count = signalBox(1)
    let runs = 0
    effect(() => {
        runs++
        return count.value
    })
    count.value = 1
    assert.equal(runs, 1)
    count.value = 2
    assert.equal(runs, 2)
})

test('reactive 的嵌套对象是惰性代理，且同一对象只代理一次', () => {
    const raw = { nested: { value: 1 } }
    const state = reactive(raw)
    assert.equal(state.nested, state.nested)
    let runs = 0
    effect(() => {
        runs++
        return state.nested.value
    })
    state.nested.value = 2
    assert.equal(runs, 2)
})
