/**
 * 调度器：把"数据变了"和"什么时候更新界面"分开
 *
 * 一次同步代码里改三次状态，不应该渲染三次。做法是：渲染 effect 带上 scheduler，
 * 数据变化时只把一个 job 推进队列，队列在**微任务**里统一 flush。
 * 于是同一个 tick 里的多次修改只渲染一次——这就是 nextTick 的来源。
 */

const queue = []
let isFlushPending = false
let currentFlushPromise = null

const resolvedPromise = Promise.resolve()

function queueJob(job) {
    if (!queue.includes(job)) queue.push(job) // 同一个 job 只排一次
    queueFlush()
}

function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
}

function flushJobs() {
    isFlushPending = false
    const jobs = queue.splice(0, queue.length) // 先取出快照，flush 过程中新加的留到下一轮
    for (const job of jobs) job()
    if (queue.length) flushJobs() // 组件有父子依赖时，执行中可能又推入新 job
}

// 等这轮更新做完（DOM 已经是最新的）再执行回调
function nextTick(fn) {
    const promise = currentFlushPromise || resolvedPromise
    return fn ? promise.then(fn) : promise
}

module.exports = { queueJob, queueFlush, flushJobs, nextTick }
