// 线性比例尺：把数据域 [d0,d1] 映射到像素域 [r0,r1]
function scaleLinear(domain, range, { clamp = false } = {}) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = (r1 - r0) / (d1 - d0) // 斜率：像素 / 数据单位
  function scale(x) {
    let v = r0 + (x - d0) * k
    if (clamp) v = Math.min(r1, Math.max(r0, v))
    return v
  }
  // invert：像素坐标反查数据值，图表 hover / 点击定位全靠它
  scale.invert = (y) => (y - r0) / k + d0
  scale.ticks = (count = 5) => niceTicks(d0, d1, count)
  return scale
}

// nice 刻度：先按目标刻度数估步长，再对齐到 1/2/5 × 10^n
function niceTicks(d0, d1, count) {
  const step0 = (d1 - d0) / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  let step = 10 * mag
  for (const m of [1, 2, 5, 10]) {
    if (m * mag >= step0) { step = m * mag; break } // 取最小的「好看步长」
  }
  const ticks = []
  for (let t = Math.ceil(d0 / step) * step; t <= d1 + 1e-9; t += step) {
    ticks.push(Number(t.toFixed(12))) // 消浮点累加误差的尾巴
  }
  return ticks
}

// 分段比例尺：类目轴。每类占一格 step，格内留 padding，柱宽 = step × (1 - paddingInner)
function scaleBand(domain, range, { paddingInner = 0, paddingOuter = 0 } = {}) {
  const [r0, r1] = range
  const n = domain.length
  const step = (r1 - r0) / Math.max(1, n - paddingInner + paddingOuter * 2)
  const start = r0 + step * paddingOuter
  const scale = (x) => start + domain.indexOf(x) * step
  scale.step = step
  scale.bandwidth = step * (1 - paddingInner)
  return scale
}

module.exports = { scaleLinear, niceTicks, scaleBand }
