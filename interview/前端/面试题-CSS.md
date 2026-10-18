# 面试题 · CSS

## 1. 隐藏元素的方法有哪些

| 方式 | 占据空间 | 响应事件 | 是否触发重排 |
| --- | --- | --- | --- |
| `display: none` | 否 | 否 | 是（从渲染树移除） |
| `visibility: hidden` | 是 | 否 | 否（只重绘） |
| `opacity: 0` | 是 | **是** | 否（走合成层） |
| `position: absolute` 移出视口 | 否（脱离文档流） | 是 | 是 |
| `transform: scale(0)` | 是 | 否 | 否 |
| `clip-path` / `clip` | 是 | 否 | 否 |

- 记忆主线：**display none 彻底消失；visibility 占位但不可交互；opacity 占位且可交互**（透明但还在）。
- 追问：`visibility: hidden` 的子元素设 `visibility: visible` 可单独显示，display/opacity 做不到；读屏（无障碍）对三者的可访问性表现也不同——display none 读屏跳过，opacity: 0 仍可被读到并可聚焦。

## 2. 对盒模型的理解

- **组成**：content → padding → border → margin。
- **两种模型**（width/height 包含范围不同）：

| | width 包含 | box-sizing |
| --- | --- | --- |
| 标准盒模型 | 仅 content | `content-box`（默认） |
| IE（怪异）盒模型 | content + padding + border | `border-box` |

- **实践**：项目统一 `* { box-sizing: border-box }`——写 width 时所见即所得，不必心算 padding/border 加成。

## 3. 对 BFC 的理解，如何创建 BFC

- **定义**：块级格式化上下文——一块独立的布局区域，内部元素按规则布局，**不影响外部**。
- **触发条件**（满足其一）：
  - 根元素；
  - `float` ≠ none；
  - `position`: absolute / fixed；
  - `display`: inline-block / table-cell / flex / **flow-root**（专治 BFC 的新值，无副作用）；
  - `overflow`: hidden / auto / scroll。
- **核心作用**（三个高频场景）：
  - **清除浮动/高度塌陷**：父元素触发 BFC 后计算高度会包含浮动子元素；
  - **解决 margin 重叠**：相邻元素 margin 会折叠，包一层 BFC 容器即隔开；
  - **自适应两栏布局**：BFC 区域不与浮动元素重叠。
- 追问：`overflow: hidden` 触发 BFC 有副作用（裁掉溢出内容、无法做下拉溢出菜单），**`display: flow-root` 是无副作用的现代首选**。

## 4. 清除浮动的方案

浮动导致的问题：父元素**高度塌陷**、后续元素环绕。

- **方案对比**：
  - 末尾空 div + `clear: both`：简单但多无意义标签；
  - **伪元素法（主流）**：
    ```css
    .clearfix::after {
      content: "";
      display: block;
      clear: both;
    }
    ```
  - 父元素 `overflow: hidden`：触发 BFC 包住浮动，副作用是裁溢出；
  - 父元素 `display: flow-root`：现代首选，无副作用；
  - 直接不用浮动：flex/grid 布局替代（浮动本为文字环绕设计，做布局是历史用法）。

## 5. position 的属性有哪些，区别是什么

| 值 | 定位基准 | 是否脱离文档流 |
| --- | --- | --- |
| `static` | 默认，正常文档流，忽略 top/left/z-index | 否 |
| `relative` | **自身原位置**偏移 | 否（保留占位） |
| `absolute` | **最近的非 static 祖先** | 是 |
| `fixed` | 视口 viewport | 是 |
| `sticky` | 正常流内，滚动过**阈值**后按 `top` 等粘住 | 否（占位保留） |

- `absolute` 的定位基准找不到非 static 祖先时，退化为相对**初始包含块**（html）。
- `fixed` 的坑：祖先带 `transform` / `filter` / `will-change` 时，fixed 会改为相对该祖先定位（层叠上下文改变包含块）——移动端弹窗内 fixed 失灵的常见根因。
- `sticky` 必须指定 `top/right/bottom/left` 之一才生效；父容器 overflow: hidden 会让其失效。

## 6. 如何实现水平垂直居中

- **结论：flex 一行搞定，是默认答案**：

```css
.parent {
  display: flex;
  justify-content: center;  /* 水平 */
  align-items: center;      /* 垂直 */
}
```

- 其他方案（面试要求说 3 种以上）：
  - **grid**：`place-items: center`（最短写法）；
  - **absolute + transform**（不知道子元素尺寸也能用）：
    ```css
    .child {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    ```
  - absolute + `margin: auto`（子元素需定宽高）；
  - absolute + 负 margin（需知道子元素具体尺寸，硬编码不推荐）；
  - 文本类：`text-align: center` + `line-height` 等于高度（仅单行文本）。
- 追问：absolute+transform 不需知道宽高（translate 百分比相对自身）；transform 触发合成不重排，动画场景更优。

## 7. Flex 布局了解过吗

- **容器属性**：
  - `justify-content`：主轴对齐（center / space-between / space-around）；
  - `align-items`：交叉轴对齐；
  - `flex-direction`：主轴方向（row / column）；
  - `flex-wrap`：是否换行；
  - `align-content`：多行时的整体对齐。
- **项目属性**：
  - `flex: 1` = `flex: 1 1 0%`（**grow 放大、shrink 缩小、basis 基准 0**）——剩余空间全分给该项；
  - `flex: auto` = `1 1 auto`（基准为内容宽，再分配剩余）；
  - `flex: none` = `0 0 auto`（不伸缩，固定内容尺寸）；
  - `align-self`：单个项目覆盖 align-items；
  - `order`：调整排列顺序（默认 0，小的在前）。
- **高频追问**：
  - `flex-basis` 与 `width`：basis 优先于 width（主轴上），`flex-basis: auto` 才回退看 width；
  - `flex: 1` 与 `flex: auto` 的区别：前者 basis=0 各项**等分**容器，后者 basis=auto 先按内容再分剩余；
  - 三属性简写省略的默认值：grow=1、shrink=1、basis=0%（`flex: 2` 即 2 1 0%）。

## 8. 两栏 / 三栏布局（左右固定、中间自适应）

- **Flex（现代默认解）**：
  ```css
  .box { display: flex; }
  .left, .right { width: 200px; }
  .center { flex: 1; }
  ```
- **Grid**：`grid-template-columns: 200px 1fr 200px`。
- **浮动 + BFC**：左右浮动定宽，中间 `overflow: hidden` 触发 BFC 不与浮动重叠（中间在 DOM 中放最后）。
- **圣杯 / 双飞翼（传统考点，说得出原理即可）**：
  - 共同点：三栏都 float，左右用**负 margin**拉到与中间并排；
  - 区别：中间内容防遮挡的处理——圣杯用父容器 padding + 左右 relative 回位；双飞翼在中间栏内再套一层 div 用 margin 腾空间；
  - 追问价值：为什么中间栏 DOM 要写在前面——**重要内容优先加载/渲染**（也是圣杯双飞翼存在的初衷）。

## 9. 回流与重绘

- **回流（reflow / re-layout）**：几何属性变化（宽高、位置、增删节点、读 offsetTop 等）→ 重新计算布局，**开销大**，且可能级联（父变子变）。
- **重绘（repaint）**：仅视觉属性变化（color、background、visibility）→ 重新绘制，不重排，开销较小。
- **composite（合成）**：`transform` / `opacity` 只触发合成（GPU 层），**不回流不重绘**——动画首选。
- **为什么用 translate 而不是定位改位置**：
  - top/left 改动触发回流 → 重绘 → 合成，全流程走一遍；
  - transform 直接在合成层完成，CPU 不参与布局计算，动画更流畅。
- **减少回流的实践**：
  - 批量改样式（加 class 而非逐条改 style）；
  - 读写分离：先批量读布局信息（offsetTop），再批量写——避免读写交替造成**强制同步布局**；
  - 频繁动画的元素 `position: absolute` / `fixed` 脱离文档流，缩小回流范围；
  - 复杂动画用 transform/opacity；必要时 `will-change` 提前建层（别滥用，图层多了反而吃内存）。

## 10. transition 与 animation 的区别

| | transition | animation |
| --- | --- | --- |
| 触发 | 需要**状态变化**（hover、class 切换） | 可自动播放 |
| 关键帧 | 只有起止两个状态 | `@keyframes` 任意多帧 |
| 循环/方向 | 不支持 | 支持 `infinite` / `alternate` / 暂停 |
| JS 控制 | 简单（改属性即触发） | 复杂（play state / Web Animations API） |
| 事件 | `transitionend` | `animationend` / `animationiteration` |

- 选型：交互反馈（hover、展开收起）用 transition；自动播放、多帧编排、循环动效用 animation。

## 11. 常见的 CSS 布局单位

- **px**：固定像素（CSS 像素，受 DPR 影响映射物理像素）。
- **%**：相对**祖先元素**（个别相对自身：translate、border-radius）。
- **em**：相对**自身或父元素**的 font-size（嵌套会复利，慎用）。
- **rem**：相对**根元素** html 的 font-size——移动端适配主力的原因：全局只有一处基准。
- **vw / vh**：相对**视口**宽/高（100vw = 满宽）；vmin/vm 取小/大边。
- 追问：vw 与 % 的区别——% 相对祖先，vw 恒相对视口（父级多窄都不影响）；100vh 在移动端地址栏收展时会跳变，可用 `100dvh`（dynamic viewport height）。

## 12. 物理像素、逻辑像素与像素密度（DPR）

- **物理像素**：设备出厂即固定的发光单元数（iPhone 6/7/8 为 750×1334）。
- **逻辑像素（CSS 像素）**：开发时写的 px（同机型为 375×667）——`window.innerWidth` / 设计稿视角。
- **DPR（devicePixelRatio）**= 物理像素 / 逻辑像素（该机型 = 2）。
- **为什么需要 @2x/@3x 图**：1 个 CSS 像素对应 2~3 个物理像素，1x 图被拉伸到多倍屏会模糊——提供 2x/3x 资源保证一个图片像素至少对应一个物理像素。

## 13. 如何解决 1px 问题

- **原因**：CSS 的 1px 在 DPR=2 的屏上用 2 个物理像素渲染，视觉偏粗——CSS 像素 ≠ 物理像素。
- **方案**：
  - **伪元素 + scale（主流）**：`::after` 画 1px 边框再 `transform: scaleY(0.5)`（或整体 scale(0.5)），物理像素级精度，推荐；
  - 直接写 `0.5px`：Safari/Firefox 支持度参差，低版本浏览器直接忽略（变无边框）；
  - **viewport 缩放**：`initial-scale = 1/DPR` 整页缩放——1px 精确了，但文字图片也被无差别缩小，副作用大（老项目 rem 方案里常见，新项目少用）。

## 14. 如何判断元素进入可视区域

- **传统方案（getBoundingClientRect / 偏移量计算）**：
  - `rect.top < window.innerHeight && rect.bottom > 0` 即在视口内（比 offsetTop+scrollTop 组合更直接）；
  - 缺点：scroll 事件高频触发，需节流。
- **IntersectionObserver（现代首选）**：
  - 异步观察交叉状态，不阻塞主线程、不监听 scroll；
  - `new IntersectionObserver(entries => {...}).observe(el)`，`entry.isIntersecting` 判断可见；
  - 应用：图片懒加载、曝光埋点、无限滚动。
