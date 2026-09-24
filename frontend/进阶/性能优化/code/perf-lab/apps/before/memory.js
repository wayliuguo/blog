/**
 * 内存独立页（优化前实现）：同样分配 60 轮，每轮的数组都挂在 window 上留引用 —— GC 收不走
 * 这是唯一一个要单独开浏览器的实验：需要 --enable-precise-memory-info，
 * 否则 performance.memory 的粒度是 100KB 级，看不出逐轮趋势。
 * 对照 after 项目的 memory.html（可回收版），两边开出来的增长量就是这层的差异。
 */
const ROUNDS = 60
/** 优化前的写法：结果数组挂在全局，生命周期与页面同长，GC 永远收不走 */
const bags = (window.__leakedBags = [])
const out = document.getElementById('out')

/** 分配 n 个对象，每个带 512 字节字符串，模拟真实业务里的数据缓存 */
function alloc(n) {
    const arr = []
    for (let i = 0; i < n; i++) arr.push({ id: i, payload: 'x'.repeat(512) })
    return arr
}

const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : null)
const mb = v => (v == null ? 'n/a' : (v / 1024 / 1024).toFixed(1) + ' MB')

async function main() {
    const samples = []
    for (let r = 0; r < ROUNDS; r++) {
        const chunk = alloc(2000)
        bags.push(chunk) // 留引用 → GC 收不走
        samples.push(heap())
        await new Promise(resolve => setTimeout(resolve, 0))
    }

    const first = samples[Math.floor(ROUNDS * 0.1)]
    const last = samples[samples.length - 1]
    const peak = Math.max(...samples.filter(v => v != null))
    const growth = first != null && last != null ? last - first : null

    out.textContent = [
        `实现            : 留引用（泄漏）`,
        `轮次            : ${ROUNDS}（每轮 2000 个对象 × 512B）`,
        `第 10% 处堆大小 : ${mb(first)}`,
        `末轮堆大小      : ${mb(last)}`,
        `峰值堆大小      : ${mb(peak)}`,
        `增长量          : ${mb(growth)}`
    ].join('\n')

    Lab.finish(
        {
            impl: 'leak',
            rounds: ROUNDS,
            precise: !!(performance.memory && performance.memory.jsHeapSizeLimit),
            first: first == null ? null : Math.round(first / 1024),
            last: last == null ? null : Math.round(last / 1024),
            peak: peak == null ? null : Math.round(peak / 1024),
            growth: growth == null ? null : Math.round(growth / 1024),
            kept: bags.length
        },
        200
    )
}

main()
