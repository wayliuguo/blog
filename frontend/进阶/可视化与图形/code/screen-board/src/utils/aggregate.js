// 时间桶聚合（与 ../screen-lab/aggregate.cjs 同源，生产实现）：
// 监控折线的原始数据是秒级甚至毫秒级上报，直接画几万个点既费帧预算又看不出信息。
// 每桶只留 min / max / count——min/max 保住「尖峰」这个监控最重要的特征。
export function aggregate(points, bucketMs) {
  const buckets = new Map()
  for (const [t, v] of points) {
    const key = Math.floor(t / bucketMs) * bucketMs
    if (!buckets.has(key)) {
      buckets.set(key, { t: key, min: v, max: v, count: 0 })
    }
    const b = buckets.get(key)
    b.min = Math.min(b.min, v)
    b.max = Math.max(b.max, v)
    b.count++
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t)
}

// 折线图数据形态：每桶取 max 画主线、min/max 画置信带（ECharts stack 面积图做法）
export function toLineSeries(buckets) {
  return {
    times: buckets.map(b => new Date(b.t).toLocaleTimeString('zh-CN', { minute: '2-digit', second: '2-digit' })),
    upper: buckets.map(b => b.max),
    lower: buckets.map(b => b.min),
  }
}
