# SVG 与声明式图形

> 统一业务场景：实时交易监控大屏（见[全景](./全景.md)）。本篇实战层绑定 `screen-board` 的告警列表与图例交互——大屏里「需要 DOM 交互」的那一半 UI。最小实现：手写 mini data-join。

## 一、入门：保留模式——DOM 即场景图

Canvas 篇讲过：即时模式没有对象，性能全靠自建显示列表。SVG 站在另一端——**场景图就是 DOM 本身**，你声明「画面该是什么样」，浏览器负责让它保持成这样：

| 能力 | 谁负责 | 对开发的意义 |
| --- | --- | --- |
| 重绘 | 浏览器（按节点脏区） | 改一处不用付整幅的代价 |
| 命中测试 | 浏览器（事件直接绑元素） | 不用自己算几何 contains |
| 缩放 | 矢量无损 | 放大不糊，适合响应式与打印 |
| 可访问性 | DOM 天然支持 | 屏幕阅读器能读到节点 |

> 示意片段（无配套脚本）

```html
<svg viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="100" height="50" fill="steelblue" />
  <circle cx="200" cy="100" r="30" fill="orange" />
</svg>
```

改 `<rect>` 的 `height` 属性，浏览器只重绘这个节点——不需要清屏重画整幅。**代价同样来自 DOM**：每个图形都是一个真实节点，几百个以内很舒适，几千个 DOM 开销开始失控（边界实测见 Canvas 篇第六节：1 万点掉到 18.6fps）。

## 二、核心机制

### 2.1 基本图形与 path

SVG 内置六种基本图形（rect / circle / ellipse / line / polyline / polygon），复杂形状全部走 `<path>`——一条 `d` 指令串就是一份「迷你绘图语言」：

> 示意片段（无配套脚本）

```html
<path d="M 10 80 L 90 80 L 50 10 Z" fill="teal" />
<!-- M 移动 · L 直线 · Z 闭合：画一个三角形 -->
<path d="M 10 200 C 60 120, 140 120, 190 200" stroke="steelblue" fill="none" />
<!-- C 三次贝塞尔：两个控制点拉出曲线，折线图变平滑曲线全靠它 -->
```

> 提示：`stroke-dasharray` + `stroke-dashoffset` 的组合是 SVG 的招牌技巧——把描边变成「从 0 画到全长」的过程，就得到了路径描边动画（进度环、签名动画的原理）。

### 2.2 viewBox：逻辑坐标系与屏幕解耦

SVG 用 `viewBox` 建立自己的逻辑坐标系，与屏幕像素解耦——这是它做响应式的天然优势：

> 示意片段（无配套脚本）

```html
<svg viewBox="0 0 100 100" width="100%" height="100%">
  <!-- 逻辑坐标 0~100，无论容器多大都等比铺满 -->
  <circle cx="50" cy="50" r="40" />
</svg>
```

图表的「容器变、图跟着变」在 SVG 里几乎是免费的：外层算一次新的像素尺寸，更新 `width` / `height`，内部逻辑坐标不动。Canvas 做同样的事要手动重设画布尺寸并整幅重画。

### 2.3 数据 join：增量更新的统一骨架

D3 最重要的抽象不是画图，而是**把数据数组绑定到 DOM 集合**（data join）。数据变化时，节点分三类：新数据没有对应节点（enter）、已有节点对应新数据（update）、旧节点没了数据（exit）：

> 示意片段（无配套脚本）

```js
const bars = d3.select('#chart').selectAll('rect').data(values)
bars.enter().append('rect')        // enter：新数据 → 新建节点
  .merge(bars)                     // update：新老合并统一设置属性
  .attr('x', (d, i) => xScale(i))
  .attr('height', (d) => hScale(d))
bars.exit().remove()               // exit：多余节点 → 移除
```

这套 enter / update / exit 的意义在于：**增量更新有了统一的骨架**。数据从 100 条变 105 条，只 append 5 个节点、更新全部高度、remove 0 个——和虚拟列表的 diff 思想同源。React 的 reconcile、Vue 的 patch，解决的是同一个问题：状态与视图的同步。

### 2.4 交互与动画：交给浏览器

SVG 的事件模型与普通 DOM 一致，动画可以直接用 CSS：

> 示意片段（无配套脚本）

```html
<circle class="dot" cx="50" cy="50" r="4" />
<style>
  .dot { transition: r 0.2s; }   /* r 属性过渡（几何属性也能动画） */
  .dot:hover { r: 8; fill: orange; }
</style>
```

hover 高亮、点击选中、tooltip 跟随，都是「给元素绑事件」而不是「算鼠标落在哪个多边形里」。

## 三、最小实现：手写 mini data-join

D3 selection 的黑盒拆开就两个函数：`join`（按 key 分三类）和 `apply`（把分类落到容器上）。`viz-lab/join.cjs` 是一个可以跑的最小实现——用轻量节点对象模拟 DOM，专注「分类与复用」机制：

> 摘自 `./code/viz-lab/join.cjs`

```js
// mini data join：nodes 是已有节点数组（每个节点通过 __data__.id 与数据关联）
function join(nodes, data) {
  const byKey = new Map(nodes.map(n => [n.__data__.id, n]))
  const enter = []
  const update = [] // [node, datum] 对
  const exit = []
  const used = new Set()
  for (const d of data) {
    const n = byKey.get(d.id)
    if (n) {
      update.push([n, d])
      used.add(d.id)
    } else {
      enter.push(d)
    }
  }
  for (const n of nodes) {
    if (!used.has(n.__data__.id)) exit.push(n)
  }
  return { enter, update, exit }
}
```

`applyJoin` 把结果落到容器：enter 建节点、update 改属性、exit 删节点（等价于 D3 的 `enter().append().merge(update).attr(...)` + `exit().remove()`）：

> 摘自 `./code/viz-lab/join.cjs`

```js
// apply：把 join 的结果落到容器上——enter 建节点、update 改属性、exit 删节点
// 这一步等价于 D3 的 enter().append().merge(update).attr(...) + exit().remove()
function applyJoin(container, data, render) {
  const { enter, update, exit } = join(container.children, data)
  for (const d of enter) {
    const n = createNode('rect')
    n.__data__ = d
    container.appendChild(n)
    update.push([n, d]) // 新建的节点也要按新数据渲染一次
  }
  for (const n of exit) n.remove()
  for (const [n, d] of update) render(n, d)
  return { enterCount: enter.length, updateCount: update.length, exitCount: exit.length }
}
```

三组关键行为实测（`node run.cjs` 场景七）：

> 摘自 `./code/viz-lab/run.cjs`

```js
// ── 场景七：mini data-join（enter / update / exit）──────────────
console.log('场景七 · data join')
function makeData(ids) {
    return ids.map(id => ({ id, value: 10 + (id.charCodeAt(0) % 7) }))
}
const svg = createNode('svg')
const render = (n, d) => n.setAttr('height', d.value)
// 初始 3 条数据 → 3 个节点全部走 enter（新建后并入 update 渲染一次）
let r = applyJoin(svg, makeData(['a', 'b', 'c']), render)
assert.deepEqual([r.enterCount, r.updateCount, r.exitCount], [3, 3, 0])
assert.equal(svg.children.length, 3)
// 数据 3→5：复用 3 个旧节点（同一对象），只新建 2 个
r = applyJoin(svg, makeData(['a', 'b', 'c', 'd', 'e']), render)
assert.deepEqual([r.enterCount, r.updateCount, r.exitCount], [2, 5, 0])
assert.equal(svg.children.length, 5)
const reused = svg.children[0] // 'a' 的节点必须是同一个对象——DOM 复用而不重建
r = applyJoin(svg, makeData(['a', 'b', 'c', 'd', 'e']), render)
assert.equal(svg.children[0], reused)
// 数据 5→2：多出的 3 个节点走 exit 被移除
r = applyJoin(svg, makeData(['a', 'b']), render)
assert.deepEqual([r.enterCount, r.updateCount, r.exitCount], [0, 2, 3])
assert.equal(svg.children.length, 2)
console.log('  ✓ 3→5 复用 3 建 2 · 重复渲染零重建 · 5→2 移除 3，与虚拟列表 diff 同源\n')
```

三个读数各说明一件事：**3→5 只新建 2 个**（增量而不是重建）；**重复渲染零重建**（同一数据再 join 一次，旧节点对象原封不动——这就是为什么 join 后的节点上能存动画状态、绑事件监听而不丢）；**5→2 走 exit**（移除而不是把 5 个全清了重来）。

## 四、实战：大屏的「交互半区」用 SVG/DOM 承担

`screen-board` 的布局分两半：图表主体（QPS/渠道/终端）用 ECharts 的 Canvas 渲染器画——量大、高频、无需逐元素交互；**告警列表用普通 DOM**——需要 hover、滚动、按严重度着色，数据量小（上限 30 条，超长裁剪防长跑内存膨胀）：

> 摘自 `./code/screen-board/src/components/AlertList.vue`

```vue
// 新告警插到头部；列表超长裁剪，防止长跑内存无限涨
function prepend(alert) {
  props.alerts.unshift(alert)
  if (props.alerts.length > 30) props.alerts.pop()
  // DOM 滚动回顶部：数据最新在最上，不需要 scrollToBottom 的时序坑
}
```

分工判据就是数量 × 交互密度：**告警列表几十条、每条都要交互 → DOM；QPS 曲线上千个点、逐帧滚动 → Canvas**。ECharts 内部同理：`renderer: 'svg'` 模式下面每个图形都是真 DOM 节点，tooltip/hover 白拿浏览器事件，代价是 1 万点分水岭（Canvas 篇第六节实测）。

一个混合小技巧：ECharts 的图形主体是 Canvas 位图，但图例、tooltip 是它自己维护的 DOM/SVG 层——「Canvas 画主体 + DOM 做交互」的混合模式就是生产图表库的标准形态。

## 五、对比与适用边界（复习 + 精确化）

| 场景 | 选谁 | 理由 |
| --- | --- | --- |
| 后台报表、几十~几百个图形 | SVG | 交互白拿、缩放无损 |
| 大屏动辄几千个图形 | Canvas | DOM 数量不受控 |
| 需要导出图片 / 图像处理 | Canvas | 位图天然可导出 |
| 需要无级缩放（地图、原理图） | SVG | 矢量放大不糊 |
| 逐帧动画、粒子系统 | Canvas / WebGL | 即时模式每帧重画成本低 |

> 提示：ECharts 的渲染器可以在 Canvas / SVG 之间切换（`renderer: 'svg'`）——同一套五层架构、两种渲染后端，正是「布局与渲染分离」的红利（见《图表引擎原理》）。

实测把「几百以内」这条经验值精确化了（见 Canvas 篇第六节 / `./code/viz-bench/`）：SVG 在 2000 点还能 59.7fps，到 1 万点掉到 18.6、5 万点只剩 3.6。**所以「几百以内选 SVG」要改成「约 1 万点以内、且重交互，选 SVG」。**

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/viz-lab/join.cjs` | mini data-join（join 分类 + applyJoin 落地） | 三 |
| `./code/viz-lab/run.cjs` | 七场景自检（场景七为本篇实测） | 三 |
| `./code/viz-bench/bench.cjs` | 三路渲染帧率基准 | 五 |
| `./code/screen-board/src/components/AlertList.vue` | 告警列表（DOM 承担交互半区） | 四 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md)
- 上一篇：[Canvas 2D 基础与性能](./Canvas%202D%20基础与性能.md)
- 下一篇：[WebGL 与 Three.js 入门](./WebGL%20与%20Three.js%20入门.md)
- MDN：[SVG 教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial) · [D3-selection](https://d3js.org/d3-selection/joining)
