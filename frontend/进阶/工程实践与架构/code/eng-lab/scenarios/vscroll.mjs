/**
 * 场景 D：虚拟滚动的区间计算
 * 虚拟滚动的核心不是 DOM 操作，而是一道"给定滚动位置，算出该渲染哪几条"的算术题。
 * 这里把这道题单独拎出来跑（不依赖浏览器），实测四件事：
 *   1) 定高方案在不同滚动位置下的渲染区间与 DOM 数量级
 *   2) 缓冲区（overscan）拿 DOM 换的是什么
 *   3) 不定高方案里"前缀和 + 二分"相对线性扫描的代价差
 *   4) 上方插入数据时的滚动锚定补偿
 */
import { table, title, section, num } from '../harness/table.mjs'

const TOTAL = 100000
const ROW_H = 44
const VIEWPORT = 600

/** 定高：可见区 + 上下缓冲区，返回该渲染的下标区间与内容容器的位移 */
export function rangeOf(scrollTop, { total, rowH, viewport, overscan = 0 }) {
    const visible = Math.ceil(viewport / rowH)
    const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan)
    const end = Math.min(total, Math.floor(scrollTop / rowH) + visible + overscan)
    return { start, end, count: Math.max(0, end - start), offset: start * rowH }
}

/** 找第一个前缀和 >= 目标偏移的下标（不定高场景的起点定位） */
export function lowerBound(offsets, target) {
    let lo = 0
    let hi = offsets.length - 1
    let steps = 0
    while (lo < hi) {
        steps++
        const mid = (lo + hi) >> 1
        if (offsets[mid] < target) lo = mid + 1
        else hi = mid
    }
    return { index: lo, steps }
}

/** 线性扫描做同一件事，用来对照 */
export function linearScan(offsets, target) {
    let steps = 0
    for (let i = 0; i < offsets.length; i++) {
        steps++
        if (offsets[i] >= target) return { index: i, steps }
    }
    return { index: offsets.length - 1, steps }
}

function makeHeights(total) {
    const out = new Array(total)
    let seed = 20260919
    for (let i = 0; i < total; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        out[i] = 32 + (seed % 49) // 32~80px 的不定高
    }
    return out
}

function buildOffsets(heights) {
    const offsets = new Float64Array(heights.length + 1)
    for (let i = 0; i < heights.length; i++) offsets[i + 1] = offsets[i] + heights[i]
    return offsets
}

function microseconds(fn, rounds = 2000) {
    // 先跑一遍热身，再取多轮中位数，避免 JIT 与首次分配干扰
    fn()
    const samples = []
    for (let s = 0; s < 7; s++) {
        const t = performance.now()
        for (let i = 0; i < rounds; i++) fn()
        samples.push(((performance.now() - t) / rounds) * 1000)
    }
    samples.sort((a, b) => a - b)
    return samples[3]
}

export default async function run() {
    console.log(title('实验设置'))
    console.log(`${TOTAL} 条数据，行高 ${ROW_H}px，视口 ${VIEWPORT}px → 一屏能放下 ${Math.ceil(VIEWPORT / ROW_H)} 条`)

    // —— 1. 定高区间
    console.log(section('一、定高方案：滚动位置 → 该渲染哪几条'))
    const positions = [0, 2200, 44000, (TOTAL - 1) * ROW_H]
    console.log(
        table(
            ['scrollTop', '可见区间', '渲染条数', '内容容器高度', '列表位移 translateY'],
            positions.map((top) => {
                const r = rangeOf(top, { total: TOTAL, rowH: ROW_H, viewport: VIEWPORT })
                return [
                    `${top} px`,
                    `${r.start} ~ ${r.end - 1}`,
                    r.count,
                    `${TOTAL * ROW_H} px`,
                    `${r.offset} px`
                ]
            })
        )
    )
    console.log('内容容器高度恒定为 total × rowH，它把滚动条撑到正确长度；真正渲染的只有 start~end 这一段，')
    console.log('用 translateY(offset) 把这段平移到视口位置 —— 于是滚动条是真的，DOM 是假的。')

    // —— 2. DOM 数量级
    console.log(section('二、和全量渲染的数量级差'))
    const r0 = rangeOf(44000, { total: TOTAL, rowH: ROW_H, viewport: VIEWPORT })
    console.log(
        table(
            ['方案', '挂载的列表项', '相对全量', '首屏可交互时间'],
            [
                ['全量渲染', TOTAL, '100%', '随条数线性增长'],
                ['虚拟滚动', r0.count, `${((r0.count / TOTAL) * 100).toFixed(2)}%`, '与条数无关']
            ]
        )
    )
    console.log(`渲染 ${r0.count} 条而不是 ${TOTAL} 条，DOM 节点少了 ${(100 - (r0.count / TOTAL) * 100).toFixed(2)}%，`)
    console.log('关键在于这个比值只由"视口高度 / 行高"决定，把数据从 1 万加到 100 万也不会变。')

    // —— 3. overscan
    console.log(section('三、缓冲区：拿 DOM 换的是"快速滚动不白屏"'))
    console.log(
        table(
            ['overscan', '渲染条数', '多渲染', '作用'],
            [0, 5, 10, 20].map((o) => {
                const r = rangeOf(44000, { total: TOTAL, rowH: ROW_H, viewport: VIEWPORT, overscan: o })
                return                 [
                    o,
                    r.count,
                    `+${r.count - r0.count}`,
                    o === 0 ? '刚好一屏，快速滚动时容易看到空白' : o === 5 ? '上下各预渲染 5 条，覆盖惯性滚动' : o === 10 ? '覆盖更快的滚动速度' : 'DOM 偏多，收益递减'
                ]
            })
        )
    )
    console.log('缓冲条数 = overscan × 2，所以它是个常数开销：overscan 取 5~10 通常就够了。')

    // —— 4. 不定高的定位代价
    console.log(section('四、不定高：前缀和 + 二分 vs 线性扫描'))
    const heights = makeHeights(TOTAL)
    const offsets = buildOffsets(heights)
    const totalHeight = offsets[TOTAL]
    const tBuild = microseconds(() => buildOffsets(heights), 20)
    console.log(
        table(
            ['方案', '定位方式', '单次查找步数', '单次查找耗时'],
            [
                ['定高', 'scrollTop ÷ rowH', '1', '常数时间'],
                [
                    '不定高',
                    `二分（${TOTAL} 条 → 约 ${Math.ceil(Math.log2(TOTAL))} 步）`,
                    lowerBound(offsets, totalHeight / 2).steps,
                    `${num(
                        microseconds(() => lowerBound(offsets, offsets[TOTAL >> 1]), 2000),
                        3
                    )} µs`
                ],
                [
                    '不定高',
                    '线性扫描（对照）',
                    linearScan(offsets, offsets[TOTAL >> 1]).steps,
                    `${num(
                        microseconds(() => linearScan(offsets, offsets[TOTAL >> 1]), 2000),
                        2
                    )} µs`
                ]
            ]
        )
    )
    console.log(`前缀和数组本身要重建 ${TOTAL + 1} 个元素，耗时 ${num(tBuild, 3)} µs —— 所以只在行高集合变化时重建，`)
    console.log('滚动过程中只读不写；行高变化时用增量更新而不是整表重算。')
    const target = offsets[TOTAL >> 1]
    const byBinary = lowerBound(offsets, target)
    const byLinear = linearScan(offsets, target)
    console.log(
        `\n在总高 ${totalHeight}px 的列表里滚到中线（${Math.round(target)}px）：` +
            `二分 ${byBinary.steps} 步命中第 ${byBinary.index} 条，线性扫描 ${byLinear.steps} 步才到 —— ` +
            `两者结果一致（下标 ${byBinary.index}），差的是 3 个数量级的步数。`
    )

    // —— 5. 滚动锚定
    console.log(section('五、上方插入数据时的滚动锚定'))
    const anchorIndex = 100
    const inserted = 20
    const insertHeight = inserted * ROW_H
    console.log(
        table(
            ['处理方式', '插入前视口首条', '插入后视口首条', '视觉位移'],
            [
                ['不动 scrollTop', anchorIndex, anchorIndex + inserted, `${insertHeight} px`],
                ['scrollTop += 插入总高', anchorIndex, anchorIndex, '0 px']
            ]
        )
    )
    console.log('往列表顶部插入数据、或上方图片加载完成把内容顶下去时，浏览器不会替你保位置：')
    console.log('要么补偿 scrollTop，要么用 CSS 的 overflow-anchor 交给浏览器做锚定，否则用户会看到内容"跳"一下。')

    console.log(section('读法'))
    console.log('- 定高优先：能定高就别做不定高，收益（一行除法）与成本（前缀和 + 二分 + 高度缓存）差得很远')
    console.log('- key 必须稳定且唯一：复用列表项时靠它认领状态，用下标当 key 会让输入框内容串行')
    console.log('- 搜索/筛选在数据层做：过滤是纯计算不碰 DOM，交给算法而不是"渲染后隐藏"')
    console.log('- 行内事件用事件委托挂到容器上，省下的是 N 个监听器的内存与解绑成本')
}
