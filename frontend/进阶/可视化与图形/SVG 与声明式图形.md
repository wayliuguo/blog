# SVG 与声明式图形

## 一、保留模式：DOM 即场景图

Canvas 没有场景图（上一篇讲过要自己建显示列表），SVG 的场景图就是 DOM 本身：

> 示意片段（无配套脚本）

```html
<svg viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="100" height="50" fill="steelblue" />
  <circle cx="200" cy="100" r="30" fill="orange" />
</svg>
```

改 `<rect>` 的 `height` 属性，浏览器只重绘这个节点——**不需要清屏重画整幅**。这就是「声明式」的含义：你描述画面该是什么样，浏览器负责让它变成现实。

| 能力 | 谁负责 | 对开发的意义 |
| --- | --- | --- |
| 重绘 | 浏览器（按节点脏区） | 改一处不用付整幅的代价 |
| 命中测试 | 浏览器（事件直接绑元素） | 不用自己算几何 contains |
| 缩放 | 矢量无损 | 放大不糊，适合响应式与打印 |
| 可访问性 | DOM 天然支持 | 屏幕阅读器能读到节点 |

## 二、基础图形与 path

SVG 内置六种基本图形（rect / circle / ellipse / line / polyline / polygon），复杂形状全部走 `<path>`——一条 `d` 指令串就是一份「迷你绘图语言」：

> 示意片段（无配套脚本）

```html
<path d="M 10 80 L 90 80 L 50 10 Z" fill="teal" />
<!-- M 移动 · L 直线 · Z 闭合：画一个三角形 -->
<path d="M 10 200 C 60 120, 140 120, 190 200" stroke="steelblue" fill="none" />
<!-- C 三次贝塞尔：两个控制点拉出曲线，折线图变平滑曲线全靠它 -->
```

> 提示：`stroke-dasharray` + `stroke-dashoffset` 的组合是 SVG 的招牌技巧——把描边变成「从 0 画到全长」的过程，就得到了路径描边动画（进度环、签名动画的原理）。

## 三、数据 join：D3 的核心思想

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

## 四、viewBox 与坐标系

SVG 用 `viewBox` 建立自己的逻辑坐标系，与屏幕像素解耦——这是它做响应式的天然优势：

> 示意片段（无配套脚本）

```html
<svg viewBox="0 0 100 100" width="100%" height="100%">
  <!-- 逻辑坐标 0~100，无论容器多大都等比铺满 -->
  <circle cx="50" cy="50" r="40" />
</svg>
```

图表的「容器变、图跟着变」在 SVG 里几乎是免费的：外层算一次新的像素尺寸，更新 `width` / `height`，内部逻辑坐标不动。Canvas 做同样的事要手动重设画布尺寸并整幅重画。

## 五、交互与动画：交给浏览器

SVG 的事件模型与普通 DOM 一致，动画可以直接用 CSS：

> 示意片段（无配套脚本）

```html
<circle class="dot" cx="50" cy="50" r="4" />
<style>
  .dot { transition: r 0.2s; }   /* r 属性过渡（几何属性也能动画） */
  .dot:hover { r: 8; fill: orange; }
</style>
```

hover 高亮、点击选中、tooltip 跟随，都是「给元素绑事件」而不是「算鼠标落在哪个多边形里」。代价是：每个图形都是节点，**几百个以内很舒适，几千个 DOM 开销开始失控**——这条边界线决定了与 Canvas 的分工。

## 六、与 Canvas 的分工（复习）

| 场景 | 选谁 | 理由 |
| --- | --- | --- |
| 后台报表、几十~几百个图形 | SVG | 交互白拿、缩放无损 |
| 大屏动辄几千个图形 | Canvas | DOM 数量不受控 |
| 需要导出图片 / 图像处理 | Canvas | 位图天然可导出 |
| 需要无级缩放（地图、原理图） | SVG | 矢量放大不糊 |
| 逐帧动画、粒子系统 | Canvas / WebGL | 即时模式每帧重画成本低 |

> 提示：ECharts 的渲染器可以在 Canvas / SVG 之间切换（`renderer: 'svg'`）——同一套五层架构、两种渲染后端，正是「布局与渲染分离」的红利（见《图表引擎原理》）。

实测把这条边界量了出来（见《Canvas 2D 基础与性能》第七节 / `./code/viz-bench/`）：同一个「N 个点逐帧平移」的动画，SVG 在 2000 点还能 59.7fps，到 1 万点掉到 18.6、5 万点只剩 3.6——因为每个点都是一个 DOM 节点，规模失控后重排重绘成本线性炸开；同场景 Canvas 1 万点仍 60fps、WebGL 44.9fps，平稳得多。**所以「几百以内选 SVG」要改成更精确的「约 1 万点以内、且重交互，选 SVG」。**

## 配套代码

本篇无独立实验台；与 Canvas / WebGL 的帧率对比来自 `./code/viz-bench/`（三路渲染基准，见 Canvas 篇第七节）。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Canvas 2D 基础与性能](./Canvas%202D%20基础与性能.md)
- 下一篇：[WebGL 与 Three.js 入门](./WebGL%20与%20Three.js%20入门.md)
- MDN：[SVG 教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial) · [D3-selection](https://d3js.org/d3-selection/joining)
