// ============================================================
// mini-react/scheduler —— 宏任务时间分片调度器
// 对应 React 源码包：packages/scheduler（独立的 npm 包 react-reconciler 依赖它）
// 被依赖：reconciler.js / index.js
// 职责：
//   ① 用 MessageChannel 起一个"宏任务循环"——比 setTimeout(0) 更快且不受嵌套层级钳制
//   ② 时间分片：每个宏任务里最多干 5ms 的活，干不完把剩余工作排到下一个宏任务
//      （render 阶段据此可中断：递归 fiber 树改成"一次推进一个 fiber"的循环）
//   ③ 批处理的底座：同一宏任务里的多次 setState 只排一次任务，天然合并成一次 render
// 建议断点：scheduleCallback（看"排一次任务"）；performWorkUntilDeadline
//          （看一个时间片跑多少个 fiber、workLoop 返回 true 后如何续排）
// ============================================================

// ============================================================
// 宏任务通道：MessageChannel（源码 packages/scheduler 按 env 支持度选择通道）
// ============================================================
// React 选通道的优先级：MessageChannel > setTimeout。postMessage 几乎立刻排进
// 宏任务队列，且不像 setTimeout 有 4ms 以上的嵌套钳制，是浏览器里最快的"可让出"手段。
const channel = new MessageChannel()
const port = channel.port2
let isMessageLoopRunning = false
let hostCallback = null // 本次宏任务要执行的回调（performRootWork）
let deadline = 0 // 当前时间片的截止时刻（毫秒时间戳）

// 每片 5ms：React 默认 frameInterval（一帧 16.6ms 里给 render 留的预算）
const SLICE_SIZE = 5

channel.port1.onmessage = performWorkUntilDeadline

/**
 * 当前时间片是否已用完。workLoop 每推进一个 fiber 前都会问它一次。
 *
 * 真实 React 还会检查 frameYieldTime / 优先级抢占（紧急 lane 不让出），
 * 教学版只做"5ms 一片"的最小实现，但让出时机与 React 一致：逐 fiber 检查。
 *
 * @returns {boolean} true = 该让出了（本片到此为止）
 *
 * @example
 *   while (nextUnitOfWork !== null && !shouldYield()) { ... } // workLoop 的骨架
 */
function shouldYield() {
    return performance.now() >= deadline
}

/**
 * 执行一个时间片：重置 5ms 截止线 → 跑回调 → 回调说没跑完就续排下一个宏任务。
 * （源码 performWorkUntilDeadline）
 */
function performWorkUntilDeadline() {
    if (hostCallback === null) {
        isMessageLoopRunning = false
        return
    }
    const callback = hostCallback
    hostCallback = null
    isMessageLoopRunning = false
    const startTime = performance.now()
    deadline = startTime + SLICE_SIZE // 打开 5ms 的时间片窗口
    let hasMoreWork = false
    try {
        hasMoreWork = callback() // 回调返回 true = 还有 fiber 没跑完
    } finally {
        if (hasMoreWork) {
            // 时间片耗尽但 render 没完成：把同一个回调排进下一个宏任务继续。
            // 这就是"长任务被切片"的机制本身——浏览器因此有机会处理绘制与输入。
            scheduleCallback(callback)
        }
    }
}

/**
 * 排一个回调到宏任务循环。重复调用只保留最新回调、不重复占通道——
 * 多次 setState 各自调它，最终只有一次 render 由此出发（批处理的基础）。
 *
 * @param {Function} callback - 返回 boolean 的任务：true = 未完成需要续排
 *
 * @example
 *   scheduleCallback(performRootWork) // reconciler 的 ensureRootIsScheduled 调它
 */
function scheduleCallback(callback) {
    hostCallback = callback
    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true
        port.postMessage(null) // 起一个宏任务，onmessage → performWorkUntilDeadline
    }
}
