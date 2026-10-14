// mock 数据源：模拟「服务端每 2s 推一批，前端每帧最多渲染一次」。
// 核心纪律是帧内合并：数据到达只标脏（pending），真正的消费统一在 rAF 回调里——
// 推送频率再高，DOM/图表更新频率也不会超过显示器的刷新率。
export function createFeed(intervalMs = 2000) {
  const listeners = new Set()
  let pending = null
  let running = true

  const timer = setInterval(() => {
    pending = {
      qps: genQps(),
      channels: genChannels(),
      terminals: genTerminals(),
      gmv: genGmv(),
      alert: genAlert(),
    } // 只标脏，不直接推
  }, intervalMs)

  function raf() {
    if (!running) return
    if (pending) {
      const p = pending
      pending = null
      for (const fn of listeners) fn(p)
    }
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  return {
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    stop() {
      running = false
      clearInterval(timer)
    },
  }
}

function genQps() {
  // 60 个点，最后一根是「现在」，其余为历史——模拟滑动窗口
  const now = Date.now()
  const base = 800 + Math.round(Math.sin(now / 60000) * 200)
  const points = []
  for (let i = 59; i >= 0; i--) {
    points.push([now - i * 1000, Math.max(0, base + rand(-120, 120))])
  }
  return points
}

function genChannels() {
  return ['APP', '小程序', 'H5', 'PC'].map(name => ({
    name,
    value: rand(200, 1200),
  }))
}

function genTerminals() {
  return ['iOS', 'Android', 'Web'].map(name => ({ name, value: rand(100, 900) }))
}

function genGmv() {
  return rand(800000, 1600000)
}

const SEVERITIES = ['info', 'warn', 'error']
const ALERT_TPL = [
  ['支付回调延迟', 'info'],
  ['订单创建耗时 P99 超阈值', 'warn'],
  ['库存服务 5xx 突增', 'error'],
  ['风控规则命中率异常', 'warn'],
  ['慢查询数量上升', 'info'],
]

function genAlert() {
  const [msg, sev] = ALERT_TPL[rand(0, ALERT_TPL.length - 1)]
  return { time: new Date().toLocaleTimeString('zh-CN'), msg, severity: sev }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
