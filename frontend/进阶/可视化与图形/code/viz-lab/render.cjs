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

// 用 n 根柱子填充显示列表
function buildBars(canvas, n) {
  for (let i = 0; i < n; i++) {
    canvas.add(['fillRect', i * 6, 0, 4, 50, 'steelblue'])
  }
  return canvas.ops
}

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

// 降级决策：点数 × 单点成本 ≈ 帧预算，超了就降采样
function planSample(count, costPerPoint, budget = 16.7) {
  const maxPoints = Math.floor(budget / costPerPoint)
  if (count <= maxPoints) return { strategy: 'full', count }
  return { strategy: 'downsample', count: maxPoints, ratio: maxPoints / count }
}

module.exports = { MiniCanvas, buildBars, FrameScheduler, planSample }
