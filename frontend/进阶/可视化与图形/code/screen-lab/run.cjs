const assert = require('node:assert')
const { chunkTasks, pickLevel } = require('./chunk.cjs')
const { aggregate } = require('./aggregate.cjs')

// ── 场景一：时间切片 ────────────────────────────────────────────
console.log('场景一 · 时间切片')
const costs = Array.from({ length: 10 }, () => 3) // 10 个任务，每个 3ms
const frames = chunkTasks(costs)
assert.equal(frames.length, 2)      // 30ms 总量 → 2 帧（每帧 5 个）
assert.equal(frames[0].length, 5)
const lone = chunkTasks([20, 3])    // 单个任务就超预算：拆不动，独占一帧
assert.equal(lone.length, 2)
assert.equal(lone[0][0], 20)
console.log('  ✓ 10×3ms 切成 2 帧 · 单个 20ms 任务独占一帧（最小粒度是单任务）\n')

// ── 场景二：降级阶梯 ────────────────────────────────────────────
console.log('场景二 · 降级阶梯')
assert.equal(pickLevel(2000), 'L0 原样')      // 10ms < 16.7ms 不降
assert.equal(pickLevel(4000), 'L1 去阴影渐变') // 20ms → 先降视觉
assert.equal(pickLevel(8000), 'L2 降采样')     // 40ms → 再降数据
assert.equal(pickLevel(20000), 'L3 上 WebGL')  // 100ms → 换渲染器
console.log('  ✓ 2k→L0 · 4k→L1 · 8k→L2 · 2w→L3，逐级加码不跳级\n')

// ── 场景三：滑动窗口聚合 ────────────────────────────────────────
console.log('场景三 · 数据聚合')
const pts = [[100, 5], [300, 9], [600, 2], [1100, 7], [1500, 4]]
const buckets = aggregate(pts, 1000)
assert.equal(buckets.length, 2)
assert.deepEqual(buckets[0], { t: 0, min: 2, max: 9, count: 3 })
assert.deepEqual(buckets[1], { t: 1000, min: 4, max: 7, count: 2 })
// 万级原始点 → 秒级桶：降维前后对比
const raw = Array.from({ length: 10000 }, (_, i) => [i * 100, Math.sin(i)])
const reduced = aggregate(raw, 60000)
assert.equal(reduced.length, Math.ceil(1000000 / 60000)) // 17 个分钟桶
console.log(`  ✓ 1 万原始点聚成 ${reduced.length} 个分钟桶，每桶只带 min/max/count`)
console.log('\n全部场景通过 ✓')
