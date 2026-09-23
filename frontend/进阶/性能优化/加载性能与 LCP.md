# 加载性能与 LCP

这一篇服务一个核心目标：**把 LCP 打下来**（p75 ≤ 2.5s）。

LCP 差的时候最容易犯的错，是拿一份「首屏优化 30 条」从头做到尾——做完读数一动不动。原因是 LCP 由四段串起来（TTFB + 资源加载延迟 + 资源加载时长 + 元素渲染延迟），**卡在哪一段，手段完全不重叠**。

所以本篇先给定位方法，再按手段所属的层展开：网络层管「什么时候开始下、以什么优先级下」，构建与产物层管「下多少、多大」，资源层管「下的东西本身合不合适」，感知层管「时间减不到零时怎么改变感受」。每一层都配本仓实验台的实测对照。

## 一、先定位：LCP 卡在哪一段

### 1.1 首屏的三段：等、下、画

把「白屏到能看」这段时间切开，只有三段：

```
1. 等：DNS / TCP / TLS / 服务端处理 ──────────────► 对应 TTFB
2. 下：下载 HTML → 发现资源 → 下载阻塞资源 ────────► 对应资源瀑布里的等待
3. 画：解析 → 样式计算 → 布局 → 绘制 ─────────────► 对应 FCP / LCP 的最后一段
```

三段的优化手段完全不重叠：

| 卡在哪 | 判断依据 | 该做的事 |
| --- | --- | --- |
| 等 | TTFB > 500ms，且后段指标整体被推后 | CDN、缓存命中率、服务端渲染时间、连接复用 |
| 下 | 瀑布图里资源条又长又靠右 | 减少首屏资源、降体积、调优先级、preload |
| 画 | 资源都到了，FCP 仍然很晚 | 减少阻塞渲染的 CSS、避免同步布局与长任务 |

上一篇（总纲与指标量化）的实测里，「未治理首屏」TTFB 只有 160ms（等这一段没问题），LCP 却 4024ms——问题全在「下」。所以这一篇重点放在后两段。

### 1.2 关键渲染路径：谁在挡第一帧

浏览器要画出第一帧，必须先完成「解析 HTML → 构建 DOM → 样式计算 → 布局 → 绘制」。这条链上有三类资源会**卡住**它：

| 资源 | 阻塞什么 | 行为 |
| --- | --- | --- |
| `<script>`（无 defer/async） | 阻塞 HTML 解析 | 遇到就必须停下来下载并执行完，才继续往下解析 |
| `<link rel="stylesheet">` | 阻塞渲染 | 样式表没到，浏览器不敢画（怕画出没有样式的画面） |
| `<img>` / 字体 | 不阻塞渲染 | 但会推迟 LCP / 引发位移 |

最容易搞错的是**动态插入的 `<script>`**：用 `appendChild` 创建的 script 默认 `async`，不影响解析。所以你想演示「阻塞」时用动态插入是无效的——必须写进 HTML（或在解析阶段用 `document.write`）。

> 摘自 `./code/perf-lab/pages/metrics.html`

```js
    if (mode === 'heavy') {
        document.write('<script src="/slow?ms=50&kb=500&kbps=2000&name=vendor.js"><\/script>')
    }
```

`kbps=2000` 让实验台按 2 Mbps 慢发这个 500KB 脚本——本机 localhost 是「秒下」，不限速的话两个版本读数完全一样。实测「未治理首屏」的 FCP 2600ms / LCP 4024ms，其中 2.2 秒就是这个脚本的下载耗时。

同一个脚本换个位置，结果差多少：

> 摘自 `./code/perf-lab/scenarios/block.mjs`（运行：`npm run block`）

```js
    const rows = await sweep('/block-naive.html', [
        { name: 'head 同步', page: '/block-naive.html' },
        { name: 'head defer', page: '/block-defer.html' },
        { name: 'body 末尾', page: '/block-bottom.html' }
    ])
```

```
| 放法       | FCP    | LCP    | DOMContentLoaded | load   | FCP 与 DCL 之差 |
|------------|--------|--------|------------------|--------|-----------------|
| head 同步  | 608 ms | 608 ms | 592 ms           | 593 ms | -16 ms          |
| head defer | 416 ms | 416 ms | 498 ms           | 498 ms | 82 ms           |
| body 末尾  | 444 ms | 444 ms | 528 ms           | 529 ms | 84 ms           |

[head 同步] FCP=608 ms LCP=608 ms
0 ms                    +--------------------------------------------------------+ 593 ms
slow ms=60&kb=8&name=si |                                 #######                | 80 ms
slow ms=200&kb=80&name= |                                 ####################   | 218 ms
/lab.js                 |                                 #                      | 16 ms

[head defer] FCP=416 ms LCP=416 ms
0 ms                    +--------------------------------------------------------+ 498 ms
slow ms=60&kb=8&name=si |                               #########                | 84 ms
slow ms=200&kb=80&name= |                               #########################| 221 ms
```

三个结论，按重要性排：

1. **head 同步最贵**：FCP 608ms，比 defer 多了 192ms——正好是脚本的下载 + 执行时间，被整段算进了首屏。
2. **defer 与 body 末尾对首屏几乎等价**（416ms vs 444ms），都是「不挡解析」。但 `DOMContentLoaded` 有差别：defer 的脚本在 DCL 之前跑完，body 末尾的也在 DCL 之前，两者相近。真正的选择依据是**执行时机**：defer 保证按顺序、且在 DOM 解析完立刻执行；body 末尾则是解析到那里就执行。
3. **`async` 是第三种选择**：不保证顺序、下载完立刻执行。适合独立无依赖的统计脚本，不适合有依赖关系的业务代码。

现在再回头看「FCP 与 DCL 之差」这个指标：head defer 版差 82ms，说明首屏画出来之后还有 82ms 的解析/执行工作。这个数大，意味着「看得见但点不动」，该去查 TBT 了。

## 二、网络层：让资源在对的时刻、以对的优先级到达

这一层不改变资源本身，只改变「什么时候开始下」和「浏览器有多重视它」。

浏览器给资源分优先级，默认策略大致是：

| 优先级 | 典型资源 |
| --- | --- |
| Highest | HTML、`<head>` 里的同步 script、首屏 CSS |
| High | CSS、`fetchpriority="high"` 的资源、字体（同源） |
| Medium | 图片、`defer` script、`fetchpriority="auto"` |
| Low | `async` script、非首屏图片、`loading="lazy"` |
| Lowest | `prefetch` 的资源 |

这张表解释了 `defer` 为什么有用——它把脚本从 Highest 降到 Medium，不再和 HTML/CSS 抢连接。

四个「提前」指令的分工常被混淆：

| 指令 | 它做的事 | 用在哪 |
| --- | --- | --- |
| `preconnect` | 提前走完 DNS + TCP + TLS | 同一个域名后面还要发多个请求（CDN） |
| `dns-prefetch` | 只解析 DNS | 第三方域，收益小、开销也小 |
| `preload` | 以高优先级现在就下这个资源 | 关键路径上、但浏览器发现得晚的资源（字体、CSS 里引用的首屏大图） |
| `prefetch` | 空闲时下「下一个页面要用」的资源 | 高概率、小体积的下一页 |

后两个的作用都是「改变开始下载的时刻」，不改变资源本身的体积——所以它们只解决「发现得晚」，不解决「太大」。

`preload` 最容易用错，两个反例值得记住：

- **preload 了但页面在几秒内根本不用**：它会把带宽从真正首屏需要的资源上抢走，反而让 LCP 变差。preload 只该给「关键渲染路径上、且浏览器发现得晚」的资源——字体和 CSS 里引用的首屏大图是典型场景。
- **`as` 写错**：`as="font"` 的资源必须带 `crossorigin`，否则会因为「证书模式不匹配」被下载两次。`as` 的值还决定了优先级，写错就等于没 preload。

还有个更省事的现代做法：给首屏图片直接标 `fetchpriority="high"`，比给整条链路加 preload 更容易维护。

## 三、构建与产物层：把产物做得更少、更小、更合适

这一层管的是打包产物——首屏到底要下多少东西、多大、以什么形态传输。它改善的是 LCP 里「资源加载时长」那一段。

「首屏必须带上所有路由的代码」是最常见的浪费。把路由改成动态 `import()`，首屏就只带当前路由。但收益和代价都不是想当然的，实测一下（实验台按 1.5 Mbps 限速）：

> 摘自 `./code/perf-lab/pages/lazy.html`

```js
    const KBPS = 1500 // 实验台把这个值当带宽，按 1.5 Mbps 分片慢发，否则本机「秒下」看不出差别

    async function eager() {
        // 全量引入：首屏就把整包拉下来（用 /bundle 端点模拟三个路由合成一个 chunk）
        await import(`/bundle?n=3&kbEach=120&kbps=${KBPS}&name=app`)
        const firstScreen = Math.round(performance.now() - started)
        // 之后依次访问三个路由：eager 版本不再产生任何新的网络请求
        for (const route of ['1', '2', '3']) view.textContent = '路由 ' + route + ' 就绪（首屏已全量加载）'
        return firstScreen
    }
```

按需那一版只加载当前路由，切到哪个才 `import` 哪个：

> 摘自 `./code/perf-lab/pages/lazy.html`

```js
    async function lazy() {
        // 按需引入：首屏只加载当前路由，切到哪个才 import 哪个
        const loaded = new Set()
        async function goto(route) {
            if (!loaded.has(route)) {
                await import(`/feature?i=${route}&kbEach=120&kbps=${KBPS}`)
                loaded.add(route)
            }
            view.textContent = '路由 ' + route + ' 就绪（已加载 ' + loaded.size + ' 个 chunk）'
        }
        await goto('1')
        const firstScreen = Math.round(performance.now() - started)
        await goto('2')
        await goto('3')
        return firstScreen
    }
```

两个版本最终都访问了三个路由，所以**总下载量是一样的**——差别只在首屏：

```
| 策略     | 首屏加载到可用 | 发出的 chunk 数 | JS 传输总量 |
|----------|----------------|-----------------|-------------|
| 首屏全量 | 2069 ms        | 1               | 347.6 KB    |
| 按需加载 | 767 ms         | 3               | 348.2 KB    |
```

首屏从 2069ms 降到 767ms，总字节数几乎不变（347.6KB vs 348.2KB，多出来的 0.6KB 是三个 chunk 各自的头部开销）。**这就是代码分割的全部价值：把「什么时候下」从首屏挪到真正需要时。**

所以取舍很清楚，判断依据是这个路由的访问概率：

- **不该懒加载**：首屏路由、高频路由。懒加载它们等于给用户加了一次额外等待。
- **适合懒加载**：低频的详情页、设置页、图表页、管理后台里的次要模块。
- **必须配 loading 兜底**：懒加载带来了网络等待，没有 loading 态就是「点了没反应」。

实测里的 /bundle 与 /feature 端点用同一份体积填充，用来保证两次实验的字节数可比：

> 摘自 `./code/perf-lab/harness/server.mjs`

```js
/** 一个「特性模块」：导出函数 + 指定体积的填充，模拟打包产物里的一个 chunk */
function feature(index, kb) {
    const rows = Math.max(1, Math.round((kb * 1024) / 84))
    const pad = `    /* ${'x'.repeat(70)} */\n`.repeat(rows)
    return `export function f${index}() {\n${pad}    return ${index}\n}\n`
}
```

tree-shaking 的前提是**静态可分析**：打包器要在不执行代码的前提下，判断某个导出有没有被引用。这带来三条硬规则：

1. **必须用 ESM**（`import` / `export`）。CJS 的 `require` 是运行时求值，打包器无法静态判断，只能整个保留。
2. **不能被副作用绑住**。如果一个模块里有顶层副作用（改全局变量、注册 polyfill），打包器不敢删——所以库作者要标 `"sideEffects": false`（或在 `package.json` 里列出真有副作用的文件）。
3. **访问方式要静态**。`import { a } from 'pkg'` 可摇；`import * as pkg` 后用 `pkg[someVar]` 动态取值，摇不掉。

一个常见误区：**tree-shaking 只作用在「没有引用的导出」上，不作用在「引用了但没执行到的分支」上**。`if (false) { heavy() }` 里的 `heavy` 仍然会被打进去（除非压缩器能证明它没有副作用）。真正的按需，要靠第三层手段。

同样 10 个特性、每个 5KB，但页面只用 3 个。整包引入和只 `import` 用到的，差多少：

> 摘自 `./code/perf-lab/pages/coverage.html`

```js
        const work = Lab.time(async () => {
            if (mode === 'full') {
                // 全量：一个 chunk 里塞 10 个特性
                const mod = await import('/bundle?n=' + FEATURES + '&kbEach=5&name=vendor')
                return USED.map(i => mod['f' + i]).filter(Boolean).length
            }
            // 按需：只 import 用到的 3 个特性，各自是一个 chunk
            const mods = await Promise.all(USED.map(i => import('/feature?i=' + i + '&kbEach=5')))
            return mods.length
        })
```

```
| 引入方式 | 请求的 chunk 数 | 实际拿到的特性 | JS 传输字节 | 加载耗时 |
|----------|-----------------|----------------|-------------|----------|
| 整包引入 | 1               | 3 / 3          | 52.6 KB     | 1 ms     |
| 按需引入 | 3               | 3 / 3          | 19.1 KB     | 1 ms     |
```

52.6KB → 19.1KB，砍掉 63%。**剩下那 33.5KB 就是「代码覆盖率」在说的东西**——DevTools Coverage 面板上那块红色。

三个层级的按需，从粗到细：

1. **入口级**：路由懒加载（上一节）。
2. **模块级**：把 `import()` 写进函数体、只在真正用到时才求值。同时保证库侧 `sideEffects` 配置正确，让没被引用的导出能摇掉。
3. **依赖级**：这是收益最大也最常被忽略的一层。

依赖级的做法具体到几种：

- **组件库按需引入**：不要 `import { Button, Table, Form } from 'ui-lib'` 然后再靠 tree-shaking（很多组件库做不到），而是用配套的按需插件，或直接引到子路径 `import Button from 'ui-lib/button'`。
- **换更小的替代**：`moment` → `dayjs`（体积差 10 倍以上）、`lodash` → `lodash-es` 配合按需、`axios` 在简单场景下换成 `fetch` 封装。
- **按需引入 polyfill**：不要整包 `core-js`，交给 `browserslist` + `useBuiltIns: 'usage'` 按实际用到的 API 和实际要支持的浏览器注入。
- **日期与国际化数据**：`moment` 的 locale、`echarts` 的地图数据这类「附属包」往往比主包还大，要按需注册。

体积砍到不能再砍之后，还有三层可做：

**第一层：代码压缩。** 生产构建默认会做，但有几个开关值得确认：

- **`drop_console` / `pure_funcs`**：去掉 `console` 与开发期调试函数，注意别把 `console.error` 也删了（监控上报要靠它）。
- **`mangle` 与 `toplevel`**：变量名混淆，`toplevel` 打开才能混淆顶层作用域的名称。
- **属性名混淆要谨慎**：会破坏 `obj['key']` 这种动态访问，也会影响上报字段名。

**第二层：传输压缩。** 这是「白捡」的收益，配置代价极低：

| 算法 | 典型压缩率（JS） | 说明 |
| --- | --- | --- |
| gzip | ~70% | 兼容性最好，必开 |
| brotli | 比 gzip 再小 15%~20% | 现代浏览器全支持，静态资源优先 |

注意两点：**只对文本类资源有效**（图片、字体、视频已经是二进制，压不动）；**压缩级别影响构建时间**，静态资源预压缩用高等级，动态压缩用低等级。

**第三层：产物形态。**

- **现代语法产物**：默认产出 ES2017+ 的代码，靠 `browserslist` 决定要不要降级。把目标定得越老，产物里的语法降级与 polyfill 越多、体积越大。分两份产物（modern / legacy）能做，但收益递减、维护成本不低，多数项目不值得。
- **sourcemap 策略**：**绝不要把 sourcemap 部署到线上静态目录**——它等于把源码公开。正确做法是构建时产出、上传到监控平台（供错误反解），线上只留 `.map` 的 URL 声明或干脆用 `hidden-source-map`。
- **chunk 划分粒度**：把「不常变」的依赖单独拆成 vendor chunk，可以显著提升缓存命中率。但拆得太碎会让请求数暴涨（HTTP/2 下影响较小，HTTP/1.1 下很致命），要按项目实际协议版本权衡。
- **文件名带内容哈希**：`app.[contenthash].js` + 长缓存，配合 vendor 拆分，才能让用户只更新真正变了的那部分。

构建侧的改动最容易「看着有道理但没效果」，所以每次改完都要回到指标：

1. **产物体积对比**：构建输出里每个 chunk 的 gzip 后大小，改动前后 diff。这一步能立刻发现「拆了但总大小没变」或「按需引入了但插件没生效」。
2. **Coverage 面板复核**：红色区域有没有真的变小。**插件没配好时，代码依然在包里**，体积对比是唯一能发现的证据。
3. **首屏资源清单**：首屏实际请求的 chunk 数与字节数（`npm run coverage` / `npm run lazy` 给的就是这个数）。
4. **真实指标回归**：LCP / FCP 有没有变好，回归到「性能优化闭环」篇的预算卡口上。

## 四、资源层：图片、字体与关键 CSS

这一层管资源本身合不合适——首屏最大的那块通常是图片，最容易被忽略的是字体。

图片通常是首屏最大的单块资源，也是最容易见效的地方。三层手段从粗到细：

**第一层：尺寸与格式。** 先保证不给浏览器制造位移——写死 `width` / `height`（或用 `aspect-ratio`）。格式上，照片类用 WebP/AVIF（同画质下比 JPEG 小 25%~50%），图标用 SVG，动图考虑视频。

**第二层：响应式。** 用 `srcset` + `sizes` 让浏览器按视口和 DPR 挑尺寸，别把 2400px 的大图发给手机。

**第三层：懒加载。** `loading="lazy"` 让首屏外的图片延后加载。但它的收益边界很容易被误解——实测一下：

> 摘自 `./code/perf-lab/pages/images.html`

```js
    for (let i = 0; i < 12; i++) {
        const img = document.createElement('img')
        // 宽高都写死：不会因为图片晚到而发生位移
        img.width = 640
        img.height = 240
        img.src = `/slow?ms=40&kb=200&name=shot${i}.svg`
        // 首屏之外的交给浏览器按需加载
        if (mode === 'lazy' && i > 0) img.loading = 'lazy'
        wrap.appendChild(img)
    }
```

```
| 策略        | 发出图片请求 | 图片字节 | 已解码  | LCP    | load   |
|-------------|--------------|----------|---------|--------|--------|
| 全部 eager  | 12 / 12      | 2.35 MB  | 12 / 12 | 540 ms | 527 ms |
| 首屏外 lazy | 8 / 12       | 1.57 MB  | 8 / 12  | 540 ms | 532 ms |
```

12 张 200KB 的图，理论上「首屏外懒加载」应该只下第一张，实际下了 8 张。原因是 **`loading="lazy"` 有约 1250px 的预加载距离**——视口外的图片只要落在这个范围内就会开始请求。所以它的真正收益不是「一张都不多下」，而是「**远离首屏的那几张不会来抢带宽**」：2.35MB → 1.57MB，省掉 33%。

同时注意 LCP 一模一样（540ms）——因为 LCP 元素是第一屏那张，两种策略都要下它。**懒加载不会改善首屏，它改善的是首屏之后的带宽竞争。**

还有两个细节：

- 首屏那张图**千万别加 `loading="lazy"`**：它会变成 Low 优先级，LCP 直接变差。
- 配合 `fetchpriority="high"` 明确告诉浏览器「这张最重要」，比靠默认策略更稳。

**关键 CSS（Critical CSS）**：首屏样式内联进 `<head>`，其余样式用 `media="print"` + `onload` 或 JS 异步加载。这样第一帧不必等外部 CSS 下载完。代价是要维护「哪些样式属于首屏」这份清单，页面一改就可能遗漏。

**字体**是首屏里最容易被忽略的一块。默认行为 `font-display: auto` 在字体没到时会有最长 3 秒的**不可见期**——文字位置留着、但不显示，用户盯着空白看。

| 取值 | 行为 | 适用 |
| --- | --- | --- |
| `block` | 最长 3s 不可见期，然后换字体 | 几乎不用 |
| `swap` | 立刻用回退字体显示，字体到了再换 | 正文首选（会有一次跳变） |
| `fallback` | 极短不可见期（~100ms），之后用回退字体直到字体到达 | 平衡选择 |
| `optional` | 视为可选，网络不好就不用了 | 首屏体验优先 |

配 `swap` 时记得选一个**度量接近**的回退字体（`size-adjust` / `ascent-override` 可以精细调整），否则换字体那一下的文字重排会变成一次 CLS。

## 五、感知层：时间减不到零，就改变感受

前四层都在减少时间。这一层反过来：时间已经减不动的时候，改变用户对这段时间的感受。

前面五节都在减少「等」的时间，这一节反过来：时间减不到零，就该改变用户的感受。

- **SSR / SSG**：服务端先给出带内容的 HTML，用户立刻看到内容，JS 到了再「注水」（hydrate）接管交互。收益是首屏内容提前，代价是 TTFB 上升、以及 hydration 阶段的「看得见点不动」。
- **骨架屏**：结构先出来、内容后填。它不减少任何时间，但把「白屏」换成「有结构」，主观等待感大幅下降。注意骨架必须和真实内容**结构一致**，否则填内容时又是一次大位移。
- **流式渲染 / 分块传输**：HTML 一边生成一边发给浏览器，浏览器边收边渲染。首字节到得极早，骨架和上半屏能比整体完成早很多出现。
- **预取下一个页面**：用户还在一屏浏览时，提前把最可能去的下一页资源拉下来。代价是可能白下，所以只对「高概率、体积小」的目标做。

这几种手段都不改变 LCP 的定义（LCP 仍然是「最大内容元素渲染」），但它们改变 LCP 元素**是什么**：SSR/流式把 LCP 元素从「JS 渲染出来的内容」变成「HTML 里的内容」，于是 LCP 可以早到 TTFB 附近。

## 配套代码

本篇示例来自 `code/perf-lab`（零依赖，需要本机有 Chrome；不需要 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/perf-lab/pages/block-naive.html` | head 同步脚本（阻塞解析的反面写法） | 一 |
| `./code/perf-lab/pages/block-defer.html` | head defer 脚本 | 一 |
| `./code/perf-lab/pages/block-bottom.html` | body 末尾脚本 | 一 |
| `./code/perf-lab/pages/metrics.html` | 用 `document.write` 插入阻塞脚本的重模式对照页 | 一 |
| `./code/perf-lab/pages/images.html` | 12 张 200KB 图，eager 与 `loading="lazy"` 对照 | 四 |
| `./code/perf-lab/pages/lazy.html` | 路由级代码分割：首屏全量 vs 按需加载 | 三 |
| `./code/perf-lab/pages/coverage.html` | 整包引入 vs 按需引入的字节数对照 | 三 |
| `./code/perf-lab/scenarios/block.mjs` | 三种放法的 FCP / DCL 与时间线 | 一 |
| `./code/perf-lab/scenarios/images.mjs` | 图片请求数、字节数与解码数对照 | 四 |
| `./code/perf-lab/scenarios/lazy.mjs` | 路由级代码分割的首屏可用时间对照 | 三 |
| `./code/perf-lab/scenarios/coverage.mjs` | 请求 chunk 数、JS 传输字节对照 | 三 |
| `./code/perf-lab/harness/server.mjs` | `/slow` 延迟响应 + `kbps` 带宽限速 + `/bundle` 与 `/feature` 端点 | 一、三 |
| `./code/perf-lab/README.md` | 全部实验场景与已知取舍 | 全篇 |

启动方式：在 `code/perf-lab` 目录执行 `npm run block`（或 `npm run images` / `npm run lazy` / `npm run coverage` / `npm run metrics`）；`npm start` 可用真浏览器手动对照。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[性能优化总纲与指标量化](./性能优化总纲与指标量化.md)
- 下一篇：[交互性能与 INP](./交互性能与%20INP.md)
