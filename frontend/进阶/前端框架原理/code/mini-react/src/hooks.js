/**
 * 第五层：Hooks —— 挂在 Fiber 节点上的链表
 *
 * 状态不存在任何"全局变量"里，而是按**调用顺序**存进当前 Fiber 的 hooks 数组。
 * 所以 Hooks 必须顶层调用、顺序固定：放进 if / 循环里，读取位置就会错位。
 */

const { state, scheduleRerender } = require('./internal')

function currentHook() {
    return state.wipFiber.alternate && state.wipFiber.alternate.hooks
        ? state.wipFiber.alternate.hooks[state.hookIndex]
        : undefined
}

function useState(initial) {
    const oldHook = currentHook()
    const hook = {
        state: oldHook ? oldHook.state : typeof initial === 'function' ? initial() : initial,
        queue: [] // 还没被消费的更新
    }

    // 把上次渲染期间攒下的更新，按顺序作用到当前状态上
    for (const action of oldHook ? oldHook.queue : []) {
        hook.state = typeof action === 'function' ? action(hook.state) : action
    }

    const setState = (action) => {
        hook.queue.push(action)
        scheduleRerender(state.wipFiber) // 重渲染"这个组件所属的那棵树"
    }

    state.wipFiber.hooks.push(hook)
    state.hookIndex++
    return [hook.state, setState]
}

function useEffect(fn, deps) {
    const oldHook = currentHook()
    const hook = {
        fn,
        deps,
        cleanup: oldHook ? oldHook.cleanup : undefined,
        hasEffect: false
    }

    // 没传 deps = 每次渲染都跑；传了数组 = 逐项浅比较，有一项变了才跑
    if (!oldHook || deps === undefined) hook.hasEffect = true
    else if (deps.some((dep, i) => dep !== oldHook.deps[i])) hook.hasEffect = true

    state.wipFiber.hooks.push(hook)
    state.hookIndex++
}

// commit 阶段结束之后统一执行副作用：先跑上一轮的清理函数，再跑这一次的
function runEffects(fiber) {
    if (!fiber) return
    for (let f = fiber; f; f = f.sibling) {
        for (const hook of f.hooks || []) {
            if (!hook.hasEffect) continue
            if (hook.cleanup) hook.cleanup()
            hook.cleanup = hook.fn()
            hook.hasEffect = false
        }
        runEffects(f.child)
    }
}

// 节点被卸载：整棵子树上挂过的 effect 都要清理，否则定时器/订阅会泄漏
function runCleanups(fiber) {
    if (!fiber) return
    for (const hook of fiber.hooks || []) {
        if (!hook.cleanup) continue
        hook.cleanup()
        hook.cleanup = undefined
    }
    for (let c = fiber.child; c; c = c.sibling) runCleanups(c)
}

module.exports = { useState, useEffect, runEffects, runCleanups }
