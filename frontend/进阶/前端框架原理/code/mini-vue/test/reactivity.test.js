const { test } = require('node:test')
const assert = require('node:assert/strict')

require('./fake-dom')

const { reactive, readonly, isReactive, isReadonly, isProxy, ref, isRef, unref, proxyRefs, computed, effect, stop, describeDeps, resetDebug } = require('../src/reactivity')

test('reactive：effect 读过才收集依赖，没读过的不触发', () => {
    const state = reactive({ a: 1, b: 2 })
    let runs = 0
    effect(() => {
        void state.a
        runs++
    })
    assert.equal(runs, 1)

    state.b = 10 // 没人依赖
    assert.equal(runs, 1)

    state.a = 10
    assert.equal(runs, 2)
})

test('reactive：惰性深度代理，同一个对象只代理一次', () => {
    const raw = { nested: { deep: 1 } }
    const state = reactive(raw)

    assert.equal(isReactive(state), true)
    assert.equal(state.nested, state.nested, '缓存命中，不会是两个不同的代理')
    assert.equal(isReactive(state.nested), true)
    assert.equal(isReactive(raw), false, '原对象没被改造')
})

test('reactive：新增属性与数组下标都能被追踪（Proxy 相对 defineProperty 的优势）', () => {
    const state = reactive({ list: ['a'] })
    const seen = []
    effect(() => seen.push(`${state.added}|${state.list[0]}`))

    state.added = 'x'
    state.list[0] = 'b'
    assert.deepEqual(seen, ['undefined|a', 'x|a', 'x|b'])
})

test('readonly：读不收集依赖，写被忽略', () => {
    const raw = { count: 1 }
    const copy = readonly(raw)
    assert.equal(isReadonly(copy), true)
    assert.equal(isReadonly(raw), false)
    assert.equal(isProxy(copy), true)

    effect(() => {
        void copy.count
    })
    resetDebug() // 调试记录里只剩"这次读产生的依赖"，便于断言
    assert.equal(describeDeps(), '  （空）', 'readonly 读属性不收集依赖')

    const warnings = []
    const rawWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
    copy.count = 2
    console.warn = rawWarn

    assert.equal(warnings.length, 1, '写 readonly 会告警')
    assert.equal(raw.count, 1, '值没有被改动')
})

test('effect：分支切换时清理旧依赖', () => {
    const state = reactive({ flag: true, a: 1, b: 2 })
    let runs = 0
    effect(() => {
        state.flag ? void state.a : void state.b
        runs++
    })

    state.flag = false
    assert.equal(runs, 2)

    state.a = 100 // 旧分支的依赖应该已经清掉
    assert.equal(runs, 2)

    state.b = 200
    assert.equal(runs, 3)
})

test('effect：stop 之后不再被唤醒', () => {
    const state = reactive({ n: 0 })
    const seen = []
    const runner = effect(() => seen.push(state.n))
    state.n = 1
    stop(runner)
    state.n = 2
    assert.deepEqual(seen, [0, 1])
})

test('effect：带 scheduler 时不直接执行', () => {
    const state = reactive({ n: 0 })
    let runs = 0
    const jobs = []
    effect(() => { void state.n; runs++ }, { scheduler: () => jobs.push(1) })

    state.n = 1
    assert.equal(runs, 1, 'effect 体没被执行')
    assert.equal(jobs.length, 1, '只把任务交给了 scheduler')
})

test('ref：基本类型也能被追踪，对象会被转成 reactive', () => {
    const count = ref(0)
    const obj = ref({ a: 1 })
    assert.equal(isRef(count), true)
    assert.equal(isReactive(obj.value), true)

    const seen = []
    effect(() => seen.push(count.value))
    count.value = 1
    count.value = 1 // 值没变，不该触发
    assert.deepEqual(seen, [0, 1])
})

test('unref / proxyRefs：模板里不用写 .value', () => {
    const count = ref(1)
    assert.equal(unref(count), 1)
    assert.equal(unref(2), 2)

    const state = proxyRefs({ count, title: 'hi' })
    assert.equal(state.count, 1)
    state.count = 5 // 写回 ref.value，引用不变
    assert.equal(count.value, 5)
    assert.equal(state.title, 'hi')
})

test('computed：惰性 + 缓存，依赖变化只置脏不重算', () => {
    let calls = 0
    const cart = reactive({ price: 10, count: 2 })
    const total = computed(() => {
        calls++
        return cart.price * cart.count
    })

    assert.equal(total.value, 20)
    assert.equal(total.value, 20)
    assert.equal(calls, 1, '第二次读命中缓存')

    cart.count = 3
    assert.equal(calls, 1, '依赖变了也不立刻重算')

    assert.equal(total.value, 30)
    assert.equal(calls, 2)
})

test('computed：被 effect 依赖时，依赖变化能唤醒 effect', () => {
    const cart = reactive({ price: 10 })
    const total = computed(() => cart.price * 2)
    const seen = []
    effect(() => seen.push(total.value))

    cart.price = 20
    assert.deepEqual(seen, [20, 40])
})
