// 路线一：reducer + dispatch（Redux 的形状）
// 三个约定：状态只能被 reducer 换掉、reducer 必须是纯函数、订阅者在 dispatch 之后才被叫醒。

function createStore(reducer, preloadedState) {
    let state = preloadedState
    let listeners = []

    function getState() {
        return state
    }

    function dispatch(action) {
        state = reducer(state, action)
        // 忠实照搬 Redux：dispatch 一律叫醒所有订阅者，
        // "这次更新跟我有没有关系"由订阅者自己的选择器判断，store 不管。
        for (const listener of listeners.slice()) listener()
        return action
    }

    function subscribe(listener) {
        listeners.push(listener)
        return function unsubscribe() {
            listeners = listeners.filter(item => item !== listener)
        }
    }

    dispatch({ type: '@@mini-store/init' })
    return { getState, dispatch, subscribe }
}

function combineReducers(reducers) {
    const keys = Object.keys(reducers)
    return function rootReducer(state = {}, action) {
        let changed = false
        const next = {}
        for (const key of keys) {
            const prev = state[key]
            const value = reducers[key](prev, action)
            next[key] = value
            // 逐个子 reducer 比较引用：谁换了新对象，才算这一层变了
            if (!Object.is(value, prev)) changed = true
        }
        // 一处都没变就返回原引用，避免"白换一次根对象"
        return changed ? next : state
    }
}

module.exports = { createStore, combineReducers }
