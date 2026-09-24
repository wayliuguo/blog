# perf-lab · 性能优化配套实验台

**两个完全独立的项目：`apps/before` 是「优化前」，`apps/after` 是「优化后」，各自持有一份完整源码，二者不共享任何文件。** 两个都是标准的 vite + vue 生产工程：单入口 `index.html`、样式走依赖图、`vite build` 出真实产物、`vite preview` 看打包后的页面。每一层（加载层 LCP / 运行层 INP / 视觉层 CLS）的优化都落在**源码写法与构建配置**上：before 用未优化的写法，after 用优化后的写法。没有共享源码、没有 `@lab` 别名、没有实验开关、没有 `?act=` 驱动——想看某一层的差异，把两个项目都构建出来对照即可。

**不依赖任何命令行测量工具，也不依赖本机 Chrome 自动化。** 页面自己会订阅真实性能条目，把实测打到浏览器 console（`[perf-lab] 本次实测` 那一条）；各实验（聚合 / 重渲染 / 公告位 / 字体 / 动画）被触发时还会各打一条 `[perf-lab] ×× 对照`。读者开 DevTools 看 console、看 Network、看 Performance 面板就能得到全部读数。

```bash
npm install              # 一次装好两个项目（npm workspaces）；运行时依赖只有 vue

npm run build            # 分别构建两套真实产物：dist-before/ 与 dist-after/（看实验前先跑这个）
npm run preview:before   # 优化后产物起在 http://localhost:5187/（vite preview）
npm run preview:after    # 优化后产物起在 http://localhost:5193/（vite preview）

npm run dev:before       # 源码模式（改代码随手看效果用）：http://localhost:5177/
npm run dev:after        # 同上：http://localhost:5197/
```

**看实验用 `build` + `preview`**：本实验台比的就是「构建产物的形态」——chunk 怎么切、HTML 里注入了什么、CSS 链接是不是阻塞，这些只在产物里成立。dev 模式每个文件都带 HMR 开销、按模块分发，字节数与关键路径都失真。构建产物不入库（`.gitignore` 已排除），只留源码。dev 与 preview 端口故意错开（5177/5197 vs 5187/5193），可以同时开着改代码。

## 一、按层级的优化对照表

每一行就是一层：before 项目里是左边的实现，after 项目里是右边的实现，读者构建并预览两个项目、打开对应页面自行对照。

| 层 | 页面 | before（优化前） | after（优化后） | 看哪里 |
|---|---|---|---|---|
| 加载 · HTML 入口 | 首屏 | 空壳 `#app`，构建注入的全量 CSS `<link>` 阻塞首屏 | 关键 CSS 内联 + 骨架屏；构建插件 `htmlAsyncCss` 把 CSS 改成异步 | 看 dist 里两个 `index.html` 的差别；开首页看首帧 |
| 加载 · 构建层 | 首屏 / 切路由 | 五视图静态 import，全部打进一个 bundle | 动态 `import()` 拆出 5 个视图 chunk + 空闲预取 | `npm run build` 日志看 chunk 数；切路由看 Network |
| 加载 · 渲染节奏 | 仪表盘 | 22 张卡一次性同步渲染 | 首屏 10 张、其余 `requestIdleCallback` 分批补齐 | 打开仪表盘，console `[perf-lab] 仪表盘对照` |
| 加载 · 资源层 | 详情页 | 图集 12 张全部立即加载 | 首屏外 11 张 `loading="lazy"` | Network 面板图片请求数（配 Slow 3G 看 LCP） |
| 加载 · 缓存 | 二次访问 | 与 after 相同：内容 hash + 强缓存 | 同左 | 二次加载 `transferSize`≈0（Network「from cache」） |
| 运行 · 聚合 | 列表页 | 同步 `heavyAggregate` 一次干完 | `Worker` 计算（分片版 `sliceAggregate` 在 store.js 备用） | 点「跑一次全量聚合」，console `[perf-lab] 聚合对照` |
| 运行 · 滚动 | 列表页 | 全量渲染 2000 行 + 每个 scroll 事件逐行读写 | 虚拟滚动（14 行）+ rAF 合帧 | 滚动时 Performance 面板看长任务；console `domNodes` |
| 运行 · 重渲染 | 列表页 | 行 key 用下标 + 无关状态穿透进每行 | 行 key 用稳定 id + 状态下沉到独立组件 | 点「在头部插入一条」「改一次无关的状态」，console `[perf-lab] 重渲染对照` |
| 运行 · 内存 | 内存页 | 每轮数组挂在 `window` 上留引用 | 结果不留在全局，可回收 | 带 `--enable-precise-memory-info` 开两个 memory.html 比增长量 |
| 视觉 · 主图 | 详情页 | 主图不带 `width/height` | 带 `width/height` 预留 + `decoding="async"` | Slow 3G 下打开详情页，console `metrics.cls` |
| 视觉 · 公告位 | 列表页 | 公告位不预留，晚到公告顶下去 | `min-height: 240px` 先预留 | 打开列表页等 300ms，console `[perf-lab] 公告位对照` |
| 视觉 · 字体 | 详情页 | 回退字体未校准度量 | `size-adjust: 118%` 对齐度量 | 打开详情页等 800ms，console `[perf-lab] 字体对照` |
| 视觉 · 动画 | 详情页 | 展开面板写 `top`（布局属性） | 写 `transform`（合成属性） | 点「展开面板」，Performance 面板看每帧布局 |

## 二、结构

```
perf-lab/
├─ package.json            根：npm workspaces（apps/*）+ 全部 scripts
├─ apps/
│  ├─ before/              优化前项目（自包含，标准 vite + vue 生产工程）
│  │  ├─ vite.config.mjs   入口 index.html + memory.html，产物 dist-before/
│  │  ├─ index.html        空壳 #app —— CSS 由构建注入 <link> 阻塞首屏，无骨架屏
│  │  ├─ memory.html / memory.js   内存实验独立页（本版：留引用）
│  │  ├─ src/
│  │  │  ├─ main.js        import 全量 CSS + vue-router 静态路由表，五视图全量进主 bundle
│  │  │  ├─ assets/main.css  全量样式（构建时被抽成 assets/index-*.css）
│  │  │  ├─ App.vue        router-view + keep-alive + 读数上报（无分割、无预取）
│  │  │  ├─ lib/           store.js（同步聚合）/ report-engine.js / chart.js
│  │  │  └─ views/         DashboardView（22 卡同步渲染）/ ListView（全量渲染 + 同步聚合 + 无节流）/ DetailView / ReportView / AboutView
│  │  └─ public/           lab.js / lab-assets/
│  └─ after/               优化后项目（自包含，标准 vite + vue 生产工程 + 一个构建插件）
│     ├─ vite.config.mjs   htmlAsyncCss 插件：构建期把 CSS <link> 改写成异步
│     ├─ index.html        关键 CSS 内联 + 骨架屏（全量 CSS 走依赖图）
│     ├─ memory.html / memory.js   内存实验独立页（本版：可回收）
│     ├─ src/
│     │  ├─ main.js        import 全量 CSS + () => import('./views/X.vue')，rollup 拆出五个视图 chunk
│     │  ├─ assets/main.css  全量样式（构建时被抽成 assets/index-*.css，再被插件改异步）
│     │  ├─ App.vue        hash 路由 + 空闲预取 + 读数上报
│     │  ├─ lib/           store.js（同步 + MessageChannel 分片）/ agg-worker.js / report-engine.js / chart.js
│     │  └─ views/         DashboardView（idle 分批渲染）/ ListView（虚拟滚动 + rAF + Worker）/ DetailView（尺寸预留 + 懒加载）/ ReportView / AboutView
│     └─ public/           lab.js / lab-assets/
├─ dist-before/            构建产物（gitignore，npm run build 生成）
└─ dist-after/             同上
```

源码里没有一行「为了凑差异」的假代码：`report-engine.js` 是 36 个指标 + 6 个维度 + 透视 / 异常检测 / 导出的真实现（构建后自己就是一块独立 chunk），`chart.js` 是仪表盘走势卡的真实渲染模块——路由级分割的收益本来就等于「被拆出去那部分有多大 × 它上首屏的概率有多低」。

## 三、读数口径（两个项目的 lab.js 相同）

- 页面加载结束会打印一条 `[perf-lab] 本次实测`：`metrics` 是 FP / FCP / LCP / CLS / longtask 这些标准指标，`resources` 是每个文件的 `transferSize`，`extra` 是首屏关键路径字节（`criticalBytes` / `criticalJs`）与 DOM 节点数。
- 各实验被触发时另打一条 `[perf-lab] ×× 对照`：聚合（`impl` / `mainThreadMs`）、重渲染（`key` / `sink` / `renders`）、公告位（`reserved` / `pushed`）、字体（`sizeAdjust` / `deltaH` / `advanceBefore→After`）、动画（`prop` / `frameMs`）、仪表盘（`impl` / `firstBatchMs`）。
- **CLS 上报到小数点后四位**，口径分 `cls`（规范，剔掉用户输入 500ms 内的预期位移）与 `clsRaw`（所有位移之和，对照实验看这个）。
- **INP 用「最长同步块」近似**：脚本 `click()` 派发的是不可信事件，量的是「计时块里强制结算布局后主线程被独占的时长」，不等于浏览器上报的 INP。
- **限速靠 DevTools，不靠本地服务**：本机 localhost 传 500 KB 只要几毫秒，想看明显的 LCP / CLS 差，在 DevTools → Network 开 **Slow 3G** 再对比。
- **数值因机器负载波动，关注差值方向**：没有自动化多轮取中位数，结论落在「before → after 哪个数变了」的方向上。

## 四、已知取舍

- **两个项目各自独立构建，绝不合在一次构建里**。多入口一起构建时 rollup 会把共用模块提到公共 chunk，优化前那份就不再是「一个 bundle 全量包含」的干净基线，对比直接不成立。
- **源码复制成两份，而不是共享**。共享源码 + 开关可以做「只改一项」的精细对照，但两套开关系统让代码一直背着实验脚手架；这里的取舍是**按层级做成两种实现**，读者启动两个项目看整体差异，实现本身保持各自干净。
- **after 的构建插件只有一个、且是真实生产会写的那种**。`htmlAsyncCss`（CSS 链接改异步）对应的是真实工程里的 critical-css 类插件；骨架屏与关键 CSS 内联直接写在 `index.html` 源码里，同样是真实项目的主流做法。不为对照额外发明机制。
- **测量能力长在页面里，不靠外部工具**。浏览器原生 `PerformanceObserver` 订阅 paint / LCP / layout-shift / longtask，`performance.getEntriesByType('resource')` 直接给每个文件的 `transferSize`。
- **图片是提交的静态 SVG**（`public/lab-assets/`，两个项目各一份），不走任何动态端点。hero ≈ 50KB、每张 shot ≈ 21KB，概念比例不变。
- **`memory` 需要 `--enable-precise-memory-info`**。不加这个 flag，`performance.memory` 的粒度是 100 KB 级，量不出逐轮趋势。该实验不在 SPA 里，是每个项目下一张独立的 `memory.html`，用带 flag 的 Chrome 分别打开对照。
