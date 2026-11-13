# 监控 SDK 设计与实现

做前端监控，市面上 SDK 很多，但面试与真实工作里更常遇到的问题是：**让你从零设计一个**。这篇文章就按这个路径走：先结构化列出 SDK 要有哪些能力，再逐项拆解它的实现——每项能力一段文字说清「用哪个浏览器 API、采什么、什么口径」，代码块给出解释。所有代码摘自配套工程，与源码逐行一致。

配套代码是一套可运行、可断点调试的实现：`code/monitor-sdk/`（JavaScript，零依赖）+ `code/monitor-demo/`（Vite + Vue3 演示商城、白屏验证页、collector 接收端与看板）。

## 一、能力设计：先列出 SDK 要做什么

一个监控 SDK 的能力清单，其实就三组：

**① 八项采集能力**（看得见的功能）：

| 能力 | 核心 API | 采什么 |
| --- | --- | --- |
| 性能 | `PerformanceObserver` + `navigation` timing | FP / FCP / LCP / CLS / INP / TBT / 导航阶段 |
| JS 异常 | `window error`（捕获）+ `unhandledrejection` | 脚本错误、未捕获的 Promise 拒绝 |
| 资源异常 | `error` 捕获 + `resource` timing | 资源加载失败、资源耗时 Top5 |
| 请求 | 包裹 `fetch` / `XMLHttpRequest` | 失败请求、慢请求 |
| 路由 | `history` 补丁 + `popstate` / `hashchange` | 页面路径变化、停留时长 |
| 用户行为 | 点击捕获委托 + `IntersectionObserver` | 点击、曝光、滚动深度（兼做面包屑） |
| 白屏 | `document.elementsFromPoint` | 米字 33 点采样，空白占比 |
| 自定义 | `report()` 单入口 | 业务埋点：PV、点击、转化漏斗 |

**② 内核公共能力**（看不见的底座）：上下文（会话 / 用户 / 页面 / 设备）、事件归一与指纹、采样与节流、队列与离线补发、批量调度、上报通道与重试。

**③ 非目标**：录屏、sourcemap 还原、告警平台都不做——那是数据平台的事。SDK 只负责把「能解释问题的数据」以可控的成本发出去。

### 三层架构

能力清单落到代码上，就是一个「内核 + 插件」结构：

```
┌─────────────────────────────────────────────────┐
│  采集层（plugins，8 个插件）                      │
│  只做一件事：把浏览器信号翻译成事件 → emit        │
├─────────────────────────────────────────────────┤
│  内核（core）                                    │
│  上下文 → 归一指纹 → 采样节流 → 队列 → 调度       │
├─────────────────────────────────────────────────┤
│  上报通道（transport）                            │
│  sendBeacon → fetch keepalive → 退避重试         │
└─────────────────────────────────────────────────┘
```

依赖方向是单向的：`plugins → core`，`core → transport`。**插件只能拿到 `emit`**——它碰不到队列和通道，也就绕不过采样、节流、脱敏。这是整套设计的核心决定：所有「治理」（采样率、批量、脱敏）只在一处实现，加功能时不会被人从旁边绕过去。

插件契约只有两个生命周期，用一个通用示意表达（各插件的完整实现见第三章）：

```js
{
    name: 'js-error',
    // ctx 是内核发的工具包，只有六个成员：cfg / context / emit / setPage / onRouteChange / log
    setup(ctx) {
        window.addEventListener('error', handler, true)
        // 返回清理函数：监听器、定时器、原型补丁都在这里撤销，teardown() 时逐个调用
        return () => window.removeEventListener('error', handler, true)
    },
    // 可选：页面隐藏前定稿终值，内核统一调它（性能插件用它发 LCP / CLS 终值）
    finalize(ctx) {}
}
```

`setup` 返回清理函数、事件只能走 `emit`，这两条写进契约，插件怎么写都不会破坏内核的时序。插件还多一个可选的 `finalize`：给「终值型数据」用——性能指标只有页面隐藏那一刻才算定稿，让内核统一调它，避免插件自己监听 `visibilitychange` 和 flush 抢时序。

### 统一事件结构

八种能力产出八种数据，但**事件外壳只有一种**：

```json
{
  "id": "b1c2…",
  "type": "error",
  "subtype": "js",
  "timestamp": 1762950000000,
  "message": "Cannot read properties of undefined (reading 'id')",
  "fingerprint": "error|js|Cannot read…|at addToCart<at commit",
  "page": { "url": "…", "path": "/product/1", "title": "…" },
  "session": { "id": "…", "userId": "…" },
  "device": { "ua": "…", "screen": "1920x1080", "network": "4g" },
  "release": "4.0.0",
  "env": "development",
  "data": { "source": "js", "filename": "…", "lineno": 42 },
  "tags": { "channel": "h5" }
}
```

`type` 收敛成八个枚举值（`perf / error / resource / request / router / behavior / white-screen / custom`），`data` 装各自的能力数据。队列、通道、接收端只处理一种结构，`subtype` 用来细分排查路径（同为 error，`js / promise / vue / manual` 的处理方式不同；同为 request，`http / network / slow` 也是两件事）。

### 文件地图

```
monitor-sdk/src/
├─ index.js          # 公共出口：init() + 8 个插件工厂
├─ config.js         # 默认值、默认插件装配顺序（顺序 = 依赖顺序）
├─ core/
│  ├─ context.js     # 会话 / 用户 / 页面 / 设备快照
│  ├─ event.js       # 归一、指纹
│  ├─ sampler.js     # 按类型采样
│  ├─ throttle.js    # 指纹去重
│  ├─ queue.js       # 定长队列 + IndexedDB 离线兜底
│  ├─ scheduler.js   # batch / interval / idle / hidden / manual
│  ├─ transport.js   # beacon → fetch keepalive → 重试
│  └─ kernel.js      # 装配、流水线、生命周期
└─ plugins/          # 8 个采集插件，见第三章
```

装配顺序写在 `config.js` 的 `resolveConfig` 里，它就是依赖顺序：

> 摘自 `./code/monitor-sdk/src/config.js`

```js
// 输入：用户配置（每个字段都可选）
// 输出：可运行配置（字段齐全，plugins 已装配完成）
// 过程：各配置段浅合并（用户只写要改的字段）→ 装配默认插件 → 自定义插件按名覆盖 → 按 disabledPlugins 裁剪
export function resolveConfig(config) {
    const merged = {
        ...defaultConfig,
        ...config,
        tags: { ...defaultConfig.tags, ...(config.tags || {}) },
        throttle: { ...defaultConfig.throttle, ...(config.throttle || {}) },
        sampleRates: { ...defaultConfig.sampleRates, ...(config.sampleRates || {}) },
        performance: { ...defaultConfig.performance, ...(config.performance || {}) },
        request: { ...defaultConfig.request, ...(config.request || {}) },
        behavior: { ...defaultConfig.behavior, ...(config.behavior || {}) },
        whitescreen: { ...defaultConfig.whitescreen, ...(config.whitescreen || {}) }
    }

    // 装配顺序就是依赖顺序：router 必须先补丁 history（赶在框架路由创建之前），request 最后包 fetch/XHR
    const defaults = [
        createRouterPlugin(),
        createPerformancePlugin(merged.performance),
        createJsErrorPlugin(),
        createResourcePlugin(),
        createRequestPlugin(merged.request),
        createBehaviorPlugin(merged.behavior),
        createWhiteScreenPlugin(merged.whitescreen),
        createCustomPlugin()
    ]
    const custom = config.plugins || []
    const overridden = new Set(custom.map(plugin => plugin.name))
    const disabled = new Set(merged.disabledPlugins)
    merged.plugins = defaults
        .filter(plugin => !overridden.has(plugin.name))
        .concat(custom)
        .filter(plugin => !disabled.has(plugin.name))
    return merged
}
```

`init()` 要赶在框架路由创建之前调用，history 补丁才拦得住框架的第一次跳转。插件体系给了三层定制空间：`disabledPlugins` 负责**关**（按名裁剪默认插件）；`plugins` 传入自定义插件负责**换**（同名覆盖默认实现，比如 request 插件换成自己的慢请求口径）；八个插件工厂随 `init` 一并导出，负责**组**——你可以复用官方实现的采样逻辑做二次封装，也可以只装其中几个做最小接入。

## 二、内核：一条事件怎么走完

```
插件 emit(input)
   │
   ▼
┌─────────┐   ┌──────────┐   ┌────────┐   ┌─────────┐   ┌───────────┐   ┌────────┐
│ 归一+指纹 │ → │ 记录上下文 │ → │  采样   │ → │ 指纹节流 │ → │ beforeSend │ → │ 入队    │
│ event.js │   │ recent   │   │sampler │   │throttle │   │  治理收口  │   │ queue  │
└─────────┘   └──────────┘   └────────┘   └─────────┘   └───────────┘   └───┬────┘
                                                                            │ notify
                                                                            ▼
                                                 ┌──────────────────────────────────┐
                                                 │ scheduler：batch 满 / interval /  │
                                                 │ idle / hidden / manual → drain    │
                                                 └───────────────┬──────────────────┘
                                                                 ▼
                                                 ┌──────────────────────────────────┐
                                                 │ transport：beacon → fetch → 重试  │
                                                 └──────────────────────────────────┘
```

### 2.1 上下文：算一次，拷贝着用

每条事件都要回答「谁、在哪、什么设备」。这些信息启动时算一次快照，之后只做增量更新：

> 摘自 `./code/monitor-sdk/src/core/context.js`

```js
function pageSnapshot() {
    return {
        url: location.href,
        path: location.pathname,
        route: location.pathname,
        referrer: document.referrer || '',
        title: document.title || ''
    }
}
function deviceSnapshot() {
    const nav = navigator
    return {
        ua: nav.userAgent,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio || 1,
        language: nav.language || '',
        network: nav.connection?.effectiveType || 'unknown'
    }
}
```

会话标识存 `sessionStorage`（30 分钟滑动过期），用户标识存 `localStorage` 的匿名 uuid，业务 `setUser()` 后被真实 id 覆盖。隐私模式下访问 storage 会直接抛异常，所有读写都包了 try/catch 退化为内存态。

一个容易踩的坑：**事件拿到的是上下文的拷贝，不是引用**。就是上面 `createEvent` 里这三行：

```js
        page: { ...ctx.page },
        session: { ...ctx.session },
        device: { ...ctx.device },
```

队列是异步的，用户可能在事件入队后又跳了路由。如果事件持有引用，`page.path` 会被后续跳转改写——发送出去的白屏事件说自己发生在别的页面。快照拷贝在创建事件那一刻定死。

### 2.2 归一与指纹

插件交来的碎片在这里变成统一结构，公共字段只在这里补一次：

> 摘自 `./code/monitor-sdk/src/core/event.js`

```js
// 输入：插件原始事件 + 运行时上下文 + 配置
// 输出：可直接入队的 MonitorEvent
// 过程：补 id/时间戳/指纹 → 拷贝上下文快照 → 错误类附带面包屑 → 合并全局 tags
export function createEvent(input, ctx, cfg) {
    const message = input.message ? String(input.message).slice(0, 500) : undefined
    const stack = input.stack ? String(input.stack).slice(0, 4000) : undefined
    const event = {
        id: newId(),
        type: input.type,
        subtype: input.subtype,
        timestamp: Date.now(),
        message,
        stack,
        fingerprint: fingerprintOf(input.type, input.subtype, message, stack),
        page: { ...ctx.page },
        session: { ...ctx.session },
        device: { ...ctx.device },
        release: ctx.release,
        env: ctx.env,
        data: input.data,
        tags: { ...cfg.tags, ...(input.tags || {}) }
    }
    // 只有错误类事件需要面包屑：它回答的是"用户做了什么才炸的"，性能事件不需要
    if (input.type === 'error' && ctx.breadcrumbs.length) {
        event.breadcrumbs = ctx.breadcrumbs.slice(-20)
    }
    return event
}
```

指纹是节流与服务端聚合共用的「事件身份」。同一条错误换个触发时机仍是同一个指纹，所以只取类型、消息和**栈顶三帧**——行号列号要去掉，压缩打包差异会让同一条错裂成一百个指纹：

```js
/** 指纹取栈顶三帧：同一条错误换个触发时机仍是同一个指纹 */
function topFrames(stack) {
    if (!stack) return ''
    return stack
        .split('\n')
        .filter(line => /^\s*at\s/.test(line))
        .slice(0, 3)
        .map(line => line.trim().replace(/:\d+:\d+\)?$/, ''))
        .join('<')
}
```

`message` 截 500 字、`stack` 截 4000 字——指纹消息里塞进一个 2MB 的响应体，一天就能把采集端打爆。

### 2.3 采样与节流：两道不同的闸门

采样按类型定比例，是「这类事件我全要还是要一部分」：

> 摘自 `./code/monitor-sdk/src/core/sampler.js`

```js
export function createSampler(cfg) {
    return type => {
        const rate = cfg.sampleRates[type]
        if (rate === undefined || rate >= 1) return true
        if (rate <= 0) return false
        return Math.random() < rate
    }
}
```

节流按指纹定时间窗，是「同一条错误一秒内别刷屏」。默认只对 error 类生效——行为是低频主动触发，性能本身就在聚合：

> 摘自 `./code/monitor-sdk/src/core/throttle.js`

```js
export function createThrottle(windowMs) {
    const seen = new Map()
    let lastSweep = 0
    return fingerprint => {
        const now = Date.now()
        const prev = seen.get(fingerprint)
        if (prev !== undefined && now - prev < windowMs) return false
        seen.set(fingerprint, now)
        // 定期清理过期指纹：Map 不清理就是内存泄漏，一页几百个指纹足够撑很久
        if (now - lastSweep > 10000) {
            for (const [key, at] of seen) {
                if (now - at > windowMs) seen.delete(key)
            }
            lastSweep = now
        }
        return true
    }
}
```

顺序有讲究：**采样在节流之前**。反过来，1% 的采样率下节流永远打不满，统计出来的 `throttled` 数毫无意义；先采样再节流，节流数才反映「留下来的事件里有多少是重复的」。

### 2.4 队列与离线兜底

队列是定长的，溢出丢最旧——最新的事件永远留得下：

> 摘自 `./code/monitor-sdk/src/core/queue.js`

```js
// 输入：上限 max、丢弃回调
// 输出：定长队列
// 过程：push 超限从头部 shift，保证最新的事件一定留得下（丢最旧比丢最新有价值）
export function createQueue(max, onDrop) {
    const buffer = []
    const limit = Math.max(1, max)
    return {
        push(event) {
            buffer.push(event)
            if (buffer.length > limit) {
                const dropped = buffer.length - limit
                buffer.splice(0, dropped)
                onDrop?.(dropped)
            }
        },
        pushAll(events) {
            for (const event of events) this.push(event)
        },
        take(n) {
            return buffer.splice(0, Math.max(0, n))
        },
        drain() {
            return buffer.splice(0, buffer.length)
        },
        size() {
            return buffer.length
        },
        clear() {
            buffer.length = 0
        }
    }
}
```

送不出去的事件不能凭空消失。只在「发送失败」与「页面隐藏」两个时机写 IndexedDB（不支持就退 localStorage，上限 100 条），下次启动 `restoreEvents()` 补发：

```js
export async function persistEvents(events) {
    if (!events.length) return
    const slice = events.slice(-PERSIST_LIMIT)
    const db = await openDb()
    if (db) {
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(DB_STORE, 'readwrite')
                tx.objectStore(DB_STORE).put(slice, 'pending')
                tx.oncomplete = () => resolve()
                tx.onerror = () => reject(tx.error)
            })
            return
        } catch {
            /* 写失败退 localStorage */
        }
    }
    try {
        const raw = localStorage.getItem(LS_KEY)
        const old = raw ? JSON.parse(raw) : []
        localStorage.setItem(LS_KEY, JSON.stringify(old.concat(slice).slice(-PERSIST_LIMIT)))
    } catch {
        /* 配额满就算了，监控不能因为存不下而报错 */
    }
}
```

正常路径不碰磁盘——监控自身就是性能敏感代码。

### 2.5 调度：五个触发口，一条 drain

什么时候发？五个触发口：**满量**（队列 ≥ batchSize）、**定时**（flushInterval）、**空闲**（requestIdleCallback，降级 setTimeout）、**隐藏**（visibilitychange）、**手动**（flush()）。调度器是个闭包工厂，内核注入一组 `opts` 回调（`take / putBack / send / finalize / persist / onFlush` 和三个阈值），五个口子汇进同一条 `flush`，不复制发送逻辑：

> 摘自 `./code/monitor-sdk/src/core/scheduler.js`

```js
// 输入：队列的取/还/长度、通道的 send、定稿与持久化回调
// 输出：可被内核触发的调度器
// 过程：notify 判定满量 → 否则排一个空闲任务；定时器兜底；hidden/pagehide 先定稿再 drain
export function createScheduler(opts) {
    let flushing = false
    let pending = null
    let idleHandle = null
    let stopped = false
    // scheduleIdle / cancelIdle：空闲触发的注册与撤销（requestIdleCallback，降级 setTimeout），此处略
    // 输入：触发原因
    // 输出：本次是否全部送达
    // 过程：hidden/pagehide 先 finalize（性能终值入队）→ 循环按 batchSize 取 → 失败回灌并落盘 → 收尾
    async function flush(reason) {
        if (flushing) return pending ?? false
        flushing = true
        cancelIdle()
        const task = (async () => {
            let ok = true
            let count = 0
            if (reason === 'hidden' || reason === 'pagehide') opts.finalize()
            let batch = opts.take(opts.batchSize)
            while (batch.length) {
                count += batch.length
                const sent = await opts.send(batch)
                if (!sent) {
                    ok = false
                    // 送不出去的事件不能凭空消失：回队首 + 落盘，下次启动补发
                    opts.putBack(batch)
                    opts.persist(batch)
                    break
                }
                batch = opts.take(opts.batchSize)
            }
            opts.onFlush(reason, count, ok)
            return ok
        })()
        pending = task
        try {
            return await task
        } finally {
            flushing = false
            pending = null
        }
    }
    function notify() {
        if (stopped) return
        // 满量走 batch，未满量等空闲：两条路都只调用同一条 drain，不复制发送逻辑
        if (opts.size() >= opts.batchSize) void flush('batch')
        else scheduleIdle()
    }
    const timer = window.setInterval(
        () => {
            void flush('interval')
        },
        Math.max(1000, opts.flushInterval)
    )
    const onVisible = () => {
        if (document.visibilityState === 'hidden') void flush('hidden')
    }
    const onPageHide = () => {
        void flush('pagehide')
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    return {
        notify,
        flush,
        stop() {
            stopped = true
            cancelIdle()
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('pagehide', onPageHide)
        }
    }
}
```

三处时序铁律：

1. **hidden 先 `finalize` 再 drain**。LCP、CLS、TBT 都是「页面隐藏才定稿」的终值——顺序反了，每次切标签发出的都是没有终值的残缺数据。
2. **失败回灌再落盘**。send 返回 false 时把批次放回队首并持久化，下次启动补发，监控数据不因为网络抖动而断流。
3. **flushing 标志防并发**。定时器和 hidden 可能撞车，重入直接返回进行中的 Promise。

### 2.6 通道：sendBeacon 优先

> 摘自 `./code/monitor-sdk/src/core/transport.js`

```js
/** sendBeacon 单次请求体积上限保守取 60KB（浏览器真实上限 64KB，留头部余量） */
const BEACON_LIMIT = 60 * 1024
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
// 输入：一批事件
// 输出：是否送达
// 过程：序列化 → sendBeacon 优先（页面关闭也能发出去）→ fetch keepalive 兜底 → 指数退避重试
export function createTransport(cfg) {
    const log = (...args) => {
        if (cfg.debug) console.log('[monitor:transport]', ...args)
    }
    function beacon(payload) {
        try {
            const nav = navigator
            if (typeof nav.sendBeacon !== 'function') return false
            // text/plain 是 CORS 简单请求：不触发预检，跨域也能直发
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' })
            if (blob.size > BEACON_LIMIT) return false
            return nav.sendBeacon(cfg.endpoint, blob)
        } catch {
            return false
        }
    }
    async function post(payload) {
        try {
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'text/plain;charset=UTF-8' },
                body: payload,
                keepalive: true // 页面卸载时请求不被取消
            })
            return res.ok
        } catch {
            return false
        }
    }
    return {
        async send(batch) {
            if (!batch.length) return true
            const payload = JSON.stringify(batch)
            if (beacon(payload)) {
                log(`beacon 送出 ${batch.length} 条 / ${payload.length}B`)
                return true
            }
            for (let attempt = 0; attempt <= cfg.maxRetry; attempt++) {
                if (await post(payload)) {
                    log(`fetch 送出 ${batch.length} 条 / ${payload.length}B`)
                    return true
                }
                if (attempt < cfg.maxRetry) await sleep(200 * Math.pow(2, attempt))
            }
            log(`发送失败 ${batch.length} 条（重试 ${cfg.maxRetry} 次）`)
            return false
        }
    }
}
```

要点：`sendBeacon` 是唯一保证「页面关闭也能发出去」的 API，所以优先；`text/plain` 是 CORS 简单请求，免预检；fetch 兜底加 `keepalive: true`；重试用 200ms × 2ⁿ 退避，且 send 失败最终会返回 false，把「落盘补发」的决定权交还给调度器。

### 2.7 装配与公开 API

内核把上面所有零件装配起来。它就是 `createKernel(cfg)` 一个闭包：先建零件，再把流水线封装成 `emit` 交给插件：

> 摘自 `./code/monitor-sdk/src/core/kernel.js`

```js
export function createKernel(cfg) {
    const context = createContext(cfg)
    const stats = { /* sent / failed / dropped / sampled / throttled / flushCount / lastFlushReason / restored */ }
    const log = (...args) => {
        if (cfg.debug) console.log('[monitor]', ...args)
    }
    const queue = createQueue(cfg.maxQueue, dropped => {
        stats.dropped += dropped
        log(`队列溢出，丢弃最旧 ${dropped} 条`)
    })
    const sampler = createSampler(cfg)
    const throttle = createThrottle(cfg.throttle.window)
    const transport = createTransport(cfg)
    // scheduler 紧随其后装配：它的回调里引用 transport 与 stats，此处省略，见 2.5

    // 输入：插件事件
    // 输出：无（入队并触发调度）
    // 过程：归一 → 记录上下文 → 采样 → 指纹节流 → beforeSend → 入队 → notify
    function emit(input) {
        try {
            const event = createEvent(input, context, cfg)
            recordRecent(event)

            if (!sampler(event.type)) {
                stats.sampled += 1
                return
            }
            if (cfg.throttle.types.includes(event.type) && !throttle(event.fingerprint)) {
                stats.throttled += 1
                return
            }

            let payload = event
            if (cfg.beforeSend) payload = cfg.beforeSend(event)
            if (!payload) {
                stats.dropped += 1
                return
            }

            queue.push(payload)
            touchSession(context.session)
            scheduler.notify()
        } catch (error) {
            log('emit 失败', error)
        }
    }
```

`emit` 全程 try/catch——**SDK 自己绝不能抛异常**，否则监控代码本身成了最大的错误源。`beforeSend` 是最后一个治理收口：业务可以在这里脱敏、改写、丢弃事件（返回 null 即丢弃）。

对外实例就是一组薄方法：`report()`（自定义上报）、`captureError()`（业务 catch 到已知异常）、`flush()`、`setUser()` / `setTag()`、`attachVue()`（挂 Vue errorHandler）、`checkWhiteScreen()`（手动触发白屏检测）、`teardown()`，外加两个只读口：`cfg`（可运行时改采样率，不用重新 init）和 `stats`（sent / failed / dropped / sampled / throttled / restored / lastFlushReason——SDK 的自观测，判断「数据有没有在正常流动」全靠它）。

## 三、八项采集能力：逐项拆解

### 3.1 性能：PerformanceObserver + 隐藏时定稿

性能插件整段代码就是一个「订阅 → 累积 → 定稿」的结构：`setup` 订阅六类条目（含 navigation）、把读数写进一个 `state`，`finalize` 在页面隐藏时把终值发出去（`ms` / `ratio` 是模块顶部的取整辅助，导航阶段的换算 `computeNavigation` 一并给出）：

> 摘自 `./code/monitor-sdk/src/plugins/performance.js`

```js
// 输入：navigation 类型的一条 PerformanceEntry
// 输出：导航阶段耗时（TTFB / DNS / TCP / 请求 / 响应 / DOM Ready / load）
// 过程：各阶段用相邻时间戳相减；loadEventEnd 尚未结束时给 0，等下一次回调覆盖
function computeNavigation(nav) {
    return {
        ttfb: ms(nav.responseStart - nav.startTime),
        dns: ms(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: ms(nav.connectEnd - nav.connectStart),
        request: ms(nav.responseStart - nav.requestStart),
        response: ms(nav.responseEnd - nav.responseStart),
        domReady: ms(nav.domContentLoadedEventEnd - nav.startTime),
        load: nav.loadEventEnd ? ms(nav.loadEventEnd - nav.startTime) : 0
    }
}
// 输入：插件配置（metrics 控制采集哪些指标）
// 输出：性能插件（setup 订阅六类条目，finalize 在隐藏时定稿终值）
// 过程：PerformanceObserver 逐类订阅 → 读数写进一个 state → finalize 一次性 emit 终值
export function createPerformancePlugin(options) {
    const enabled = new Set(options.metrics)
    let state = { cls: 0, inp: 0, tbt: 0, longTaskCount: 0, navigation: null, emitted: false }
    const observers = []
    // buffered: true 补收 init 之前就已经结束的条目，否则 FCP 恒为 0；不支持的指标静默跳过
    function observe(type, handler) {
        try {
            const observer = new PerformanceObserver(list => handler(list.getEntries()))
            observer.observe({ type, buffered: true })
            observers.push(observer)
        } catch {
            /* 该指标在当前浏览器不支持：静默跳过，不影响其他指标 */
        }
    }
    return {
        name: 'performance',
        setup() {
            observe('paint', entries => {
                for (const entry of entries) {
                    if (entry.name === 'first-paint' && enabled.has('fp')) state.fp = ms(entry.startTime)
                    if (entry.name === 'first-contentful-paint' && enabled.has('fcp')) state.fcp = ms(entry.startTime)
                }
            })
            // LCP 会随页面变化持续产生候选，取最后一条；真正的终值要等页面隐藏
            observe('largest-contentful-paint', entries => {
                const last = entries[entries.length - 1]
                if (last && enabled.has('lcp')) state.lcp = ms(last.startTime)
            })
            // CLS 是累加量，hadRecentInput 的位移是用户主动交互，不能算布局抖动
            observe('layout-shift', entries => {
                for (const entry of entries) {
                    if (!entry.hadRecentInput) state.cls += entry.value
                }
            })
            // TBT：长任务超出 50ms 的部分累加，这是主线程被阻塞的总时长
            observe('longtask', entries => {
                for (const entry of entries) {
                    state.longTaskCount += 1
                    state.tbt += Math.max(0, entry.duration - 50)
                }
            })
            // INP 简化版：取所有交互事件里的最大耗时（严格口径需要按 interactionId 分组算 p98）
            if (enabled.has('inp')) {
                observe('event', entries => {
                    for (const entry of entries) state.inp = Math.max(state.inp, entry.duration)
                })
            }
            // 导航阶段同样走 Observer + buffered：同步的 getEntriesByType 在 init 过早时可能还拿不到条目
            if (enabled.has('navigation')) {
                observe('navigation', entries => {
                    const nav = entries[entries.length - 1]
                    if (nav) state.navigation = computeNavigation(nav)
                })
            }
            return () => {
                for (const observer of observers) observer.disconnect()
                observers.length = 0
            }
        },
        finalize(ctx) {
            if (state.emitted) return // 终值只能上报一次，hidden 与 pagehide 可能连续触发
            state.emitted = true
            ctx.emit({
                type: 'perf',
                subtype: 'vitals',
                message: '页面性能终值',
                data: {
                    fp: state.fp,
                    fcp: state.fcp,
                    lcp: state.lcp,
                    cls: ratio(state.cls),
                    inp: ms(state.inp),
                    tbt: ms(state.tbt),
                    longTaskCount: state.longTaskCount,
                    navigation: state.navigation
                }
            })
        }
    }
}
```

四个必踩的坑，代码里都处理了：

- **`buffered: true`**：`init()` 跑在首帧之后，不补收历史条目 FCP 恒为 0；
- **LCP 取最后一条**：它随页面变化持续产生候选；
- **CLS 排除 `hadRecentInput`**：用户点按钮导致的位移不是布局抖动；
- **终值在 `finalize` 出**：页面隐藏时才定稿，且只发一次（hidden 与 pagehide 可能连续触发）。

导航阶段也是同一套 Observer：`observe('navigation')` + `buffered` 补收，拿到那条 navigation timing 记录后用相邻时间戳相减得到 TTFB / DNS / TCP / DOM Ready / load。这里特意没用同步的 `performance.getEntriesByType('navigation')`——SDK 注入得早时该方法可能还拿不到条目，而 Observer 的 buffered 回调保证补收得到。

### 3.2 JS 异常：一个监听 + 一条兜底 + 一个框架口

错误采集源有三个：`window` 的 `error` 事件、`unhandledrejection` 事件、框架的 `errorHandler`。前两个注册在插件的 `setup(ctx)` 里（`normalize` 是模块顶部的归一函数，`Error` / 字符串 / 其余对象逐层兼容）：

> 摘自 `./code/monitor-sdk/src/plugins/js-error.js`

```js
            // 输入：一个 error 事件
            // 输出：脚本错误事件（资源错误直接返回，交给 resource 插件，避免同一错误报两次）
            // 过程：判 target.tagName 分流 → 归一 Error 对象 → emit
            const onError = event => {
                try {
                    const target = event.target
                    if (target && target.tagName) return
                    const normalized = normalize(event.error)
                    ctx.emit({
                        type: 'error',
                        subtype: 'js',
                        message: event.message || normalized.message || 'Script error.',
                        stack: normalized.stack,
                        data: {
                            source: 'js',
                            filename: event.filename,
                            lineno: event.lineno,
                            colno: event.colno
                        }
                    })
                } catch {
                    /* 静默 */
                }
            }
            // 资源错误不冒泡，所以这里必须用捕获阶段；脚本错误两阶段都能收到，用捕获统一处理
            window.addEventListener('error', onError, true)
            const onRejection = event => {
                try {
                    const normalized = normalize(event.reason) // reason 可能是字符串、对象、undefined
                    ctx.emit({
                        type: 'error',
                        subtype: 'promise',
                        message: normalized.message,
                        stack: normalized.stack,
                        data: { source: 'promise' }
                    })
                } catch {
                    /* 静默 */
                }
            }
            window.addEventListener('unhandledrejection', onRejection)
```

三个要点：

- **必须捕获阶段**：`<img src=404>` 这类资源错误不冒泡，只在捕获阶段拿得到；同一个监听里按 `target.tagName` 分流，有 tagName 的是资源错误，直接 return 交给 resource 插件——不然同一错误报两次。
- **`unhandledrejection` 兜底 Promise**：`reason` 可能是字符串、对象甚至 undefined，归一函数逐一处理。
- **`attachVue(app)` 挂框架口**：Vue 组件内错误不会冒泡到 window，只能挂 `app.config.errorHandler`。注意先调业务原有的 handler——SDK 是补充不是替代。

### 3.3 资源：失败看 error，耗时看 timing

失败与耗时是两个数据源、两个 subtype，但共享同一份闭包状态，整个插件不长，直接看全文：

> 摘自 `./code/monitor-sdk/src/plugins/resource.js`

```js
export function createResourcePlugin() {
    // 汇总状态放在插件闭包里：setup 采集、finalize 出终值，两个生命周期要共享同一份数据
    let total = 0
    let count = 0
    const slowest = []
    return {
        name: 'resource',
        setup(ctx) {
            // 输入：一个资源 error 事件
            // 输出：resource 事件（只要加载失败，不要脚本错误）
            // 过程：target.tagName 判资源类型 → 取 currentSrc/src/href → emit
            const onError = event => {
                try {
                    const target = event.target
                    if (!target || !target.tagName) return
                    const tag = target.tagName.toLowerCase()
                    const url = target.currentSrc || target.src || target.href || ''
                    ctx.emit({
                        type: 'resource',
                        subtype: 'load-error',
                        message: `资源加载失败 ${tag} ${url}`,
                        data: { tag, url: url.slice(0, 500) }
                    })
                } catch {
                    /* 静默 */
                }
            }
            // 资源错误不冒泡，只在捕获阶段拿得到
            window.addEventListener('error', onError, true)
            // 资源耗时：只留 Top5 慢资源，全量条目在采集端聚合即可
            let observer = null
            try {
                observer = new PerformanceObserver(list => {
                    for (const entry of list.getEntries()) {
                        const duration = Math.round(entry.duration)
                        total += duration
                        count += 1
                        slowest.push({ url: entry.name.slice(0, 300), duration, type: entry.initiatorType })
                        slowest.sort((a, b) => b.duration - a.duration)
                        if (slowest.length > 5) slowest.length = 5
                    }
                })
                observer.observe({ type: 'resource', buffered: true })
            } catch {
                /* 不支持 resource timing 就只保留加载失败能力 */
            }
            return () => {
                window.removeEventListener('error', onError, true)
                observer?.disconnect()
            }
        },
        finalize(ctx) {
            if (!count) return
            ctx.emit({
                type: 'resource',
                subtype: 'timing',
                message: `资源耗时汇总 ${count} 条`,
                data: { url: '', count, total, slowest: slowest.slice() }
            })
        }
    }
}
```

两个设计点：资源耗时走另一个 `PerformanceObserver('resource')`，采集端只聚合——总数、总耗时、Top5 慢资源，全量条目发上去没人看；`total / count / slowest` 放在插件工厂闭包而不是 `setup` 里，因为 `setup` 与 `finalize` 是两次调用，终值要读到采集期累积的状态。

### 3.4 请求：包裹 fetch 与 XHR，只报「有诊断价值」的

插件分两层：模块顶部的 `report` 决定「什么请求值得上报」（口径所在），`setup(ctx)` 里的包装决定「怎么拿到请求结果」。先看口径：

> 摘自 `./code/monitor-sdk/src/plugins/request.js`

```js
// 输入：一条请求记录（url/method/status/duration/kind）
// 输出：按口径决定是否上报
// 过程：失败（HTTP 失败 / 网络失败）必报；成功只报慢请求
function report(ctx, options, record) {
    const url = shortUrl(record.url)
    const success = record.status >= 200 && record.status < 400
    if (!success) {
        ctx.emit({
            type: 'request',
            subtype: record.status === 0 ? 'network' : 'http',
            message: `${record.status} ${record.method} ${url}`,
            data: { ...record, url, success }
        })
        return
    }
    // 慢请求单独一个 subtype：它和"报错"是两种排查路径，混在一起会让错误率失真
    if (options.reportSlow && record.duration >= options.slowThreshold) {
        ctx.emit({
            type: 'request',
            subtype: 'slow',
            message: `慢请求 ${record.method} ${url} ${record.duration}ms`,
            data: { ...record, url, success }
        })
    }
}
```

包装就是给 `window.fetch` 换一个"计时 + 判定 + 原样转发"的替身（`shortUrl` 是模块顶部工具，只留 path 去 query）：

```js
        setup(ctx) {
            const endpoint = ctx.cfg.endpoint
            // SDK 自己的上报请求必须放过：否则每发一次监控数据，就产生一条被监控的请求
            const isOwnRequest = url => !!endpoint && url.indexOf(endpoint) === 0

            const originalFetch = window.fetch
            if (typeof originalFetch === 'function') {
                window.fetch = async function (input, init) {
                    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
                    if (isOwnRequest(url)) return originalFetch.call(window, input, init)

                    const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()
                    const start = performance.now()
                    try {
                        const response = await originalFetch.call(window, input, init)
                        report(ctx, options, {
                            url,
                            method,
                            status: response.status,
                            duration: Math.round(performance.now() - start),
                            kind: 'fetch'
                        })
                        return response
                    } catch (error) {
                        // 网络层失败没有 response：先记一条 status=0，再把异常原样抛回去
                        ctx.emit({
                            type: 'request',
                            subtype: 'network',
                            message: `网络错误 ${method} ${shortUrl(url)}`,
                            data: {
                                url: shortUrl(url),
                                method,
                                status: 0,
                                duration: Math.round(performance.now() - start),
                                kind: 'fetch',
                                success: false
                            }
                        })
                        throw error
                    }
                }
            }
            // XHR 同理包 prototype.open / send，用 loadend 事件收尾；清理函数还原两处补丁，完整实现见源码
        }
```

三条口径：

- **只报失败与慢**：全量成功请求是性能数据不是错误数据；HTTP 失败（`status >= 400`）、网络失败（`status = 0`）、慢请求（超过 slowThreshold）分开 subtype——报错和慢是两种排查路径，混在一起错误率就失真了。
- **catch 必须 rethrow**：包裹不能改变业务语义，网络失败照样要让业务的 catch 接得住。
- **SDK 自己的上报请求必须放过**：否则每发一批监控数据就生成一条「被监控的请求」，无限套娃。XHR 同理包 `prototype.open / send`，用 `loadend` 事件收尾。

### 3.5 路由：三路都要接管

SPA 框架的 `router.push` 走 `history.pushState`，**只监听 popstate 抓不到它**。所以 `setup(ctx)` 里补丁两个 history 方法、监听 popstate 与 hashchange，三路汇进同一个 `commit`（`lastPath / lastAt` 是闭包状态：上次路径与时刻，用来算停留时长）：

> 摘自 `./code/monitor-sdk/src/plugins/router.js`

```js
        setup(ctx) {
            let lastPath = location.pathname + location.search
            let lastAt = Date.now()
            // 输入：路由动作类型
            // 输出：一条路由事件 + 更新后的 page 快照
            // 过程：读新地址 → 与上次地址算停留时长 → setPage 广播 → emit
            const commit = action => {
                const next = location.pathname + location.search
                const from = lastPath
                const now = Date.now()
                const duration = now - lastAt
                lastPath = next
                lastAt = now
                ctx.setPage({
                    url: location.href,
                    path: location.pathname,
                    route: location.pathname,
                    title: document.title || ''
                })
                // 框架通常在 afterEach 才写 document.title，延后一拍把标题补正
                window.setTimeout(() => {
                    ctx.context.page.title = document.title || ctx.context.page.title
                }, 0)
                ctx.emit({
                    type: 'router',
                    subtype: action,
                    message: `${from} → ${next}`,
                    data: { from, to: next, route: location.pathname, duration, action }
                })
            }
            // 补丁必须先调原函数再 commit、原样转发参数——路由跳转不能因为 SDK 而改变行为
            const originalPush = history.pushState
            const originalReplace = history.replaceState
            history.pushState = function (...args) {
                const result = originalPush.apply(this, args)
                commit('push')
                return result
            }
            history.replaceState = function (...args) {
                const result = originalReplace.apply(this, args)
                commit('replace')
                return result
            }
            const onPopState = () => commit('popstate')
            const onHashChange = () => commit('hashchange')
            window.addEventListener('popstate', onPopState)
            window.addEventListener('hashchange', onHashChange)
            // 首屏也发一条：没有它，第一条路由事件就缺少 from，停留时长也无从计算
            ctx.emit({
                type: 'router',
                subtype: 'enter',
                message: `enter ${lastPath}`,
                data: { from: '', to: lastPath, route: location.pathname, duration: 0, action: 'enter' }
            })
            return () => {
                history.pushState = originalPush
                history.replaceState = originalReplace
                window.removeEventListener('popstate', onPopState)
                window.removeEventListener('hashchange', onHashChange)
            }
        }
```

`commit` 里有两件事值得注意：`ctx.setPage()` 把新地址广播给所有插件（白屏插件据此复检、行为插件据此重置滚动深度）；`duration` 用「上次跳转时刻」算出上一页的停留时长。首屏也发一条 `enter`——没有它，第一条路由事件缺少 from，停留时长无从计算。

### 3.6 行为：点击委托 + 曝光观察 + 面包屑

点击、曝光、滚动三类信号都汇进面包屑。先看点击：委托在 `document` 的捕获阶段，`setup(ctx)` 开头定义了两个闭包内工具——`push` 往面包屑环形队列写一条、`selectorOf` 给元素生成一个可读的定位选择器：

> 摘自 `./code/monitor-sdk/src/plugins/behavior.js`

```js
        setup(ctx) {
            const push = (type, message) => {
                const list = ctx.context.breadcrumbs
                list.push({ time: Date.now(), type, message: message.slice(0, 120) })
                if (list.length > options.breadcrumbSize) list.splice(0, list.length - options.breadcrumbSize)
            }
            const selectorOf = el => {
                if (el.id) return `#${el.id}`
                const track = el.getAttribute('data-track')
                if (track) return `[data-track="${track}"]`
                const parent = el.parentElement
                const tag = el.tagName.toLowerCase()
                return parent && parent !== document.body ? `${parent.tagName.toLowerCase()} > ${tag}` : tag
            }
            // 输入：一次点击
            // 输出：behavior 事件 + 一条面包屑
            // 过程：从事件目标向上找最近的可交互元素（捕获阶段委托，动态节点不用重新绑定）
            const onClick = event => {
                try {
                    const target = event.target
                    if (!target || typeof target.closest !== 'function') return
                    const el = target.closest(options.clickSelectors)
                    if (!el) return
                    const track = el.getAttribute('data-track') || ''
                    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
                    const label = track || text || el.tagName.toLowerCase()
                    ctx.emit({
                        type: 'behavior',
                        subtype: 'click',
                        message: label,
                        data: {
                            action: 'click',
                            target: el.tagName.toLowerCase(),
                            text,
                            selector: selectorOf(el),
                            x: event.clientX,
                            y: event.clientY
                        }
                    })
                    push('click', label)
                } catch {
                    /* 静默 */
                }
            }
            document.addEventListener('click', onClick, true)
            // 曝光（IntersectionObserver + MutationObserver 补挂）与滚动深度同样注册在这里，见下文
        }
```

点击用**捕获阶段委托**：绑在 document 上，动态插入的节点不用重新绑定；选择器收敛到 `a / button / [data-track]` 等可交互元素，避免每个 div 都变成点击事件。

曝光用 `IntersectionObserver`（进入视口一半即算），两个工程细节：

- **观察到就 `unobserve`**——注销本身就是去重，元素不会反复上报；
- **`init()` 时框架还没 mount，首扫必然扑空**——用 `MutationObserver` 监听 DOM 变化补挂，200ms 合并一次防抖。

点击、曝光、路由变化同时压进一条**面包屑环形队列**（默认 20 条），等 3.2 节的错误事件发生时随事件带出去——「用户做了什么才炸的」比错误堆栈本身更早回答问题。滚动深度只报一次到底（可配比例，默认 90%），路由切换后重置。

### 3.7 白屏：米字采样 + 二次复检

白屏检测容易走偏的两条路：截图比对（成本高、要回传图片）、只看「容器有没有子节点」（空 div 也是子节点）。我们的做法：**容器上取 33 个米字采样点，`elementsFromPoint` 逐点判断有没有有效内容，空白占比超 90% 判白屏**。阈值刻意设得这么高：移动端页面「内容不满一屏」是常态，购物车页实测视口下半区全是留白，空白占比能到 73%，0.7 的容忍度会把这类稀疏正常页误判成白屏；而真白屏与骨架屏伪装的空白占比都接近 100%，0.9 不损失检出能力。

```
容器矩形上的米字采样（横/竖/两条对角线各 9 点，去重后 33 点）：

   ●────────●────────●
    ╲       │       ╱
     ╲      │      ╱
      ●─────●─────●
     ╱      │      ╲
    ╱       │       ╲
   ●────────●────────●
```

判定「有效内容」分三层：先排除，再看硬内容，最后看绘制信号：

> 摘自 `./code/monitor-sdk/src/plugins/whitescreen.js`

```js
    // 输入：命中的一个元素
    // 输出：这个元素自身是否有"已绘制的内容"
    // 过程：排除脚本样式/骨架屏/不可见 → 替换元素看尺寸 → 直接文本 → 背景色/背景图/边框/阴影等绘制信号
    // 取舍：只看直接文本会让"白底卡片里的稀疏文字"被判成空白（wrapper 命中时无文本），
    //      所以补上绘制信号。代价是白底空卡片不算白屏——那是数据问题，交给错误与接口监控，白屏只管渲染链路
    function ownContent(el) {
        const tag = el.tagName.toLowerCase()
        if (IGNORED.has(tag) || isGuarded(el)) return false

        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false

        if (REPLACED.has(tag)) {
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
        }
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType === 3 && (node.textContent || '').trim().length > 0) return true
        }
        // 绘制信号：背景、边框、阴影任一存在，说明这块区域已经渲染出来了，不是"白屏"
        if (style.backgroundImage !== 'none') return true
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') return true
        if (style.boxShadow !== 'none') return true
        return (
            style.borderTopWidth !== '0px' ||
            style.borderRightWidth !== '0px' ||
            style.borderBottomWidth !== '0px' ||
            style.borderLeftWidth !== '0px'
        )
    }
```

这一层的取舍值得展开讲。`elementsFromPoint` 返回该点上的**整条元素栈**，所以父容器绝不能凭 `textContent` 判内容——否则任何带 wrapper 的空页面都会漏判。但只认「直接文本节点」又会误报：商品详情页这种「白底卡片 + 稀疏文字」的布局，大量采样点落在卡片留白或没有直接文本的 wrapper 上，实测空白占比 88%，正常页面被判成白屏。补上绘制信号后，这些点有了判据。

代价要讲清楚：**白底空卡片不再算白屏**。这是主动选的偏置——白屏检测只负责「渲染链路挂了」（JS 崩溃、资源全挂、路由没渲染），「渲染出来了但没数据」属于接口与业务异常，交给错误监控去报。误报会让团队对这个指标彻底失去信任，漏报还能靠错误率兜住。

`getComputedStyle` 是强制样式计算，33 个点里同一元素会被反复命中，按元素缓存、一轮采样只算一次：

```js
    function hasContent(el, cache) {
        const cached = cache.get(el)
        if (cached !== undefined) return cached
        const result = ownContent(el)
        cache.set(el, result)
        return result
    }
```

两个工程经验：

- **`data-blank-safe` 骨架屏豁免**：骨架屏是白屏的常见伪装——页面上有灰块但业务内容是空的。带这个属性的节点沿祖先链都被排除，不当作有效内容。
- **二次复检**：首屏渲染慢、路由切换瞬间都可能误判。首采命中后等 2 秒再采一次，仍空白才上报。

上报事件的 `data` 里带一个 `recent` 字段——白屏从来不是孤立现象：

```js
                recent: {
                    errors: recent.errors.slice(),
                    resources: recent.resources.slice(),
                    requests: recent.requests.slice(),
                    routes: recent.routes.slice()
                }
```

这样一条白屏事件本身就回答了「是不是某个接口挂了 / 某个 JS 报错导致渲染中断 / 只是这个路由没渲染」。

### 3.8 自定义上报：一个入口，两条守则

`report(input)` 挂在插件对象上，内核把它暴露成 `sdk.report()`。整个插件不长，直接看全文：

> 摘自 `./code/monitor-sdk/src/plugins/custom.js`

```js
const PARAM_LIMIT = 4096
export function createCustomPlugin() {
    let ctxRef = null
    return {
        name: 'custom',
        setup(ctx) {
            ctxRef = ctx
            return () => {
                ctxRef = null
            }
        },
        report(input) {
            const ctx = ctxRef
            if (!ctx) return
            const name = String(input?.name || '').trim()
            if (!name) {
                ctx.log('report() 需要一个事件名')
                return
            }
            let params = input.params
            let truncated = false
            try {
                const json = params ? JSON.stringify(params) : ''
                if (json.length > PARAM_LIMIT) {
                    params = { truncated: json.slice(0, PARAM_LIMIT) }
                    truncated = true
                }
            } catch {
                params = { note: '参数无法序列化' }
            }
            if (name.split('.').length < 3) ctx.log(`事件名建议三段式（平台.页面.行为）：${name}`)
            ctx.emit({
                type: 'custom',
                subtype: name,
                message: name,
                tags: input.tags,
                data: { name, params, truncated }
            })
        }
    }
}
```

所有手动埋点走 `sdk.report()` 一个入口（业务再封装出自己的 `trackPageView / trackClick`），两条守则：

- **事件名三段式**：`平台.页面.行为`（`monishop.HOME.product_click`）。页面段随路由切换，服务端按名字聚合漏斗时不用解析上下文。
- **参数 4KB 截断并打标**：`truncated: true` 让服务端知道这是被截断的参数，而不是静默丢信息。事件名不合规范只 log 不拒绝——埋点该宽松，采集该严格。

业务 catch 到的已知异常走 `sdk.captureError(error, tags)`：归一后以 `subtype: 'manual'` 上报，与全局兜底的三路来源（js / promise / vue）区分开，服务端能算出「兜底率」——多少错误是业务自己接住的。

## 四、验证与取舍

### 演示工程

```
monitor-demo/
├─ sdk.js            # 全站唯一实例（多处 init 会重复挂监听器）
├─ useReport.js      # 业务二次封装：PV / 点击 / 已知异常
├─ views/LabView.vue # 能力总控台：每项能力一个按钮 + 实时快照
├─ blank.html/.js    # 空容器撑满视口，专门验证白屏链路
└─ collector.js      # 接收端 + 聚合看板 + mock 错误与慢接口
```

SDK 以源码被 demo 直接引用，改 SDK 立即生效。每项能力都有可复现的操作入口：

| 能力 | 操作入口 | 期望事件 |
| --- | --- | --- |
| 性能 | 页面隐藏（切标签/关页面） | `perf` / 一条终值 |
| JS 异常 | 实验室「运行时错误」「Vue 渲染错误」 | `error` / `js`、`error` / `vue` |
| Promise | 实验室「未捕获拒绝」 | `error` / `promise` |
| 资源 | 实验室「图片 404」 | `resource` / `load-error` |
| 请求 | 实验室「HTTP 404」「网络失败」「慢请求」 | `request` / `http`、`network`、`slow` |
| 路由 | 顶部导航、实验室 `router.push`、原生 `history.pushState` | `router` / `push`、`enter` |
| 行为 | 点商品卡、滚到曝光区、滚到底 | `behavior` / `click`、`expose`、`scroll-depth` |
| 白屏 | 打开 `/blank.html` | `white-screen` / `recheck` |
| 自定义 | 实验室 `report()`、加购、下单 | `custom` / 事件名 |
| 采样 / 节流 / 批量 | 实验室按钮 | `stats.sampled` / `throttled` / `lastFlushReason` 变化 |
| 离线补发 | 关掉 collector 触发上报后再启动 | 启动时 `stats.restored` 增长 |

### 实测读数

白屏页（`/blank.html`，容器 `#app` 撑满视口但没有内容）：

```json
{
  "container": "#app",
  "ratio": 1,
  "blank": 33,
  "total": 33,
  "stage": "recheck",
  "recent": { "errors": [], "resources": [], "requests": [], "routes": ["enter: enter /blank.html"] }
}
```

33 个采样点全部空白，首采后 1.5 秒复检仍空白，上报一次；`recent.routes` 记录了进入动作，说明上下文链路通了。

商城页（首页 → 点商品 → 进入详情）：

```json
{
  "routes": [
    { "route": "/", "count": 4 },
    { "route": "/blank.html", "count": 2 },
    { "route": "/product/1", "count": 1 }
  ],
  "topEvents": [
    { "name": "monishop.HOME.PV", "count": 1 },
    { "name": "monishop.HOME.product_click", "count": 1 },
    { "name": "monishop.PRODUCT.PV", "count": 1 }
  ]
}
```

路由三路（`enter` / `push`）都在，`duration` 能直接读出首页停留时长；业务事件名三段式，页面段随路由切换从 `HOME` 变 `PRODUCT`。

性能终值（空白页，切标签触发 hidden）：

```json
{
  "tbt": 100,
  "longTaskCount": 2,
  "cls": 0,
  "inp": 0,
  "navigation": { "ttfb": 70, "dns": 0, "tcp": 48, "request": 15, "response": 7, "domReady": 429, "load": 429 }
}
```

空白页没有内容绘制，所以 `fp/fcp/lcp` 缺省（`JSON.stringify` 丢弃 `undefined`），但导航阶段与长任务正常——这本身是个有用的信号：**有 TBT 却没有任何绘制，通常意味着渲染被 JS 阻塞了**。

### 已知取舍

- **INP 是简化口径**（最大交互耗时），没有按 `interactionId` 分组取 p98。
- **资源失败只认 `error` 事件**，没有做 `transferSize + duration` 的启发式判断，跨域资源的信息缺失会漏报。
- **白屏偏置到漏报**：绘制信号让白底空卡片、只有背景色的空容器也被算作「已绘制」，不会判白屏；阈值默认 0.9——内容不满一屏的页面（实测购物车页 73%）不算白屏，真白屏（100%）与骨架屏伪装仍会检出。窄布局在超宽屏上两侧留白也会抬高空白占比。真正的渲染失败要靠错误率与接口异常交叉确认。
- **没有采样率自适应**：客户端不知道服务端压力，降采样只能靠配置下发。

这些都不是「做不了」，而是明确划在 SDK 边界外——把它们放进路线图，比让 SDK 无限膨胀更实际。

## 小结

设计一套监控 SDK，真正难的不是调用哪个浏览器 API，而是三个边界决定：

1. **能力边界**：只采能解释问题的数据。请求只报失败与慢，资源只报失败与 Top5，行为只报可用作漏斗与面包屑的部分。
2. **职责边界**：插件只能 `emit`，队列与通道只有内核能碰。没有这条，采样、脱敏、批量这些「治理」迟早会被某个插件绕过。
3. **时序边界**：性能终值必须在 `hidden` 定稿后才发；`finalize` 必须先于 drain。顺序错一次，数据就永久缺失。

剩下的都是工程细节：`buffered: true`、捕获阶段、`text/plain` 免预检、指纹去重、离线兜底。这些细节写进代码容易，写进设计文档才不会再踩第二遍。
