# Canvas 2D 基础与性能

Canvas 是可视化的地基：ECharts 的默认渲染器、各类图表、游戏、图像处理，底层都是它。这一篇先补齐 Canvas 的心智模型（即时模式、状态机），再用可运行的实验验证它的性能模型——**为什么改一根柱子要重画一整屏、帧预算怎么算、降级怎么决策**。

## 一、Canvas 是什么：位图与即时模式

`<canvas>` 只是一张位图，`getContext('2d')` 拿到的是画笔。它和 SVG 的根本区别在渲染模式：

| | Canvas（即时模式） | SVG（保留模式） |
| --- | --- | --- |
| 你操作什么 | 画笔指令：画完就忘，画布上没有「对象」 | DOM 节点：每个图形都是元素，留着可改 |
| 重画方式 | 任何变化都要整幅重画 | 改一个节点的属性，浏览器只重绘它 |
| 拾取交互 | 自己算几何命中（isPointInPath / 数学） | 浏览器帮你做（事件直接绑在元素上） |
| 适合 | 上千个图形、逐帧动画、图像处理 | 几百个以内、需要 DOM 交互、可缩放 |

> 提示：即时模式意味着 Canvas 没有「场景图」——想移动一个矩形，必须先清屏再按新坐标重画所有东西。理解这一点，性能问题就有了统一的解释框架。

## 二、基础绘制与状态机

Canvas 的 API 是「状态机 + 指令」：设置状态（颜色、线宽、变换），再执行绘制指令。

> 示意片段（无配套脚本）

```js
const ctx = canvas.getContext('2d')
ctx.fillStyle = 'steelblue'      // 设置状态（不影响已画内容）
ctx.fillRect(10, 10, 100, 50)    // 执行指令（用当前状态画）
ctx.save()                       // 保存状态快照
ctx.translate(50, 0)             // 变换坐标
ctx.restore()                    // 恢复到快照，避免状态泄漏
```

三条最容易被忽视的规矩：

1. **`save` / `restore` 必须成对**——变换和样式状态会泄漏到后续绘制，这是「画着画着全歪了」的头号原因；
2. **样式设置本身就是开销**——`fillStyle` 每次赋值都会让状态变化，同色图形应批量画；
3. **像素级操作用 `getImageData` / `putImageData`**，它们绕过状态机直接读写位图，但也绕过 GPU 加速。

## 三、渲染成本模型：显示列表

Canvas 没有场景图，但我们可以给应用层自己建一个——**显示列表（display list）**：把「当前画面由哪些指令构成」记下来，重绘就是对它重放。这正好也是 ECharts 内部 ZRender 的思路。用实验台模拟：

> 摘自 `./code/viz-lab/render.cjs`

```js
// 迷你「虚拟画布」：只记录绘制指令不真画 —— 用指令数度量渲染成本
class MiniCanvas {
  constructor() {
    this.ops = [] // 显示列表：当前画面由哪些指令构成
    this.clears = 0
    this.executed = 0 // 最近一次重绘真正执行的指令数
  }
  add(op) { this.ops.push(op); return this }
  // 策略 A · 全量重绘：清屏后重放整个显示列表（改 1 根柱子也要付 100 根的代价）
  repaintFull() {
    this.clears++
    this.executed = this.ops.length
  }
  // 策略 B · 增量重绘：只执行受影响的指令（真实实现按脏矩形裁剪）
  repaintIncremental(changed) {
    this.clears++
    this.executed = changed.length
  }
}
```

填 100 根柱子，然后只改其中 1 根：

> 摘自 `./code/viz-lab/render.cjs`

```js
// 用 n 根柱子填充显示列表
function buildBars(canvas, n) {
  for (let i = 0; i < n; i++) {
    canvas.add(['fillRect', i * 6, 0, 4, 50, 'steelblue'])
  }
  return canvas.ops
}
```

实测（`node run.cjs` 场景四）：

> 摘自 `./code/viz-lab/run.cjs`

```js
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
assert.equal(inc.executed, 1)    // 增量：只画受影响的 1 根
console.log('  ✓ 同样改 1 根柱子：全量执行 100 条指令，增量只执行 1 条\n')
```

**同样改 1 根柱子，全量执行 100 条指令、增量只执行 1 条。** 这就是为什么大屏类项目要做「脏矩形 + 增量重绘」，也是为什么 Canvas 图表在高频更新下需要引擎级的优化而不是调 API。

## 四、帧预算与合并

显示器每 16.7ms 刷新一次（60fps），一次重绘必须在这之内完成。应用层的第一个纪律是：**一帧内多次数据变更，只重绘一次**——全部合并到 `requestAnimationFrame` 回调里：

> 摘自 `./code/viz-lab/render.cjs`

```js
// 帧内合并：同一帧里多次数据变更只重绘一次（rAF 的核心价值）
class FrameScheduler {
  constructor(repaint) {
    this.repaintFn = repaint
    this.dirty = false
    this.frames = 0
  }
  setData() { this.dirty = true } // 只标脏，不画
  flushFrame() { // 模拟下一帧 rAF 回调
    if (!this.dirty) return
    this.dirty = false
    this.frames++
    this.repaintFn()
  }
}
```

实测：同一帧 3 次 `setData`，只触发 1 次重绘（`node run.cjs` 场景五）：

> 摘自 `./code/viz-lab/run.cjs`

```js
// ── 场景五：帧内合并 ───────────────────────────────────────────
console.log('场景五 · 帧合并')
const cv = new MiniCanvas()
buildBars(cv, 100)
const sched = new FrameScheduler(() => cv.repaintFull())
sched.setData(); sched.setData(); sched.setData() // 一帧内 3 次数据变更
sched.flushFrame()
sched.flushFrame()
assert.equal(sched.frames, 1) // 只重绘 1 次
console.log('  ✓ 同一帧 3 次 setData 只触发 1 次重绘\n')
```

> 提示：WebSocket 推送、轮询、用户拖动可能在一帧内连环触发 setData——不合并的话，同一帧就是画三次白三次，帧预算瞬间爆掉。

## 五、性能手法清单

按「性价比从高到低」排序，都是大屏项目的常规操作：

> 示意片段（无配套脚本）

```
1. 离屏 canvas 预渲染：把不变的背景/网格画到离屏画布，每帧 drawImage 一次贴上
2. 分层 canvas：静态层（网格/背景）与动态层（数据）分开，动态层只重绘自己
3. 帧内合并：一切 setData 只标脏，rAF 回调统一重绘（见上节实测）
4. 增量重绘：脏矩形裁剪，只重画受影响区域（见上节实测）
5. 批量绘制：同色 path 合并成一个 beginPath，减少状态切换
6. 避免亚像素：坐标取整，抗锯齿开销骤降
7. 长任务切片：数据分片逐帧处理，避免一次 setData 卡死主线程
```

前两条值得展开：**离屏预渲染**相当于把 Canvas 也做出了「保留模式」——贵的部分画一次存成位图，之后每帧只是一次 `drawImage` 拷贝，GPU 处理极快；**分层 canvas** 则是多个 `<canvas>` 叠放，各自按需重绘，互不拖累。

## 六、降级：数据量超预算怎么办

帧预算 16.7ms 是硬约束。如果每个数据点的绘制成本是固定的，那么「最多能画多少点」就可以直接算出来，超了就降采样：

> 摘自 `./code/viz-lab/render.cjs`

```js
// 降级决策：点数 × 单点成本 ≈ 帧预算，超了就降采样
function planSample(count, costPerPoint, budget = 16.7) {
  const maxPoints = Math.floor(budget / costPerPoint)
  if (count <= maxPoints) return { strategy: 'full', count }
  return { strategy: 'downsample', count: maxPoints, ratio: maxPoints / count }
}
```

实测：单点成本 0.005ms 时，预算上限约 3340 点；1 万点的数据必须降采样（`node run.cjs` 场景六）：

> 摘自 `./code/viz-lab/run.cjs`

```js
// ── 场景六：降级决策 ───────────────────────────────────────────
console.log('场景六 · 降级')
assert.deepEqual(planSample(3000, 0.005), { strategy: 'full', count: 3000 })
const plan = planSample(10000, 0.005)
assert.equal(plan.strategy, 'downsample')
assert.equal(plan.count, 3340) // 16.7ms / 0.005ms ≈ 3340 点是预算上限
console.log(`  ✓ 1 万点超预算 → 降采样到 ${plan.count} 点（保留率 ${(plan.ratio * 100).toFixed(1)}%）`)
console.log('\n全部场景通过 ✓')
```

> 提示：ECharts 的 `sampling: 'lttb'`（最大最小三角抽稀）就是生产级的降采样实现——降级不是「画不动就卡着」，而是有策略地丢数据：趋势图用抽稀保形状，监控折线用采样保特征点。

## 小结

- Canvas 2D 基础与性能
  - 心智模型：位图 + 即时模式，没有场景图，变化即重画；与 SVG 的取舍在规模与交互
  - 状态机：save/restore 成对防状态泄漏；样式切换本身是开销
  - 渲染成本模型
    - 显示列表：记录画面构成，重绘 = 重放（ZRender 同思路）
    - 实测：改 1 根柱子全量 100 条指令 vs 增量 1 条
  - 帧纪律：一切变更只标脏，rAF 合并，一帧一画（3 次 setData 实测只画 1 次）
  - 手法清单：离屏预渲染 / 分层 canvas / 批量 path / 取整坐标 / 长任务切片
  - 降级：预算公式 16.7ms ÷ 单点成本 = 最大点数，超限降采样（1 万点实测降到 3340）

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/viz-lab/render.cjs` | 虚拟画布 / 帧调度器 / 降级决策 | 三、四、五、六 |
| `./code/viz-lab/run.cjs` | 六场景自检（四/五/六为本篇实测） | 三、四、六 |
| `./code/viz-lab/scale.cjs` | 比例尺 | （图表引擎篇引用） |
| `./code/viz-lab/layout.cjs` | 饼图 / 堆叠布局 | （图表引擎篇引用） |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 下一篇：[图表引擎原理](./图表引擎原理.md)
- MDN：[Canvas 教程](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial) · [优化 Canvas](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Optimizing_canvas)
