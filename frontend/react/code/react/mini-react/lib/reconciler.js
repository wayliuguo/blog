// ============================================================
// mini-react/reconciler —— Element 工厂 + Fiber 架构 + diff（render 阶段）
// 对应 React 源码包：packages/react（createElement）
//                  + packages/react-reconciler（ReactFiber / ReactFiberBeginWork / ReactChildFiber）
// 依赖：shared.js / scheduler.js / hooks.js；运行期调用 dom.js 的宿主操作
// 职责：
//   ① createElement / h：站在"编译产物层"造 React Element（JSX 的运行时形态）
//   ② FiberNode 与双缓冲：current（已上屏）/ workInProgress（正在构建）两棵树交替
//   ③ beginWork / completeWork：把递归渲染改成"一次推进一个 fiber"的可中断循环
//   ④ reconcileChildren：同位复用 + keyed diff（头同步 → 尾同步 → 乱序区）
//   ⑤ 调度衔接：setState → 记 action → 合并成一次从根开始的 render
// 建议断点：createElement（看 Element 长什么样）；performUnitOfWork（单步看 fiber
//          如何被逐个推进）；reconcileChildren（keyed diff 主战场）
// ============================================================

// ============================================================
// React Element 工厂（源码 packages/react/src/ReactElement.js）
// ============================================================
/**
 * 创建 React Element——JSX 编译产物的运行时形态。
 * `<div onClick={f} key="k">hello {n}</div>` 编译后就是
 * `h('div', { onClick: f, key: 'k' }, 'hello ', n)`。
 *
 * 关键点（与真实 React 一致）：
 *   - key 从 config 里单独拎出来，不进 props；
 *   - 孩子最终都挂在 props.children 上（单个孩子不包数组，多个是数组）；
 *   - 文本孩子归一化成"文本元素"（type 为 null，nodeValue 承载内容）——
 *     真实 React 把这一步放在 reconcile 的 createChild 里，教学版提前到这里；
 *   - null / undefined / boolean 孩子归一化成 null（渲染时直接丢弃）。
 *
 * @param {string|Function|null} type - 标签名 / 函数组件 / null（文本元素）
 * @param {Object|null} config - JSX 属性对象（key 在这里）
 * @param {...*} children - 孩子（可变参数）
 * @returns {Object} element：{ $$typeof, type, key, props }
 *
 * @example
 *   h('li', { key: t.id }, '#', t.id, ' ', t.text)
 *   // → { $$typeof, type: 'li', key: '1', props: { children: [文本元素 ×3] } }
 */
function createElement(type, config, ...children) {
    let key = null
    const props = {}
    if (config !== null && config !== undefined) {
        for (const propName in config) {
            if (propName === 'key') {
                key = String(config.key) // key 单独存放，参与 diff 但不属于 DOM 属性
            } else {
                props[propName] = config[propName] // ref / contextType 等教学版不支持，原样透传
            }
        }
    }
    if (children.length === 1) {
        props.children = normalizeChild(children[0]) // 单孩子不包数组（typeof props.children 有两种形态）
    } else if (children.length > 1) {
        props.children = children.map(normalizeChild)
    }
    return { $$typeof: REACT_ELEMENT_TYPE, type, key, props }
}

/** createElement 的短别名：demo 与文档统一用它，读起来接近 JSX。 */
const h = createElement

/**
 * 孩子归一化：文本 → 文本元素；空值/布尔 → null（丢弃）；嵌套数组保持数组（diff 前 flatten）。
 *
 * @param {*} child - createElement 收到的任意孩子
 * @returns {Object|null}
 */
function normalizeChild(child) {
    if (child === null || child === undefined || typeof child === 'boolean') return null
    if (isString(child) || isNumber(child)) {
        // 文本元素：type 为 null 的特殊 Element，fiber tag 会是 HostText
        return { $$typeof: REACT_ELEMENT_TYPE, type: null, key: null, props: { nodeValue: String(child) } }
    }
    if (isArray(child)) return child.map(normalizeChild)
    return child // 已经是 Element
}

// ============================================================
// FiberNode 与双缓冲（源码 ReactFiber.js / ReactFiberWorkLoop.js）
// ============================================================
/**
 * 创建一个 fiber 节点。React 里它同时承担三重角色：
 *   ① vdom 节点（type/key/props）  ② 调度与 diff 的工作单元  ③ 链表树节点。
 *
 * 全部字段：
 *   tag / type / key     —— 节点身份，diff 用它们判断"能不能复用"
 *   props                —— 本轮的属性（React 区分 pendingProps/memoizedProps，教学版合一）
 *   stateNode            —— 宿主 fiber 指向真实 DOM 实例；HostRoot 指向容器
 *   return/child/sibling —— 链表化的树（不用 children 数组，深度遍历不依赖递归栈）
 *   index                —— 在兄弟中的位次，keyed diff 的移动判定要读它
 *   alternate            —— 双缓冲指针，指向对面树上"同位置"的 fiber
 *   flags                —— 给 commit 阶段的记账（Placement/Update/Deletion）
 *   memoizedState        —— 函数组件：hooks 链表头
 *   updateQueue          —— 函数组件：本次 render 收集的 effect 数组
 *
 * @param {number} tag - FiberTag 之一
 * @param {Object|null} props - 属性
 * @param {string|null} key - 复用标识
 * @returns {Object} fiber
 */
function createFiber(tag, props, key) {
    return {
        tag,
        type: null, // 由 createFiberFromElement / 装配处补上
        key,
        props,
        stateNode: null,
        return: null,
        child: null,
        sibling: null,
        index: 0,
        alternate: null,
        flags: FiberFlags.NoFlags,
        memoizedState: null,
        updateQueue: null
    }
}

/**
 * 由 Element 建 fiber：按 type 分派 tag。
 *
 * @param {Object} element - React Element
 * @returns {Object} 全新 fiber（alternate 为 null → commit 视为新挂载）
 */
function createFiberFromElement(element) {
    const tag =
        element.type === null
            ? FiberTag.HostText
            : isString(element.type)
            ? FiberTag.HostComponent
            : FiberTag.FunctionComponent
    const fiber = createFiber(tag, element.props, element.key)
    fiber.type = element.type
    return fiber
}

/**
 * 双缓冲的核心：为 current fiber 造出 workInProgress 副本（或反向）。
 * 复用 type/key/stateNode/memoizedState——所以"更新"天然继承 DOM 实例与 hooks；
 * alternate 互指，下一次再更新时两棵树交换角色。
 *
 * @param {Object} current - 对面树上的 fiber
 * @param {Object|null} props - 本轮新属性
 * @returns {Object} wip fiber
 *
 * @example
 *   wip = createWorkInProgress(currentFiber, element.props) // diff 复用的标准动作
 */
function createWorkInProgress(current, props) {
    const wip = createFiber(current.tag, props, current.key)
    wip.type = current.type
    wip.stateNode = current.stateNode // 宿主 fiber：DOM 实例直接继承（不重建）
    wip.alternate = current
    current.alternate = wip
    wip.memoizedState = current.memoizedState // hooks 链表交接（hooks.js 据此回放）
    wip.index = current.index
    return wip
}

// ============================================================
// render 阶段的全局工作状态（源码 ReactFiberWorkLoop.js 的同名变量）
// ============================================================
let currentRootFiber = null // 已上屏的 HostRoot fiber（current 树的根）
let wipRoot = null // 正在构建的 HostRoot fiber（wip 树的根）
let nextUnitOfWork = null // 下一个要推进的 fiber（时间片循环的游标）
let deletions = [] // 本轮 diff 判定的删除（commit 先删后插）
let pendingRootElement = null // render(element) 等待处理的根元素
let hasPendingRootWork = false // 是否有等待处理的 render（挂载或任意 setState 都会置位）
let isWorkScheduled = false // 是否已有一次 render 在调度管道里（合并重复调度）
let renderCount = 0 // 教学观测：从根发起的 render 次数（demo 用它验证批处理）

// ============================================================
// beginWork：自上而下，"处理一个 fiber，返回它的孩子"
// （源码 ReactFiberBeginWork.js —— render 阶段的两段式之一）
// ============================================================
/**
 * 处理传入 fiber 的"向下"部分：算出孩子 elements 并 diff 成孩子 fiber 链。
 * 只负责建 fiber 树和记账，不碰 DOM（DOM 操作全部推迟到 commit）。
 *
 * @param {Object} fiber - 正在处理的 fiber
 * @returns {Object|null} 第一个孩子 fiber（无孩子返回 null）
 */
function beginWork(fiber) {
    switch (fiber.tag) {
        case FiberTag.HostRoot:
            // 根：pendingProps 就是 createRoot().render(element) 的那个 element
            return reconcileChildren(fiber, [fiber.props])
        case FiberTag.FunctionComponent:
            // 函数组件：执行组件函数（hooks.js 上下文内），拿孩子 elements
            return reconcileChildren(fiber, [renderWithHooks(fiber)])
        case FiberTag.HostComponent:
            // 宿主元素：props.children 就是孩子
            return reconcileChildren(fiber, [fiber.props.children])
        case FiberTag.HostText:
        default:
            return null // 文本没有孩子
    }
}

// ============================================================
// completeWork：自下而上，"给 fiber 补上宿主实例"
// （源码 ReactFiberCompleteWork.js —— render 阶段的两段式之二）
// ============================================================
/**
 * 处理 fiber 的"收尾"部分：宿主 fiber 在这里创建/复用 DOM 实例并记账。
 * 注意：创建实例 ≠ 插入 DOM——插入统一由 commit 按 Placement 执行，
 * 这让"先删后插、锚点定位"有单一的执行时机。
 *
 * @param {Object} fiber - 无孩子的 fiber（beginWork 返回 null 后落到这里）
 */
function completeWork(fiber) {
    if (fiber.tag === FiberTag.HostComponent) {
        if (fiber.alternate !== null && fiber.alternate.stateNode !== null) {
            fiber.flags |= FiberFlags.Update // 复用旧实例：commit 时 diff 属性
        } else {
            fiber.stateNode = createInstance(fiber.type) // dom.js：document.createElement
            setInitialProperties(fiber.stateNode, fiber.props) // dom.js：初始属性趁节点还游离在文档外时铺好
            fiber.flags |= FiberFlags.Placement // 新实例：commit 时插入
        }
    } else if (fiber.tag === FiberTag.HostText) {
        if (fiber.alternate !== null && fiber.alternate.stateNode !== null) {
            fiber.flags |= FiberFlags.Update
        } else {
            fiber.stateNode = createTextInstance(fiber.props.nodeValue) // dom.js：createTextNode
            fiber.flags |= FiberFlags.Placement
        }
    }
    // FunctionComponent / HostRoot 没有 stateNode，什么都不做
}

// ============================================================
// reconcileChildren：把孩子 elements diff 成 fiber 链
// （源码 ReactChildFiber.js —— React diff 的全部家当）
// ============================================================
/**
 * 核心算法（对齐 React reconcileChildFibers 的多轮结构）：
 *   第一轮 从头同步：key 与 type 都相同的成对复用，遇到不同立即停；
 *   快速通道 旧链耗尽   → 剩余新 elements 全部挂载（新列表更长）
 *   快速通道 新链耗尽   → 剩余旧 fibers 全部删除（旧列表更长）
 *   第二轮 从尾同步：两头都剩 → 先把公共尾巴对齐，缩小乱序区；
 *   乱序区  以 key 建 map：新表逐个找旧 fiber——找到就复用（用 lastPlacedIndex
 *           判定要不要"移动"），找不到就新建；map 里剩下的旧 fiber 全部删除。
 *
 * @param {Object} wipFiber - 父 fiber（孩子链挂它的 child/sibling）
 * @param {Array} elements - 孩子elements（扁平化、去掉 null 之后）
 * @returns {Object|null} 第一个孩子 fiber
 *
 * @example
 *   // [a,b,c,d,e] → [a,d,f,b,e]（key 同步走一遍）：
 *   // 头同步接住 a；尾同步接住 e；乱序区：d 复用原位、f 新建、b 移动、c 删除
 */
function reconcileChildren(wipFiber, elements) {
    // 扁平化嵌套数组 + 丢掉 null（JSX 里条件渲染 {ok && <X/>} 的常态）
    const children = elements.flat(Infinity).filter(el => el !== null && el !== undefined)
    const current = wipFiber.alternate
    let oldFiber = current !== null ? current.child : null

    // 统一的"往结果链尾部追加"：head/tail 两个游标贯穿四个阶段，
    // 避免"头指针 + 局部子链拼接"容易接错头的经典 bug
    let head = null
    let tail = null
    const append = fiber => {
        if (tail === null) head = fiber
        else tail.sibling = fiber
        tail = fiber
    }

    // —— 第一轮：从头同步 ——
    let newIdx = 0
    for (; newIdx < children.length && oldFiber !== null; newIdx++) {
        const element = children[newIdx]
        if (!isReusable(oldFiber, element)) break // 类型或 key 对不上 → 进入后面的分支
        const newFiber = createWorkInProgress(oldFiber, element.props)
        newFiber.index = newIdx
        append(newFiber)
        oldFiber = oldFiber.sibling
    }

    // 快速通道：旧链耗尽（或本来就是挂载）→ 剩余新 elements 批量 mount
    if (oldFiber === null) {
        for (; newIdx < children.length; newIdx++) {
            const newFiber = createFiberFromElement(children[newIdx])
            newFiber.index = newIdx
            newFiber.flags |= FiberFlags.Placement
            append(newFiber)
        }
        return finishChildren(wipFiber, head)
    }

    // 快速通道：新链耗尽 → 剩余旧 fibers 全部删除（旧列表更长的收尾）
    if (newIdx >= children.length) {
        for (; oldFiber !== null; oldFiber = oldFiber.sibling) {
            deletions.push(oldFiber)
        }
        return finishChildren(wipFiber, head)
    }

    // 剩余旧 fibers 收进数组：单链表只能从头往后走，"从尾同步"需要反向下标
    const remainingOld = []
    for (let f = oldFiber; f !== null; f = f.sibling) remainingOld.push(f)

    // —— 第二轮：从尾同步（两头都有剩余时，先把公共尾巴摘出去）——
    let newEnd = children.length - 1
    const tailFibers = [] // 从尾往头收集复用的尾巴 fiber（tailFibers[0] 是最靠后的孩子）
    while (
        remainingOld.length > 0 &&
        newEnd >= newIdx &&
        isReusable(remainingOld[remainingOld.length - 1], children[newEnd])
    ) {
        const oldTail = remainingOld.pop() // 从旧数组尾部摘
        const newFiber = createWorkInProgress(oldTail, children[newEnd].props)
        newFiber.index = newEnd
        tailFibers.push(newFiber)
        newEnd--
    }
    // 尾巴 fibers 属于孩子链的"最后一段"，等乱序区追加完再倒序补上（tailFibers[0] 是最靠后的孩子）

    // —— 乱序区：newIdx..newEnd 与 remainingOld 里剩下的旧 fibers ——
    // key → 旧 fiber 的映射（教学版假定乱序区元素都有 key；无 key 退化为按"隐式 key"即位次配对）
    const existingFibers = new Map()
    for (let i = 0; i < remainingOld.length; i++) {
        const f = remainingOld[i]
        // 隐式 key = 它在旧列表中的位次（前面已被头同步/尾同步消耗的位次不会出现在这里）
        existingFibers.set(f.key === null ? `__idx_${newIdx + i}` : f.key, f)
    }

    let lastPlacedIndex = 0 // 已处理复用节点在旧链中的最大 index——移动判定基准
    for (; newIdx <= newEnd; newIdx++) {
        const element = children[newIdx]
        const mapKey = element.key === null ? `__idx_${newIdx}` : element.key
        const old = existingFibers.get(mapKey)
        existingFibers.delete(mapKey)
        let newFiber
        if (old !== undefined && old.type === element.type) {
            // 复用：要不要动？旧 index 小于已锚定的最大 index → 它前面的兄弟被挪走了/删了 → 必须移动
            newFiber = createWorkInProgress(old, element.props)
            newFiber.index = newIdx
            if (old.index < lastPlacedIndex) {
                newFiber.flags |= FiberFlags.Placement // 复用节点"移动"也是 Placement（insertBefore）
            } else {
                lastPlacedIndex = old.index
            }
        } else {
            newFiber = createFiberFromElement(element) // 全新挂载
            newFiber.index = newIdx
            newFiber.flags |= FiberFlags.Placement
        }
        append(newFiber)
    }
    for (let i = tailFibers.length - 1; i >= 0; i--) append(tailFibers[i]) // 尾巴段最后入链：倒序追加 = 链表正序
    // map 里没被摘走的 = 新列表里已经不存在的旧 fiber → 删除
    existingFibers.forEach(fiber => deletions.push(fiber))
    return finishChildren(wipFiber, head)
}

/**
 * diff 复用判定：key 与 type 都相同才复用（React 的 key 策略本体）。
 *
 * @param {Object} fiber - 旧 fiber
 * @param {Object} element - 新 element
 * @returns {boolean}
 */
function isReusable(fiber, element) {
    return fiber.key === element.key && fiber.type === element.type
}

/**
 * 收尾：孩子链头挂到父 fiber 的 child 上，父 return 指回父 fiber。
 *
 * @param {Object} wipFiber - 父 fiber
 * @param {Object|null} head - 孩子链头
 * @returns {Object|null} 链头
 */
function finishChildren(wipFiber, head) {
    wipFiber.child = head
    for (let node = head; node !== null; node = node.sibling) {
        node.return = wipFiber
    }
    return head
}

// ============================================================
// 工作循环：递归改循环， fiber 一个个推进（可中断的关键）
// ============================================================
/**
 * 推进一个 fiber：先 beginWork 向下（返回孩子就继续深入），
 * 没孩子了就 completeWork 向上（顺着 sibling / return 找下一个待办）。
 *
 * 这就是 React 把"递归渲染"改写成"循环 + 游标"的形态——每一步之间
 * 都可以检查时间片，这就是可中断渲染的全部秘密。
 *
 * @param {Object} fiber - 当前 fiber
 * @returns {Object|null} 下一个 fiber（整棵树跑完返回 null）
 */
function performUnitOfWork(fiber) {
    const child = beginWork(fiber) // 向下：diff 出孩子 fiber 链
    if (child !== null) return child
    let completed = fiber
    while (completed !== null) {
        completeWork(completed) // 向上：给宿主 fiber 补 DOM 实例
        if (completed.sibling !== null) return completed.sibling // 有弟弟 → 处理弟弟
        completed = completed.return // 没弟弟 → 回到父亲，找父亲的弟弟
    }
    return null
}

// ============================================================
// 调度衔接：setState 的终点（源码 ensureRootIsScheduled / performWorkOnRoot）
// ============================================================
/**
 * 请求一次更新。只在"还没有 render 在管道里"时真正排任务——
 * 同一宏任务里的多次 setState 在这里被合并成一次 render（批处理）。
 */
function scheduleRootUpdate() {
    hasPendingRootWork = true
    if (isWorkScheduled) return
    isWorkScheduled = true
    scheduleCallback(performRootWorkAndRelease)
}

/**
 * performRootWork 的包装：先解除"占用"再干活——commit 执行 useEffect 时
 * 组件里若又 setState，能立刻排上新一轮 render，不会丢更新。
 *
 * @returns {boolean} true = 时间片耗尽还有剩余工作
 */
function performRootWorkAndRelease() {
    isWorkScheduled = false
    return performRootWork()
}

/**
 * 一次 render 的完整过程：准备新工作栈 → 循环推进 fiber → 跑完就 commit。
 *
 * @returns {boolean} true = 时间片耗尽还有剩余工作（scheduler 会续排下一个时间片）
 */
function performRootWork() {
    if (nextUnitOfWork === null) {
        // 全新 render：可能是 render(element) 挂载，也可能只是某个 setState 的重渲染
        if (!hasPendingRootWork) return false
        hasPendingRootWork = false
        prepareFreshStack(pendingRootElement !== null ? pendingRootElement : currentRootFiber.props)
        pendingRootElement = null
    } else if (hasPendingRootWork) {
        // 上一个 render 被时间片打断、期间又来了新更新：
        // 丢弃进行中的 render 从头再算（action 都记在 hook 队列上，丢了 wip 也不丢更新）
        hasPendingRootWork = false
        prepareFreshStack(pendingRootElement !== null ? pendingRootElement : currentRootFiber.props)
        pendingRootElement = null
    }

    const hasMoreWork = workLoop()
    if (!hasMoreWork) commitRoot() // 树跑完 → 进入 commit（index.js）
    return hasMoreWork
}

/**
 * 开新工作栈：为 current 根造 wip 副本，游标指向它，清空删除清单。
 *
 * @param {Object} element - 根 elements
 */
function prepareFreshStack(element) {
    renderCount++ // 教学观测：每次"从根重渲染"计数 +1
    wipRoot = createWorkInProgress(currentRootFiber, element)
    wipRoot.flags = FiberFlags.NoFlags
    deletions = []
    nextUnitOfWork = wipRoot
}

/**
 * 时间片循环：只要还有活且时间片没用完，就推进下一个 fiber。
 *
 * @returns {boolean} true = 时间片耗尽、树还没跑完
 */
function workLoop() {
    while (nextUnitOfWork !== null && !shouldYield()) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
    return nextUnitOfWork !== null
}
