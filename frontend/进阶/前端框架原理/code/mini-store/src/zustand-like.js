// 路线二：setState + 订阅切片（Zustand 的形状）
// 与路线一的差别只有两处，但这两处决定了"要不要叫醒订阅者"：
//   1. 不需要 action，直接给"要改的那几个键"（默认浅合并）
//   2. 逐键 Object.is 比较，一个键都没变就整个 return —— 连通知都省掉

function create(createState) {
    let state
    const listeners = new Set()

    function setState(partial, replace = false) {
        const next = typeof partial === 'function' ? partial(state) : partial
        if (Object.is(next, state)) return

        if (replace) {
            state = next
        } else {
            let changed = false
            const merged = {}
            for (const key of Object.keys(next)) {
                if (!Object.is(state[key], next[key])) changed = true
                merged[key] = next[key]
            }
            if (!changed) return // 赋的是同值：状态没动，订阅者不必醒
            state = { ...state, ...merged }
        }
        for (const listener of [...listeners]) listener(state)
    }

    function getState() {
        return state
    }

    function subscribe(listener) {
        listeners.add(listener)
        return function unsubscribe() {
            listeners.delete(listener)
        }
    }

    state = createState(setState, getState)
    return { getState, setState, subscribe }
}

module.exports = { create }
