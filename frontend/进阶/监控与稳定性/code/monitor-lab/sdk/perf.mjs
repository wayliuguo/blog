/**
 * 性能采集（RUM 侧，零依赖）：Navigation / Paint / LCP / CLS / LongTask / Resource
 * 与 Lab（实验台）侧采集的三个关键差别：
 *   1. buffered:true —— 补收在 SDK 初始化之前就已经产生的条目，否则会漏 FCP
 *   2. 页面隐藏时定稿 —— LCP / CLS 是「越晚越准」的指标，必须在 visibilitychange 时收口
 *   3. 一切都要能降级 —— 老浏览器不支持某类 entry 时静默跳过，不能把页面搞崩
 */

export const PERF_THRESHOLDS = { ttfb: 800, fcp: 1800, lcp: 2500, cls: 0.1, tbt: 200 }

export function createPerfCollector(options = {}) {
  const win = options.win || (typeof window !== 'undefined' ? window : globalThis)
  const perf = options.performance || win.performance
  const PO = options.PerformanceObserver || win.PerformanceObserver
  const observers = []
  const metrics = { fp: 0, fcp: 0, lcp: 0, cls: 0, clsRaw: 0, tbt: 0, longtasks: 0, ttfb: 0, domReady: 0, load: 0, resources: 0, resourceBytes: 0 }

  function observe(type, cb, extra = {}) {
    if (typeof PO !== 'function') return false
    try {
      const po = new PO((list) => list.getEntries().forEach(cb))
      po.observe({ type, buffered: true, ...extra })
      observers.push(po)
      return true
    } catch {
      return false   // 该 entry 类型不被支持：直接放弃这一类，不抛
    }
  }

  function readNavigation() {
    const nav = perf && perf.getEntriesByType && perf.getEntriesByType('navigation')[0]
    if (!nav) return null
    metrics.ttfb = Math.round(nav.responseStart)
    metrics.domReady = Math.round(nav.domContentLoadedEventEnd)
    metrics.load = Math.round(nav.loadEventEnd)
    return nav
  }

  function observeAll() {
    observe('paint', (e) => {
      if (e.name === 'first-paint') metrics.fp = Math.round(e.startTime)
      if (e.name === 'first-contentful-paint') metrics.fcp = Math.round(e.startTime)
    })
    observe('largest-contentful-paint', (e) => { metrics.lcp = Math.round(e.startTime) })
    observe('layout-shift', (e) => {
      // 无用户输入时的位移才计入 CLS；带 hadRecentInput 的位移只是「点击后的正常重排」
      metrics.clsRaw += e.value
      if (!e.hadRecentInput) metrics.cls += e.value
    })
    observe('longtask', (e) => {
      metrics.longtasks++
      metrics.tbt += Math.max(0, e.duration - 50)   // TBT 只算超出 50ms 的部分
    })
    observe('resource', (e) => {
      metrics.resources++
      metrics.resourceBytes += e.transferSize || 0
    })
    readNavigation()
  }

  // 页面隐藏 / 卸载时收口：LCP 与 CLS 都是「越晚越准」
  function finalize() {
    metrics.lcp = Math.round(metrics.lcp)
    metrics.cls = Number(metrics.cls.toFixed(4))
    metrics.clsRaw = Number(metrics.clsRaw.toFixed(4))
    metrics.tbt = Math.round(metrics.tbt)
    return { ...metrics }
  }

  function onHidden() {
    if ((win.document && win.document.visibilityState) === 'hidden') return { reason: 'hidden', metrics: finalize() }
    return null
  }

  return { metrics, observeAll, readNavigation, finalize, onHidden, observers }
}

// 按 Core Web Vitals 的官方口径给一次评级，方便看板上直接标色
export function ratePerf(m) {
  const rate = (v, good, poor) => (v <= good ? '良好' : v <= poor ? '需改进' : '差')
  return {
    ttfb: rate(m.ttfb, PERF_THRESHOLDS.ttfb, PERF_THRESHOLDS.ttfb * 2),
    fcp: rate(m.fcp, PERF_THRESHOLDS.fcp, PERF_THRESHOLDS.fcp * 1.8),
    lcp: rate(m.lcp, PERF_THRESHOLDS.lcp, PERF_THRESHOLDS.lcp * 1.6),
    cls: rate(m.cls, PERF_THRESHOLDS.cls, PERF_THRESHOLDS.cls * 2.5),
    tbt: rate(m.tbt, PERF_THRESHOLDS.tbt, PERF_THRESHOLDS.tbt * 3),
  }
}
