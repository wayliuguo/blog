# Vue SPA 性能实战

前六篇是「一人一招」：加载篇讲关键路径，构建篇讲产物，运行时篇讲长任务，闭环篇讲怎么守住。每一招都单独成立，但真实项目里它们从不单独出现——**你面对的永远是一个具体的页面，它同时有首屏慢、切路由卡、长列表掉帧、二次访问还在重新下载这四五个问题**，而且这几个问题会互相打架：给首屏做的预加载会抢长列表的带宽，把路由拆细了会让切路由变卡。

这一篇拿一个真的 Vue 3 单页应用（hash 路由 + 三个路由模块 + 2000 条订单），把五段手段按顺序做一遍，每一步都用实验台实测前后数字。**它不是新招式的清单，是把前面六篇串起来的那根线。**

实验台在 `code/perf-lab/pages/spa/`：同一个应用有两版外壳，对应两套工程决策，用 query 开关逐项对照。这一篇需要 `npm install`（唯一的依赖是 Vue 3 运行时），其余场景仍然零依赖。

## 一、这个应用长什么样

| | 未优化外壳 | 优化外壳 |
| --- | --- | --- |
| 入口 | `index.html` + `app.js` | `optimized.html` + `app-opt.js` |
| CSS | 外链，阻塞首屏 | 关键 CSS 内联，全量 CSS 异步加载 |
| JS 未到位时 | `#app` 是空的 | HTML 里自带骨架屏 |
| 路由模块 | 三个全量静态引入 | `() => import(...)` 动态引入 |
| 列表 | 2000 条全量渲染 | 虚拟滚动，只渲染视窗内 14 行 |
| 聚合计算 | 一次算完（长任务） | 分片算（片间让出主线程） |
| 图片 | 不带尺寸、立即加载 | 带 `width/height` + `loading="lazy"` |
| 滚动回调 | 每个 scroll 逐行读写布局 | rAF 里只读一次、只写一次 |

开关都是独立的：`?opt=1` 表示全开，也可以只开某一项做单项对照（`?virtual=1`、`?prefetch=0`……）。**这个设计本身就是关键**——优化手段必须能单独开关，否则你没法知道到底是哪个改动起了作用。

## 二、第一段：加载——首屏那几跳

### 关键 CSS 内联 + 全量 CSS 异步

首屏真正需要的 CSS 只有几百字节（布局尺寸 + 骨架屏样式），把它内联进 HTML，剩下的整包改成非阻塞：

> 摘自 `./code/perf-lab/pages/spa/optimized.html`（运行：`npm run spa`）

```html
        <!-- 关键 CSS 内联：骨架屏和首屏布局尺寸，省掉一次阻塞首屏的请求 -->
        <style>
            body { margin: 0; font: 14px/1.5 system-ui, 'Microsoft YaHei', sans-serif; color: #1f2328; }
            .app { max-width: 880px; margin: 0 auto; padding: 16px; }
            .top { display: flex; align-items: center; justify-content: space-between; height: 48px; border-bottom: 1px solid #e6e8eb; }
            .sk { background: linear-gradient(90deg, #f1f2f4 25%, #e9eaec 37%, #f1f2f4 63%); background-size: 400% 100%; animation: sk 1.4s ease infinite; border-radius: 6px; }
            @keyframes sk { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
            .sk-nav { display: inline-block; width: 180px; height: 16px; }
            .sk-bar { height: 28px; width: 320px; margin: 12px 0; }
            .sk-row { height: 20px; margin-bottom: 16px; }
            .sk-text { color: #9ca3af; margin: 4px 0 12px; }
        </style>
        <!-- 全量 CSS 改成异步加载：不挡首屏 -->
        <link rel="stylesheet" href="./app.css" media="print" onload="this.media='all'" />
        <!-- modulepreload：把入口依赖提前告诉浏览器，省掉「解析到 app-opt.js 才知道要下 vue」的一跳 -->
        <link rel="modulepreload" href="/vendor/vue.js" />
        <link rel="modulepreload" href="./options.js" />
        <link rel="modulepreload" href="./boot.js" />
```

`media="print"` 那一行看着像 hack，但它就是目前最稳的异步 CSS 写法：`media` 不匹配就不阻塞渲染，加载完再改成 `all`。代价是**全量 CSS 到位前页面是"裸"的**——所以内联的那部分必须包含布局尺寸，否则异步 CSS 一到就会引发位移，等于用 CLS 换 FCP。

`modulepreload` 解决的是另一件事：ESM 的依赖是"解析到才知道"的，`app-opt.js` 不下载完，浏览器不知道它还要 `vue.js`。把这条依赖提前写出来，就能省掉一整跳串行等待。

### 骨架屏是双刃剑

骨架屏写在 HTML 里，JS 没到位就有东西可画。但要注意它带来的**指标假象**：

| 版本 | FCP | LCP | 首屏有内容 | 关键路径 JS | 长任务 | 最长任务 | DOM 节点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 未优化（全量打包 + 空壳） | 508 ms | 508 ms | 247 ms | 10 个 / 152.2 KB | 1 | 214 ms | 10023 |
| 优化后（分割 + 骨架屏） | 224 ms | 336 ms | 94 ms | 7 个 / 149.1 KB | 0 | 0 ms | 99 |

优化版的 LCP（336 ms）落在骨架屏那行"订单数据加载中…"上。**LCP 变好了，但用户那时候还什么都没看到。** 所以骨架屏项目里必须配一个"真实内容渲染完成"的自定义指标，否则你会拿着一个变绿的 LCP 和一个一样慢的体感互相矛盾。

表里真正说明问题的是**首屏有内容**（94 ms vs 247 ms）和**关键路径 JS 数**（7 vs 10）。

### 路由级代码分割

两版入口的差别就是这几行：

> 摘自 `./code/perf-lab/pages/spa/app.js`（运行：`npm run spa`）

```js
/** 未优化入口：三个路由静态引入，首屏一次性下完 */
import { mount } from './boot.js'
import all from './routes-all.js'

mount({
    split: false,
    loaders: {
        list: async () => all.list,
        detail: async () => all.detail,
        about: async () => all.about
    }
})
```

> 摘自 `./code/perf-lab/pages/spa/app-opt.js`（运行：`npm run spa`）

```js
/**
 * 优化入口：路由组件改成动态 import，切到哪个路由才下哪个 chunk
 * 真实项目里这一步是构建工具做的（Vite: () => import('./views/List.vue')），
 * 这里直接写在浏览器里，省掉构建步骤，效果一致
 */
import { mount } from './boot.js'

mount({
    split: true,
    loaders: {
        list: () => import('./routes/list.js'),
        detail: () => import('./routes/detail.js'),
        about: () => import('./routes/about.js')
    }
})
```

**但看体积那两列要冷静**：152.2 KB → 149.1 KB，几乎没省。因为 Vue 运行时本身就 131.5 KB，占了首屏 JS 的九成。**路由级分割省的是业务代码，框架那一大块得靠长期缓存和 CDN 去摊**——这不是"分割没用"，是你量错了指标：分割改善的是"首屏要等几个请求"，不是"首屏总共多少字节"。

## 三、第二段：切路由——分割的代价与预取

分割不是免费的：省下的首屏时间，会在用户切路由的时候连本带利还回去。这段实验给每个资源加了 150 ms 延迟（本机 localhost 是"秒下"，不加这一跳根本测不出差别）：

| 策略 | 首屏关键路径 JS | 首屏 JS 体积 | 切路由耗时 | 切换时才下的 chunk | 会话总 JS |
| --- | --- | --- | --- | --- | --- |
| 全量打包 | 10 个 | 152.2 KB | 69 ms | 0 | 152.2 KB |
| 分割，不预取 | 7 个 | 149.1 KB | 245 ms | 1 | 151.0 KB |
| 分割 + 空闲预取 | 7 个 | 149.1 KB | 80 ms | 0 | 151.8 KB |

**分割不预取就是拿 176 ms 的切换等待换 3 KB 的首屏。** 单独看这一步是亏的。真正让它划算的是第三行——空闲时把没去过的路由悄悄下下来：

> 摘自 `./code/perf-lab/pages/spa/boot.js`（运行：`npm run spa:nav`）

```js
    // 空闲时把没去过的路由预取下来：切过去时不用再等 chunk
    const prefetchOn = split && flag('prefetch', true)
    window.__spa.prefetchOn = prefetchOn
    if (prefetchOn) {
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200))
        idle(async () => {
            for (const name of ROUTES) if (!cache[name]) await load(name)
            window.__spa.prefetched = ROUTES.filter(n => timings[n] !== undefined)
        })
    }
```

预取也不是白拿的：它占的是**空闲带宽和用户的流量**。所以通常只给"大概率会去"的一两个路由做，或者先看一眼网络条件（`navigator.connection.effectiveType === '4g'` 且 `saveData` 为 false）再决定。

判断依据始终是访问概率：**首屏路由和高频路由不该懒加载**，低频的详情页、设置页、图表页才适合拆出去。

## 四、第三段：运行时——长列表与交互

### 排序这一下：渲染 vs 计算

| 组合 | 交互到下一帧 | 实际渲染行数 | 这段新增长任务 | 最长的一个 | DOM 节点 |
| --- | --- | --- | --- | --- | --- |
| 全量渲染 + 同步计算 | 134 ms | 2000 | 1 | 84 ms | 10023 |
| 虚拟滚动 + 同步计算 | 31 ms | 14 | 0 | 0 ms | 95 |
| 虚拟滚动 + 分片计算 | 28 ms | 14 | 0 | 0 ms | 99 |

前两行的差距（134 → 31 ms）几乎全来自虚拟滚动：**不管数据多少，DOM 里始终只有视窗内那十几行**，重排重绘的代价从 O(全量) 变成 O(视窗)。第三行的分片计算在这个数据量下几乎没贡献——因为 2000 条数据的聚合本来就只有几十毫秒。

**这是个重要提醒：分片不是越细越好。** 它的代价是总耗时变长（片间要让出主线程），只有当"算"本身超过 50 ms（长任务阈值）时才值得做。数据量大到上万条，第三行才会明显拉开。

> 摘自 `./code/perf-lab/pages/spa/store.js`（运行：`npm run spa:list`）

```js
/**
 * 分片版：每片 200 条，片与片之间用 MessageChannel 让出主线程
 * 为什么不用 setTimeout(0)：它有 4ms  clamping，片数一多（2000/200=10 片）就白等 40ms
 */
export function sliceAggregate(items, chunk = 200) {
    return new Promise(resolve => {
        let i = 0
        let sum = 0
        let max = 0
        const buckets = {}
        const channel = new MessageChannel()
        const step = () => {
            const end = Math.min(i + chunk, items.length)
            for (; i < end; i++) {
                const price = Number(items[i].price)
                sum += price
                if (price > max) max = price
                buckets[items[i].tag] = (buckets[items[i].tag] || 0) + price
            }
            if (i < items.length) return channel.port2.postMessage(0)
            channel.port2.close()
            const sorted = [...items].sort((a, b) => b.score - a.score)
            resolve({ sum: Math.round(sum), max, buckets, top: sorted.slice(0, 5).map(it => it.name) })
        }
        channel.port1.onmessage = step
        step()
    })
}
```

用 `MessageChannel` 而不是 `setTimeout(0)` 让出主线程，是因为后者嵌套超过 5 层会被钳到 4 ms，10 片就白等 40 ms。

### 滚动：强制同步布局的两种写法

| 滚动回调写法 | 30 屏总耗时 | 这段新增长任务 | 最长的一个 |
| --- | --- | --- | --- |
| 每个 scroll 都逐行读写 | 3985 ms | 1 | 3035 ms |
| rAF 里只读一次、只写一次 | 1007 ms | 0 | 0 ms |

差 4 倍，而且前者有一个 3035 ms 的长任务——**整整三秒主线程没空过**，这段时间里点什么都没反应。

> 摘自 `./code/perf-lab/pages/spa/routes/list.js`（运行：`npm run spa:list`）

```js
        // 全量渲染时滚动的是整个文档：这里的两种写法差别最明显
        // 未节流：每一行都「写完就读」一次 → 2000 行就是 2000 次强制同步布局
        // 节流：一帧只读一次滚动位置，然后只写一次，不逐行读
        function onWindowScroll() {
            if (throttle) {
                if (scheduled) return
                scheduled = true
                requestAnimationFrame(() => {
                    scheduled = false
                    document.documentElement.style.setProperty('--scroll-y', String(window.scrollY))
                })
                return
            }
            for (const el of document.querySelectorAll('.row')) {
                el.style.transform = `translateX(${el.offsetTop % 3}px)`
            }
        }
```

改法不是"少滚几次"，而是**把读和写分开**：读只在一帧开头的 `requestAnimationFrame` 里做一次，写集中到最后，中间不再读。这段代码里"坏"的那一版长得很自然——滚动时给每行算个偏移，谁都会这么写。

### 一个必须说清的口径问题

无头环境里没有真实用户输入，脚本派发的 `click()` 是不可信事件，不产生 `event` 性能条目，**所以真的 INP 测不到**。表里"交互到下一帧"用的是"派发事件 → 第二个 rAF 回调"的耗时，口径和 INP 一致，但不是浏览器上报的那个值。线上 INP 必须靠 RUM 采集。

## 五、第四段：二次访问——缓存

同一个 URL 连开两次（每组都加了 100 ms 延迟）：

| 缓存策略 | 首次 首屏有内容 | 二次 首屏有内容 | 首次 JS 传输 | 二次 JS 传输 | 二次命中缓存的资源 |
| --- | --- | --- | --- | --- | --- |
| 无缓存（对照） | 289 ms | 278 ms | 149.1 KB | 149.1 KB | 0 / 10 |
| HTTP 强缓存 | 266 ms | 122 ms | 149.1 KB | 0 B | 8 / 11 |
| Service Worker | 276 ms | 205 ms | 146.6 KB | 0 B | 9 / 11 |

**HTTP 强缓存这一组收益最实在**：零代码，一个响应头，二次访问从 ~280 ms 到 ~120 ms，传输量归零。

**Service Worker 反而慢一点（205 ms vs 122 ms）**，这个结果值得单独说：SW 要冷启动一个线程，每个请求都要过一遍它的 `fetch` 回调，这笔开销在"只是想让二次访问快一点"的场景里是净亏损。它不是"更快的缓存"，真正的价值在 HTTP 缓存给不了的两件事——**离线可用**，以及**对缓存策略的精确控制**（比如"HTML 走网络优先、JS 走缓存优先"这种按资源分的策略）。

> 摘自 `./code/perf-lab/pages/sw.js`（运行：`npm run spa:cache`）

```js
self.addEventListener('fetch', event => {
    const req = event.request
    const url = new URL(req.url)
    if (req.method !== 'GET' || url.origin !== self.location.origin) return
    if (!SCOPE.test(url.pathname)) return
    event.respondWith(
        caches.match(req).then(hit => {
            if (hit) return hit
            return fetch(req).then(res => {
                const copy = res.clone()
                caches.open(CACHE).then(c => c.put(req, copy))
                return res
            })
        })
    )
})
```

顺序应该是：**先把 HTTP 强缓存配好，再考虑要不要为离线 / 精细控制引入 SW**。反过来做，等于用一整套要维护的逻辑去换一个已经拿到的收益。

两者的前提都是**文件名带内容 hash**：内容变了文件名就变，用户才会去拿新的。否则"缓存生效"和"改了没生效"会变成同一个问题。

做这个实验有个坑值得记下来：HTTP 缓存按 origin 存，而实验台的端口默认是系统分配的（`listen(0)`），**端口每次都变，上一次访问写进磁盘的缓存根本不会被查到**，测出来就是"缓存没生效"的假象。所以缓存场景必须固定端口：

> 摘自 `./code/perf-lab/harness/server.mjs`（运行：`npm run spa:cache`）

```js
        const cacheable = spaCache && /\.(js|css)$/.test(file) && file.includes(`${path.sep}spa${path.sep}`)
        const cache = cacheable ? CACHEABLE : headers
        // spaLatency 给 /spa/ 下的资源统一加一段延迟，模拟真实网络的 RTT
        // 本机 localhost 是「秒下」，不加上这一跳，路由懒加载的代价根本看不出来
        if (spaLatency && file.includes(`${path.sep}spa${path.sep}`)) await sleep(spaLatency)
```

## 六、第五段：闭环——把上面几条变成卡口

做完五段优化，真正的工作才开始：保证三个月后它们还在。这一节给这个 SPA 定一组预算（按闭环篇的方法——从现状出发，不是从理想出发）：

| 指标 | 现状（优化后实测） | 预算 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| 首屏有内容 | 94 ms | ≤ 150 ms | 统计性 | 多轮中位数 + 20% 余量，只拦断崖式劣化 |
| LCP | 336 ms | ≤ 500 ms | 统计性 | 骨架屏会让它偏乐观，必须和上一行一起卡 |
| 关键路径 JS 数 | 7 个 | ≤ 9 个 | 确定性 | 可以卡死：多一个说明有人往首屏塞了静态引入 |
| 首屏 JS 传输 | 149.1 KB | ≤ 180 KB | 确定性 | 可以卡死，按路由分级 |
| 切路由耗时 | 80 ms | ≤ 150 ms | 统计性 | 防止有人把高频路由改成懒加载又不预取 |
| 排序交互到下一帧 | 28 ms | ≤ 100 ms | 统计性 | 长列表回归的哨兵 |
| 长任务个数 | 0 | ≤ 1 | 确定性 | 出现就得看是哪个改动引入的 |

**确定性指标（体积、chunk 数、请求数）卡死，统计性指标（耗时类）用多轮中位数 + 宽松阈值**，只拦断崖式劣化——这条边界在闭环篇里论证过，这里不重复。

有一项必须额外单独卡：**"关键路径 JS 数"**。这一项最容易被业务需求顺手破坏——某个 PR 为了省事把一个组件改成静态引入，其它指标一个都不会报警，但首屏悄悄多了一个请求。

## 七、按 ROI 排一遍

做完之后的顺序感，比手段本身更值钱：

1. **长期缓存（文件名 hash + max-age）** —— 零代码成本，二次访问传输量直接归零，收益最大
2. **虚拟滚动 / 列表裁剪** —— 长列表页面里收益最陡（134 ms → 31 ms），代价是滚动锚定与窗口计算的复杂度
3. **关键 CSS 内联 + 全量 CSS 异步** —— 省一跳阻塞，但要配好布局尺寸，否则用 CLS 换 FCP
4. **路由级分割 + 空闲预取** —— 必须成对做，只做分割是亏的
5. **计算分片** —— 只有"算"真的超过 50 ms 才值得，否则是纯亏
6. **Service Worker** —— 只有需要离线或精细控制时才做；单纯想让二次访问快，它比 HTTP 缓存慢

## 配套代码

本篇示例来自 `code/perf-lab`（本篇需要 `npm install`——唯一的依赖是 Vue 3；其余场景零依赖，需要本机有 Chrome）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/perf-lab/pages/spa/index.html` | 未优化外壳：CSS 外链阻塞 + `#app` 空壳 | 一、二 |
| `./code/perf-lab/pages/spa/optimized.html` | 优化外壳：关键 CSS 内联、CSS 异步、modulepreload、骨架屏 | 一、二 |
| `./code/perf-lab/pages/spa/app.js` | 未优化入口：三个路由静态全量引入 | 二 |
| `./code/perf-lab/pages/spa/app-opt.js` | 优化入口：`() => import()` 动态引入 | 二、三 |
| `./code/perf-lab/pages/spa/boot.js` | 两版共用：hash 路由、组件懒加载、空闲预取、实验驱动 | 三、四 |
| `./code/perf-lab/pages/spa/routes/list.js` | 列表路由：虚拟滚动 + 两种滚动回调写法 | 四 |
| `./code/perf-lab/pages/spa/store.js` | 同步聚合 vs 分片聚合（MessageChannel 让出主线程） | 四 |
| `./code/perf-lab/pages/sw.js` | Service Worker：只缓存 `/spa/` 与 `/vendor/` | 五 |
| `./code/perf-lab/harness/server.mjs` | `spaCache` / `spaLatency` 两个服务端开关 | 三、五 |
| `./code/perf-lab/scenarios/spa.mjs` | 首屏总对照（FCP / LCP / 关键路径 JS / DOM 节点） | 二 |
| `./code/perf-lab/scenarios/spa-nav.mjs` | 切路由三策略：全量 / 分割 / 分割 + 预取 | 三 |
| `./code/perf-lab/scenarios/spa-list.mjs` | 排序交互 + 滚动回调两种写法 | 四 |
| `./code/perf-lab/scenarios/spa-cache.mjs` | 二次访问：无缓存 / HTTP 强缓存 / Service Worker | 五 |
| `./code/perf-lab/README.md` | 全部场景、目录说明与已知取舍 | 全篇 |

运行：在 `code/perf-lab` 目录执行 `npm install`，然后 `npm run spa`、`npm run spa:nav`、`npm run spa:list`、`npm run spa:cache`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[优化手段速查](./优化手段速查.md)
- 下一篇：[监控平台](../监控与稳定性/监控平台.md)
