// 时间切片：把任务列表按帧预算切分，单帧放不下的顺延到下一帧
function chunkTasks(costs, budget = 16.7) {
  const frames = []
  let cur = []
  let used = 0
  for (const c of costs) {
    // 当前帧放不下且已有任务 → 收帧开新帧
    if (used + c > budget && cur.length) {
      frames.push(cur)
      cur = []
      used = 0
    }
    cur.push(c)
    used += c
  }
  if (cur.length) frames.push(cur)
  return frames
}

// 降级阶梯：视觉 → 数据 → 渲染器逐级加码，取第一个满足帧预算的档位
const LADDER = [
  { level: 'L0 原样', costPerPoint: 0.005 },
  { level: 'L1 去阴影渐变', costPerPoint: 0.0035 },
  { level: 'L2 降采样', costPerPoint: 0.002 },
  { level: 'L3 上 WebGL', costPerPoint: 0.0005 },
]
function pickLevel(count, budget = 16.7) {
  for (const l of LADDER) {
    if (count * l.costPerPoint <= budget) return l.level
  }
  return LADDER[LADDER.length - 1].level // 都超预算就顶格降
}

module.exports = { chunkTasks, LADDER, pickLevel }
