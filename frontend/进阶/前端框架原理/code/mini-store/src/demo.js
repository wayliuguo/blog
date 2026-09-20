// 三条路线共用同一份状态与同一个改动，逐条对照才有意义。
// 状态是一棵有三个切片的小树：user / cart / theme

const initialState = {
    user: { name: 'Ada' },
    cart: { items: 0 },
    theme: 'light'
}

const userReducer = (state = initialState.user, action) =>
    action.type === 'user/setName' ? { ...state, name: action.name } : state

const cartReducer = (state = initialState.cart, action) =>
    action.type === 'cart/setItems' ? { ...state, items: action.items } : state

const themeReducer = (state = initialState.theme, action) => (action.type === 'theme/set' ? action.theme : state)

// 三个"组件"各订阅一个切片，切片值都是原始类型，便于比较
const selectors = {
    header: state => state.user.name,
    badge: state => state.cart.items,
    toggle: state => state.theme
}

module.exports = { initialState, userReducer, cartReducer, themeReducer, selectors }
