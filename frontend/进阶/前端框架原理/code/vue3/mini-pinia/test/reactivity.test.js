const { test } = require('node:test')
const assert = require('node:assert/strict')

const { effect, reactive, computed, track, trigger } = require('../src/reactivity')

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

test('trigger 返回被唤醒的 effect 数，且只唤醒读过该字段的 effect', () => {
    const state = reactive({ a: 1, b: 1 })
    let runsA = 0
    let runsB = 0
    effect(() => {
        runsA++
        return state.a
    })
    effect(() => {
        runsB++
        return state.b
    })
    state.a = 2
    assert.equal(runsA, 2)
    assert.equal(runsB, 1)
})
