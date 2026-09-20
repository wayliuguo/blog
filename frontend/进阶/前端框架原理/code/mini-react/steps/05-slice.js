/**
 * 第 5 步：时间切片到底切掉了什么
 *
 * workLoop 每处理完一个 Fiber 就问一次"还有时间吗"。这里给它一个"每次只给 2ms"的
 * 假 deadline，手动驱动它，于是能数出：一次大渲染被切成了几片、最长一片阻塞多久。
 *
 * 两组都要先预热再取中位数：第一轮要付 JIT 编译的钱，直接对比会得出反的结论。
 *
 * 运行：npm run step:slice
 */
const { h, render, workLoop, host, state } = require('../src/index')

const N = 4000 // 列表项数，每项产生 2 个宿主节点（li + 文本）
const BUDGET = 2 // 每片给多少毫秒
const ROUNDS = 3

function List({ n }) {
    const items = []
    for (let i = 0; i < n; i++) items.push(h('li', { key: i }, `第 ${i} 项`))
    return h('ul', null, ...items)
}

// 一帧预算固定为 budget 毫秒的假 deadline（用 performance.now，Date.now 的粒度太粗）
function budgetDeadline(budget) {
    const start = performance.now()
    return { timeRemaining: () => budget - (performance.now() - start) }
}

function countNodes(node) {
    let n = 1
    for (const child of node.children) n += countNodes(child)
    return n
}

// ---- 对照组一：一次跑完（中途完全不让出主线程）----
function runOnce() {
    const container = host.createInstance('div')
    const t0 = performance.now()
    render(h(List, { n: N }), container, { sync: true })
    return { ms: performance.now() - t0, nodes: countNodes(container) }
}

// ---- 对照组二：每次只给 BUDGET ms，让出主线程后再继续 ----
function runSliced() {
    const container = host.createInstance('div')
    render(h(List, { n: N }), container, { manual: true }) // 不自己调度，由下面手动驱动

    const t0 = performance.now()
    const durations = []
    while (state.nextUnitOfWork) {
        const sliceStart = performance.now()
        workLoop(budgetDeadline(BUDGET))
        durations.push(performance.now() - sliceStart)
    }
    return {
        ms: performance.now() - t0,
        durations,
        longest: Math.max(...durations),
        nodes: countNodes(container)
    }
}

const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

runOnce()
runSliced() // 预热：让 JIT 把两条路径都编译好

const onceRuns = []
const sliceRuns = []
for (let i = 0; i < ROUNDS; i++) {
    onceRuns.push(runOnce())
    sliceRuns.push(runSliced())
}

const once = { ms: median(onceRuns.map(r => r.ms)), nodes: onceRuns[0].nodes }
const sliced = {
    ms: median(sliceRuns.map(r => r.ms)),
    durations: sliceRuns[0].durations,
    longest: median(sliceRuns.map(r => r.longest)),
    nodes: sliceRuns[0].nodes
}

const f = x => x.toFixed(1)

console.log(`渲染一个 ${N} 项的列表（宿主节点 ${once.nodes} 个），取 ${ROUNDS} 轮中位数\n`)
console.log('---- 一次跑完 ----')
console.log(`  总耗时        ${f(once.ms)} ms`)
console.log(`  最长一次阻塞  ${f(once.ms)} ms（= 总耗时，中途主线程完全没法响应输入）`)

console.log(`\n---- 每次只给 ${BUDGET}ms 时间片 ----`)
console.log(`  总耗时        ${f(sliced.ms)} ms`)
console.log(`  片数          ${sliced.durations.length}`)
console.log(`  最长一次阻塞  ${f(sliced.longest)} ms`)
const last = sliced.durations.length - 1
console.log('  每片耗时')
console.log(
    sliced.durations
        .map((d, i) => {
            let tag = ''
            if (i === 0) tag = '  ← 含 List 组件函数：造 4000 个 vnode，这一整块不可切分'
            else if (i === last) tag = '  ← 含 commit 阶段：所有 DOM 写入，不可中断'
            return `    #${String(i + 1).padStart(2)}  ${f(d).padStart(5)} ms${tag}`
        })
        .join('\n')
)

console.log('\n---- 结论 ----')
console.log(`1. 总工作量没变（节点数都是 ${sliced.nodes}）：切片不省时间，只是让人能插队。`)
console.log(`   最长阻塞从 ${f(once.ms)} ms 降到 ${f(sliced.longest)} ms，输入/点击才有机会响应。`)
console.log('2. 但切片不是万能的，两处仍然不可切分：')
console.log('   · 第一个工作单元是「执行 List 组件函数」，它自己要造 4000 个 vnode；')
console.log('   · 最后一个工作单元后面紧跟 commit，所有 DOM 写入必须一次做完。')
console.log('   → 组件本身算得久，时间切片救不了它，那是 memo / 虚拟列表要解决的问题。')
const overhead = ((sliced.ms / once.ms - 1) * 100).toFixed(0)
console.log(`3. 让出主线程本身几乎不花钱：总耗时 ${f(once.ms)} ms → ${f(sliced.ms)} ms（${overhead}%），`)
console.log(`   ${sliced.durations.length} 次"停下来问时间"的总开销，远小于 20 ms 量级的工作量。`)
console.log('   真实 React 的额外开销来自优先级计算与副作用标记，不在"切"这个动作本身。')
