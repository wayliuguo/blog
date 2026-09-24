# perf-lab · 性能优化配套实验台

**两个独立工程，一份共享源码。** `apps/before` 是「优化前」（`raw.html`：CSS 外链阻塞 + `#app` 空壳 + 静态 `import` 全部视图），`apps/after` 是「优化后」（`index.html`：关键 CSS 内联 + 骨架屏 + 动态 `import()`）。业务组件与逻辑只有一份，放在 `shared/`，两个工程都用 `@lab` 别名引入。

**不依赖任何命令行测量工具，也不依赖本机 Chrome 自动化。** 直接打开两个版本对比即可：页面自己会订阅真实性能条目，把实测打到浏览器 console（`[perf-lab] 本次实测` 那一条）。读者开 DevTools 看 console、看 Network、看 Performance 面板就能得到全部读数。

```bash
npm install              # 一次装好两个工程（npm workspaces）；运行时依赖只有 vue

npm run dev:before       # 优化前：http://localhost:5187/raw.html
npm run dev:after        # 优化后：http://localhost:5193/index.html
npm run build            # 分别构建两套产物：dist-before/ 与 dist-after/
npm run preview:before   # 用构建产物起服务（更接近线上，推荐做字节/缓存对比）
npm run preview:after    # 同上，优化后
```

`build` 与「看实验」是两件事：想看**首屏字节 / 二次访问缓存**，用 `preview` 起构建产物最准（dev 模式每个文件都带 HMR 开销，字节数失真）。跑实验前必须先 `build`。构建产物不入库（`.gitignore` 已排除），只留源码。

## 一、实验对照表（全部手动，开 before / after 对比）

十二个实验分两层对照：**八个基础 case**（同一个开关在 before / after 下行为不同）和**四个页面内手动对照**（读数本身是同一次加载里的前后差值，做成面板由页面自演）。两类都在 `npm run dev:after` / `dev:before` 打开的页面里读，只是取证方式不同。

| 层 | `?act=` / 路由 | 对照变量（before → after） | 打开哪个 URL（after 端口 5193，before 端口 5187） | 看哪里 |
|---|---|---|---|---|
| 加载 | `spa` | 静态 import 全量 bundle → 动态 import 拆 chunk | 两个都开 `#/list` | console `jsBytes` / `criticalBytes`（或在 build 日志里看 raw vs optimized 两个主包） |
| 加载 | `nav` | 静态路由（切即全在）/ 路由级分割 + 空闲预取 | `index.html?act=nav#/list`（点「详情」也行） | console `navMs` / `navChunks` |
| 加载 | `cache` | 内容 hash + 长缓存 | 两个都开 `#/list`，加载一次再刷新 | 二次加载 console `jsBytes`≈0，或 Network 面板「from cache」 |
| 加载 | `images` | 首屏外图 `loading="lazy"` 开 / 关 | `index.html?gallery=1&lazy=1#/detail/1`（lazy=0 对照；before 用 `raw.html`） | Network 面板图片请求数；**LCP 需在 DevTools 开 Slow 3G** 后看 console `metrics.lcp` |
| 运行 | `agg` | 同步聚合 / MessageChannel 分片 / Worker | `index.html?act=agg#/report`（或点聚合按钮） | console `aggMs` / `newTasks` / `longestTask` |
| 运行 | `scroll` | 全量 / rAF 节流 / 虚拟滚动 | `index.html?act=scroll#/list`（连滚 30 帧） | console `scrollMs` / `domNodes` / `longestTask` |
| 运行 | `memory` | 留引用（泄漏）/ 可回收（独立页） | `memory.html?mode=clean` 与 `?mode=leak`（在 5187 上） | 页面正文 + console `growth`（**需 `--enable-precise-memory-info` 起 Chrome**） |
| 视觉 | `cls` | 主图带 / 不带 `width/height` | `index.html?act=cls#/detail/1`（before 默认不带） | console `cls` / `clsRaw` |
| 视觉 | `rerender` | 列表 key 用下标 / 稳定 id；无关状态留父 / 下沉 | `index.html?act=rerender&key=idx&sink=0#/list` 等 | console `rendersOnInsert` / `rendersOnTick` |
| 视觉 | `banner` | 顶部公告不预留 / 先 `min-height` 占位 | `index.html?act=banner&reserve=0#/list` 等 | console `pushed` / `clsRaw` |
| 视觉 | `font` | 回退字体未 / 已 `size-adjust` 校准 | `index.html?act=font&sz=0#/detail/1` 等 | console `deltaH` / `advanceBefore`→`advanceAfter` / `clsRaw` |
| 视觉 | `anim` | 展开动画改 `top` / 改 `transform` | `index.html?act=anim&anim=top#/detail/1` 等 | console `clsRaw` / 位移条目数 |

> 注意：`?act=` / `?key=` 等开关必须写在 `#` **之前**（真实的 query string），应用才能从 `location.search` 读到；写在 `#` 后面会被当成路由一部分而失效。记忆口诀：**`index.html?act=xxx#/route`**。

### 四个页面内手动对照（`?act=`）

剩下四件事的读数**都是同一次加载里的前后差值**——换字那一刻文本块高了多少、公告插进来把下面推下去多少、同一个脏更新触发了几次行渲染——差值横跨一次加载里的两个时刻，做成「开页面 → 读一个数」反而会失掉要观察的那段过程。所以它们做成页面内面板：`npm run dev:after` 打开页面，`?act=` 指定演哪一出，页面自己把两个时刻的读数一起打到 console。

三条使用规则：

- **一次只带一个 `act=`**。驱动力在 `shared/App.vue` 的 `drive()`：它按 `?act=` 去 `window.__spa.exp[act]()` 取该实验读数（`shared/views/*.vue` 各自挂上去），跑完拼进上报对象。多个 act 同时给只会执行第一个命中的。
- **交互面板之间不串味**。四个面板各占一个 `mode` 分支（`v-if / v-else-if`），带 `act=` 时只挂载自己那一个；同一次会话里换个 URL 重新进即可切到另一个实验。
- **看差值，不看绝对值**。本机 localhost 的 JS 执行本身只要几毫秒，个别读数（如 `anim` 的时长）噪声可能盖过差异——结论要落在「两次对比之间哪个数变了、变了多少」。

## 二、篇目对照表

| 篇 | 用到的实验 | 对应小节 |
|---|---|---|
| 性能优化体系与指标 | 12 个实验（8 基础 case + 4 页面内） | 一：指标体系与排障主线；二：加载层 LCP（`spa` `nav` `cache` `images`）；三：运行层 INP（`agg` `scroll` `memory`，以及 `rerender`）；四：视觉层 CLS（`cls` `banner` `font` `anim`）；五：收口 |
| 性能优化实战（本实验台手册） | 全部 | 怎么起工程、怎么手动读、每个实验怎么对照、数字怎么读 |

## 三、结构

```
perf-lab/
├─ package.json            根：npm workspaces（apps/*）+ 全部 scripts（只有 dev/build/preview）
├─ shared/                 业务源码唯一一份，两个工程共用（@lab 别名）
│  ├─ App.vue              SPA 外壳：hash 路由、实验驱动（?act=）、指标采集
│  ├─ lib/
│  │  ├─ options.js        开关解析：入口总开关 window.__PERF_OPT + 单项 ?key=0/1 覆盖
│  │  ├─ store.js          数据与聚合（makeItems / heavyAggregate / sliceAggregate）
│  │  ├─ agg-worker.js     Worker 版聚合
│  │  └─ report-engine.js  报表页的重活：透视 / 异常检测 / 导出（低频繁重路由）
│  ├─ views/               ListView / DetailView / ReportView / AboutView
│  │                       ——四个手动实验的面板与读数就挂在这些视图里（window.__spa.exp）
│  └─ public/
│     ├─ app.css           应用样式（两版共用，含 font / banner / anim 三个实验面板的样式）
│     ├─ lab.js            页面侧：订阅性能条目 + 把实测打到 console（无服务端、无回传）
│     └─ lab-assets/       hero.svg（≈50KB）+ shot0..11.svg（各 ≈21KB），替换原 /asset 动态端点
└─ apps/
   ├─ before/              优化前工程 → dist-before/
   │  ├─ vite.config.mjs   入口 raw.html + memory.html，5187
   │  ├─ raw.html          CSS 外链阻塞、#app 空壳（window.__PERF_OPT=false）
   │  ├─ memory.html       内存实验独立页
   │  ├─ memory.js         内存实验页脚本
   │  └─ main.js           静态 import 全部视图
   └─ after/               优化后工程 → dist-after/
      ├─ vite.config.mjs   入口 index.html，5193
      ├─ index.html        关键 CSS 内联 + 骨架屏（window.__PERF_OPT=true）
      └─ main.js           () => import('@lab/views/X.vue')
```

源码里没有一行「为了凑差异」的假代码：`report-engine.js` 是 36 个指标 + 6 个维度 + 透视 / 异常检测 / 导出的真实现（14.7 KB），它是报表路由的依赖，构建后自己就是一块独立 chunk。

## 四、开关怎么用

- 入口总开关写在 HTML 里：`after/index.html` 设 `window.__PERF_OPT = true`，`before/raw.html` 设 `false`。它决定一批优化开关的默认开合（路由级分割、虚拟滚动、分片聚合、Worker、图片尺寸预留、空闲预取）。
- 单项开关命令行上覆盖总开关，用来做「只改一项」的对照：
  - `?virtual=0` → 优化后入口里只关掉虚拟滚动
  - `?split=1` → 优化前入口里单独打开路由级分割
  - `?imgopt=0` → 优化后入口里关掉主图尺寸预留（复现 CLS）
  - `?lazy=1` / `?gallery=1` → 详情页图集渲染与懒加载
- 可用开关：`split` `virtual` `slice` `worker` `throttle` `prefetch` `imgopt` `gallery` `lazy`；另有 `n=` 改列表条数（默认 2000）、`act=` 指定实验动作。
- **一次只留一个变量**：两套入口的渲染开关默认一致，差异只来自「整个入口」（CSS 外链/内联、空壳/骨架屏、静态/动态 import 三处合起来）。想最干净地只比打包，给 after 加 `?prefetch=0` 即可（不影响关键路径字节 `criticalBytes` 的读数）。

## 五、为什么这么设计（已知取舍）

- **两个独立工程，而不是「一个工程、两个入口」**。多入口一起构建时 rollup 会把两个入口共用的模块提到公共 chunk，优化前那份就不再是「一个 bundle 全量包含」的干净基线，对比直接不成立。`apps/before` 与 `apps/after` 各自 `vite build`，各按自己的方式打包，差异才是真的。
- **也不是把源码复制成两份**。两份代码同步维护必然腐烂，改一处忘一处，最后比出来的不是「工程决策的差异」而是「两份代码的差异」。源码放 `shared/`、用 `@lab` 别名引入，两个工程跑同一份组件、同一套开关逻辑。
- **测量能力长在页面里，不靠外部工具**。浏览器原生 `PerformanceObserver` 订阅 paint / LCP / layout-shift / longtask，`performance.getEntriesByType('resource')` 直接给每个文件的 `transferSize`（首屏字节、缓存后字节、图片传输量都在里面）。`lab.js` 把这些整理成一份 payload 打到 console——所以开页面、开 DevTools 就能读数，不需要无头 Chrome、不需要服务端。
- **CLS 上报到小数点后四位**。CLS 真值多落在 0.005~0.1 之间，一位小数会把 0.0633 显示成 0.1、把 0.0081 显示成 0，两组对照直接看成一个数。口径仍分 `cls`（规范，剔掉用户输入 500ms 内的预期位移）与 `clsRaw`（所有位移之和，对照实验看这个）。
- **INP 用「最长同步块」近似**。真实 INP 要用户实际输入才产生 `event` 条目；脚本 `click()` 派发的是不可信事件，所以 `agg` / `nav` 里量的是「计时块里强制结算布局后主线程被独占的时长」——比帧间隔稳定，也更贴近「用户点了多久没反应」。
- **限速靠 DevTools，不靠本地服务**。本机 localhost 传 500 KB 只要几毫秒，不放大网络差异，「少一次往返」「图没预留尺寸」这些结论根本显示不出来。所以 `images` / `cls` 想要明显的 LCP 差，在 DevTools → Network 里开 **Slow 3G**（或自定义限速）再对比即可——这是标准的手动手法，比自己写一个限速服务简单。
- **`memory` 需要 `--enable-precise-memory-info`**。不加这个 flag，`performance.memory` 的粒度是 100 KB 级，量不出逐轮趋势。该 case 不进 SPA，是 `apps/before` 下一张独立的 `memory.html`，用带 flag 的 Chrome 打开 `?mode=clean` / `?mode=leak` 对照。
- **图片是提交的静态 SVG**（`shared/public/lab-assets/`），不走任何动态端点。hero ≈ 50KB、每张 shot ≈ 21KB，概念比例不变；具体字节只影响「懒加载省了多少传输」的绝对值，不影响结论方向。
