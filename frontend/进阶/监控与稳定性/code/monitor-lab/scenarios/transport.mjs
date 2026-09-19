/**
 * 场景 transport：上报传输层的四个关键行为
 *   1. 攒批     —— 逐条发 vs 攒批发，请求次数差多少
 *   2. 采样     —— sampleRate 控制上报量，采样掉的事件不出端
 *   3. 失败重试 —— 投递失败后按 maxRetry 重试，成功才计入 sent
 *   4. 溢出丢弃 —— 队列超过 maxQueue 丢最旧的，防止内存被慢网络拖爆
 * 运行：npm run transport
 */
import { createTransport } from '../sdk/transport.mjs'
import { table, title, section, pct, runAsMain } from '../harness.mjs'

// 可注入的「浏览器环境」：用 sendBeacon 的返回值模拟投递成功/失败
function beaconEnv({ failUntil = 0 } = {}) {
  const delivered = []
  let calls = 0
  return {
    delivered,
    calls: () => calls,
    navigator: {
      sendBeacon(url, body) {
        calls++
        if (calls <= failUntil) return false   // 模拟这一批投递失败
        delivered.push(JSON.parse(body))
        return true
      },
    },
  }
}

const ev = (i) => ({ ts: 1700000000000 + i, type: 'track', name: 'click', id: `btn-${i}` })

export default async function run() {
  console.log(title('场景 1 · 上报传输层：攒批 / 采样 / 重试 / 丢弃'))

  /* ---- 1. 攒批 vs 逐条 ---- */
  const batching = []
  for (const [label, batchSize, count] of [['逐条上报', 1, 12], ['攒批上报', 5, 12]]) {
    const env = beaconEnv()
    const t = createTransport({ env, batchSize, flushInterval: 1e9, sampleRate: 1 })
    for (let i = 0; i < count; i++) t.enqueue(ev(i))
    await t.flush('manual')
    t.stop()
    batching.push([label, count, env.calls(), t.stats().batches, t.stats().sent])
  }
  console.log(section('攒批：同样 12 条事件，请求次数差 4 倍'))
  console.log(table(['策略', '事件数', 'HTTP 请求数', '批次数', '发送成功'], batching))

  /* ---- 2. 采样 ---- */
  const sampled = []
  for (const rate of [1, 0.5, 0.1]) {
    const env = beaconEnv()
    const t = createTransport({ env, batchSize: 1000, flushInterval: 1e9, sampleRate: rate })
    for (let i = 0; i < 2000; i++) t.enqueue(ev(i))
    await t.flush('manual')
    t.stop()
    const s = t.stats()
    sampled.push([pct(rate, 0), 2000, s.accepted, s.sampled, pct(s.accepted / 2000)])
  }
  console.log(section('采样：入队 2000 条，实际接受多少（随机数，每次略有浮动）'))
  console.log(table(['采样率', '入队', '接受', '被采样丢弃', '实际接受率'], sampled))

  /* ---- 3. 失败重试 ---- */
  const retry = []
  for (const failUntil of [0, 2, 5]) {
    const env = beaconEnv({ failUntil })
    // batchSize 故意设大，避免 enqueue 触发自动 flush，把投递时机交给显式 flush
    const t = createTransport({ env, batchSize: 10, maxRetry: 2, flushInterval: 1e9 })
    t.enqueue(ev(1))
    const r = await t.flush('manual')
    t.stop()
    retry.push([`前 ${failUntil} 次失败`, env.calls(), r.attempt, t.stats().retried, r.ok ? '成功' : '放弃', t.stats().sent, t.stats().dropped])
  }
  console.log(section('重试：maxRetry=2，最多额外试 2 次；失败 3 次（首投 + 2 次重试）后放弃并计入 dropped'))
  console.log(table(['投递情况', 'sendBeacon 调用', '重试轮数', 'retried 计数', '结果', 'sent', 'dropped'], retry))

  /* ---- 4. 队列溢出 ---- */
  const overflowEnv = beaconEnv()
  const overflow = createTransport({ env: overflowEnv, batchSize: 1000, maxQueue: 10, flushInterval: 1e9 })
  for (let i = 0; i < 50; i++) overflow.enqueue(ev(i))
  const beforeFlush = overflow.size()
  await overflow.flush('manual')
  overflow.stop()
  const os = overflow.stats()
  console.log(section('溢出：maxQueue=10，入队 50 条（网络慢时队列会一直涨）'))
  console.log(table(['指标', '数值'], [
    ['入队', 50],
    ['队列实际长度', beforeFlush],
    ['accepted（接受过的总数）', os.accepted],
    ['dropped（含溢出丢弃）', os.dropped],
    ['最终投递', os.sent],
  ]))

  /* ---- 5. fetch 兜底 ---- */
  const fetchEnv = {
    delivered: [],
    fetch(url, init) {
      this.delivered.push({ url, body: JSON.parse(init.body) })
      return Promise.resolve({ ok: true })
    },
  }
  const f = createTransport({ env: fetchEnv, batchSize: 2, flushInterval: 1e9 })
  f.enqueue(ev(1)); f.enqueue(ev(2))
  await f.flush('manual')
  f.stop()
  console.log(section('兜底：环境没有 sendBeacon 时自动降级到 fetch(keepalive)'))
  console.log(table(['URL', '批内条数', '耗时方式'], [['/collect', fetchEnv.delivered[0].body.events.length, 'fetch + keepalive']]))
}

runAsMain(import.meta.url, run)
