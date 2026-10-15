const { test } = require('node:test')
const assert = require('node:assert/strict')

const { reduxLike, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { initialState, userReducer, cartReducer, themeReducer } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })
const makeRedux = () => createStore(rootReducer, initialState)

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
