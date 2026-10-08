const { reduxLike, zustandLike, harness, binding, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { create } = zustandLike
const { shallowEqual } = harness
const { createReduxBinding, createZustandBinding } = binding
const { initialState, userReducer, cartReducer, themeReducer, selectors } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })

console.log('---- Redux 绑定：Provider + useSelector + useDispatch ----')
const reduxStore = createStore(rootReducer, initialState)
const redux = createReduxBinding(reduxStore)
const { Provider, useSelector, useDispatch } = redux

// 三个组件：每个都用 useSelector 订阅一个切片（挂载即首次渲染）
const header = Provider(() => useSelector(selectors.header))
const badge = Provider(() => useSelector(selectors.badge))
const toggle = Provider(() => useSelector(selectors.toggle))
const renders = () => `${header.renders} / ${badge.renders} / ${toggle.renders}`
console.log('挂载后渲染次数（user.name / cart.items / theme）=', renders())

console.log('')
console.log('---- dispatch({ type: "cart/setItems", items: 1 }) ----')
const dispatch = useDispatch()
dispatch({ type: 'cart/setItems', items: 1 })
console.log('渲染次数 =', renders(), ' <- 只有订阅 cart.items 的组件重渲染')
console.log('重渲染 =', `${header.renders - 1} / ${badge.renders - 1} / ${toggle.renders - 1}`)

console.log('')
console.log('---- dispatch 一个没人认领的 action ----')
const rootBefore = reduxStore.getState()
dispatch({ type: 'nobody/cares' })
console.log('根对象换了新引用 =', reduxStore.getState() !== rootBefore, ' <- combineReducers 逐片比较后短路')
console.log('渲染次数 =', renders(), ' <- 选择器切片没变，3 个组件都不重渲染')

console.log('')
console.log('---- Zustand 绑定：useStore（getSnapshot + subscribe + selector）----')
const zustandStore = create(() => ({ ...initialState }))
const zustand = createZustandBinding(zustandStore)
const { useStore } = zustand

const h = useStore(selectors.header)
const b = useStore(selectors.badge)
const t = useStore(selectors.toggle)
const zRenders = () => `${h.renders} / ${b.renders} / ${t.renders}`
console.log('挂载后渲染次数 =', zRenders())

console.log('')
console.log('---- setState({ cart: { items: 1 } }) ----')
zustandStore.setState({ cart: { items: 1 } })
console.log('渲染次数 =', zRenders(), ' <- 只有订阅 cart.items 的组件重渲染')

console.log('')
console.log('---- 赋同值：setState({ theme: "light" }) ----')
zustandStore.setState({ theme: 'light' })
console.log('渲染次数 =', zRenders(), ' <- 逐键 Object.is 之后连通知都省了')

console.log('')
console.log('---- 坑：选择器返回新对象 ----')
const toObject = state => ({ name: state.user.name })
const byReference = useStore(toObject)
const byShallow = useStore(toObject, shallowEqual)
console.log('挂载后渲染 =', `${byReference.renders} / ${byShallow.renders}`)
zustandStore.setState({ cart: { items: 2 } })
zustandStore.setState({ cart: { items: 3 } })
console.log('两次无关更新后渲染 =', `${byReference.renders} / ${byShallow.renders}`)
console.log('Object.is：每次都是新对象 → 无关更新也重渲染')
console.log('shallowEqual：字段逐个比 → 无关更新被拦下')
