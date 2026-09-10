# SVG 图形

> 级别：中级

按本书四层推进：

- **入门使用**：直接用 `<svg>` 标签声明 `rect` / `circle` / `path` 等基础图形；
- **进阶**：吃透 `viewBox` 世界坐标映射、`path` 的 `d` 命令、`transform` 复合顺序与样式/动画写法；
- **实战**：用手写 SVG 拼简单图表，理解节点即 DOM 带来的交互与事件优势；
- **最小实现掌握原理**：到 `code/frontend/10-visualize` 运行 `svg-chart.html`，亲手用数据映射生成 SVG 元素，体会保留模式与 Canvas 立即模式的差异。

SVG（Scalable Vector Graphics）是**基于 XML 的矢量图形标准**，每个图形都是一个真实的 DOM 节点。与 Canvas 的"命令式位图"不同，它是"声明式矢量图"：图形可缩放不失真、天然支持 CSS 与事件。图标、Logo、简单图表、地图标注、交互动效，是 SVG 最擅长的战场。理解 SVG 是理解前面图表库（很多走 SVG 渲染器）以及后面复杂图形引擎的基石。

这篇文章带你把 SVG 的坐标、基础图形、路径、文本、变换、样式与动画逐项吃透，并给出与 Canvas 的选型对比和应用实践。

## 一、SVG 与坐标系

### 1. 一个最小的 SVG

SVG 通过命名空间嵌入 HTML，根元素是 `<svg>`：

```html
<svg width="200" height="100" viewBox="0 0 200 100">
  <rect x="10" y="10" width="80" height="40" fill="#4a90d9" />
</svg>
```

- `width` / `height`：SVG 的**显示尺寸**。
- `viewBox="minX minY w h"`：定义**可见的世界坐标系**，SVG 据此做等比缩放（关键，是"可缩放大屏"的核心）。

### 2. 坐标系统

SVG 坐标系也是**左上角为原点，x 向右、y 向下**。但 `viewBox` 会做"视口坐标 → 世界坐标"的映射：

```html
<!-- 视口 200x100，世界坐标 400x200，等比放大显示 -->
<svg viewBox="0 0 400 200" width="200" height="100">
  <!-- 一个世界坐标 (400,200) 的矩形被缩放到显示区 -->
  <rect width="400" height="200" fill="#eee" />
</svg>
```

### 3. `viewBox` 的实战意义

- **一图适配多尺寸**：一套坐标，任意 `width/height` 都清晰。
- **图标字体化 / 雪碧图**：靠 viewBox 精确定位单个图标。
- 不理解 viewBox，图标的缩放与定位就会"莫名其妙地错位"。

## 二、基础图形

### 1. 图形一览

| 标签 | 作用 | 关键属性 |
| --- | --- | --- |
| `rect` | 矩形 | `x y width height rx ry`（圆角） |
| `circle` | 圆 | `cx cy r` |
| `ellipse` | 椭圆 | `cx cy rx ry` |
| `line` | 直线 | `x1 y1 x2 y2` |
| `polyline` | 折线 | `points="x1,y1 x2,y2 ..."` |
| `polygon` | 多边形 | `points="..."`（自动闭合） |
| `path` | 任意路径 | `d="..."` |
| `text` | 文本 | `x y font-size` |
| `g` | 分组 | 把多个元素归组统一变换/样式 |

```html
<svg width="300" height="150">
  <circle cx="50" cy="60" r="30" fill="#e74c3c" />
  <ellipse cx="80" cy="60" rx="40" ry="20" fill="#3498db" />
  <polygon points="120,20 160,100 80,100" fill="#f39c12" />
  <line x1="180" y1="20" x2="260" y2="80" stroke="#9b59b6" stroke-width="3" />
</svg>
```

### 2. `g` 分组的妙用

把一组图形放进 `<g>`，一次施加变换与样式，是绘制复杂图标/图表的前提：

```html
<g fill="none" stroke="#333" stroke-width="2">
  <rect x="10" y="10" width="40" height="40" />
  <rect x="50" y="10" width="40" height="40" />
  <rect x="10" y="50" width="40" height="40" />
</g>
```

## 三、路径 Path

`d` 属性是 SVG 最强大的绘制语法，用**命令字母+坐标**描述轨迹。

### 1. 关键命令

| 命令 | 含义 | 示例 |
| --- | --- | --- |
| `M x y` | 移动到（不画线） | `M 10 10` |
| `L x y` / `l dx dy` | 画直线（绝对/相对） | `L 100 50` |
| `H x` / `V y` | 水平/垂直直线 | `V 100` |
| `C` / `S` | 三次贝塞尔曲线 | `C x1 y1 x2 y2 x y` |
| `Q` / `T` | 二次贝塞尔曲线 | `Q cx cy x y` |
| `A rx ry rot large sweep x y` | 椭圆弧 | 见下 |
| `Z` | 闭合路径 | 回到起点 |

### 2. 画一个简单路径

```html
<svg width="200" height="120">
  <path d="M 10 90 L 60 20 L 110 90 L 160 40"
        fill="none" stroke="#2ecc71" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" />
</svg>
```

### 3. 弧命令（A）—— 容易被忽略的难点

```
A rx ry x-axis-rotation large-arc-flag sweep-flag x y
```

- `large-arc-flag`：0 取小弧、1 取大弧。
- `sweep-flag`：0 逆时针、1 顺时针。

```html
<path d="M 10 60 A 50 50 0 0 1 110 60"
      fill="none" stroke="#e67e22" stroke-width="3" />
```

## 四、样式与填充

### 1. 属性 vs CSS

SVG 元素既可用**属性**设置，也可用 **CSS** 设置（二者可分层，CSS 优先）：

```html
<style>
  .fill-red { fill: #e74c3c; }
  .stroke-dashed { stroke-dasharray: 6 4; }
</style>

<rect class="fill-red" x="10" y="10" width="50" height="50" />
<circle cx="90" cy="35" r="25" class="stroke-dashed" fill="#eee" stroke="#34495e" />
```

常用样式属性：`fill`（填充色/`none`）、`stroke`（描边色）、`stroke-width`、`stroke-linecap`、`stroke-linejoin`、`stroke-dasharray`、`fill-opacity`、`stroke-opacity`、`opacity`。

### 2. 渐变与图案

```html
<defs>
  <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#f5576c" />
    <stop offset="1" stop-color="#4facfe" />
  </linearGradient>
</defs>
<rect width="200" height="80" fill="url(#lg)" />
```

## 五、变换 transform

`transform` 支持 `translate`、`scale`、`rotate`、`skewX/Y`，与 CSS / Canvas 概念一致但**属性写法不同**：

```html
<!-- 平移 (20,10)，再缩放成 1.5 倍 -->
<rect x="10" y="10" width="40" height="40"
      transform="translate(20, 10) scale(1.5)" fill="#3498db" />
```

要点：
- 多个变换按**书写顺序从右到左应用**（先 scale 后 translate）。
- 典型技巧：想绕元素自身中心旋转，先 `translate` 到中心再 `rotate`。

```html
<!-- 绕 (100,100) 旋转 45° -->
<g transform="translate(100 100) rotate(45)">
  <rect x="-20" y="-20" width="40" height="40" />
</g>
```

## 六、动画与交互

### 1. CSS 动画

SVG 图形是 DOM，天然可应用 CSS 动画：

```html
<style>
  @keyframes pulse {
    from { r: 20; opacity: .8; }
    to   { r: 40; opacity: .2; }
  }
  circle { animation: pulse 1.5s infinite; }
</style>
<svg width="200" height="120">
  <circle cx="100" cy="60" fill="#e74c3c" />
</svg>
```

> CSS 的 `r`、`fill`、`stroke` 等 SVG 属性通常可用 CSS 动画（现代浏览器支持 `r` 属性动画）。

### 2. 事件与交互

因为是 DOM，直接加事件监听即可，无需像 Canvas 那样做坐标命中检测：

```html
<svg width="200" height="120" id="panel">
  <circle id="dot" cx="100" cy="60" r="30" fill="#3498db" />
</svg>
```

```js
document.getElementById("dot").addEventListener("click", (e) => {
  console.log("clicked at", e.clientX, e.clientY);
});
```

### 3. 内置 SMIL 动画小结

`<animate>`、`<animateTransform>` 等 SMIL 语法可驱动 SVG，但复杂度与兼容考虑下，**更推荐 CSS/JS（Web Animations API）动画**。

## 七、在图表与图标中的应用

### 1. 为什么很多"新图表库"走 SVG

- **节点即数据**：每个数据点对应一个元素，便于绑定事件、更新局部。
- **可缩放清晰**：矢量，适配各分辨率。
- **CSS 驱动样式/动画**：生态成熟、性能可接受（节点量适中时）。

### 2. 用 SVG 手写一个简单柱状图

```html
<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
  <rect x="20"  y="120" width="40" height="100" fill="#4a90d9" />
  <rect x="80"  y="80"  width="40" height="140" fill="#50b7d9" />
  <rect x="140" y="140" width="40" height="80"  fill="#e67e22" />
  <rect x="200" y="40"  width="40" height="180" fill="#2ecc71" />
</svg>
```

### 3. 图标库原理

大多数图标（Font Awesome、SVG sprite）本质就是一段 `<path>` 提取成组件/雪碧图，通过 `fill` 换色：

```html
<svg viewBox="0 0 24 24" width="24" height="24">
  <path fill="currentColor"
        d="M12 2 L2 7 L12 12 L22 7 Z M2 17 L12 22 L22 17 L22 12 L12 17 L2 12 Z" />
</svg>
```

## 八、SVG 与 Canvas 对比（再深化）

| 维度 | SVG | Canvas |
| --- | --- | --- |
| 模型 | 保留模式（节点常驻文档） | 立即模式（绘制即弃） |
| 存储 | 每个图形都是 DOM，占用内存（节点多时高） | 只有像素，无节点 |
| 缩放 | 矢量清晰 | 位图放大失真（需 DPR 适配） |
| 事件 | 天然 DOM 事件 | 需手工命中检测 |
| 更新 | 修改属性即可局部更新 | 需整屏/区域重绘 |
| 性能拐点 | 几千+节点开始吃力 | 更适合大量图形频繁刷新 |

**决策口诀**：**少而交互、要缩放不失真 → SVG；多而高频更新 → Canvas。** 大型复杂可视化常两者结合。

## 小结

- SVG 是**声明式矢量图**，图形即 DOM，`viewBox` 撑起"一图多用、缩放清晰"。
- 掌握 `rect/circle/path/line/polygon/g` 也就掌握了基础绘图；真正的核心是 **`path` 与 `d` 命令**。
- 样式既可用属性也可用 CSS；`transform` 遵循从右到左的复合语义。
- 交互天然、动画可走 CSS，是图表的轻量载体。
- 与 Canvas 的取舍核心：**节点数与更新频率、是否需要矢量可缩放**。

## 最小实现：手写极简坐标映射与 SVG 元素生成

到 `code/frontend/10-visualize` 打开 `svg-chart.html`，用数据数组手工生成 `<rect>` / `<polyline>` 等 SVG 节点拼出柱状图与折线图。关键三步：

- 求出数据 min/max，把业务值线性映射到画布坐标——这正是一张图表坐标系的本质；
- 用 `document.createElementNS` 逐个创建元素并设置 `x` / `y` / `width` / `height` / `points` 属性；
- 因为图形就是 DOM，demo 里顺带演示"改一个属性即局部更新"。

原理一句话：SVG 是保留模式的矢量图，节点常驻文档、改属性即局部变化，与 Canvas"重绘整个像素区域"的成本模型正好相反——这是两者选型的核心依据。

## 面试衔接

本节对应 `90-附录-面试体系` 的「可视化」阶段（118"Canvas、SVG、WebGL 的区别？如何按场景选择？"）：`viewBox` 世界坐标映射、`path` 及其 `d` 命令、`transform` 复合顺序、节点即 DOM 带来的交互与性能拐点都要能讲清。做真题自测后，进入下一节 `04-WebGL 与 Three.js`。