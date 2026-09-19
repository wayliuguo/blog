const { reduxLike, zustandLike, signal, harness, demo } = require('../src')

const { createStore, combineReducers } = reduxLike
const { create } = zustandLike
const { reactive, effect } = signal
const { mount, shallowEqual } = harness
const { initialState, userReducer, cartReducer, themeReducer, selectors } = demo

const rootReducer = combineReducers({ user: userReducer, cart: cartReducer, theme: themeReducer })
const KEYS = ['header', 'badge', 'toggle']

// 给 store 装一个计数器：每一次订阅回调被执行，都记一笔"store 叫醒了谁"
function instrument(store) {
    const stats = { notified: 0 }
    const rawSubscribe = store.subscribe.bind(store)
    store.subscribe = (listener) =>
        rawSubscribe(() => {
            stats.notified++
            listener()
        })
    return stats
}

// 路线一 / 二：订阅 + 选择器（订阅整棵树时选择器就是 s => s）
function runStoreRoute(store, select, apply) {
    const stats = instrument(store)
    const comps = KEYS.map((key) => mount(store, select(key), () => {}))
    apply(store)
    return { woken: stats.notified, renders: comps.reduce((sum, c) => sum + c.renders - 1, 0) }
}

// 路线三：effect 逐字段收集依赖，"被唤醒"就是 effect 真的被执行了一次
function runSignalRoute(apply) {
    const state = reactive({
        user: { ...initialState.user },
        cart: { ...initialState.cart },
        theme: initialState.theme
    })
    const runs = {}
    for (const key of KEYS) {
        runs[key] = 0
        effect(() => {
            runs[key]++
            const value = selectors[key](state)
            return value
        })
    }
    apply(state)
    const woken = KEYS.reduce((sum, key) => sum + runs[key] - 1, 0)
    return { woken, renders: woken }
}

const pad = (text, width) => String(text).padEnd(width, ' ')
const printTable = (title, rows) => {
    console.log(title)
    console.log(pad('路线', 30) + pad('被唤醒', 8) + pad('重渲染', 8) + '说明')
    console.log('-'.repeat(110))
    for (const row of rows) {
        console.log(pad(row.name, 30) + pad(row.woken, 8) + pad(row.renders, 8) + row.note)
    }
    console.log('')
}

// 场景：三个组件分别订阅 user.name / cart.items / theme，然后只改 cart.items
printTable('场景一：只改 cart.items（1 个组件该动，另外 2 个不该动）', [
    {
        ...runStoreRoute(createStore(rootReducer, initialState), () => (state) => state, (store) =>
            store.dispatch({ type: 'cart/setItems', items: 1 })
        ),
        name: 'reducer（订阅整棵树）',
        note: 'dispatch 一律通知，根引用每次都是新的 → 3 个全部重渲染'
    },
    {
        ...runStoreRoute(createStore(rootReducer, initialState), (key) => selectors[key], (store) =>
            store.dispatch({ type: 'cart/setItems', items: 1 })
        ),
        name: 'reducer + 选择器',
        note: 'store 层不管"跟谁有关"，收敛全靠订阅者手里的选择器'
    },
    {
        ...runStoreRoute(create(() => ({ ...initialState })), (key) => selectors[key], (store) =>
            store.setState({ cart: { items: 1 } })
        ),
        name: 'setState + 选择器',
        note: '不用 action，直接给"要改的键"；通知之后仍靠选择器收敛'
    },
    {
        ...runSignalRoute((state) => {
            state.cart.items = 1
        }),
        name: 'signal（effect 逐字段）',
        note: '依赖表精确到字段，只有读过 cart.items 的那个被唤醒'
    }
])

// 场景二：这次更新跟三个组件全都无关
printTable('场景二：无关更新 / 赋同值（三个组件都不该动）', [
    {
        ...runStoreRoute(createStore(rootReducer, initialState), (key) => selectors[key], (store) =>
            store.dispatch({ type: 'nobody/cares' })
        ),
        name: 'reducer + 不认领的 action',
        note: 'combineReducers 短路返回原引用 → 0 重渲染，但通知照样发了 3 次'
    },
    {
        ...runStoreRoute(create(() => ({ ...initialState })), (key) => selectors[key], (store) =>
            store.setState({ theme: 'light' })
        ),
        name: 'setState 赋同值',
        note: '逐键 Object.is → 连通知都不发，订阅者连"被叫醒"都没有'
    },
    {
        ...runSignalRoute((state) => {
            state.theme = 'light'
        }),
        name: 'signal 赋同值',
        note: 'set 里先 Object.is 再 return，压根不进通知流程'
    }
])

// 场景三：选择器本身返回新对象时，引用相等这一关就失守了
const bare = create(() => ({ ...initialState }))
const toObject = () => (state) => ({ name: state.user.name })
const plain = {
    ...runStoreRoute(bare, toObject, (store) => store.setState({ cart: { items: 1 } })),
    name: '选择器返回新对象',
    note: '每次调用都是新对象，Object.is 永远不等 → 无关更新也重渲染'
}
const guarded = {
    ...(() => {
        const stats = instrument(bare)
        const comps = KEYS.map(() => mount(bare, toObject(), () => {}, shallowEqual))
        bare.setState({ cart: { items: 2 } })
        return { woken: stats.notified, renders: comps.reduce((sum, c) => sum + c.renders - 1, 0) }
    })(),
    name: '同上 + shallowEqual',
    note: '逐字段比 → 切片其实没变，被拦下'
}
printTable('场景三：选择器返回新对象（改一次 cart.items）', [plain, guarded])

// 场景四：一轮里连续改多次，看"通知次数"与"渲染次数"能不能被合并
const burst = (times) => {
    const store = create(() => ({ ...initialState }))
    const stats = instrument(store)
    const comps = KEYS.map((key) => mount(store, selectors[key], () => {}))
    for (let index = 0; index < times; index++) store.setState({ cart: { items: index + 1 } })
    return { woken: stats.notified, renders: comps.reduce((sum, c) => sum + c.renders - 1, 0) }
}
const ten = burst(10)
printTable('场景四：一轮里连续 setState 10 次', [
    {
        ...ten,
        name: 'setState × 10（无批处理）',
        note: '每改一次通知一次、渲染一次 —— 批处理不是 store 的职责'
    },
    {
        ...runStoreRoute(create(() => ({ ...initialState })), (key) => selectors[key], (store) =>
            store.setState((state) => ({ cart: { items: state.cart.items + 10 } }))
        ),
        name: '合并成一次函数式 setState',
        note: '把"改成什么"算完再一次说出去，才是真正的批处理'
    }
])

console.log('注：被唤醒 = store 层订阅回调被执行的次数；重渲染 = 组件视图函数真正被调用了几次（不含首次挂载）。')
