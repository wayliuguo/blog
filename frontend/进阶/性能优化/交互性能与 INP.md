# 交互性能与 INP

这一篇服务一个核心目标：**把 INP 打下来**（p75 ≤ 200ms）。

前面一篇讲的是「尽快把东西送到用户眼前」。但用户真正不爽的时刻往往发生在**页面已经打开之后**：点了没反应、滚动掉帧、切几次页面越用越卡。

运行时性能有两个标尺，记住这两个数，后面所有手段都能归位：

- **单帧 16ms**：要维持 60fps，每一帧的所有工作（脚本 + 样式 + 布局 + 绘制）必须挤进 16.7ms。任何一段超了，就是掉帧。
- **长任务 50ms**：超过 50ms 的任务会被浏览器标记为长任务。长任务期间用户输入无法被处理——这是 INP 变差的直接原因。

本篇同样先定位再展开：先判断 INP 差在哪一段，再按手段所属的层给做法——JS 执行层管「主线程被谁占着」，渲染层管「每帧要做多少事」，框架层管「不必要的重渲染」，内存管「长时间会话下的持续劣化」。

## 一、先定位：INP 差在哪一段

INP 量的是「从用户操作到浏览器画出下一帧」，这段时间由三段串起来，**三段的修法完全不同**，先分清是哪一段，否则会改错地方：

```
用户操作 ──► 回调开始执行 ──► 回调执行完 ──► 下一帧绘制
   └── 输入延迟 ──┘└── 处理时间 ──┘└─ 呈现延迟 ─┘
     主线程被占着        回调本身慢        DOM 太大 / 强制布局
```

| 差在哪一段 | 典型证据 | 该去哪一层 |
| --- | --- | --- |
| 输入延迟 | `longtask` 条目多且长，交互时刻正好落在某个长任务里 | JS 执行层：切片、挪走、拆小 |
| 处理时间 | Performance 火焰图里回调自身就是一个宽条 | JS 执行层：换算法、Worker；框架层：减少重渲染 |
| 呈现延迟 | 回调很快返回，但之后紧跟一次大范围 Layout / Recalculate Style | 渲染层：读写分离、减少重排、缩小 DOM |

判断的实操顺序只有三步：

1. **先看有没有长任务**。有长任务，INP 几乎一定差——浏览器只有等一个任务结束才能处理输入。这一步直接决定要不要做切片。
2. **再看长任务里是谁**。火焰图里那个最宽的条，是业务回调（处理时间）还是样式重算（呈现延迟）。
3. **最后看是不是持续劣化**。刚打开还好、用久了变卡，就不是单帧问题，去查内存。

一个容易搞反的点：**「总耗时」和「INP」不是一回事**。切片会让总耗时变长（每片都有结算开销），但最长阻塞块降下来，INP 就变好——下面的实测能看到这个反直觉的结果。

## 二、JS 执行层：谁占住了主线程

「一次渲染 6 万行」这种需求，不管怎么优化单次操作，只要所有工作在同一个同步块里跑完，主线程就会被独占这么久。实测：

> 摘自 `./code/perf-lab/pages/longtask.html`

```js
    // 关键：用一次强制同步布局把「主线程真正被独占多久」量出来。
    // 只测字符串拼接会得到十几毫秒的假象——真正卡住用户的是浏览器必须把这 6 万个盒子排完才能画第一帧。
    function buildAndFlush(from, to) {
        build(from, to)
        void list.offsetHeight // 读一次布局属性 → 浏览器必须立刻结算，无法拖到下一帧
    }
```

切片版每 6000 行让出一次控制权，用的是 `MessageChannel`：

> 摘自 `./code/perf-lab/pages/longtask.html`

```js
        const CHUNK = 6000
        const blocks = []
        let done = 0
        let firstContentMs = null
        const t0 = performance.now()
        const channel = new MessageChannel()

        channel.port1.onmessage = () => {
            const started = performance.now()
            buildAndFlush(done, Math.min(done + CHUNK, ROWS))
            blocks.push(Math.round(performance.now() - started))
            done += CHUNK
            if (firstContentMs == null) firstContentMs = Math.round(performance.now() - t0)
            if (done < ROWS) channel.port2.postMessage(null)
```

```
| 做法     | 总耗时  | 分片数 | 最长同步块 | 首屏可见耗时 | 超过 50ms 的块 |
|----------|---------|--------|------------|--------------|----------------|
| 一次做完 | 737 ms  | 1      | 737 ms     | 737 ms       | 1              |
| 分片切片 | 1152 ms | 10     | 144 ms     | 162 ms       | 10             |
```

三个数一起看才有意思：

- **总耗时反而变长**（1152ms vs 737ms，多 415ms）。每次结算布局都有固定开销，切片不是免费的。
- **最长同步块从 737ms 降到 144ms**。这是最重要的改善——144ms 仍然是长任务，但用户从「卡死 0.7 秒」变成「卡 0.14 秒」，感知天差地别。
- **首屏可见从 737ms 降到 162ms**。用户不用等全部渲染完就能看到内容、能开始滚动。

**选哪个让出机制，是有讲究的**，这一步最容易做错：

| 机制 | 任务类型 | 能不能让渲染插进来 | 适合 |
| --- | --- | --- | --- |
| `Promise.then` | 微任务 | **不能** | 不适合切片（微任务队列会在当前宏任务结束前全部跑完） |
| `setTimeout(fn, 0)` | 宏任务 | 能，但有 4ms 节流 | 可以，但时间粒度差 |
| `MessageChannel` | 宏任务 | 能，无节流 | **首选** |
| `requestIdleCallback` | 空闲回调 | 能 | 低优先级后台任务，可能长时间不被调用 |
| `scheduler.postTask` | 宏任务 | 能，可带优先级 | 现代浏览器里的最佳选择 |

**用 Promise 做切片是无效的**——它的回调会在当前宏任务结束前全部执行完，浏览器一帧都插不进来。

另外注意切片的边界：切片只能切开「多个独立工作单元」。如果单个工作单元本身就要 300ms（比如一次 10 万行数据排序），切不了，得换算法或挪到 Worker。

主线程要同时负责 JS 执行、样式计算、布局、绘制，还要响应用户输入。所以「算得快」不如「别占着主线程」。同一段 1200 万次循环的计算，放两边对比：

> 摘自 `./code/perf-lab/pages/heavy.js`

```js
/**
 * 一段纯计算的热点函数：主线程版与 Worker 版共用同一份实现
 * 页面里用 <script src="./heavy.js"> 引入，Worker 里用 importScripts 引入
 */
self.heavyTask = function heavyTask(rounds) {
    let hash = 0
    for (let i = 0; i < rounds; i++) hash = (hash * 31 + i) % 2147483647
    return hash
}
```

两边引入的是**同一份实现**，区别只在哪个线程执行：

> 摘自 `./code/perf-lab/pages/heavy-worker.js`

```js
// Worker 线程：引入同一份热点函数，算完把结果回传
importScripts('./heavy.js')

self.onmessage = e => {
    const started = Date.now()
    const result = self.heavyTask(e.data)
    self.postMessage({ result, workerMs: Date.now() - started })
}
```

```
| 做法        | 页面感知耗时 | 计算本身耗时 | 最长帧间隔 | 期间帧数 |
|-------------|--------------|--------------|------------|----------|
| 主线程计算  | 189 ms       | 189 ms       | 200 ms     | 19       |
| Worker 计算 | 235 ms       | 191 ms       | 17 ms      | 32       |
```

**计算本身并没有变快**（189ms vs 191ms），变的是「谁在被占用」：主线程版期间最长 200ms 没能刷出一帧，页面直接冻住；Worker 版主线程最长只被挡住 17ms（≈一帧），期间照常出帧 32 次。

Worker 的两个边界必须清楚：

- **通信要序列化**。`postMessage` 走的是结构化克隆，传大对象本身有成本，且是拷贝不是共享（`SharedArrayBuffer` 例外，但需要跨源隔离头）。所以适合传「输入参数 / 结果」，不适合高频传大块数据。
- **Worker 里没有 DOM**。能做的是纯计算：数据处理与聚合、加解密、图片像素运算、压缩解压、文本解析、diff 计算。
- **启动成本要考虑**。Worker 的创建与首次加载有开销（几十毫秒级），适合「一次重活」，不适合「每 10ms 一次的小任务」。常驻 Worker 池或把 `heavy.js` 这类脚本提前缓存能摊薄这个成本。

判断标准很简单：**「这段计算和 DOM 无关，而且单次超过 50ms」——满足就挪。**

## 三、渲染层：每帧要做多少事

浏览器渲染是**攒批**的：JS 改了样式，浏览器不会立刻重算布局，而是记下来，等这一轮 JS 跑完再统一算一次。但如果 JS 在改完之后**立刻读一个依赖布局的属性**（`offsetWidth`、`offsetTop`、`getBoundingClientRect`、`getComputedStyle`……），浏览器就没得拖了——必须马上把刚才的改动算进布局，才能给出正确的读值。这就是**强制同步布局**（forced synchronous layout），俗称布局抖动。

写 2000 个盒子的宽度，两种写法：

> 摘自 `./code/perf-lab/pages/thrash.html`

```js
    const loop = Lab.time(() => {
        if (mode === 'interleaved') {
            for (let i = 0; i < COUNT; i++) {
                boxes[i].style.width = 30 + (i % 20) + 'px' // 写样式
                layouts += boxes[i].offsetWidth > 0 ? 1 : 0 // 紧接着读 → 浏览器必须立刻重算布局
            }
        } else {
            const widths = boxes.map(el => el.offsetWidth) // 集中读：只触发一次布局
            for (let i = 0; i < COUNT; i++) boxes[i].style.width = widths[i] + 2 + 'px' // 集中写：留到下一帧统一布局
            layouts = 1
        }
    })
```

```
| 写法     | 循环耗时 | 触发布局次数 | 相对倍数 |
|----------|----------|--------------|----------|
| 交错读写 | 4794 ms  | 2000         | 1.00×    |
| 集中读写 | 4 ms     | 1            | 1114.98× |
```

**同样 2000 次样式改动，交错版 4794ms，集中版 4ms——差 1115 倍。** 这不是夸张的构造，`4794 / 2000 ≈ 2.4ms` 正是「把 2000 个元素的布局重算一遍」的成本，交错写法付了 2000 次。

三种解法，按优先级：

1. **读提前、写后置**（本实验的写法）。把一轮循环里所有的读集中到最前面，所有的写放到最后。复杂场景可以引入 fastdom 这类读写调度库。
2. **用缓存代替读**。要读的值如果能从数据算出来，就别去问 DOM。
3. **把写延到下一帧**。`requestAnimationFrame` 里批量写，浏览器只在这一帧的渲染阶段布局一次。

体感上，这类问题表现为「滚动或拖拽时一格一格地卡」——每个 `scroll` / `mousemove` 回调里都藏着一对读写。

浏览器把渲染拆成几步，不同属性触发到不同的深度：

| 改了这类属性 | 触发到 | 例子 | 成本 |
| --- | --- | --- | --- |
| 几何属性 | 布局 → 绘制 → 合成 | `width`、`height`、`margin`、`font-size`、`display` | 最高 |
| 绘制属性 | 绘制 → 合成 | `color`、`background`、`box-shadow`、`visibility` | 中 |
| 合成属性 | 只合成 | `transform`、`opacity`、`filter` | 最低（可走 GPU） |

所以动画要尽量只用 `transform` 和 `opacity`——它们能在合成层上完成，不触发布局与重绘。这同时解释了「视觉稳定与 CLS」篇里那条规则：`transform` 不改变元素在布局中的起始位置，所以不产生位移。

合成层的两个注意点：

- **别滥用 `will-change`**。它会为元素单独提升一个层，层数一多，内存和合成开销反而上升。只在「确实要开始动画前」加、动画结束就撤。
- **层多了会掉帧**：每个合成层都要占显存，移动端尤其敏感。用 DevTools 的 Layers 面板能看到实际层数。

一万行的列表，DOM 里到底该有多少个节点？实测：

> 摘自 `./code/perf-lab/pages/virtual.html`

```js
        function renderWindow() {
            const start = Math.max(0, Math.floor(viewport.scrollTop / ROW_H) - BUFFER)
            const end = Math.min(TOTAL, start + WINDOW + BUFFER * 2)
            let html = ''
            for (let i = start; i < end; i++) html += rowHtml(i)
            win.innerHTML = html
            win.style.top = start * ROW_H + 'px'
            scrollUpdates++
            return end - start
        }
```

```
| 做法     | DOM 节点数 | 实际渲染行数  | 首屏渲染 | 一次大跨度滚动 |
|----------|------------|---------------|----------|----------------|
| 全量渲染 | 10012      | 10000 / 10000 | 14 ms    | 288 ms         |
| 虚拟滚动 | 39         | 25 / 10000    | 1 ms     | 13 ms          |

| 做法     | JS 堆   |
|----------|---------|
| 全量渲染 | 1421 KB |
| 虚拟滚动 | 615 KB  |
```

**DOM 节点数 10012 → 39，砍掉 99.6%。** 首屏渲染 14ms → 1ms，一次大跨度滚动 288ms → 13ms（全量版那次滚动慢，是因为浏览器要为 1 万个节点重新布局视口），JS 堆 1421KB → 615KB。

虚拟滚动的代价也要说清楚：

- **每次滚动都要重算窗口并重建那几十行**。滚动事件触发频率高，实现时要做节流或 `requestAnimationFrame` 合帧，否则重算本身会成为新的卡顿源。
- **滚动锚定问题**：不定高的列表在重算窗口时，`scrollTop` 对应的内容会变，容易出现「滚一下跳一段」。解决办法是记锚点元素（`IntersectionObserver` 配 `scrollIntoView`），或维护「已测高度 + 估算高度」两套数据。
- **别用 `scroll` 事件 + 逐行判断**去实现懒加载/虚拟滚动，优先用 `IntersectionObserver`——它由浏览器批量派发，不在滚动回调里做同步计算。

一个必须强调的分工：**虚拟滚动解决的是「DOM 太多」，不解决「计算太重」。** 如果每行都有复杂的格式化逻辑，滚动时那一行仍然要算，卡顿依旧。

## 四、框架层：避免不必要的重渲染

前两层是通用的浏览器机制。这一层是框架特有的：**你写的代码没变，但框架替你多做了渲染**。

框架层的问题通常不表现为「某一个函数很慢」，而是「同一段渲染被重复执行了很多次」。判据很简单：**一次交互之后，有多少组件被重新渲染了、而它们的数据其实没变**。

**React 侧**：默认行为是父组件更新就带着整棵子树重渲染。收敛手段是切断这条传播链——`React.memo` 包住子组件、`useMemo` 缓存计算结果、`useCallback` 稳定传给子组件的回调引用（否则 memo 会被新函数引用打穿）。状态要尽量下沉到真正需要它的组件，避免把大对象塞进一个 `useState` 里导致「改一个字段、整片重渲」。

**Vue 侧**：响应式是细粒度的，默认不会带着整棵树重渲，但有两个常见放大器：一是把巨大的列表或第三方实例直接放进 `ref` / `reactive`，深层代理的建立与追踪本身就是成本（用 `shallowRef` / `markRaw` 跳过）；二是模板里写了复杂表达式或方法调用，每次重渲染都会重新求值（抽成 computed）。长列表用 `v-memo` 可以跳过整个子树的 diff。

**两侧通用**的三条：

- **`key` 要稳定**。用数组下标当 `key`，插入或排序时会让框架认为大量节点都变了，把「移动几个节点」变成「重建一片节点」。
- **重渲染的代价由子树大小决定**。组件切得越细、状态下沉得越深，单次更新的影响面越小——这是组件拆分在性能上的真正收益。
- **懒加载交互才需要的部分**。富文本编辑器、图表、地图这类「重但非首屏必需」的组件按需引入，既减小首屏体积，也减少初始化阶段的长任务。

这一层没有实验台配套（它高度依赖具体应用结构），但它是「框架项目 INP 差」时最常见、也最容易被忽略的一层：前两层都查过了没有长任务、也没有强制布局，那多半是重渲染次数的问题。

## 五、内存与长会话：为什么越用越卡

内存问题的现象是「越用越卡」，原因是「有东西没被回收」，中间隔着一段距离。最小对照：同样分配 60 轮 × 2000 个对象，唯一区别是每轮的数组有没有被挂到全局。

> 摘自 `./code/perf-lab/scenarios/memory.mjs`（运行：`npm run memory`）

```js
const FLAGS = ['--enable-precise-memory-info']
```

```
| 模式           | 第 10% 处堆 | 末轮堆  | 峰值堆  | 净增长  | 留下的引用 |
|----------------|-------------|---------|---------|---------|------------|
| 留引用（泄漏） | 3.2 MB      | 21.5 MB | 21.5 MB | 18.3 MB | 60         |
| 可回收（正常） | 2.4 MB      | 3.2 MB  | 4.8 MB  | 0.8 MB  | 0          |
```

前端最常见的四类泄漏，全部都是「还留着引用」：

1. **事件监听没摘**。`window.addEventListener('resize', ...)` 注册后组件卸载时不摘，回调里又闭包引用了 DOM，DOM 就永远回收不掉。
2. **定时器没清**。`setInterval` 里引用的组件状态，会让整个组件树一直活着。
3. **全局缓存只增不减**。用 Map 做请求缓存但从来不清理，长会话页面必然膨胀。要配上 LRU 或大小上限。
4. **闭包把大对象绑在长生命周期上**。一个挂在全局的闭包引用了整个 `response.data`，即使只用其中一个字段。

排查路径见「性能优化总纲与指标量化」篇的工具一节（Heap snapshot Comparison、Detached DOM、Allocation timeline）。

## 配套代码

本篇示例来自 `code/perf-lab`（零依赖，需要本机有 Chrome；不需要 `npm install`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/perf-lab/pages/thrash.html` | 2000 个盒子：交错读写 vs 集中读写 | 三 |
| `./code/perf-lab/pages/longtask.html` | 60000 行列表：一次做完 vs 分片切片 | 二 |
| `./code/perf-lab/pages/virtual.html` | 10000 行长列表：全量渲染 vs 虚拟滚动 | 三 |
| `./code/perf-lab/pages/worker.html` | 同一段计算放主线程 vs 放 Worker | 二 |
| `./code/perf-lab/pages/heavy.js` | 主线程与 Worker 共用的热点计算函数 | 二 |
| `./code/perf-lab/pages/heavy-worker.js` | Worker 线程入口，算完把结果回传 | 二 |
| `./code/perf-lab/pages/memory.html` | 分配 / 留引用 / 采样堆大小的最小对照 | 五 |
| `./code/perf-lab/scenarios/thrash.mjs` | 循环耗时与强制布局次数对照 | 三 |
| `./code/perf-lab/scenarios/longtask.mjs` | 最长同步块与首屏可见耗时对照 | 二 |
| `./code/perf-lab/scenarios/virtual.mjs` | DOM 节点数、首屏渲染、滚动与堆对照 | 三 |
| `./code/perf-lab/scenarios/worker.mjs` | 最长帧间隔与期间出帧数对照 | 二 |
| `./code/perf-lab/scenarios/memory.mjs` | 堆增长对照（需要 `--enable-precise-memory-info`） | 五 |
| `./code/perf-lab/README.md` | 全部实验场景与已知取舍 | 全篇 |

启动方式：在 `code/perf-lab` 目录执行 `npm run thrash`（或 `npm run longtask` / `npm run virtual` / `npm run worker` / `npm run memory`）。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[加载性能与 LCP](./加载性能与%20LCP.md)
- 下一篇：[视觉稳定与 CLS](./视觉稳定与%20CLS.md)
