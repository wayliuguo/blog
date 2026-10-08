// 响应式底座精简实测（完整机制见本模块「手写 mini-vue」篇）
// 演示三层依赖表与 computed：改一个字段只唤醒读过它的 effect
const { reactive, effect, computed } = require('../src/reactivity')

console.log('---- 三个组件各订阅一个字段，挂载 ----')
const state = reactive({ user: { name: 'Ada' }, cart: { items: 0 }, theme: 'light' })
const runs = { header: 0, badge: 0, toggle: 0 }
effect(() => {
    runs.header++
    return state.user.name
})
effect(() => {
    runs.badge++
    return state.cart.items
})
effect(() => {
    runs.toggle++
    return state.theme
})
const snapshot = () => `${runs.header} / ${runs.badge} / ${runs.toggle}`
console.log('挂载后 effect 执行次数（user.name / cart.items / theme）=', snapshot())

console.log('')
console.log('---- state.cart.items = 1 ----')
state.cart.items = 1
console.log('三个 effect 的执行次数 =', snapshot(), ' <- 只有"读过 cart.items"的那个被唤醒')
console.log('被唤醒的 effect 数 =', runs.header + runs.badge + runs.toggle - 3, '/ 3')

console.log('')
console.log('---- computed：惰性 + 缓存 + 无关字段不重算 ----')
const nums = reactive({ price: 10, qty: 2, noise: 0 })
const total = computed(() => nums.price * nums.qty)
console.log('第一次读 total =', total.value, '| 计算次数 =', total.evaluations)
console.log('第二次读 total =', total.value, '| 计算次数 =', total.evaluations, ' <- 依赖没变，用缓存')
nums.price = 20
console.log('改 price 但还没读，计算次数 =', total.evaluations, ' <- 只置脏，不算')
console.log('读 total =', total.value, '| 计算次数 =', total.evaluations)
nums.noise = 1
console.log('改无关字段 noise 后读 total =', total.value, '| 计算次数 =', total.evaluations, ' <- 不在依赖里，不重算')
