// 滑动窗口聚合：把原始点按时间桶归并，每桶只留 min/max/count（监控折线的降维）
function aggregate(points, bucketMs) {
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

module.exports = { aggregate }
