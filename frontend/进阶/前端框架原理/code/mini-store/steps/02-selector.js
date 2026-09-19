const { zustandLike, harness, demo } = require('../src')

const { create } = zustandLike
const { mount, shallowEqual } = harness
const { selectors, initialState } = demo

const store = create(() => ({ ...initialState }))

console.log('---- 三个组件各订阅一个切片 ----')
const comps = {
    header: mount(store, selectors.header, () => {}),
    badge: mount(store, selectors.badge, () => {}),
    toggle: mount(store, selectors.toggle, () => {})
}
const renders = () => [comps.header, comps.badge, comps.toggle].map((c) => c.renders).join(' / ')
console.log('挂载后渲染次数（user.name / cart.items / theme）=', renders())

console.log('')
console.log('---- setState({ cart: { items: 1 } }) ----')
store.setState({ cart: { items: 1 } })
console.log('渲染次数 =', renders(), ' <- 只有订阅 cart.items 的那个重渲染')
console.log('重渲染 =', [comps.header, comps.badge, comps.toggle].map((c) => c.renders - 1).join(' / '))

console.log('')
console.log('---- 赋同值：setState({ theme: "light" }) ----')
let notified = 0
const unsubscribe = store.subscribe(() => {
    notified++
})
const beforeSame = renders()
store.setState({ theme: 'light' })
console.log('store 层的订阅回调被调用 =', notified, '次 <- 逐键 Object.is 之后连通知都省了')
console.log('渲染次数有没有变 =', renders() !== beforeSame)
unsubscribe()

console.log('')
console.log('---- 两个键一起改 ----')
store.setState({ theme: 'dark', cart: { items: 2 } })
console.log('渲染次数 =', renders(), ' <- 各订阅者只收到一次通知')

console.log('')
console.log('---- 坑：选择器返回新对象 ----')
const toObject = (state) => ({ name: state.user.name })
const byReference = mount(store, toObject, () => {})
const byShallow = mount(store, toObject, () => {}, shallowEqual)
console.log('挂载后渲染 =', byReference.renders, '/', byShallow.renders)
store.setState({ cart: { items: 3 } })
store.setState({ cart: { items: 4 } })
console.log('两次无关更新后渲染 =', byReference.renders, '/', byShallow.renders)
console.log('Object.is：每次都是新对象 → 无关更新也重渲染')
console.log('shallowEqual：字段逐个比 → 无关更新被拦下')

console.log('')
console.log('---- 选择器在 store 层是不是也"免检"？ ----')
const emptyState = create(() => ({ ...initialState }))
let selectorCalls = 0
const counted = mount(emptyState, (state) => {
    selectorCalls++
    return state.cart.items
}, () => {})
emptyState.setState({ cart: { items: 1 } })
emptyState.setState({ cart: { items: 2 } })
console.log('选择器被调用次数 =', selectorCalls, '（2 次挂载：首次渲染 + 取初值；2 次通知）<- 每次通知都会跑一遍选择器，跑完才决定要不要渲染')
counted.unsubscribe()
