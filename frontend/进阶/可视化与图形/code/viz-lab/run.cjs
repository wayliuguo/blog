const assert = require('node:assert')
const { scaleLinear, scaleBand } = require('./scale.cjs')
const { pie, stack } = require('./layout.cjs')
const { MiniCanvas, buildBars, FrameScheduler, planSample } = require('./render.cjs')

// ── 场景一：线性比例尺 + invert + nice 刻度 ─────────────────────
console.log('场景一 · 线性比例尺')
const x = scaleLinear([0, 100], [0, 300])
assert.equal(x(50), 150) // 中点映射中点
assert.equal(x.invert(300), 100) // 像素反查数据
const xc = scaleLinear([0, 100], [0, 300], { clamp: true })
assert.equal(xc(150), 300) // 超域钳制到边界
assert.deepEqual(x.ticks(5), [0, 20, 40, 60, 80, 100])
console.log('  ✓ 50→150 · invert(300)→100 · clamp(150)→300 · ticks=[0,20,...,100]\n')

// ── 场景二：分段比例尺（类目轴）────────────────────────────────
console.log('场景二 · 分段比例尺')
const band = scaleBand(['a', 'b', 'c', 'd', 'e'], [0, 600], { paddingInner: 0.2 })
assert.equal(band('c'), 250) // 第 3 类的起点
assert.equal(band.step, 125) // 每类一格 125px
assert.equal(band.bandwidth, 100) // 柱宽 100，间隙 25
console.log('  ✓ 5 类 600px · step=125 · bandwidth=100\n')

// ── 场景三：饼图与堆叠布局 ─────────────────────────────────────
console.log('场景三 · 布局')
const arcs = pie([30, 20, 10])
assert.equal(arcs[0].endAngle, Math.PI) // 30/60 = 半圆
assert.ok(Math.abs(arcs[2].endAngle - Math.PI * 2) < 1e-9) // 弧段首尾相接（容差消浮点）
const rows = stack(
    [
        { label: 'Q1', a: 10, b: 5 },
        { label: 'Q2', a: 8, b: 7 }
    ],
    ['a', 'b']
)
assert.deepEqual(rows[0].a, { y0: 0, y1: 10 })
assert.deepEqual(rows[0].b, { y0: 10, y1: 15 }) // b 踩在 a 头上
console.log('  ✓ 饼图弧段首尾相接 · 堆叠 y0/y1 正确衔接\n')

// ── 场景四：全量重绘 vs 增量重绘 ───────────────────────────────
console.log('场景四 · 渲染成本')
const full = new MiniCanvas()
buildBars(full, 100)
full.ops[57] = ['fillRect', 57 * 6, 20, 4, 30, 'orange'] // 改第 58 根
full.repaintFull()
assert.equal(full.executed, 100) // 全量：付 100 根的代价
const inc = new MiniCanvas()
buildBars(inc, 100)
inc.ops[57] = ['fillRect', 57 * 6, 20, 4, 30, 'orange']
inc.repaintIncremental([inc.ops[57]])
assert.equal(inc.executed, 1) // 增量：只画受影响的 1 根
console.log('  ✓ 同样改 1 根柱子：全量执行 100 条指令，增量只执行 1 条\n')

// ── 场景五：帧内合并 ───────────────────────────────────────────
console.log('场景五 · 帧合并')
const cv = new MiniCanvas()
buildBars(cv, 100)
const sched = new FrameScheduler(() => cv.repaintFull())
sched.setData()
sched.setData()
sched.setData() // 一帧内 3 次数据变更
sched.flushFrame()
sched.flushFrame()
assert.equal(sched.frames, 1) // 只重绘 1 次
console.log('  ✓ 同一帧 3 次 setData 只触发 1 次重绘\n')

// ── 场景六：降级决策 ───────────────────────────────────────────
console.log('场景六 · 降级')
assert.deepEqual(planSample(3000, 0.005), { strategy: 'full', count: 3000 })
const plan = planSample(10000, 0.005)
assert.equal(plan.strategy, 'downsample')
assert.equal(plan.count, 3340) // 16.7ms / 0.005ms ≈ 3340 点是预算上限
console.log(`  ✓ 1 万点超预算 → 降采样到 ${plan.count} 点（保留率 ${(plan.ratio * 100).toFixed(1)}%）`)
console.log('\n全部场景通过 ✓')
