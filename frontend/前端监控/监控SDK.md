# 监控SDK

自建监控 SDK 解决一个问题：**把浏览器里发生的异常、性能、业务行为，可靠地变成可查询的数据。** SDK 按能力分为五个文件：**初始化、异常、性能、声明上报、上报**，手动上报只有一个入口 `report()`——业务侧区分上报类型的二次封装（PV / 点击 / 错误）在接入层完成。本篇按这几条线逐个展开，每条原理都摘配套源码落地，最后是覆盖全部特性的演示工程。全部实现零依赖、可断点复现：`code/monitor-sdk/`（SDK 本体）+ `code/monitor-demo/`（演示工程、业务二次封装与接收端）。

## 一、SDK 架构

### 1.1 五个能力文件：初始化 / 异常 / 性能 / 声明上报 / 上报

模块划分只有一个依据：**能力边界**。一个文件回答一个问题——异常怎么抓、性能怎么测、声明式埋点怎么挂、事件怎么可靠地发出去；装配三者的过程就是初始化。依赖方向单向：异常、性能、声明上报只产出事件交给上报，谁也不感知谁的存在；装配与生命周期收口集中在初始化。

```
┌───────────────────────────────────────────────────────────────┐
│ 接入侧：init(config) + 手动上报 report()                        │
│   业务二次封装（PV / trackClick / errorReport）落在 report() 上  │
├───────────────────────────────────────────────────────────────┤
│ 初始化 init.js —— 默认配置、单例、装配、hidden 收口               │
│      │ 装配（依赖注入：send / onRequestTime）                    │
│      ├──► exceptions.js   异常：error / unhandledrejection /   │
│      │                     请求拦截（接口+网络错误）/ Vue 归一    │
│      ├──► performance.js  性能：Web Vitals 全指标 + 导航明细 +   │
│      │                     请求耗时，hidden 定稿                │
│      └──► declarative.js  声明上报：data-track 点击委托 /        │
│                           data-expose 曝光                     │
│                │ 三者只产出事件                                 │
│                ▼                                               │
│           report.js 上报：report() 手动入口 + 公共字段 → 采样 →   │
│                     节流 → beforeSend → 批量 → sendBeacon 优先   │
└───────────────────────────────────────────────────────────────┘
                          │ JSON 数组（一个请求一批事件）
                          ▼
              collector 接收端（POST /api/report）
```

```
code/monitor-sdk/src/
├── index.js          # 公共出口：init / report / getCurrentInstance
├── init.js           # 初始化：默认配置、单例、装配采集模块、hidden 收口
├── exceptions.js     # 异常：error（捕获阶段）/ unhandledrejection / fetch+XHR 拦截 / Vue errorHandler
├── performance.js    # 性能：FP/FCP/LCP/CLS/INP/TBT + 导航明细 + 请求耗时，hidden 定稿
├── declarative.js    # 声明上报：data-track 点击委托 / data-expose 曝光
└── report.js         # 上报：report() 手动入口 + 公共字段补全 → 采样 → 节流 → 批量 → sendBeacon 优先
```

一个模块间协作的例子：fetch/XHR 请求拦截产出的耗时，由初始化通过 `onRequestTime` 回调交给性能模块——异常模块不需要知道性能模块存在，增删任一模块只动 init 里的装配行。

### 1.2 初始化：装配就是架构

`init` 是唯一初始化入口，装配行的顺序就是依赖的顺序——**上报必须先创建**（它要在任何请求拦截之前拿到原生 fetch，否则 SDK 自己的上报也会被拦截采集）：

> 摘自 `./code/monitor-sdk/src/init.js`

```js
    // 上报先创建（内部要拿原生 fetch），再装配采集模块——顺序反了 SDK 自己的上报会被请求拦截采集
    const reporter = initReporter(cfg, win, stats)

    // 性能：订阅 Web Vitals 与导航明细，请求耗时由异常模块的请求拦截写入
    const perf = initPerformance(win)

    // 异常：window error / unhandledrejection / fetch+XHR 请求拦截（接口与网络错误）
    const exceptions = installExceptions(win, {
        send: reporter.send,
        onRequestTime: perf.addRequestTime
    })

    // 声明上报：data-track 点击委托 / data-expose 曝光
    initDeclarative(cfg, win, reporter.send)
```

对外 API 只有一张小表——手动上报全部收敛到 `report()` 一个入口：

| 类别 | API | 说明 |
| --- | --- | --- |
| 上报 | `report(event)` | 唯一手动上报入口；业务区分类型的二次封装落在它上面 |
| 异常 | `attachVue(app)` | Vue errorHandler 归一（app 创建后调用） |
| 上报 | `flush(reason)` | 立即发送队列（hidden 收口已自动） |
| 自观测 | `stats`（sent/retried/dropped/throttled）、`cfg`（运行时可改采样率） | SDK 自己也是被监控对象 |

## 二、异常捕获

浏览器给异常暴露的钩子一共四路 + 一个框架口，每一路都有明确的边界与陷阱。

### 2.1 error 事件：捕获阶段才能截住资源错误

`window` 的 `error` 事件一次监听抓两类错误，判据是事件对象有没有 `target.tagName`——资源错误（img/script/link 加载失败）不冒泡，**必须用捕获阶段**（`addEventListener` 第三个参数 `true`）才能截住：

> 摘自 `./code/monitor-sdk/src/exceptions.js`

```js
    // 1. error 事件：资源错误（img/script/link）不冒泡，必须捕获阶段才能截住
    win.addEventListener(
        'error',
        (event) => {
            try {
                // 判据：事件对象上有 target.tagName 就是资源错误，没有才是脚本错误
                if (event.target && event.target.tagName) {
                    const el = event.target
                    const src = el.src || el.href || ''
                    send({
                        type: 'resource',
                        message: '资源加载失败: ' + el.tagName.toLowerCase() + ' ' + src,
                        data: { url: src } // 资源错误没有 stack，url 是归并键的一部分
                    })
                    return
                }
                const err = event.error
                send({
                    type: 'runtime',
                    message: event.message,
                    stack: err && err.stack,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                })
            } catch (e) {
                /* 静默：SDK 内部错误不上报，避免循环 */
            }
        },
        true
    )
```

两个实测踩出的坑：**游离元素抓不到资源错误**——`new Image()` 不插入 DOM，error 事件不经过 window，演示页专门用 `createElement('img') + appendChild` 复现正确姿势；**SDK 自己不能抛错**——每一路采集都包 try/catch，否则 SDK 的报错会触发再上报，形成循环。

### 2.2 unhandledrejection：Promise 拒绝的唯一兜底

Promise 拒绝不走 `error` 事件，没有兜底 catch 的拒绝只能在这里抓。reason 可能是任意值（`throw 'str'` 合法），要按类型归一：

> 摘自 `./code/monitor-sdk/src/exceptions.js`

```js
    // 2. Promise 拒绝不走 error 事件，必须单独监听
    win.addEventListener('unhandledrejection', (event) => {
        try {
            const reason = event.reason
            send({
                type: 'promise',
                message: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : '' // 没有 filename/lineno，stack 是唯一位置线索
            })
        } catch (e) {
            /* 静默 */
        }
    })
```

### 2.3 fetch 拦截：接口错误与「双报」陷阱

包裹 `win.fetch`，`status >= 400` 记接口错误（不能用 `!res.ok`——它的口径是 200~299，304 缓存命中也会命中但不是错误）；catch 分支只交耗时、**必须 rethrow，不能再上报**——没被业务接住的 fetch 拒绝会走 `unhandledrejection` 兜底，这里再抓就是同一条错误报两次：

> 摘自 `./code/monitor-sdk/src/exceptions.js`

```js
    const origFetch = win.fetch
    if (typeof origFetch === 'function') {
        win.fetch = async function (...args) {
            const input = args[0]
            const url = typeof input === 'string' ? input : (input && input.url) || ''
            const method = ((args[1] && args[1].method) || (input && input.method) || 'GET').toUpperCase()
            const start = Date.now()
            try {
                const res = await origFetch.apply(this, args)
                const duration = Date.now() - start
                if (onRequestTime) onRequestTime({ description: method + ' ' + url, duration, status: res.status })
                // 接口错误判据是 status>=400，不能用 !res.ok——
                // res.ok 的口径是 200~299，304 缓存命中也会 !ok，但那不是错误
                if (res.status >= 400) {
                    send({
                        type: 'http',
                        message: '接口错误 ' + method + ' ' + url + ' status=' + res.status,
                        data: { url, method, status: res.status }
                    })
                }
                return res
            } catch (err) {
                const duration = Date.now() - start
                if (onRequestTime) onRequestTime({ description: method + ' ' + url, duration, status: 0 })
                throw err // 上报耗时后必须 rethrow，否则吞掉业务异常
            }
        }
    }
```

注意拦截同时产出两种数据：**接口/网络错误**（本路）与**请求耗时**（`onRequestTime` 交给性能模块，第三章慢请求榜的数据源）——一次拦截喂两类监控。

### 2.4 XHR 拦截：status=0 的网络错误只能在这抓

XHR 的网络层失败（DNS 失败、连接被拒，`status=0`）没有 Promise 拒绝可兜底，只能在 `loadend` 里判。改写 `open` 记录请求元信息，改写 `send` 挂 `loadend`：

> 摘自 `./code/monitor-sdk/src/exceptions.js`

```js
    // XHR 没有事件模型之外的 Promise 拒绝：网络层失败（DNS 失败、连接被拒，status=0）只能在 loadend 里判
    const XHR = win.XMLHttpRequest
    if (XHR && XHR.prototype && typeof XHR.prototype.open === 'function') {
        const origOpen = XHR.prototype.open
        const origSend = XHR.prototype.send
        XHR.prototype.open = function (method, url) {
            this.__monitorMeta = { method: String(method || 'GET').toUpperCase(), url: String(url) }
            return origOpen.apply(this, arguments)
        }
        XHR.prototype.send = function () {
            const meta = this.__monitorMeta || { method: 'GET', url: '' }
            const start = Date.now()
            this.addEventListener('loadend', () => {
                try {
                    const status = this.status
                    const duration = Date.now() - start
                    if (onRequestTime) onRequestTime({ description: meta.method + ' ' + meta.url, duration, status })
                    if (status === 0) {
                        send({
                            type: 'network',
                            message: '网络错误 ' + meta.method + ' ' + meta.url,
                            data: { url: meta.url, method: meta.method }
                        })
                    } else if (status >= 400) {
                        send({
                            type: 'http',
                            message: '接口错误 ' + meta.method + ' ' + meta.url + ' status=' + status,
                            data: { url: meta.url, method: meta.method, status }
                        })
                    }
                } catch (e) {
                    /* 静默 */
                }
            })
            return origSend.apply(this, arguments)
        }
    }
```

### 2.5 框架口：Vue errorHandler 归一

框架内部（渲染函数、生命周期）的错误走不到 window，Vue 用 `app.config.errorHandler` 兜。SDK 接管后保留原 handler（接入方可能自己也挂了），并用 tags/extra 标注错误来源：

> 摘自 `./code/monitor-sdk/src/exceptions.js`

```js
    // 4. Vue errorHandler：框架内错误（渲染函数、生命周期）走不到 window，在这里归一
    function attachVue(app) {
        const prevHandler = app.config.errorHandler
        app.config.errorHandler = (err, vueInstance, info) => {
            send({
                type: 'runtime',
                handled: true, // 归一入口 = 业务侧已接住，区别于全局兜底
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : '',
                tags: { vue: true },
                extra: {
                    lifecycleHook: info, // 出错的钩子名，如 setup / mounted / render
                    componentName: (vueInstance && vueInstance.$options && vueInstance.$options.name) || 'anonymous'
                }
            })
            // 保留原 handler：接入方可能自己也挂了错误处理
            if (typeof prevHandler === 'function') prevHandler.call(app, err, vueInstance, info)
        }
    }
```

框架口是补充不是替代：事件处理器与异步代码里的错误仍由 2.1/2.2 的全局钩子兜底。

## 三、性能指标

### 3.1 PerformanceObserver 与 buffered 补收

性能数据浏览器已经替你算好了，SDK 的工作是**订阅对的事件类型、拿到准的口径**。统一订阅入口只有一个关键参数——`buffered: true`，它补收 SDK 加载之前已产生的 entry（否则 FCP 恒为 0，因为 paint 发生在 SDK init 之前太常见）：

> 摘自 `./code/monitor-sdk/src/performance.js`

```js
    // 统一订阅入口：buffered: true 补收 SDK 加载前已产生的 entry（否则 FCP 恒为 0，paint 常发生在 init 之前）
    function po(type, cb) {
        try {
            new win.PerformanceObserver((list) => cb(list.getEntries())).observe({ type, buffered: true })
        } catch (e) {
            /* 浏览器不支持该 entry 类型时静默跳过，不把页面搞崩 */
        }
    }
```

### 3.2 指标口径：全指标覆盖

| 指标 | 订阅类型 | 口径要点 |
| --- | --- | --- |
| FP | `paint` | 首次绘制 |
| FCP | `paint` | `first-contentful-paint` 的 startTime |
| LCP | `largest-contentful-paint` | 取**最后一条**候选：LCP 越晚越准，hidden 定稿时最新候选就是终值 |
| CLS | `layout-shift` | **双口径**：规范口径累计 `hadRecentInput=false` 的位移（用户输入导致的位移豁免）；全量口径 `clsRaw` 全部累计供排查 |
| INP | `event` | 取交互 duration 的最大值（简化版；生产建议接官方 web-vitals 库） |
| TBT | `longtask` | 只算超出 50ms 门槛的部分：`Σ max(0, duration - 50)` |
| 导航明细 | `getEntriesByType('navigation')` | TTFB / DNS / TCP / DOM Ready / load |
| 请求耗时 | fetch/XHR 拦截写入 | 慢请求 Top5 的数据源 |

> 摘自 `./code/monitor-sdk/src/performance.js`

```js
    po('paint', (entries) => {
        for (const e of entries) {
            if (e.name === 'first-paint') state.fp = Math.round(e.startTime)
            if (e.name === 'first-contentful-paint') state.fcp = Math.round(e.startTime)
        }
    })
    po('largest-contentful-paint', (entries) => {
        const last = entries[entries.length - 1]
        if (last) state.lcp = Math.round(last.startTime) // LCP 越晚越准：hidden 定稿时的最新候选就是终值
    })
    po('layout-shift', (entries) => {
        for (const e of entries) {
            state.clsRaw += e.value
            if (!e.hadRecentInput) state.cls += e.value
        }
    })
    po('longtask', (entries) => {
        for (const e of entries) {
            state.longtaskCount++
            state.tbt += Math.max(0, e.duration - 50)
        }
    })
```

### 3.3 finalize：hidden 才是终值

LCP/CLS 的语义是「页面生命周期结束时的最终值」——中途读到的都是中间候选。所以性能快照在页面 hidden 时才定稿上报，且只算一次（`finalized` 标记防重复上报）。导航明细与慢请求榜也在此时一并定稿：

> 摘自 `./code/monitor-sdk/src/performance.js`

```js
    // finalize：页面 hidden 时定稿。重复调用直接返回 null，防止流量翻倍
    function finalize() {
        if (state.finalized) return null
        state.finalized = true
        const navigation = {}
        try {
            const entry = (win.performance.getEntriesByType('navigation') || [])[0]
            if (entry) {
                navigation.ttfb = Math.round(entry.responseStart - entry.startTime) // 首字节时间
                navigation.dns = Math.round(entry.domainLookupEnd - entry.domainLookupStart) // DNS 解析
                navigation.tcp = Math.round(entry.connectEnd - entry.connectStart) // TCP 连接
                navigation.dom = Math.round(entry.domContentLoadedEventEnd - entry.startTime) // DOM Ready
                navigation.load = Math.round(entry.loadEventEnd - entry.startTime) // 页面加载完成
            }
        } catch (e) {
            /* ignore */
        }
        // 慢请求 Top5：接口排查最高频的诉求
        const slowRequests = state.requestTimes.slice().sort((a, b) => b.duration - a.duration).slice(0, 5)
```

收口触发端在初始化，有一条**顺序铁律**——先定稿性能终值入队，再发送队列，顺序反了指标就丢（见 5.5）。

## 四、手动上报与声明上报

### 4.1 report()：唯一的手动上报入口

SDK 只提供一个手动上报函数 `report(event)`，异常自动采集内部也走同一条通道。传 `error` 字段（Error 实例）时 SDK 归一拆出 message/stack——业务 catch 分支不需要自己拼错误现场：

> 摘自 `./code/monitor-sdk/src/report.js`

```js
// 手动上报：SDK 唯一的手动入口。业务侧区分上报类型的二次封装（demo 的 useReport）都落在这一句上
export function report(event) {
    if (!active) {
        console.warn('[monitor-sdk] report() 需在 init() 之后调用')
        return
    }
    active.send(event)
}
```

公参在 init 时静态传入（`commonParams`），之后每条事件自动附带；发送环节的完整处理见第五章。

### 4.2 业务二次封装：区分上报类型

`report()` 是单入口，但业务代码不应该到处裸写事件对象——在接入层按类型封装成具名函数，形态对齐 cash-web 的 `hooks/useReport`。事件名 = **平台.页面.行为** 三段式：平台段读 init 的 `eventPrefix`，页面段由路由生成——过滤数字段（商品 id 不炸开事件名）、空路径回退 INDEX；维度（id/价格/渠道）进 params 不进事件名，事件名保持有限集合，分析时才能 GROUP BY：

> 摘自 `./code/monitor-demo/useReport.js`

```js
// 页面段：路由 path → 事件名页面段。数字段过滤（商品 id 不炸开事件名）、空路径回退 INDEX
const PAGE_MAP = { '/': 'HOME', '/cart': 'CART', '/lab': 'LAB' }
function pageName() {
    const path = window.location.pathname
    if (PAGE_MAP[path]) return PAGE_MAP[path]
    const seg = path
        .split('/')
        .filter(Boolean)
        .filter((s) => !/^\d+$/.test(s))
        .join('_')
        .toUpperCase()
        .replace(/-/g, '_')
    return seg || 'INDEX'
}

// 完整事件名：平台.页面.行为（平台段读 init 时传入的 eventPrefix）
function eventPos(pos) {
    const { cfg } = getCurrentInstance()
    return (cfg.eventPrefix ? cfg.eventPrefix + '.' : '') + pageName() + '.' + pos
}
```

三个类型化函数覆盖业务的全部上报需求——PV、行为、已知异常：

> 摘自 `./code/monitor-demo/useReport.js`

```js
// PV：路由切换时由 afterEach 调用——PV 是业务事件，SDK 不自动上报（形态同 cash-web 的 page_visit 手动上报）
export function trackPageView() {
    report({ type: 'track', event: eventPos('PV'), params: { path: window.location.pathname + window.location.search } })
}

// 点击/自定义行为：语义对齐 cash-web 的 dataReport({ eventPos, extendInfo })
export function trackClick(pos, params = {}) {
    report({ type: 'track', event: eventPos(pos), params })
}

// 已知异常：业务 catch 分支里调用，handled=true 区别于全局兜底；error 对象由 SDK 归一拆出 message/stack
export function errorReport(error, tags, extra) {
    report({ type: 'runtime', handled: true, error, tags, extra })
}
```

接入侧的完整用法：PV 在路由钩子里手动报（demo 用 vue-router 的 `afterEach`），业务流程调 `trackClick`，catch 分支调 `errorReport`：

> 摘自 `./code/monitor-demo/main.js`

```js
// PV 手动上报：每次路由切换（含首次进入）一条，事件名 = monishop.HOME.PV
router.afterEach(() => trackPageView())
```

### 4.3 声明上报：data-track 委托 + data-expose 曝光

声明式埋点是 SDK 自带的自动采集：元素加 `data-track` 属性即埋点，零 JS 代码。点击用**事件委托**（捕获阶段，业务方 stopPropagation 也拦不住埋点），一个监听覆盖全页、动态插入的元素天然生效。曝光用 IntersectionObserver，观察后即注销（同一元素只报一次）：

> 摘自 `./code/monitor-sdk/src/declarative.js`

```js
        // 点击委托挂捕获阶段：业务方 stopPropagation 也拦不住埋点；一个监听覆盖全页，动态元素天然生效
        doc.addEventListener(
            'click',
            (e) => {
                try {
                    const el = e.target.closest('[data-track]')
                    if (el) track(el.dataset.track, { text: (el.textContent || '').trim().slice(0, 20) })
                } catch (err) {
                    /* 静默 */
                }
            },
            true
        )

        if (typeof win.IntersectionObserver !== 'function') return
        const io = new win.IntersectionObserver(
            (entries) => {
                for (const en of entries) {
                    if (en.isIntersecting) {
                        track(en.target.dataset.expose)
                        io.unobserve(en.target) // 观察后即注销：同一元素只报一次
                    }
                }
            },
            { threshold: 0.5 }
        )
```

曝光有个实测踩出的坑：**init 时 Vue 还没 mount，首屏扫描 `[data-expose]` 必然扑空**——SPA 的曝光元素是动态渲染的。必须用 MutationObserver 补挂，新节点进文档即注册曝光观察：

> 摘自 `./code/monitor-sdk/src/declarative.js`

```js
        // init 时 Vue 还没 mount，首屏扫描 [data-expose] 必然扑空——SPA 的曝光元素是动态渲染的。
        // MutationObserver 补挂：新节点进文档即注册曝光观察，列表异步加载同样覆盖
        const observeAll = (root) => root.querySelectorAll('[data-expose]').forEach((el) => io.observe(el))
        observeAll(doc)
        const mo = new win.MutationObserver((muts) => {
            for (const m of muts) {
                m.addedNodes.forEach((n) => {
                    if (n.nodeType !== 1) return
                    if (n.matches && n.matches('[data-expose]')) io.observe(n)
                    else if (n.querySelectorAll) observeAll(n)
                })
            }
        })
        mo.observe(doc.body || doc, { childList: true, subtree: true })
```

声明式事件名 = init 的 `eventPrefix` + 属性值，如 `monishop.product_expose:1`——冒号后缀是维度（商品 id）不是步骤名。

## 五、上报

一条事件从产出到落库的完整旅程：公共字段补全 → 采样 → 节流 → beforeSend → 批量发送 → sendBeacon 优先 → 失败上限重试 → 页面隐藏统一收口。原则只有一条：**监控数据不值得牺牲用户体验，但要在不牺牲的前提下尽量送达。**

### 5.1 事件补全与入队前处理

采集模块产出的事件先做 Error 归一（4.1），再展开、补公共字段——顺序反了，事件自带的 tags/extra 会被公共字段覆盖丢失。入队前依次过三道处理：**采样**（错误/业务与性能分开配置）、**节流**（5.2）、**beforeSend**（治理唯一收口：脱敏、过滤、丢弃）：

> 摘自 `./code/monitor-sdk/src/report.js`

```js
    function send(event) {
        // Error 实例归一：手动上报直接传 error 对象即可，SDK 负责拆出 message/stack
        const { error, ...rest } = event
        if (error instanceof win.Error) {
            if (!rest.message) rest.message = error.message
            if (!rest.stack) rest.stack = error.stack
        }

        // 公共字段：先展开采集模块产出的事件再补全——事件自带的 tags/extra 不会被覆盖
        const full = {
            ...rest,
            event_id: uuid(),
            sdk: { name: 'monitor-sdk', version: SDK_VERSION },
            timestamp: Date.now(),
            environment: cfg.environment,
            release: cfg.release, // release 贯穿每条事件：sourcemap 对齐、按版本分桶的前提
            page: rest.page || win.location.pathname, // 发生页面：未传则取当前路径
            // 公参：init 时静态传入，每条事件自动附带（漏斗/留存分析全靠它）
            params: { ...cfg.commonParams, ...(rest.params || {}) }
        }

        // 采样：错误/业务与性能分开配置（错误量小要全量，性能每页一条也要控量）
        const rate = full.type === 'perf' ? cfg.tracesSampleRate : cfg.sampleRate
        if (Math.random() >= rate) return

        // 节流：相同错误 1 秒内只报一条，丢弃量记 stats.throttled
        const key = throttleKey(full)
        if (key) {
            const now = Date.now()
            if (now - (lastSeen.get(key) || 0) < 1000) {
                stats.throttled++
                return
            }
            if (lastSeen.size > 200) lastSeen.clear()
            lastSeen.set(key, now)
        }

        // beforeSend：治理唯一收口——脱敏、过滤、丢弃（返回 null 即丢弃）
        if (typeof cfg.beforeSend === 'function') {
            const result = cfg.beforeSend(full)
            if (result === null || result === undefined) return
        }
        enqueue(full)
    }
```

### 5.2 节流：相同错误 1 秒一条

节流的归并键 = **类型 + 消息 + 位置**（文件行号或请求 url）。没有它，一次渲染死循环产生的错误风暴就能打爆队列；丢弃量记进 `stats.throttled` 供观测。track/perf 每条都是有效样本，不参与节流：

> 摘自 `./code/monitor-sdk/src/report.js`

```js
    // 归并键 = 类型 + 消息 + 位置（文件行号或请求 url）。
    // 没有它，一次渲染死循环产生的错误风暴就能打爆队列
    const lastSeen = new Map()
    function throttleKey(event) {
        if (!ERROR_TYPES.includes(event.type)) return null
        return [event.type, event.message, event.filename || (event.data && event.data.url) || ''].join('|')
    }
```

### 5.3 批量：满量或超时触发

逐条直发是流量灾难。批量两个触发条件：队列满 `batchSize` 立即发，或 `flushInterval` 超时兜底发——高频操作靠满量、低频操作靠超时，两头都不等太久：

> 摘自 `./code/monitor-sdk/src/report.js`

```js
    // 批量上报：队列满 batchSize 立即发，或 flushInterval 超时兜底发——
    // 高频操作靠满量、低频操作靠超时，两头都不等太久
    function enqueue(event) {
        if (queue.length >= cfg.maxQueue) {
            queue.shift() // 溢出丢最旧：内存可控比多留几条旧事件重要
            stats.dropped++
        }
        queue.push(event)
        if (queue.length >= cfg.batchSize) flush('batch-full')
        else schedule()
    }

    function schedule() {
        if (timer) return
        timer = setTimeout(() => {
            timer = null
            flush('interval')
        }, cfg.flushInterval)
    }
```

### 5.4 投递与重试：sendBeacon 优先，上限重试

发送体是 **JSON 数组**——一个请求一批事件。首选 `sendBeacon`：判断支持即调用，页面卸载时也能送达、不阻塞；Blob 用 text/plain 发送，跨域不触发预检。兜底 `fetch + keepalive`（有响应回调，但请求体 64KB 上限）。重试有上限——无限重试消耗用户带宽，监控不值得：

> 摘自 `./code/monitor-sdk/src/report.js`

```js
    async function flush(reason) {
        if (sending || !queue.length) return
        sending = true // 防重入：hidden 触发 flush 时可能又有批次在途
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        const batch = queue.splice(0, queue.length)
        let ok = await deliver(batch)
        if (!ok) {
            // 重试有上限：监控数据不值得无限重试，重试本身也消耗用户带宽
            for (let i = 0; i < cfg.maxRetry && !ok; i++) {
                stats.retried++
                ok = await deliver(batch)
            }
        }
        if (ok) {
            stats.sent += batch.length
            if (cfg.debug) win.console.log('[monitor-sdk] 发送 ' + batch.length + ' 条 ✓（' + reason + '）')
        } else {
            stats.dropped += batch.length
            if (cfg.debug) win.console.warn('[monitor-sdk] 发送失败已放弃 ' + batch.length + ' 条（' + reason + '）')
        }
        sending = false
    }
```

> 摘自 `./code/monitor-sdk/src/report.js`

```js
    async function deliver(batch) {
        const body = JSON.stringify(batch) // 一个请求一批事件：JSON 数组
        // 首选 sendBeacon：判断支持即调用。页面卸载时也能送达且不阻塞；
        // Blob 用 text/plain 跨域不触发预检
        if (win.navigator && typeof win.navigator.sendBeacon === 'function') {
            if (win.navigator.sendBeacon(cfg.endpoint, new win.Blob([body], { type: 'text/plain' }))) return true
        }
        // 兜底 fetch + keepalive：有响应回调，但请求体有 64KB 上限
        if (!nativeFetch) return false
        try {
            const res = await nativeFetch(cfg.endpoint, { method: 'POST', body, keepalive: true })
            return !res || res.ok !== false
        } catch (e) {
            return false
        }
    }
```

### 5.5 hidden 统一收口

页面隐藏时收口一次：**先定稿性能终值入队，再发送队列**——顺序反了指标就丢。这是生命周期收口的唯一入口：

> 摘自 `./code/monitor-sdk/src/init.js`

```js
    // 生命周期收口唯一入口：先定稿性能终值入队，再发送队列（顺序反了指标就丢了）
    if (win.document && typeof win.document.addEventListener === 'function') {
        win.document.addEventListener('visibilitychange', () => {
            if (win.document.visibilityState === 'hidden') {
                const metrics = perf.finalize() // LCP/CLS 越晚越准，hidden 才是终值
                if (metrics) reporter.send(metrics)
                reporter.flush('hidden')
            }
        })
    }
```

## 六、Demo 全特性覆盖

### 6.1 两个工程

`code/monitor-demo/` 是 Vite + Vue3 + vue-router 的电商演示（monishop 商城：首页商品网格 → 商品详情 → 购物车下单 → 实验室总控台），SDK 通过相对路径引 `../monitor-sdk/src/index.js`，业务二次封装在 `useReport.js`。collector（5189）既是上报接收端（`POST /api/report`），又下发 dist 静态资源并带 history 路由的 SPA fallback，另提供 `GET /api/stats` 三块看板（错误聚合 / 性能快照 / 业务漏斗）作验证出口。

```
cd code/monitor-demo && npm install
npm run build          # 构建 demo（产物 dist/）
npm run collector      # 起接收端 http://localhost:5189/
```

### 6.2 特性 ↔ 操作对照

每个特性 = 实验室页一个带标签的按钮（或商城页一段真实流程）。**UI 入口的标签就是监控特性**，触发后按「验证位置」对号入座。

#### 性能

- **FP / FCP / LCP / CLS / INP（自动）**：无需触发，页面加载即采集，`hidden` 时定稿上报。验证：看板 `perf` 块。
- **TBT（长任务）**：点「性能 · TBT｜制造 150ms 长任务」→ 主线程阻塞 150ms，TBT 累计超 50ms 门槛的部分。验证：看板 `perf.tbt` 增大（实测 +100）。
- **慢请求**：点「性能 · 慢请求｜800ms 接口」→ fetch /mock/slow。验证：看板 `slowRequests` 榜首。
- **导航明细**：TTFB / DNS / TCP / DOM Ready / load 随性能快照上报。验证：看板 `navigation`。

#### 异常

- **运行时错误**：点「异常 · JS 错误｜运行时错误」→ 读 null 的属性。验证：看板 stack 首行定位。
- **Vue 渲染错误**：点「异常 · JS 错误｜Vue 渲染错误」→ 子组件 setup 抛错，errorHandler 归一（tags.vue=true，extra 带组件名与钩子）。
- **未捕获拒绝**：点「异常 · Promise｜未捕获拒绝」→ `Promise.reject` 不 catch。验证：看板 `handledRate: 0%`。
- **资源错误**：点「异常 · 资源｜图片 404」→ 真插入 DOM 的 img 加载失败（游离元素抓不到，正文 2.1 的坑）。
- **接口错误**：点「异常 · 接口｜HTTP 404」→ fetch /mock/404。验证：`接口错误 ... status=404`。
- **网络错误**：点「异常 · 网络｜请求失败（已 catch）」→ 业务 catch 后不重复上报（2.3 的双报陷阱：catch 只交耗时 rethrow）。

#### 手动上报与声明上报

- **PV（手动）**：路由切换由 `afterEach` 调 `trackPageView()`，事件名 `monishop.HOME.PV` / `monishop.PRODUCT.PV`。验证：看板 `topEvents`。
- **手动异常**：点「手动上报 · 异常｜errorReport（catch 封装）」；商城侧购物车下单 50% 抛错走同一函数。验证：`handled: true`，看板 handledRate 计入 100%。
- **手动消息**：点「手动上报 · 消息｜report()」→ 直接上报 `{ type: 'message' }`。
- **手动行为**：点「手动上报 · 行为｜trackClick（封装）」；商城真实流程同款——点商品卡（`product_click`）、加购（`add_cart`）、下单（`order_submit`/`order_done`）。
- **声明式点击**：点「声明上报 · 点击｜data-track 属性」→ 元素加 `data-track` 即埋点，零 JS 代码。
- **曝光**：首页商品网格带 `data-expose`，滚入视口自动上报（商品卡曝光是漏斗第一步）。
- **公参**：init 传 `commonParams: { uid, channel, ab_group }`，每条事件的 params 自动带。

#### 上报

- **采样**：实验室滑块设采样率 → 「采样演示：触发 10 次不同错误」→ 页面直接显示入队条数。
- **节流**：「节流演示：1 秒连发 10 次同错」→ 入队 1 条、丢弃 9 条（`sdk.stats.throttled`）。
- **批量**：Console 的发送日志可观察 batch-full / interval 两种触发原因交替出现。
- **收口**：标签页切走（或演示脚本派发 hidden）→ Console 出现 `发送 N 条 ✓（hidden）`，性能终值随该批次到达。

### 6.3 实测读数

headless Chrome 走完「逛商城 → 加购下单 → 实验室触发全特性 → hidden 收口」一轮，collector 收到 27 条事件（错误归并后 9 组），关键读数：

> 实测输出，示意片段（无配套脚本）

```
采样 30%：触发 10 次 → 入队 1 条            # 期望 ≈3，随机波动合理
节流：触发 10 次同错 → 丢弃 9 条，入队 1 条   # 看板同错 count=1
funnel: 曝光 6 → 点击 1（17%）→ 加购 1 → 下单 1
PV:    monishop.HOME.PV / monishop.PRODUCT.PV（afterEach 手动上报）
perf:  fp=72ms  fcp=340ms  lcp=7688ms  cls=0.077  tbt=261ms
slow:  GET /mock/slow 817ms 榜首，POST /mock/pay 332ms 次席
```

lcp=7688ms 偏大不是 bug：SPA 的 LCP 在路由切换后仍会更新候选，而纯 JS 派发的点击不算用户输入（不会冻结 LCP），headless 脚本的慢操作把候选推晚了——真实用户页面不会这么晚，但这正是「LCP 越晚越准」语义的活教材。已知取舍：性能快照 hidden 定稿且只算一次（SPA 长会话后续路由不再重复上报整页性能）、发送失败按上限重试不做退避。

## 配套代码

| 路径 | 覆盖内容 |
| --- | --- |
| `./code/monitor-sdk/src/index.js` | 公共出口 |
| `./code/monitor-sdk/src/init.js` | 初始化：配置 / 单例 / 装配 / hidden 收口 |
| `./code/monitor-sdk/src/exceptions.js` | 异常：error 分流 / unhandledrejection / fetch+XHR 拦截 / Vue 归一 |
| `./code/monitor-sdk/src/performance.js` | 性能：PerformanceObserver 订阅 / 指标口径 / finalize |
| `./code/monitor-sdk/src/declarative.js` | 声明上报：data-track 委托 / data-expose 曝光 + MutationObserver 补挂 |
| `./code/monitor-sdk/src/report.js` | 上报：report() 入口 / Error 归一 / 采样 / 节流 / 批量 / sendBeacon / 重试 |
| `./code/monitor-demo/useReport.js` | 业务二次封装：PV / trackClick / errorReport，三段式事件名 |
| `./code/monitor-demo/main.js` | 演示页接入：init 配置 / 公参 / PV 手动上报 |
| `./code/monitor-demo/collector.js` | 接收端：JSON 数组解析 / 落盘 / /api/stats 三块看板 |
| `./code/monitor-demo/views/CartView.vue` | 下单流程：trackClick 漏斗事件 + errorReport 协作 |
| `./code/monitor-demo/views/LabView.vue` | 实验室总控台：全特性触发源 / 采样与节流演示 |
