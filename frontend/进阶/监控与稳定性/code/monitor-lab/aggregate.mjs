/**
 * 聚合（零依赖）：离散事件 → 秒桶 → 分位值 → 分钟级汇总
 * 为什么必须分位值：平均值会被少数慢请求拉偏，P75/P95 才代表「大多数用户的体感」
 */

// q 取 0.5 / 0.75 / 0.95 / 0.99；样本为空返回 0
export function percentile(values, q) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q))
  return sorted[idx]
}

export function median(values) {
  return percentile(values, 0.5)
}

// 秒桶：把事件按 ts 归到 [ts, ts+sizeMs) 的桶里，桶内先算计数，延迟留样本后算
export function bucketize(events, sizeMs = 1000) {
  const map = new Map()
  for (const e of events) {
    const ts = Math.floor(e.ts / sizeMs) * sizeMs
    let b = map.get(ts)
    if (!b) {
      b = { ts, count: 0, errors: 0, pv: 0, byKind: {}, latency: [] }
      map.set(ts, b)
    }
    b.count++
    const kind = e.kind || e.type || 'unknown'
    b.byKind[kind] = (b.byKind[kind] || 0) + 1
    if (kind === 'error' || e.ok === false) b.errors++
    if (e.name === 'pv') b.pv++
    if (typeof e.latency === 'number') b.latency.push(e.latency)
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts)
}

// 桶 → 可读指标：TPS / 平均延迟 / P95 / 错误率
export function summarizeBucket(b) {
  const avg = b.latency.length ? b.latency.reduce((a, c) => a + c, 0) / b.latency.length : 0
  return {
    ts: b.ts,
    count: b.count,
    tps: b.count,
    avg: Math.round(avg),
    p50: percentile(b.latency, 0.5),
    p75: percentile(b.latency, 0.75),
    p95: percentile(b.latency, 0.95),
    p99: percentile(b.latency, 0.99),
    errorRate: b.count ? b.errors / b.count : 0,
    errors: b.errors,
    pv: b.pv,
    max: b.latency.length ? Math.max(...b.latency) : 0,
  }
}

// 滑动窗口汇总：把最近 windowMs 的样本合起来算一次全局分位值（告警看的就是这个）
export function rollup(events, windowMs = 60000, now = Date.now()) {
  const from = now - windowMs
  const recent = events.filter((e) => e.ts >= from)
  const latency = recent.filter((e) => typeof e.latency === 'number').map((e) => e.latency)
  const errors = recent.filter((e) => (e.kind || e.type) === 'error' || e.ok === false).length
  return {
    window: windowMs,
    samples: recent.length,
    count: recent.length,
    tps: Math.round(recent.length / (windowMs / 1000)),
    avg: latency.length ? Math.round(latency.reduce((a, c) => a + c, 0) / latency.length) : 0,
    p50: percentile(latency, 0.5),
    p75: percentile(latency, 0.75),
    p95: percentile(latency, 0.95),
    p99: percentile(latency, 0.99),
    max: latency.length ? Math.max(...latency) : 0,
    errorRate: recent.length ? errors / recent.length : 0,
  }
}
