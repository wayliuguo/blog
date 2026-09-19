const { signal, demo } = require('../src')

const { reactive, effect, computed, signal: signalBox } = signal
const { initialState } = demo

console.log('---- 三个组件各订阅一个切片，挂载 ----')
const state = reactive({
    user: { ...initialState.user },
    cart: { ...initialState.cart },
    theme: initialState.theme
})
const runs = { header: 0, badge: 0, toggle: 0 }
effect(() => {
    runs.header++
    const value = state.user.name
    return value
})
effect(() => {
    runs.badge++
    const value = state.cart.items
    return value
})
effect(() => {
    runs.toggle++
    const value = state.theme
    return value
})
const snapshot = () => `${runs.header} / ${runs.badge} / ${runs.toggle}`
console.log('挂载后 effect 执行次数（user.name / cart.items / theme）=', snapshot())

console.log('')
console.log('---- state.cart.items = 1 ----')
state.cart.items = 1
console.log('三个 effect 的执行次数 =', snapshot(), ' <- 只有"读过 cart.items"的那个被唤醒')
console.log('被唤醒的 effect 数 =', runs.header + runs.badge + runs.toggle - 3, '/ 3')

console.log('')
console.log('---- 没读过的字段不算依赖 ----')
const box = reactive({ a: 1, b: 1 })
let boxRuns = 0
effect(() => {
    boxRuns++
    const value = box.a
    return value
})
box.b = 2
console.log('只读 a 的 effect，改 b 之后执行次数 =', boxRuns)
box.a = 2
console.log('改 a 之后执行次数 =', boxRuns)

console.log('')
console.log('---- 动态依赖：分支切换要清掉旧依赖 ----')
const cond = reactive({ flag: true, a: 'a', b: 'b' })
let branchRuns = 0
effect(() => {
    branchRuns++
    const value = cond.flag ? cond.a : cond.b
    return value
})
cond.b = 'B'
console.log('flag=true 时改 b，执行次数 =', branchRuns, ' <- cleanup 先摘掉旧依赖，没读到的字段唤不醒它')
cond.a = 'A'
console.log('flag=true 时改 a，执行次数 =', branchRuns)
cond.flag = false
console.log('切到 b 分支，执行次数 =', branchRuns)
cond.a = 'A2'
console.log('此时改 a，执行次数 =', branchRuns, ' <- 重新收集之后，a 已经不在依赖里')

console.log('')
console.log('---- computed：惰性 + 缓存 ----')
const nums = reactive({ price: 10, qty: 2, noise: 0 })
const total = computed(() => nums.price * nums.qty)
console.log('第一次读 total =', total.value, '| 计算次数 =', total.evaluations)
console.log('第二次读 total =', total.value, '| 计算次数 =', total.evaluations, ' <- 依赖没变，用缓存')
nums.price = 20
console.log('改 price 但还没读，计算次数 =', total.evaluations, ' <- 只置脏，不算')
console.log('读 total =', total.value, '| 计算次数 =', total.evaluations)
nums.noise = 1
console.log('改无关字段 noise 后读 total =', total.value, '| 计算次数 =', total.evaluations, ' <- 不在依赖里，不重算')

console.log('')
console.log('---- signal 与 reactive 的分工 ----')
const count = signalBox(0)
let signalRuns = 0
effect(() => {
    signalRuns++
    const value = count.value
    return value
})
count.value = 0
console.log('给 signal 赋同值，effect 执行次数 =', signalRuns, ' <- set 里先做 Object.is，同值直接 return')
count.value = 1
console.log('赋新值，effect 执行次数 =', signalRuns)
