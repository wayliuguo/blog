# Canvas 基础

> 级别：中级

按本书四层推进：

- **入门使用**：写 `<canvas>` 并用 2D 上下文调用 `fillRect` / `arc` / `fillText` 等 API 画基础图形即可；
- **进阶**：吃透"立即模式、位图"这两条本质，掌握 `save/restore`、变换、图像与 `getImageData` 的交互与安全边界；
- **实战**：用 Canvas 手写柱状图 / 折线图，并用 `requestAnimationFrame` 跑通"清屏 → 重绘 → 循环"的逐帧动画，配离屏缓存与 DPR 做性能兜底；
- **最小实现掌握原理**：到 `code/frontend/10-visualize` 运行 `canvas-chart.html`、`raf-particles.html` 两个 demo，亲手验证 Canvas 的绘制与重绘最小闭环。

在前端，绘制图形大致有两条主流路线：一是声明式的 **SVG**（由 DOM 描述），二是命令式的 **Canvas**（用 JS 逐像素绘制）。Canvas 凭借"那块可以随便画的画布"，在图表、游戏、图像处理、粒子特效、可视化大屏等领域占据核心地位。理解了 Canvas，你就掌握了浏览器端高性能绘图的底层能力。

这篇文章从 Canvas 最基础的概念讲起，逐步覆盖图形、颜色、文本、图像、变换与动画，最后给出高性能渲染与高 DPI（DPR）适配的工程实践。

## 一、Canvas 简介

### 1. 什么是 Canvas

**Canvas** 是 HTML5 提供的一个"位图画布"元素。它本身只是页面上的一块空白区域，真正绘制靠的是 **Canvas 2D 上下文（`getContext('2d')`）** 提供的一整套图形 API。

```html
<canvas id="myCanvas" width="800" height="400"></canvas>
```

```js
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
```

核心特点：
- **立即模式（immediate mode）**：调用 API 立刻把像素画到画布上，绘制后不留"图形对象"记录。
- **位图**：基于像素，放大或缩到过小会失真。
- **高性能**：适合大量图形、逐帧动画、像素级操作。

### 2. 坐标系

Canvas 坐标系以**左上角为原点**，`x` 向右、`y` 向下增大，单位是像素。

```js
// (0,0) 在左上角，(width, height) 在右下角
ctx.fillRect(100, 50, 200, 100); // 从(100,50)开始，宽200高100的矩形
```

## 二、绘制基础图形

### 1. 矩形

矩形是最基本的图形，有**三种画法**：描边、填充、清除。

```js
// 填充矩形
ctx.fillStyle = "#4a90d9";
ctx.fillRect(20, 20, 150, 100);

// 描边矩形
ctx.strokeStyle = "#e67e22";
ctx.lineWidth = 4;
ctx.strokeRect(200, 20, 150, 100);

// 清除一块矩形（清成透明）
ctx.clearRect(150, 50, 40, 40);
```

### 2. 路径（Path）

路径是 Canvas 最灵活的绘制手段，包括"开始路径 → 画线/曲线 → 封闭 → 填充/描边"几个阶段。

```js
ctx.beginPath();               // 开始一个新路径
ctx.moveTo(300, 300);          // 移动到起始点
ctx.lineTo(400, 200);          // 画直线到 (400,200)
ctx.lineTo(500, 300);          // 直线到 (500,300)
ctx.closePath();               // 闭合路径
ctx.strokeStyle = "#2ecc71";
ctx.lineWidth = 2;
ctx.stroke();                  // 描边
// ctx.fillStyle = "rgba(46,204,113,0.4)"; ctx.fill(); // 也可填充
```

常用路径 API：`moveTo`、`lineTo`、`arc`、`arcTo`、`bezierCurveTo`、`quadraticCurveTo`、`rect`。

### 3. 圆形 / 弧线

用 `arc(x, y, radius, startAngle, endAngle, 是否逆时针)` 绘制，**角度单位是弧度**。

```js
ctx.beginPath();
// (300,150) 圆心，半径80，0 到 2π 即整圆；Math.PI/2 即 90° 转到 270° 会得到半圆
ctx.arc(300, 150, 80, 0, Math.PI * 2);
ctx.fillStyle = "#9b59b6";
ctx.fill();
```

画一个"弧度"：

```js
ctx.beginPath();
ctx.arc(300, 150, 60, 0, Math.PI * 1.5); // 到 270° 处
ctx.strokeStyle = "#34495e";
ctx.stroke();
```

## 三、颜色与渐变

### 1. 颜色

通过 `fillStyle` / `strokeStyle` 设置，支持颜色名、`#hex`、`rgb()` / `rgba()` 等所有 CSS 颜色写法。

```js
ctx.fillStyle = "red";
ctx.fillStyle = "#ff6600";
ctx.fillStyle = "rgba(0, 128, 255, 0.6)"; // 半透明
```

### 2. 线性渐变

```js
const linear = ctx.createLinearGradient(0, 0, 200, 0); // (x0,y0)→(x1,y1)
linear.addColorStop(0, "#f5576c");
linear.addColorStop(0.5, "#f093fb");
linear.addColorStop(1, "#4facfe");
ctx.fillStyle = linear;
ctx.fillRect(0, 0, 200, 100);
```

### 3. 径向渐变

```js
const radial = ctx.createRadialGradient(150, 150, 10, 150, 150, 100);
radial.addColorStop(0, "#fff5a1");
radial.addColorStop(1, "#ffce00");
ctx.fillStyle = radial;
ctx.fillRect(100, 100, 100, 100);
```

## 四、绘制文本

```js
ctx.font = "bold 24px 'Microsoft YaHei', sans-serif";
ctx.fillStyle = "#333";
ctx.textAlign = "center";   // start / center / end
ctx.textBaseline = "middle"; // top / middle / bottom

// 填充文本
ctx.fillText("你好，Canvas！", 400, 200);

// 仅描边文本
ctx.strokeStyle = "#e74c3c";
ctx.strokeText("OUTLINE", 400, 260);

// 测量文本宽度（可用于居中/布局）
const metrics = ctx.measureText("你好");
console.log(metrics.width);
```

## 五、绘制图像

### 1. 基础绘制图片

可以绘制 `Image` 对象、`<img>` 元素、另一个 `<canvas>`、`<video>` 等图像源。

```js
const img = new Image();
img.src = "/assets/logo.png";
img.onload = () => {
  // 基本绘制：9 参数可精确控制裁剪+缩放
  ctx.drawImage(img, 0, 0, 200, 100);
  // 9 参数：drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) —— 源区裁剪后绘制
};
```

### 2. 内容安全与跨域

如果图片来自其他域名且需要读取像素（`getImageData` / `toDataURL`），必须解决跨域：

```js
img.crossOrigin = "anonymous";
img.src = "https://api.example.com/img/logo.png";
```

并且服务器需返回 `Access-Control-Allow-Origin`，否则画布会被"污染"（tainted），读取像素会抛安全错误。

## 六、变换与动画

### 1. 状态保存与恢复

`save()` / `restore()` 把当前**上下文状态**（样式、变换等）压栈/出栈，便于隔离，是动画里的惯用法。

```js
ctx.save();
ctx.translate(100, 100);
ctx.rotate(Math.PI / 4);
ctx.scale(1.5, 1.5);
ctx.fillRect(0, 0, 50, 50);
ctx.restore(); // 恢复变换，不影响后续绘制
```

### 2. 常用变换

```js
ctx.translate(x, y);   // 平移
ctx.rotate(rad);       // 旋转（弧度）
ctx.scale(sx, sy);     // 缩放
ctx.transform(a, b, c, d, e, f); // 通用矩阵变换
```

### 3. 基础动画循环

Canvas 动画本质是"清屏 → 重绘 → 循环"。每个循环用 `requestAnimationFrame`（见第三节），避免使用 `setInterval`：

```js
let angle = 0;
function draw(timestamp) {
  // 清空（或部分清除）
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const x = 100 + Math.cos(angle) * 80;
  const y = 150 + Math.sin(angle) * 80;

  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#3498db";
  ctx.fill();

  angle += 0.02;
  requestAnimationFrame(draw); // 请求下一帧
}
requestAnimationFrame(draw);
```

## 七、高性能渲染技巧

### 1. 认识绘制性能瓶颈

Canvas 频繁绘制很吃 GPU/CPU，优化目标是**减少每帧的绘制工作量**与**避免重复请求浏览器布局**。

### 2. 离屏 Canvas（Offscreen Canvas）缓存

把"每帧几乎不变的静态部分"预先绘制到**离屏 canvas**，每帧只需把整个离屏画布 `drawImage` 到屏幕一次，大幅减少绘制调用。

```js
// 离屏画布：一次性画好静态背景或复杂图形
const offscreen = document.createElement("canvas");
offscreen.width = canvas.width;
offscreen.height = canvas.height;
const octx = offscreen.getContext("2d");
octx.fillStyle = "url(...)"; // 绘制复杂的静态内容...
octx.arc(200, 150, 60, 0, Math.PI * 2);
octx.stroke();

// 每帧只拷贝整块离屏内容
function draw(timestamp, dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offscreen, 0, 0); // 一次 drawImage 完成静态部分
  // 再绘制动态动画对象 ...
  requestAnimationFrame(draw);
}
```

### 3. requestAnimationFrame：与帧率同步

相比 `setInterval(fn, 16)`，`requestAnimationFrame`（rAF）的优势：

- **自动匹配屏幕刷新率**（通常 60Hz），避免掉帧/撕裂。
- **页面不可见时自动暂停**，省电省性能。
- 回调收到精确的**时间戳**，可用于计算匀速运动。

```js
let last = 0;
function tick(timestamp) {
  const dt = timestamp - last; // 上一帧到这一帧的毫秒数
  last = timestamp;
  // 用 dt 计算位移，保证不同刷新率下速度一致
  update(dt);
  draw();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

### 4. 其他性能要点

- **缩小涂抹区域**：只在脏区 `clip` / 局部重绘，避免每帧全量 `clearRect`。
- **减少状态切换**：按颜色/线宽分组批量绘制，避免频繁改 `fillStyle`。
- **避免每帧创建对象**：`gradient`、`Path2D` 等复用实例。
- **大项目可考虑 WebGL**：数千上万粒子的场景，Canvas 2D 力不从心，交给 WebGL。
- **避免强行读像素**：`getImageData` 会触发管道同步、拖慢帧率。

## 八、Canvas 与 SVG 对比

| 维度 | Canvas | SVG |
| --- | --- | --- |
| 渲染模型 | 立即模式（命令绘制） | 保留模式（DOM 节点声明） |
| 本质 | 位图（像素） | 矢量（可无限缩放不失真） |
| 与 DOM 的关系 | 无 DOM 节点 | 每个图形都是 DOM 节点 |
| 事件绑定 | 需自行命中检测（坐标判断） | 天然支持事件冒泡/独立交互 |
| 性能 | 大量图形、高频更新占优 | 元素多/频繁改 DOM 时变慢 |
| 适用场景 | 游戏、图表大数据、粒子、逐帧动画 | 图标、Logo、简单图表、地图标注 |
| 缩放 | 放大可能失真 | 清晰矢量 |

**选择建议**：图形数量多、帧率高、要像素级控制 → **Canvas**；图形少、要交互性强、要可缩放不失真 → **SVG**。两者也可混用（如"SVG 图标 + Canvas 大图"）。

## 九、Canvas 大小与 DPR 适配

### 1. 大小 vs 显示尺寸

- **CSS 尺寸**（`width/height` 样式）控制画布的**显示大小**。
- **属性尺寸**（`canvas.width` / `height`）控制**实际像素分辨率**。
- 两者不一致会拉伸/模糊。

### 2. 高 DPR（视网膜屏幕）适配

高清屏（DPR≥1）下，CSS 1 像素对应多个物理像素，直接把 Canvas 画到 CSS 尺寸会**模糊**。标准解法：**把画布像素分辨率放大到 物理像素，再按 DPR 缩小显示**。

```js
function setupCanvas(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  // 物理像素 = CSS 尺寸 × DPR
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  // CSS 尺寸保持原样
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  // 坐标系整体放大到物理像素
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}

const canvas = document.getElementById("myCanvas");
const ctx = setupCanvas(canvas, 800, 400);
// 此后所有绘制都按 CSS 像素坐标书写即可获得高清清晰度
ctx.fillRect(0, 0, 800, 400);
```

> 要点：`ctx.scale(dpr, dpr)` 后，后续绘图逻辑完全以 CSS 像素为准，由缩放统一映射到物理像素，既清晰又不用改业务坐标。

### 3. 窗口缩放响应

窗口尺寸变化时，需重设尺寸并重绘：

```js
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const ctx = setupCanvas(canvas, rect.width, rect.height);
  redraw(ctx);
}
window.addEventListener("resize", resize);
```

## 小结

- **Canvas** 是命令式、位图式的高性能绘图 API，坐标系原点在左上角。
- 掌握**矩形、路径、弧形、渐变、文本、图像**等基础绘制，就能覆盖绝大多数图表与大屏需求。
- 动画用 **`requestAnimationFrame`**，配合**离屏缓存**与**局部重绘**换取稳定帧率。
- 与 **SVG** 的取舍看"图形量/更新频率/是否需缩放不失真"。
- **高 DPR 适配**是清晰度的关键：`canvas.width = cssWidth × dpr` + `ctx.scale(dpr, dpr)`。

## 最小实现：Canvas 的"画 + 重绘"最小闭环

到 `code/frontend/10-visualize` 启动后打开两个 demo：

- `canvas-chart.html` —— 用原生 Canvas 2D 手写坐标折线图：算好像素坐标、画轴线/刻度/折线，演示"命令式逐笔绘制"与按数据重绘；
- `raf-particles.html` —— 一个用 `requestAnimationFrame` 驱动的粒子动画：每帧先 `clearRect` 清屏、更新粒子位置、再全部重画，直观呈现 Canvas 动画的本质是"清屏 → 重绘 → 循环"。

原理一句话：Canvas 是立即模式位图，绘制即弃、不留对象；要让画面动起来，就得靠 rAF 每帧整体或局部重绘，再叠加离屏缓存降低每帧工作量。

## 面试衔接

本节对应 `90-附录-面试体系` 的「可视化」阶段（118"Canvas、SVG、WebGL 的区别？如何按场景选择？"、119"如何用 Canvas 实现一个高性能的可视化图表？"）：Canvas 立即模式/位图本质、基础绘制与坐标系、`requestAnimationFrame` 逐帧动画、离屏缓存与 DPR 适配都要能讲清。做真题自测后，进入下一节 `02-数据可视化与图表库`。