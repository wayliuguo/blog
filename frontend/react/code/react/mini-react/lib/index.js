// ============================================================
// mini-react/index —— commit 阶段 + createRoot 装配入口
// 对应 React 源码：packages/react-reconciler 的 ReactFiberCommitWork（commit 三段式）
//                + packages/react-dom 的 createRoot（浏览器装配层）
// 依赖：前五个文件必须先按序加载（shared → scheduler → hooks → reconciler → dom）
// 职责：
//   ① commitRoot：render 阶段产出的 wip 树落地成真实 DOM
//      mutation（先删后插/更新）→ passive（useEffect）→ 切换 current（双缓冲交接）
//   ② createRoot(container).render(element)：官网 CDN 用法的浏览器装配层
//   ③ 全量 API 挂到 window.MiniReact
// 建议断点：commitRoot（看三段式顺序）；commitPlacement（看 getHostSibling
//          怎么找到"插在谁前面"）；flushPassiveEffects（先 destroy 后 create）
// ============================================================

// ============================================================
// commit：把 wip 树变成真实 DOM（源码 commitRoot → commitRootImpl）
// ============================================================
/**
 * commit 三段式（教学版对齐 React 的执行顺序，省略 beforeMutation）：
 *   ① mutation：先执行所有删除，再按树的先序遍历执行插入/更新
 *   ② passive：遍历提交后的树，执行 useEffect（先旧 destroy 再新 create）
 *   ③ 切换 current：wipRoot 顶替 currentRootFiber——双缓冲树交换角色，
 *      hooks 的 pendingActions 也随之清空（state 已结算进 memoizedState）
 */
function commitRoot() {
    const root = wipRoot

    // —— mutation：删除优先（React 同款：先删后插，避免锚点被待删节点干扰）——
    for (const fiber of deletions) commitDeletion(fiber)
    if (root.child !== null) commitMutationEffects(root.child)

    // —— passive：useEffect（真实 React 把它排到"绘制之后"的宏任务，教学版就地执行）——
    flushPassiveEffects(root.child)

    // —— 切换 current：双缓冲交接 ——
    currentRootFiber = root
    wipRoot = null
    deletions = []
    clearPendingActions(root.child) // action 已结算进 memoizedState，队列清空防重放
}

// ============================================================
// mutation：插入 / 移动 / 更新 / 删除（源码 commitMutationEffects）
// ============================================================
/**
 * 先序遍历 wip 树执行 DOM 变更。先序保证"左边的兄弟先落位"——
 * 后面 fiber 的插入锚点（getHostSibling）因此总是已就位。
 *
 * @param {Object} fiber
 */
function commitMutationEffects(fiber) {
    if (fiber.flags & FiberFlags.Placement) {
        commitPlacement(fiber) // 新挂载 + 复用节点的"移动"，在 DOM 层是同一个动作
        fiber.flags &= ~FiberFlags.Placement // 已落位：清标记，后续锚点判定才能把它当"稳定节点"
    } else if (fiber.flags & FiberFlags.Update) {
        if (fiber.tag === FiberTag.HostText) {
            commitTextUpdate(fiber.stateNode, fiber.props.nodeValue) // 文本：只改 nodeValue
        } else if (fiber.tag === FiberTag.HostComponent) {
            // 元素：实例复用，diff 两份属性表（旧表在 alternate 上）
            commitUpdate(fiber.stateNode, fiber.alternate.props, fiber.props)
        }
        fiber.flags &= ~FiberFlags.Update
    }
    if (fiber.child !== null) commitMutationEffects(fiber.child)
    if (fiber.sibling !== null) commitMutationEffects(fiber.sibling)
}

/**
 * 把 fiber 的 DOM 实例插到它该在的位置。
 * 锚点 = 新树里"它后面的第一个已在文档中的宿主节点"；找不到就 appendChild。
 * 函数组件 fiber 也会带 Placement（首次挂载时），但它没有 stateNode——
 * 直接跳过，它的宿主孩子各自带 Placement 标记、由自己的 commitPlacement 落位。
 *
 * @param {Object} fiber - 带 Placement 标记的 fiber
 */
function commitPlacement(fiber) {
    if (fiber.tag !== FiberTag.HostComponent && fiber.tag !== FiberTag.HostText) return
    const parentFiber = getHostParentFiber(fiber) // 向上找最近的宿主父节点
    const parentDOM = parentFiber.stateNode // HostRoot 是容器，HostComponent 是元素
    const before = getHostSibling(fiber)
    if (before !== null) {
        insertBefore(parentDOM, fiber.stateNode, before)
    } else {
        appendChild(parentDOM, fiber.stateNode)
    }
}

/**
 * 向上找最近的宿主父节点（函数组件没有 stateNode，会被跳过）。
 *
 * @param {Object} fiber
 * @returns {Object} HostComponent 或 HostRoot fiber
 */
function getHostParentFiber(fiber) {
    let parent = fiber.return
    while (parent !== null && parent.tag !== FiberTag.HostComponent && parent.tag !== FiberTag.HostRoot) {
        parent = parent.return
    }
    return parent
}

/**
 * 找插入锚点：从本 fiber 的弟弟开始，在新树里找"第一个已落定位置的宿主节点"。
 *
 * 三条规则：
 *   ① 弟弟是函数组件 → 下钻它的孩子（DOM 挂在更深处）；
 *   ② 带 Placement 标记的候选一律跳过——新挂载的还没进文档，
 *      待移动的最终位置未定（它自己 commit 时会换到正确位置），
 *      只有"原地不动"的节点才是稳定锚点；
 *   ③ 一路没有 → return null → appendChild 兜底。
 *
 * @param {Object} fiber
 * @returns {Node|null} 锚点节点
 */
function getHostSibling(fiber) {
    let node = fiber
    siblings: while (true) {
        // 没有弟弟 → 看父节点：宿主/根就放弃（锚点必须与自己在同一个宿主父节点里，
        // 继续爬只会爬出子树的 DOM 父节点）；函数组件没有 stateNode，穿过它继续找
        while (node.sibling === null) {
            const parent = node.return
            if (parent === null || parent.tag === FiberTag.HostRoot || parent.tag === FiberTag.HostComponent) {
                return null
            }
            node = parent
        }
        node = node.sibling
        while (node.tag !== FiberTag.HostComponent && node.tag !== FiberTag.HostText) {
            // 弟弟是函数组件：带 Placement 的整棵都是新的，下钻也没意义
            if (node.flags & FiberFlags.Placement) continue siblings
            if (node.child === null) continue siblings
            node = node.child
        }
        // 宿主候选：新挂载 / 待移动都位置未定，不能当锚点
        if (node.flags & FiberFlags.Placement) continue siblings
        return node.stateNode
    }
}

/**
 * 删除一个 fiber 子树：
 *   ① 递归找出所有函数组件，同步执行它们的 useEffect destroy（React 在
 *      mutation 阶段执行"卸载型 passive effect"，与真实顺序一致）；
 *   ② 找到子树里第一个宿主节点，从宿主父节点摘除——宿主节点一摘，整棵 DOM 子树跟着走。
 *
 * @param {Object} fiber - 待删除子树的根
 */
function commitDeletion(fiber) {
    let hostNode = null
    const walk = f => {
        if (f.tag === FiberTag.FunctionComponent) {
            let hook = f.memoizedState // hooks 链表：逐个执行 effect.destroy
            while (hook !== null) {
                const effect = hook.memoizedState
                if (effect !== null && effect !== undefined && isFunction(effect.destroy)) {
                    effect.destroy()
                    effect.destroy = null
                }
                hook = hook.next
            }
        }
        if (hostNode === null && (f.tag === FiberTag.HostComponent || f.tag === FiberTag.HostText)) {
            hostNode = f.stateNode // 子树的第一个宿主节点：摘它 = 摘整棵
            return
        }
        for (let child = f.child; child !== null; child = child.sibling) walk(child)
    }
    walk(fiber)
    if (hostNode === null) return
    const parentFiber = getHostParentFiber(fiber)
    removeChild(parentFiber.stateNode, hostNode)
}

// ============================================================
// passive：useEffect 的执行（源码 flushPassiveEffects）
// ============================================================
/**
 * 遍历提交后的树，执行本次 render 收集的 effect：
 *   先跑旧 destroy（清理），再跑新 create（建立），create 的返回值记为新 destroy。
 * 没进收集区的 effect（deps 没变的）完全不动——这正是依赖数组的优化效果。
 *
 * @param {Object} fiber - 已提交树的任意节点
 */
function flushPassiveEffects(fiber) {
    if (fiber === null) return
    if (fiber.tag === FiberTag.FunctionComponent && fiber.updateQueue !== null) {
        for (const effect of fiber.updateQueue) {
            if (isFunction(effect.destroy)) effect.destroy() // 先清理旧的
            effect.destroy = effect.create() || null // 再建立新的
        }
        fiber.updateQueue = null
    }
    if (fiber.child !== null) flushPassiveEffects(fiber.child)
    if (fiber.sibling !== null) flushPassiveEffects(fiber.sibling)
}

/**
 * 提交完成后清空各 hook 的 pendingActions：
 * 队列里的 action 已经结算进 memoizedState，不清掉下次 render 会重放。
 *
 * @param {Object} fiber
 */
function clearPendingActions(fiber) {
    if (fiber === null) return
    if (fiber.tag === FiberTag.FunctionComponent) {
        let hook = fiber.memoizedState
        while (hook !== null) {
            hook.queue.pendingActions = []
            hook = hook.next
        }
    }
    if (fiber.child !== null) clearPendingActions(fiber.child)
    if (fiber.sibling !== null) clearPendingActions(fiber.sibling)
}

// ============================================================
// 浏览器装配层：createRoot（源码 packages/react-dom 的 ReactDOMRoot）
// ============================================================
/**
 * 官网用法的第一半：createRoot(container) 拿到根。
 * 返回的对象上挂 render（初次挂载 + 后续全部更新的统一入口）与 unmount。
 *
 * 教学版支持单根（模块级全局状态，与真实 React 多 Root 并存不同）。
 *
 * @param {HTMLElement} container - 挂载容器
 * @returns {{render: Function, unmount: Function}}
 *
 * @example
 *   const root = MiniReact.createRoot(document.getElementById('app'))
 *   root.render(h(App, null))
 */
function createRoot(container) {
    const rootFiber = createFiber(FiberTag.HostRoot, null, null)
    rootFiber.stateNode = container
    currentRootFiber = rootFiber // current 树的起点

    let isUnmounted = false
    return {
        /**
         * 渲染 / 更新的统一入口：只记下最新的根元素并请求调度。
         * 多次调用在调度层被合并（同一宏任务只 render 一次）。
         */
        render(element) {
            if (isUnmounted) {
                console.warn('MiniReact: root 已卸载，render 无效（重新加载页面可重看挂载）')
                return
            }
            pendingRootElement = element
            scheduleRootUpdate()
        },
        /** 卸载：执行所有 useEffect destroy + 摘除 DOM。之后 render 不再生效。 */
        unmount() {
            if (isUnmounted) return
            isUnmounted = true
            pendingRootElement = null
            hasPendingRootWork = false
            if (currentRootFiber.child !== null) {
                commitDeletion(currentRootFiber.child) // destroy + 摘 DOM，一套逻辑复用删除链路
            }
            clearContainer(container)
            wipRoot = null
            nextUnitOfWork = null
        }
    }
}

// ============================================================
// API 装配：挂到 window.MiniReact（《React 原理》一.1 分层协作的可运行证明）
// ============================================================
window.MiniReact = {
    createElement,
    h,
    createRoot,
    useState,
    useEffect,
    // 教学观测：demo 用它验证"多次 setState 只触发一次 render"（批处理）
    __internal: {
        getRenderCount: () => renderCount
    }
}
