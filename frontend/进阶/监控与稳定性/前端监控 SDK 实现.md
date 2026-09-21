# 前端监控 SDK 实现

`监控平台` 讲了监控要采集什么（错误 / 性能 / 埋点）与告警怎么做，但把采集代码散落在业务页面里，早晚会变成一团：同一个错误上报三遍、页面关闭时数据丢了、埋点把主线程拖慢。本篇讲把这些收成**一个 SDK**：它长什么样、为什么必须这么分层、哪几个坑一定会踩。

## 一、SDK 分成四层，一层只干一件事

监控 SDK 的复杂度不在"采集"，而在"采集之外"。把职责切开，每层都能单独测：

> 摘自 `./code/monitor-lab/sdk/index.mjs`

```js
export const DEFAULTS = {
  appId: 'default',
  url: '/collect',
  sampleRate: 1,
  throttleMs: 3000,   // 同一条错误 3 秒内只报一次
  autoErrors: true,
  autoPerf: true,
  autoTrack: true
}
```

| 层 | 职责 | 本实验台落在哪 |
| --- | --- | --- |
| 采集层 | 从浏览器拿到原始事实：错误、性能条目、行为 | `sdk/errors.mjs` `sdk/perf.mjs` `sdk/track.mjs` |
| 传输层 | 采样 → 攒批 → 投递 → 重试 → 溢出丢弃 | `sdk/transport.mjs` |
| 治理层 | 采样率、脱敏、按指纹频控 | `transport` 与 `errors` 各承担一半 |
| 生命周期 | 什么时候初始化、什么时候收口上报 | `sdk/index.mjs` |

> 摘自 `./code/monitor-lab/sdk/index.mjs`

```js
export function init(options = {}) {
  // 单例：业务里可能多处 init，重复初始化只会重复绑监听、重复上报
  if (instance) return instance
  const cfg = { ...DEFAULTS, ...options }
  const win = cfg.win || (typeof window !== 'undefined' ? window : globalThis)

  const transport = createTransport({ url: cfg.url, sampleRate: cfg.sampleRate, env: win, ...(cfg.transport || {}) })
  const emit = event => transport.enqueue({ appId: cfg.appId, ts: event.ts ?? Date.now(), ...event })

  const errors = cfg.autoErrors ? installErrorCapture({ win, emit, throttleMs: cfg.throttleMs }) : null
  const perf = cfg.autoPerf ? createPerfCollector({ win }) : null
  const track = cfg.autoTrack ? createTracker({ win, emit }) : null
  const plugins = []
```

关键点：**插件只负责"采"，`emit` 只负责把事件丢进传输层**。加一类采集（比如 WebSocket 断连、白屏检测）就是加一个插件，传输、重试、生命周期一行都不用改。

## 二、为什么单例与插件化不是"设计癖"

两个理由都是踩出来的：

- **重复初始化 = 重复上报**。多个团队各写一句 `init()`，结果是每一类错误上报 N 遍，看板上的错误数直接乘 N。
- **插件让采集器之间互不感知**。错误采集不该知道埋点存在，反之亦然；它们唯一的交集是 `emit(event)` 这个函数签名。

> 摘自 `./code/monitor-lab/sdk/index.mjs`

```js
  function use(plugin) {
    plugins.push(plugin)
    if (plugin && typeof plugin.install === 'function') plugin.install({ track, emit, transport, win, flushAll })
    return instance
  }
```

## 三、传输层：采样、攒批、重试、溢出，四件事都必须有

传输层的输入是"一条条事件"，输出是"一次次 HTTP 请求"。四件事按顺序发生：

> 摘自 `./code/monitor-lab/sdk/transport.mjs`

```js
export const DEFAULT_TRANSPORT = {
  url: '/collect',
  batchSize: 5,        // 攒够 5 条就发一批
  flushInterval: 3000, // 否则最多等 3 秒
  maxRetry: 2,         // 每批失败后最多再试 2 次
  sampleRate: 1,       // 采样率（0~1）
  maxQueue: 100,       // 队列上限，超出丢最旧的
}
```

### 1. 攒批：请求数直接决定监控的网络成本

同样是 12 条事件，逐条发和攒批发差 4 倍：

> 摘自 `./code/monitor-lab/scenarios/transport.mjs`（运行：`npm run transport`）

```
---- 攒批：同样 12 条事件，请求次数差 4 倍 ----
| 策略     | 事件数 | HTTP 请求数 | 批次数 | 发送成功 |
|----------|--------|-------------|--------|----------|
| 逐条上报 | 12     | 12          | 12     | 12       |
| 攒批上报 | 12     | 3           | 3      | 12       |
```

线上量级下这个差别更明显：PV 十万的站点，每次点击都发一条的话，监控自己就能把带宽吃掉。

### 2. 采样：量不可控时必须主动丢

入队 2000 条，三种采样率的实际结果：

> 摘自 `./code/monitor-lab/scenarios/transport.mjs`（运行：`npm run transport`）

```
---- 采样：入队 2000 条，实际接受多少（随机数，每次略有浮动） ----
| 采样率 | 入队 | 接受 | 被采样丢弃 | 实际接受率 |
|--------|------|------|------------|------------|
| 100%   | 2000 | 2000 | 0          | 100.0%     |
| 50%    | 2000 | 1001 | 999        | 50.0%      |
| 10%    | 2000 | 198  | 1802       | 9.9%       |
```

采样要放在**入队口**而不是投递口：让被采样掉的数据早点消失，别在内存里排队。

> 摘自 `./code/monitor-lab/sdk/transport.mjs`

```js
  function enqueue(event) {
    // 采样放在入队口，避免不可控的采集量把网络打满
    if (Math.random() >= cfg.sampleRate) { stats.sampled++ return false }
    queue.push(event)
    stats.accepted++
    if (queue.length > cfg.maxQueue) { queue.shift() stats.dropped++ }
    if (queue.length >= cfg.batchSize) flush('batch-full')
    else schedule()
    return true
  }
```

### 3. 重试：失败要有次数上限，不能死循环

`maxRetry = 2` 意味着「首投 + 最多 2 次重试」，共 3 次尝试；3 次都不行就放弃并计入 `dropped`：

> 摘自 `./code/monitor-lab/scenarios/transport.mjs`（运行：`npm run transport`）

```
---- 重试：maxRetry=2，最多额外试 2 次；失败 3 次（首投 + 2 次重试）后放弃并计入 dropped ----
| 投递情况    | sendBeacon 调用 | 重试轮数 | retried 计数 | 结果 | sent | dropped |
|-------------|-----------------|----------|--------------|------|------|---------|
| 前 0 次失败 | 1               | 0        | 0            | 成功 | 1    | 0       |
| 前 2 次失败 | 3               | 2        | 2            | 成功 | 1    | 0       |
| 前 5 次失败 | 3               | 2        | 2            | 放弃 | 0    | 1       |
```

注意"前 5 次失败"那一行：只调用了 3 次 `sendBeacon` 就放弃了。**监控数据不值得为它无限重试**——重试本身也会消耗用户带宽。

### 4. 溢出：网络慢时队列会一直涨

如果网络卡住，批次发不出去，队列就会一直接收新事件。必须有上限，超了丢最旧的：

> 摘自 `./code/monitor-lab/scenarios/transport.mjs`（运行：`npm run transport`）

```
---- 溢出：maxQueue=10，入队 50 条（网络慢时队列会一直涨） ----
| 指标                     | 数值 |
|--------------------------|------|
| 入队                     | 50   |
| 队列实际长度             | 10   |
| accepted（接受过的总数） | 50   |
| dropped（含溢出丢弃）    | 40   |
| 最终投递                 | 10   |
```

丢 40 条看起来可惜，但它换来的是**内存可控**：留着 40 条旧事件不会让看板更准，只会让页面更难跑。

### 5. 投递方式：先 sendBeacon，再 fetch keepalive

> 摘自 `./code/monitor-lab/sdk/transport.mjs`

```js
  async function deliver(body) {
    // 首选 sendBeacon：页面卸载时也能送达，且不阻塞主线程
    if (env.navigator && typeof env.navigator.sendBeacon === 'function') {
      if (env.navigator.sendBeacon(cfg.url, body)) return true
    }
    if (typeof env.fetch === 'function') {
      try {
        const res = await env.fetch(cfg.url, {
          method: 'POST', body, keepalive: true,
          headers: { 'Content-Type': 'application/json' }
        })
        return !res || res.ok !== false
      } catch {
        return false
      }
    }
    return false
  }
```

为什么这个顺序不能反：

| 方式 | 页面卸载时能否送达 | 是否阻塞 | 限制 |
| --- | --- | --- | --- |
| 同步 `XMLHttpRequest` | 能 | **阻塞卸载** | 浏览器已基本禁用 |
| `fetch`（无 keepalive） | 不能，请求会被取消 | 不阻塞 | — |
| `fetch + keepalive` | 能 | 不阻塞 | 请求体有 64KB 上限 |
| `navigator.sendBeacon` | 能 | 不阻塞 | 无响应回调，成功与否看返回值 |

`sendBeacon` 拿不到响应体，所以它只能回答"提交出去了没有"；要确认服务端收到，得靠服务端的入库计数。

## 四、生命周期：指标越晚越准，必须在离开时收口

LCP 与 CLS 都是**整页生命周期内**收敛的指标：一个用户滚动后看到的大图，可能把 LCP 从 1.2s 改到 2.4s。所以「页面隐藏」才是上报时机。

> 摘自 `./code/monitor-lab/sdk/index.mjs`

```js
  // 生命周期收口：LCP / CLS 这类指标只有在页面离开时才定稿
  function flushAll(reason = 'lifecycle') {
    if (perf) {
      const metrics = perf.finalize()
      emit({ type: 'perf', kind: 'perf', ...metrics, rate: ratePerf(metrics) })
    }
    if (track) track.pageLeave()
    return transport.flush(reason)
  }
```

> 摘自 `./code/monitor-lab/sdk/index.mjs`

```js
  if (win.document && typeof win.addEventListener === 'function') {
    if (errors) errors.patchFetch()
    if (perf) perf.observeAll()
    win.addEventListener('visibilitychange', () => {
      if (win.document.visibilityState === 'hidden') flushAll('hidden')
    })
  }
```

用 `visibilitychange → hidden` 而不是 `unload`：`unload` 在移动端经常不触发（浏览器要保证前进后退缓存可用），而 `hidden` 是移动端唯一可靠的"用户要走了"信号。

## 五、SDK 自己不能成为性能问题

监控 SDK 的第一条自我约束是**轻**。本实验台一次 `flushAll` 的实际体积：

> 摘自 `./code/monitor-lab/scenarios/perf.mjs`（运行：`npm run perf`）

```
---- 上报体积：监控不能自己变成性能问题 ----
| 项           | 数值                                        |
|--------------|---------------------------------------------|
| 事件条数     | 4                                           |
| 批量序列化后 | 593 B                                       |
| 单条平均     | 148 B                                       |
| 说明         | 一次 flush 的体积应该远小于一个业务接口响应 |
```

换算一下：单条 148 B，一次触发 5 条也才 700 多字节，比一张图片小两个数量级。反过来，如果一次上报就带上了完整的 DOM 快照、全量 UA、所有资源列表，几十 KB 起步，监控就成了新的性能瓶颈。

三条具体的自律要求：

1. **采集要松耦合到生命周期**：`PerformanceObserver` 是异步回调，不占首屏；不要用轮询 `performance.getEntries()`。
2. **不在热路径上做同步计算**：`enqueue` 只做「采样 + push + 判批」，序列化发生在 `flush` 里。
3. **错误对象只留栈，不留引用**：栈是字符串，`Error` 对象会拖着作用域链不释放。

## 六、治理：采样率怎么定、什么该脱敏、频控按什么键

### 采样率

| 场景 | 建议 | 原因 |
| --- | --- | --- |
| 错误 | 100%（不采样） | 错误量本身不大，抽样会让"偶发崩溃"漏掉 |
| 性能指标 | 全量或高比例 | 分位值需要足够样本才稳 |
| 埋点（点击/曝光） | 10%~50% | 量最大，且统计口径本来就不要求逐条准确 |
| 长任务/资源明细 | 1%~5% | 单条体积大，且看的是趋势 |

### 脱敏

- URL 只留 `pathname`，丢掉 query（可能带 token、手机号、订单号）；
- 元素文本截断（本实验台取 40 字符）；
- 不上报表单值、不上报 `localStorage` 内容；
- UA 只留必要字段，不上报完整串。

> 摘自 `./code/monitor-lab/sdk/track.mjs`

```js
// 脱敏：只留 path，丢掉可能带 token / 手机号的 query
export function sanitizeUrl(url) {
  return String(url).split('?')[0]
}
```

### 频控

错误频控的键是「指纹」，不是「错误信息」：`message + 出错位置 + 行号`。原因在 `错误监控` 篇用实测说明——同一个函数被循环调用时，报错信息一模一样，只按 message 去重会把不同的出错点合并，只按指纹去重才既压量又不丢信息。

## 配套代码

本篇的可运行示例在仓库 `frontend/进阶/监控与稳定性/code/monitor-lab/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/monitor-lab/sdk/index.mjs` | SDK 入口：单例 init、插件注册、`flushAll` 生命周期收口 | 一、SDK 分成四层，一层只干一件事 |
| `./code/monitor-lab/sdk/transport.mjs` | 传输层：采样入队、攒批、`sendBeacon`/`fetch` 投递、有限重试、队列溢出丢弃 | 三、传输层：采样、攒批、重试、溢出，四件事都必须有 |
| `./code/monitor-lab/scenarios/transport.mjs` | 四组对照实验：逐条 vs 攒批、三种采样率、三档失败重试、队列溢出 | 三、传输层：采样、攒批、重试、溢出，四件事都必须有 |
| `./code/monitor-lab/scenarios/perf.mjs` | 一次 flush 的上报体积实测（监控自身的开销） | 五、SDK 自己不能成为性能问题 |
| `./code/monitor-lab/sdk/track.mjs` | 埋点采集里的脱敏口径：URL 只留 path、文本截断 | 六、治理：采样率怎么定、什么该脱敏、频控按什么键 |

运行方式：在 `code/monitor-lab` 目录执行 `npm run transport`（纯 Node，不需要浏览器）或 `npm run perf`（需本机 Chrome）。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[监控平台](./监控平台.md)
- 下一篇：[错误监控](./错误监控.md)
