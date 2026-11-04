// ============================================================
// mini-react/hooks —— 函数组件的 Hooks 实现（useState / useEffect）
// 对应 React 源码：packages/react-reconciler/src/ReactFiberHooks.js
// 依赖：shared.js（类型判断）；运行期调用 reconciler.js 的调度入口、
//       index.js 的 commit（都是运行期才发生的调用，与加载顺序无关）
// 职责：
//   ① renderWithHooks：beginWork 渲染函数组件时的"上下文切换"——
//      记录当前正在渲染的 fiber，让 useState/useEffect 知道自己属于谁
//   ② hooks 链表：fiber.memoizedState 挂一条按调用顺序串起来的 hook 链，
//      更新渲染时按同样的顺序回放（这就是"Hooks 不能写在 if 里"的底层原因）
//   ③ useState：state 存 hook.memoizedState，action 存 hook.queue，
//      dispatch 只是"记下动作 + 请求调度"，真正结算发生在下次 render
//   ④ useEffect：effect 挂在 hook.memoizedState 上，commit 后统一执行
// 建议断点：renderWithHooks（看上下文如何建立）；useState 的更新分支
//          （看 action 如何被"回放"成新 state）；flushPassiveEffects 前的收集过程
// ============================================================

// ============================================================
// 渲染上下文（源码 ReactFiberHooks.js 的 renderWithHooks / currentlyRenderingFiber）
// ============================================================
// 正在渲染函数组件的 wip fiber；renderWithHooks 进出时设置/清空。
// React 的 Hooks 全靠它 + workInProgressHook 定位"我该读写哪条 hook"。
let currentlyRenderingFiber = null
let workInProgressHook = null // 本次渲染正在装配的 hook（链表尾指针）
let currentHook = null // 旧 fiber（alternate）链上同位置的 hook，更新时逐个对齐

/**
 * beginWork 渲染函数组件前的准备工作 + 真正执行组件函数。
 *
 * 关键点：updateQueue 在这里初始化为空数组——本次 render 里 useEffect
 * 收集到的 effect 都记在这上面，commit 之后统一执行（源码同名机制的简化）。
 *
 * @param {Object} fiber - 函数组件的 wip fiber（fiber.type 是组件函数）
 * @returns {*} 组件函数的返回值（React Element），交给 reconcileChildren
 *
 * @example
 *   // beginWork 的 FunctionComponent 分支：
 *   const children = renderWithHooks(fiber) // 内部执行 fiber.type(fiber.props)
 */
function renderWithHooks(fiber) {
    currentlyRenderingFiber = fiber
    fiber.updateQueue = [] // 本次 render 的 effect 收集区
    workInProgressHook = null
    currentHook = null
    const children = fiber.type(fiber.props) // 执行组件函数（可能递归触发子组件渲染）
    // 渲染完毕立即清上下文：防止 Hooks 被组件函数之外的地方误用
    currentlyRenderingFiber = null
    workInProgressHook = null
    currentHook = null
    return children
}

// ============================================================
// hooks 链表的装配（源码 mountWorkInProgressHook / updateWorkInProgressHook）
// ============================================================
/**
 * 挂载路径：新建一个 hook，接到 fiber.memoizedState 这条链的末尾。
 *
 * @returns {Object} hook：{ memoizedState, queue, next }
 *   - memoizedState：useState 存 state；useEffect 存 effect 对象
 *   - queue：useState 的 action 队列（本渲染与旧 hook 共享同一对象）
 */
function mountWorkInProgressHook() {
    const hook = { memoizedState: null, queue: { pendingActions: [] }, next: null }
    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = hook // 链表头挂到 fiber 上
    } else {
        workInProgressHook.next = hook
    }
    workInProgressHook = hook
    return hook
}

/**
 * 更新路径：从旧 fiber 的 hook 链上取"同位置"的 hook，生成与之配对的新 hook。
 * 两个关键共享：
 *   ① queue 共享——dispatch 往旧 hook 的队列里 push 的 action，这里能读到；
 *   ② 链表按调用顺序对齐——所以 Hooks 必须无条件调用，顺序一变就对不上号。
 *
 * @returns {Object} 与旧 hook 配对的新 hook
 */
function updateWorkInProgressHook() {
    if (currentHook === null) {
        // 本次 render 的第一个 hook：从旧 fiber 的链头开始
        const currentFiber = currentlyRenderingFiber.alternate
        currentHook = currentFiber ? currentFiber.memoizedState : null
    } else {
        currentHook = currentHook.next // 后续 hook：沿旧链往后走一格
    }
    if (currentHook === null) {
        // 旧链上没有对应位置（首次出现的 hook）→ 按挂载处理。
        // 真实 React 会在开发模式下报警"Hooks 顺序变了"，教学版从简。
        return mountWorkInProgressHook()
    }
    const hook = { memoizedState: currentHook.memoizedState, queue: currentHook.queue, next: null }
    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = hook
    } else {
        workInProgressHook.next = hook
    }
    workInProgressHook = hook
    return hook
}

// ============================================================
// useState（源码 mountStateImpl / updateStateImpl / dispatchSetState）
// ============================================================
/**
 * 状态钩子。挂载时初始化 state；更新时把队列里的 action 依序"回放"出新 state。
 *
 * 注意 dispatch 里只有"记动作 + 请求调度"两步——setState 之后立刻读变量
 * 拿到的还是旧值，因为结算要等下一次 render（这与 React 行为一致）。
 *
 * @param {*} initialState - 初始状态（函数则惰性求值）
 * @returns {Array} [state, dispatch]
 *
 * @example
 *   const [message, setMessage] = useState('Hello React!')
 *   const [count, setCount] = useState(0)
 *   setCount(count + 1)       // 记一个直接值
 *   setCount(c => c + 1)      // 记一个基于上次 state 的函数
 */
function useState(initialState) {
    const isMount = currentlyRenderingFiber.alternate === null
    const hook = isMount ? mountWorkInProgressHook() : updateWorkInProgressHook()

    if (isMount) {
        hook.memoizedState = isFunction(initialState) ? initialState() : initialState
    } else {
        // 回放：从"上次提交的 state"出发，把本次 render 前积累的所有 action 依序结算。
        // 队列不在这一步清空——被中断的 render 丢弃后重放仍能算对，
        // 等 commit 成功后由 clearPendingActions 统一清（见 index.js）。
        let state = hook.memoizedState
        const actions = hook.queue.pendingActions
        for (const action of actions) {
            state = isFunction(action) ? action(state) : action
        }
        hook.memoizedState = state
    }

    // dispatch 闭包抓住 hook：无论哪个 render 发出的 dispatch，
    // 都写到同一个共享队列（hook.queue 与旧 hook 共享）→ 不会丢更新
    const dispatch = action => dispatchSetState(hook, action)
    return [hook.memoizedState, dispatch]
}

/**
 * setState 的真身：记下动作 + 请求一次根级重渲染。
 * （源码 dispatchSetState 还带 eagerState 急切计算优化，教学版从简）
 *
 * @param {Object} hook - dispatch 所属的 hook（queue 上记动作）
 * @param {*|Function} action - 新值或更新函数
 */
function dispatchSetState(hook, action) {
    hook.queue.pendingActions.push(action)
    scheduleRootUpdate() // reconciler 里定义：合并调度一次从根开始的 render
}

// ============================================================
// useEffect（源码 mountEffectImpl / updateEffectImpl / pushEffect）
// ============================================================
/**
 * 副作用钩子。挂载：effect 进收集区，commit 后必执行。
 * 更新：先比 deps——没变就什么都不记（旧 effect 原样保留，destroy 继续有效）；
 *       变了就把旧 destroy 带进新 effect，commit 后先清后建。
 *
 * deps 传 undefined（不写第二参）= 每次渲染都执行，与 React 语义一致。
 *
 * @param {Function} create - 副作用函数，返回值作为清理函数（destroy）
 * @param {Array} [deps] - 依赖数组
 *
 * @example
 *   useEffect(() => { log('message 变了') }, [message])
 *   useEffect(() => { log('挂载了'); return () => log('卸载了') }, [])
 */
function useEffect(create, deps) {
    const isMount = currentlyRenderingFiber.alternate === null
    const hook = isMount ? mountWorkInProgressHook() : updateWorkInProgressHook()

    if (isMount) {
        const effect = { create, deps: deps === undefined ? null : deps, destroy: null }
        hook.memoizedState = effect
        currentlyRenderingFiber.updateQueue.push(effect) // 进本次 render 的收集区
        return
    }

    const oldEffect = currentHook.memoizedState
    if (areHookInputsEqual(deps, oldEffect.deps)) {
        hook.memoizedState = oldEffect // deps 没变：新链直接复用旧 effect，不进收集区
        return
    }
    // deps 变了：destroy 带着旧清理函数，flush 时"先 destroy 再 create"
    const effect = { create, deps: deps === undefined ? null : deps, destroy: oldEffect.destroy }
    hook.memoizedState = effect
    currentlyRenderingFiber.updateQueue.push(effect)
}

/**
 * 依赖数组浅比较。任一侧为 null/undefined（没写 deps）→ 视为变化，每次都执行。
 * 逐位 Object.is：与 React 的 areHookInputsEqual 同款（NaN 正确、+0/-0 区分）。
 *
 * @param {Array|null} nextDeps - 本次声明的 deps
 * @param {Array|null} prevDeps - 上次的 deps
 * @returns {boolean} true = 依赖没变，effect 跳过
 */
function areHookInputsEqual(nextDeps, prevDeps) {
    if (nextDeps === null || prevDeps === null) return false
    if (nextDeps.length !== prevDeps.length) return false
    for (let i = 0; i < nextDeps.length; i++) {
        if (!Object.is(nextDeps[i], prevDeps[i])) return false
    }
    return true
}
