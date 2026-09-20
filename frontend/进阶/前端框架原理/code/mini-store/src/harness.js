// 一个极简的"订阅式渲染器"：把 store 的一个切片映射成一次渲染。
// 真实框架里这一层是 useSyncExternalStore / useSelector —— 位置完全一样，
// 都是"订阅 + 选择器 + 引用相等就跳过"。

// 切片与上一次相等（默认 Object.is，需要比对象时传 shallowEqual）就不渲染
function subscribeWithSelector(store, selector, onChange, isEqual = Object.is) {
    let prev = selector(store.getState())
    const unsubscribe = store.subscribe(() => {
        const next = selector(store.getState())
        if (isEqual(prev, next)) return
        prev = next
        onChange(next)
    })
    return unsubscribe
}

// 挂载一个"组件"：先渲染一次，之后只在它订阅的切片变化时重渲染
function mount(store, selector, view, isEqual = Object.is) {
    const instance = { renders: 0, lastSlice: undefined }
    const render = slice => {
        instance.renders++
        instance.lastSlice = slice
        view(slice)
    }
    render(selector(store.getState()))
    instance.unsubscribe = subscribeWithSelector(store, selector, render, isEqual)
    return instance
}

function shallowEqual(a, b) {
    if (Object.is(a, b)) return true
    if (typeof a !== 'object' || a === null) return false
    if (typeof b !== 'object' || b === null) return false
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => Object.is(a[key], b[key]))
}

module.exports = { subscribeWithSelector, mount, shallowEqual }
