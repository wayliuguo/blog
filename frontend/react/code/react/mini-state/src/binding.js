// 绑定层：把 store 接到"组件"上（等价真实 React 生态的绑定层）
// Redux 侧 = react-redux 的 Provider / useSelector / useDispatch；
// Zustand 侧 = useStore（内部就是 useSyncExternalStore：getSnapshot + subscribe + selector）。
// 两者都跑在假渲染器（harness 的 mount）上，唯一的"真实"部分是订阅 + 选择器 + 引用相等。
// 返回的 instance 上：renders = 重渲染次数，lastSlice = 当前切片。

const { mount } = require('./harness')

// ---- Redux 绑定：Provider + useSelector + useDispatch ----
function createReduxBinding(store) {
    // Provider 的语义是"把 store 提供给子树"；在假渲染器里，store 由闭包提供即可
    function Provider(render) {
        return render()
    }

    // 组件在渲染期调用：读切片 + 订阅切片，切片没变（引用相等）就不重渲染
    function useSelector(selector, isEqual = Object.is) {
        return mount(store, selector, () => {}, isEqual)
    }

    // 触发更新的唯一入口：直接给出 store.dispatch
    function useDispatch() {
        return store.dispatch
    }

    return { Provider, useSelector, useDispatch }
}

// ---- Zustand 绑定：useStore ----
// 语义等价 useSyncExternalStore(subscribe, getSnapshot) + selector：
// 1. 订阅 store；2. 每次通知后 getSnapshot 拿最新状态；3. selector 收敛到切片；4. 引用相等就跳过重渲染。
function createZustandBinding(store) {
    const getSnapshot = () => store.getState()
    const subscribe = store.subscribe.bind(store)

    function useStore(selector = state => state, isEqual = Object.is) {
        // 把 store 包成"订阅 + 快照"的形状，交给假渲染器
        return mount({ getState: getSnapshot, subscribe }, selector, () => {}, isEqual)
    }

    return { useStore }
}

module.exports = { createReduxBinding, createZustandBinding }
