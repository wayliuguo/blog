/**
 * 第三层：渲染器的内部状态
 *
 * 单独放一个文件，是为了让 reconciler 与 hooks 都只依赖它，
 * 避免两个模块互相 require（setState 要能触发渲染，渲染又要执行 effect）。
 *
 * 两个关键概念：
 *   roots —— 每个容器一份"当前已提交的 ROOT Fiber"。React 里 createRoot(container)
 *            就是这件事：**根是按容器区分的**，往另一个容器渲染是另一棵树。
 *   wipRoot / nextUnitOfWork —— 内存里正在构建的那棵树，以及下一个待处理的工作单元。
 */

const state = {
    roots: new Map(), // container -> 上一次提交的 ROOT fiber
    wipRoot: null, // work in progress：内存中正在构建的那棵树
    nextUnitOfWork: null, // 为 null 说明这轮已经做完了
    deletions: [], // 这一轮要删掉的旧 Fiber，统一留到 commit 阶段处理
    wipFiber: null, // 当前正在执行的函数组件 Fiber，hooks 要挂到它身上
    hookIndex: 0,
    sync: false, // true = 一次跑完（脚本/测试用）；false = 交给 requestIdleCallback 切片
    manual: false, // true = 渲染器不自己调度，由调用方手动驱动 workLoop
    // reconciler 载入时会把真正的驱动函数注册进来
    pump: () => {}
}

// 从任意 Fiber 向上走到根，就知道这个组件属于哪个容器
function rootOf(fiber) {
    let f = fiber
    while (f.parent) f = f.parent
    return f
}

// 某个组件要重新渲染：以它所属的 ROOT 为对照，重建一棵 wipRoot
function scheduleRerender(onFiber) {
    const current = rootOf(onFiber)
    state.wipRoot = {
        type: 'ROOT',
        key: null,
        props: current.props,
        dom: current.dom,
        alternate: current
    }
    state.deletions = []
    state.nextUnitOfWork = state.wipRoot
    state.pump()
}

module.exports = { state, rootOf, scheduleRerender }
