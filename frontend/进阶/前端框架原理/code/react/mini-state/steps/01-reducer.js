const { reduxLike, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { initialState, userReducer, cartReducer, themeReducer } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })
const store = createStore(rootReducer, initialState)

console.log('---- 初始状态 ----')
const first = store.getState()
console.log('user.name =', first.user.name, '| cart.items =', first.cart.items, '| theme =', first.theme)

let notified = 0
store.subscribe(() => {
    notified++
})

console.log('')
console.log('---- dispatch({ type: "cart/setItems", items: 1 }) ----')
store.dispatch({ type: 'cart/setItems', items: 1 })
const after = store.getState()
console.log('cart.items =', after.cart.items)
console.log('根对象换了新引用 =', after !== first)
console.log('user 切片换了新引用 =', after.user !== first.user, ' <- 没被碰到的切片原样带过去')
console.log('cart 切片换了新引用 =', after.cart !== first.cart)
console.log('订阅者被叫醒 =', notified, '次 <- dispatch 之后一律通知，不看"这次更新跟谁有关"')

console.log('')
console.log('---- dispatch 一个没人认领的 action ----')
const rootBefore = store.getState()
store.dispatch({ type: 'nobody/cares' })
console.log('根对象换了新引用 =', store.getState() !== rootBefore, ' <- combineReducers 逐片比较后短路')
console.log('订阅者被叫醒 =', notified, '次（累计） <- 但通知照样发出去了')

console.log('')
console.log('---- reducer 是纯函数 ----')
const cartState = { items: 0 }
const nextCart = cartReducer(cartState, { type: 'cart/setItems', items: 5 })
console.log('返回值 =', JSON.stringify(nextCart), '| 入参被改动 =', JSON.stringify(cartState) !== '{"items":0}')
const untouched = cartReducer(cartState, { type: 'other' })
console.log('不认领的 action → 返回原引用 =', untouched === cartState)

console.log('')
console.log('---- 直接原地改的后果 ----')
const beforeMutate = notified
store.getState().cart.items = 99
console.log('原地改 cart.items，订阅者被叫醒 =', notified - beforeMutate, '次 <- 不经过 dispatch，没有任何通知')
console.log('（订阅者看到的还是那个 99，但它没有任何机会知道）')
