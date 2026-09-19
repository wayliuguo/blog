/**
 * 第四层：reconciler —— Fiber 树、diff、两阶段提交
 *
 * 整棵树的遍历不是递归，而是一条链表：child / sibling / parent 三个指针，
 * 于是"大更新"可以被切成一个一个工作单元（Fiber），随时暂停、让出主线程。
 *
 *   1. 建树（render 阶段）：为每个 Fiber 算出 effectTag（PLACEMENT/UPDATE/DELETION）
 *   2. 提交（commit 阶段）：一次性把变更写到宿主环境，并执行 effect
 */

const { state } = require('./internal')
const { host } = require('./host')
const { runEffects, runCleanups } = require('./hooks')
const { TEXT_ELEMENT, Fragment } = require('./element')

// 浏览器里用 requestIdleCallback 拿到"剩余时间"，Node 里退化成 setTimeout
const requestIdleCallback =
    globalThis.requestIdleCallback || ((cb) => setTimeout(() => cb(deadline()), 0))

function deadline() {
    const start = Date.now()
    // 假设一帧 16ms，返回"这帧还剩多少时间"
    return { timeRemaining: () => Math.max(0, 16 - (Date.now() - start)) }
}

// ---------- 时间切片：每处理完一个 Fiber 就问一次"还有时间吗" ----------
function workLoop(dl) {
    let shouldYield = false
    while (state.nextUnitOfWork && !shouldYield) {
        state.nextUnitOfWork = performUnitOfWork(state.nextUnitOfWork)
        shouldYield = dl.timeRemaining() < 1
    }
    if (!state.nextUnitOfWork && state.wipRoot) commitRoot()
}

// 脚本与测试用：不受时间片限制，一次跑完
function flushWork() {
    while (state.nextUnitOfWork) state.nextUnitOfWork = performUnitOfWork(state.nextUnitOfWork)
    if (state.wipRoot) commitRoot()
}

// reconciler 负责"怎么推进"，internal 负责"存状态"，两者靠这个回调解耦
state.pump = () => {
    if (state.manual) return // 交给调用方驱动 workLoop（用来观察切片行为）
    if (state.sync) flushWork()
    else requestIdleCallback(workLoop)
}

function render(element, container, options = {}) {
    state.sync = options.sync === true
    state.manual = options.manual === true
    state.wipRoot = {
        type: 'ROOT',
        key: null,
        props: { children: [element] },
        dom: container,
        // 同一个容器再来一次就是"更新"，换容器则是另一棵新树
        alternate: state.roots.get(container) || null
    }
    state.deletions = []
    state.nextUnitOfWork = state.wipRoot
    state.pump()
}

// ---------- 处理一个工作单元，并返回下一个 ----------
function performUnitOfWork(fiber) {
    if (fiber.effectTag === 'PLACEMENT') fiber.dom = createDom(fiber)

    if (typeof fiber.type === 'function') updateFunctionComponent(fiber)
    else reconcileChildren(fiber, fiber.props.children)

    // 深度优先：先孩子，没孩子找兄弟，都没了就回到父节点继续找兄弟
    if (fiber.child) return fiber.child
    let next = fiber
    while (next) {
        if (next.sibling) return next.sibling
        next = next.parent
    }
    return null
}

function updateFunctionComponent(fiber) {
    state.wipFiber = fiber
    state.hookIndex = 0
    fiber.hooks = [] // hooks 链表挂在组件自己的 Fiber 上
    reconcileChildren(fiber, [fiber.type(fiber.props)])
}

// ---------- diff：给每个子节点算 effectTag ----------
// 身份规则：有 key 用 key，没 key 退化成下标 —— 这就是"index 陷阱"的源头
function identityOf(key, index) {
    return key === null || key === undefined ? `i:${index}` : `k:${key}`
}

function reconcileChildren(wipFiber, elements) {
    const oldChildren = []
    for (let f = wipFiber.alternate && wipFiber.alternate.child; f; f = f.sibling) {
        oldChildren.push(f)
    }

    const oldByIdentity = new Map()
    oldChildren.forEach((f, i) => oldByIdentity.set(identityOf(f.key, i), f))

    const reused = new Set()
    let prevSibling = null

    elements.forEach((element, index) => {
        const matched = oldByIdentity.get(identityOf(element.key, index))
        if (matched) reused.add(matched)

        let newFiber = null
        // 启发式一 + 二：类型相同就复用 DOM 只更 props，类型不同整棵重建
        if (matched && matched.type === element.type) {
            newFiber = {
                type: matched.type,
                key: element.key,
                props: element.props,
                dom: matched.dom,
                parent: wipFiber,
                alternate: matched,
                effectTag: 'UPDATE'
            }
        } else {
            newFiber = {
                type: element.type,
                key: element.key,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: 'PLACEMENT'
            }
            if (matched) {
                matched.effectTag = 'DELETION'
                state.deletions.push(matched)
            }
        }

        if (index === 0) wipFiber.child = newFiber
        else prevSibling.sibling = newFiber
        prevSibling = newFiber
    })

    // 新列表里没出现过的旧节点，一并删除
    for (const old of oldChildren) {
        if (reused.has(old)) continue
        old.effectTag = 'DELETION'
        state.deletions.push(old)
    }
}

// ---------- commit：把算好的变更写进宿主环境 ----------
function commitRoot() {
    for (const fiber of state.deletions) commitDeletion(fiber, domParentOf(fiber))
    commitWork(state.wipRoot.child)
    const root = state.wipRoot
    state.roots.set(root.dom, root) // 双缓存切换：wip 变 current，并按容器记住
    state.wipRoot = null
    runEffects(root) // 副作用统一在 commit 之后执行
}

function domParentOf(fiber) {
    let parent = fiber.parent
    while (parent && !parent.dom) parent = parent.parent
    return parent ? parent.dom : null
}

function commitWork(fiber) {
    if (!fiber) return

    if (fiber.effectTag === 'PLACEMENT') {
        if (fiber.dom) insertDom(fiber)
        // 函数组件 / Fragment 没有自己的 DOM，交给它下面的孩子去插
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

// 插到"右边最近的兄弟"之前；没有兄弟就追加到父节点末尾
function insertDom(fiber) {
    const parentDom = domParentOf(fiber)
    let sibling = fiber.sibling
    while (sibling) {
        if (sibling.dom) return host.insertBefore(parentDom, fiber.dom, sibling.dom)
        sibling = sibling.child
    }
    host.appendChild(parentDom, fiber.dom)
}

function commitDeletion(fiber, parentDom) {
    runCleanups(fiber) // 先跑完整棵子树的 effect 清理
    removeDom(fiber, parentDom)
}

function removeDom(fiber, parentDom) {
    if (fiber.dom) return host.removeChild(parentDom, fiber.dom) // 摘掉外层节点，子树跟着走
    for (let c = fiber.child; c; c = c.sibling) removeDom(c, parentDom)
}

function createDom(fiber) {
    if (fiber.type === 'ROOT' || fiber.type === Fragment) return null
    if (typeof fiber.type === 'function') return null
    if (fiber.type === TEXT_ELEMENT) return host.createTextInstance(fiber.props.nodeValue)

    const dom = host.createInstance(fiber.type)
    for (const [name, value] of Object.entries(fiber.props)) {
        if (name === 'children') continue
        host.setProperty(dom, name, value)
    }
    return dom
}

function updateDom(dom, prevProps, nextProps) {
    // 文本节点只有 nodeValue
    if (nextProps.nodeValue !== undefined) {
        if (prevProps.nodeValue !== nextProps.nodeValue) {
            host.setProperty(dom, 'nodeValue', nextProps.nodeValue)
        }
        return
    }
    for (const name of Object.keys(prevProps)) {
        if (name === 'children' || name === 'nodeValue') continue
        if (!(name in nextProps)) host.setProperty(dom, name, null) // 旧的属性要摘掉
    }
    for (const [name, value] of Object.entries(nextProps)) {
        if (name === 'children' || name === 'nodeValue') continue
        if (prevProps[name] !== value) host.setProperty(dom, name, value)
    }
}

module.exports = {
    render,
    flushWork,
    workLoop,
    createDom,
    updateDom,
    reconcileChildren,
    identityOf,
    requestIdleCallback,
    deadline
}
