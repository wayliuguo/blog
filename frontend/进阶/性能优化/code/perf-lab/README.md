# perf-lab · 性能优化配套实验台

零依赖（Node 内置模块 + 本机 Chrome）——唯一的例外是 Vue SPA 闭环实验，它需要一个真的 Vue 3，所以 `vue` 是唯一的运行时依赖。每个场景都是**真跑真测**：起一个本地 HTTP 服务，用无头 Chrome 打开实验页，页面把浏览器真实采集到的指标 POST 回来，Node 侧汇总成表。

```bash
npm start          # 手动浏览：把 pages/ 挂在 http://localhost:5187/
npm run <场景名>    # 跑一个场景，终端出表
npm run list       # 列出全部场景
npm run all        # 依次跑完全部场景（耗时较长）
```

> 需要本机有 Chrome。找不到时用环境变量指定：`CHROME_PATH=/path/to/chrome npm run metrics`

## 一、场景对照表

| npm script | 实验页 | 对照的是什么 | 读哪个数 |
|---|---|---|---|
| `metrics` | `metrics.html` | 轻量首屏 vs 未治理首屏（阻塞脚本 + 大图） | TTFB / FCP / LCP / load + 逐资源字节 |
| `waterfall` | `metrics.html` | 同上，换成资源瀑布视角 | 每根条的起点（何时开始请求）与长度（下载耗时） |
| `cls` | `cls.html` | 图片不留尺寸 + 横幅插顶部 vs 都做了预留 | 累计位移值、位移次数 |
| `block` | `block-naive/defer/bottom.html` | 同一个慢脚本放 head 同步 / head defer / body 末尾 | FCP 与 DOMContentLoaded 之差 |
| `images` | `images.html` | 12 张 200KB 图 全部 eager vs loading="lazy" | 发出的图片请求数、总字节数 |
| `lazy` | `lazy.html` | 路由级代码分割：首屏全量 vs 按需 | **首屏加载到可用**的耗时（总量相同） |
| `coverage` | `coverage.html` | 10 个特性整包引入 vs 只 import 用到的 3 个 | JS 传输字节、请求的 chunk 数 |
| `thrash` | `thrash.html` | 2000 个盒子改宽度：交错读写 vs 集中读写 | 循环耗时、强制同步布局次数 |
| `longtask` | `longtask.html` | 60000 行列表：一次插入 vs 每 6000 行让出 | **最长同步块**、首屏可见耗时 |
| `virtual` | `virtual.html` | 10000 行长列表：全量渲染 vs 虚拟滚动 | DOM 节点数、首屏渲染、一次大跨度滚动 |
| `worker` | `worker.html` | 同一段计算放主线程 vs 放 Web Worker | 最长帧间隔、期间出帧数 |
| `memory` | `memory.html` | 60 轮分配：留引用 vs 可回收 | 堆净增长、峰值堆 |
| `score` | `metrics.html` + `cls.html` | 把实测值套上 Core Web Vitals 区间 | 每个指标的评级与整体结论 |
| `budget` | `metrics.html` | 性能预算卡口 | PASS / FAIL，超线时**退出码 1** |
| `spa` | `spa/index.html` vs `spa/optimized.html` | Vue SPA 首屏：全量打包 + 空壳 vs 分割 + 骨架屏 | FCP / LCP / 首屏有内容 / 关键路径 JS 数 |
| `spa:nav` | 同上 | 切路由：全量打包 vs 分割不预取 vs 分割 + 空闲预取 | 切路由耗时、切换时才下的 chunk 数 |
| `spa:list` | 同上 | 2000 行：全量渲染 + 同步计算 vs 虚拟滚动 + 分片；滚动回调两种写法 | 交互到下一帧、新增长任务、30 屏总耗时 |
| `spa:cache` | `spa/optimized.html` | 二次访问：无缓存 vs HTTP 强缓存 vs Service Worker | 二次的传输字节、命中缓存的资源数 |

## 二、篇目对照表

| 篇 | 用到的场景 | 对应小节 |
|---|---|---|
| 性能指标与评估 | `metrics` `score` `cls` | 指标定义与区间、实验室 vs 现场口径、位移从哪来 |
| 性能测量工具实操 | `waterfall` `memory` `coverage` | 瀑布图怎么读、堆快照对比、已用/总字节 |
| 加载与首屏优化 | `block` `images` `lazy` `metrics` | 关键渲染路径、资源优先级、懒加载的边界 |
| 构建侧优化 | `coverage` `lazy` | 三个层级的按需、代码覆盖率 |
| 运行时性能 | `thrash` `longtask` `virtual` `worker` `memory` | 强制同步布局、长任务与切片、虚拟滚动、Worker 边界、泄漏 |
| 性能优化闭环 | `budget` `score` `metrics` | 预算怎么定、CI 卡口、优化前后指标 |
| 优化手段速查 | 全部 | 每条手段后面挂本节实测的数字 |
| Vue SPA 性能实战 | `spa` `spa:nav` `spa:list` `spa:cache` | 一个页面把加载 / 构建 / 运行时 / 缓存 / 闭环五段串起来 |

## 三、结构

```
perf-lab/
├─ cli.mjs                 命令行入口：node cli.mjs <场景名>
├─ server.js               手动浏览用的静态服务（端口 5187，占用自动 +1）
├─ harness/
│  ├─ server.mjs           实验台服务器：静态下发 pages/ + /asset /slow /bundle /feature /report
│  ├─ chrome.mjs           定位并启动本机无头 Chrome
│  ├─ index.mjs            measure() 跑单页、sweep() 跑多套对照、多轮取中位数
│  └─ table.mjs            中英混排对齐的表格、时间线、单位换算
├─ pages/
│  ├─ lab.js               页面侧：订阅性能条目 + 统一 POST 回实验台
│  ├─ sw.js                SPA 实验用的 Service Worker（缓存 /spa/ 与 /vendor/）
│  ├─ spa/                 Vue SPA 闭环实验：见下方说明
│  └─ *.html               各实验页（每个都以 Lab.finish({...}) 收尾）
└─ scenarios/
   └─ *.mjs                每个场景一个文件，默认导出 run()
```

### `pages/spa/` 是什么

一个真的 Vue 3 单页应用（hash 路由 + 三个路由模块 + 2000 条订单），两版外壳对应两种工程决策：

| 文件 | 角色 |
|---|---|
| `index.html` + `app.js` | 未优化外壳：CSS 外链阻塞、`#app` 空壳、三个路由静态全量引入 |
| `optimized.html` + `app-opt.js` | 优化外壳：关键 CSS 内联 + 骨架屏、全量 CSS 异步加载、路由动态 import |
| `boot.js` | 两版共用：hash 路由、组件懒加载、空闲预取、实验驱动（?act=） |
| `options.js` | 开关：`opt=1` 全开，单个开关（split / virtual / slice / prefetch / throttle / imgopt / sw）可单独覆盖 |
| `routes/list.js` `detail.js` `about.js` | 三个路由组件 |
| `routes-all.js` | 未优化版用：把三个路由静态打进同一张依赖图 |

浏览器里直接跑 ESM，没有构建步骤——服务端把 `node_modules/vue/dist/vue.esm-browser.prod.js` 挂在 `/vendor/vue.js`。真实项目里这一步由 Vite 做（`() => import('./views/List.vue')`），写法和收益一致。

## 四、为什么这么设计（已知取舍）

- **不用 puppeteer**。实验只需要「打开页面 → 页面把数据送回来」这一条链路，用 `spawn` 拉起本机 Chrome + 页面 `fetch('/report')` 就够了，换来的是零依赖。代价是拿不到 CDP 的能力（比如强制 GC、CPU 节流、网络面板录屏），这些留给人开 DevTools 手动做。
- **端口用 0 让系统分配**。`npm run <场景>` 起的服务不写死端口，避免和 `npm start` 的 5187 撞车，也允许几个场景同时跑。唯一的例外是 `spa:cache`：HTTP 缓存按 origin 存，端口每次都变的话上一次访问写进磁盘的缓存根本不会被查到，所以它固定用 5192。
- **限速是必须的**。本机 localhost 传 500KB 只要几毫秒，`lazy` / `metrics` 这类对比在无限速下两个版本读数完全一样。服务器支持 `&kbps=2000`，按带宽分片慢发，把网络差异放大到可比。这是实验台的模拟，不是真实网络测量。
- **多轮取中位数**。每套对照默认跑 3 轮（抖动的场景跑 5 轮），数值逐项取中位，数组类的取最后一轮。单轮结果受机器负载影响很大。
- **共享 Chrome profile**。`harness/chrome.mjs` 复用同一个 `--user-data-dir`，省掉每次启动的初始化开销；副作用是如果上一个 Chrome 没退干净，新的启动可能被转发到旧实例，出现读数串台——所以 `measure()` 每轮结束都会 `kill()` 再进下一轮。
- **`CLS` 读的是「全量位移」不是规范 CLS**。规范口径会剔掉 `hadRecentInput` 为 true 的位移，而无头环境里没有真实输入事件、这个字段却仍是 true，导致规范 CLS 恒为 0。所以上报里 `cls` 是规范口径（真实用户环境用这个）、`clsRaw` 是所有位移之和（无头对照实验用这个）。
- **`memory` 需要 `--enable-precise-memory-info`**。不加这个 flag 时 `performance.memory` 的粒度是 100KB 级，量不出逐轮趋势。
- **INP 在无头环境里测不到真的**。真实 INP 要用户实际输入才会产生 `event` 条目，而脚本 `click()` 派发的是不可信事件，不产生条目。所以 `spa:list` 里的「交互到下一帧」用的是「派发事件 → 第二个 `requestAnimationFrame` 回调」的耗时，口径和 INP 一致，但不是浏览器上报的那个值。无头环境下 `requestAnimationFrame` 的回调节奏不可靠，所以改成量「最长同步块」：在计时块里读一次 `offsetHeight` 强制结算布局，得到的就是主线程真正被独占的时长。这个数比帧间隔稳定得多，也更贴近「用户点了多久没反应」。
