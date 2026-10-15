const { test } = require('node:test')
const assert = require('node:assert/strict')

const { effect } = require('../src/reactivity')
const { createPinia, setActivePinia, defineStore, storeToRefs, ref, isRef } = require('../src/pinia')

function makePinia() {
    setActivePinia(createPinia())
    const useCounter = defineStore('counter', () => {
        const count = ref(0)
        function increment(step = 1) {
            count.value += step
        }
        return { count, increment }
    })
    return { useCounter }
}

test('defineStore：id 即命名空间，同一个 id 只实例化一次', () => {
    const { useCounter } = makePinia()
    const a = useCounter()
    const b = useCounter()
    assert.equal(a, b)
    assert.equal(a.$id, 'counter')
})

test('setup store：ref 字段自动解包第一层，action 绑定到 store', () => {
    const { useCounter } = makePinia()
    const store = useCounter()
    assert.equal(store.count, 0) // 不是 store.count.value
    store.increment(2)
    assert.equal(store.count, 2)
})

test('修改 ref 字段会唤醒依赖它的 effect', () => {
    const { useCounter } = makePinia()
    const store = useCounter()
    let runs = 0
    effect(() => {
        runs++
        return store.count
    })
    assert.equal(runs, 1)
    store.increment()
    assert.equal(runs, 2)
})

test('storeToRefs：只解包第一层，action 不解包', () => {
    const { useCounter } = makePinia()
    const store = useCounter()
    const { count, increment } = storeToRefs(store)
    assert.equal(isRef(count), true)
    assert.equal(count.value, 0)
    assert.equal(typeof increment, 'function') // action 原样保留
})

test('$patch：批量更新生效，赋同值不触发依赖', () => {
    const { useCounter } = makePinia()
    const store = useCounter()
    let runs = 0
    effect(() => {
        runs++
        return store.count
    })
    assert.equal(runs, 1)
    store.$patch({ count: 5 })
    assert.equal(store.count, 5)
    assert.equal(runs, 2)
    store.$patch({ count: 5 }) // 逐键 Object.is，赋同值跳过
    assert.equal(store.count, 5)
    assert.equal(runs, 2)
})

test('跨 store 引用：一个 store 的 action 读另一个 store 的字段并建立依赖', () => {
    setActivePinia(createPinia())
    const useCounter = defineStore('counter', () => {
        const count = ref(1)
        function inc() {
            count.value += 1
        }
        return { count, inc }
    })
    // cart 的 getter 读 counter.count：依赖挂在 counter 的 ref 上
    const useCart = defineStore('cart', () => {
        const counter = useCounter()
        const total = ref(counter.count * 10)
        function refresh() {
            total.value = counter.count * 10
        }
        return { total, refresh }
    })

    const counter = useCounter()
    const cart = useCart()
    let runs = 0
    effect(() => {
        runs++
        return cart.total
    })
    assert.equal(runs, 1)

    cart.refresh()
    assert.equal(cart.total, 10)

    counter.inc() // 改 counter，不会自动重算 cart.total（无 getter 联动，refresh 手动同步）
    assert.equal(counter.count, 2)
    assert.equal(runs, 1)
})
