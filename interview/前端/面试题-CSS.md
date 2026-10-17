# 面试题 · CSS

## 1. CSS 选择器及优先级

**优先级从高到低**：

| 优先级 | 选择器 |
| --- | --- |
| 最高 | `!important` |
| 行内样式 | `style="..."` |
| 100 | id 选择器 `#id` |
| 10 | 类 / 伪类 / 属性选择器 `.class` `:hover` `[type]` |
| 1 | 标签 / 伪元素 `div` `::before` |
| 0 | 通配符 `*`、组合符、继承值 |

- **计算规则**：按 (a, b, c) 三元组逐级比较——a=行内、b=id 个数、c=类/伪类/属性个数、d=标签/伪元素个数；**不能进位**（11 个 class 压不过 1 个 id）。
- 同级冲突看**源码顺序**，后者覆盖。
- **追问**：解析顺序是**从右往左**——先命中最右侧节点再向上验证，缩小匹配范围（`.box a` 先找所有 a 再筛祖先）；所以选择器不宜写过长。
- 继承属性（color/font）优先级最低，`*` 和 `!important` 都能覆盖继承值。

## 2. display 的 block / inline / inline-block

| | 换行 | 设置宽高 | 默认宽度 |
| --- | --- | --- | --- |
| `block` | 独占一行 | 可以 | 撑满父容器 |
| `inline` | 不换行 | **无效**（水平 margin/padding 部分生效，垂直不生效） | 由内容决定 |
| `inline-block` | 不换行 | 可以 | 由内容决定 |

- 典型行内：`a span strong em`；典型行内块：`img input button`。
- **追问**：inline 设置垂直 padding/margin 视觉上不撑开行盒、会溢出父容器；行内元素间换行产生**空白间隙**（font-size: 0 或去掉标签间换行可解）。

## 3. 隐藏元素的方法有哪些

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

## 4. 对盒模型的理解

- **组成**：content → padding → border → margin。
- **两种模型**（width/height 包含范围不同）：

| | width 包含 | box-sizing |
| --- | --- | --- |
| 标准盒模型 | 仅 content | `content-box`（默认） |
| IE（怪异）盒模型 | content + padding + border | `border-box` |

- **实践**：项目统一 `* { box-sizing: border-box }`——写 width 时所见即所得，不必心算 padding/border 加成。

## 5. 对 BFC 的理解，如何创建 BFC

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

## 6. 清除浮动的方案

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

## 7. position 的属性有哪些，区别是什么

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

## 8. 如何实现水平垂直居中

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

## 9. Flex 布局了解过吗

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

## 10. 两栏 / 三栏布局（左右固定、中间自适应）

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

## 11. 对层叠上下文的理解

- **定义**：决定元素在 z 轴上的渲染顺序的三维概念。同一层叠上下文内按规则比较，不同上下文之间**整体比较**（内部 z-index 再大也翻不出父上下文）。
- **形成条件**（常用）：
  - 根元素（html）；
  - `position` 为 absolute/fixed/sticky **且 z-index ≠ auto**；
  - `z-index` ≠ auto 的 flex/grid 子项；
  - `opacity` < 1、`transform` / `filter` / `will-change` / `isolation: isolate` 等。
- **同一上下文内的比较顺序**：z-index 正数 → 按出现顺序 → 普通流内块级 → 浮动 → inline → z-index: 0/auto → 负数 → 背景边框（自上而下，先绘制在下层）。
- **高频追问（z-index 为什么"失灵"）**：
  - 父元素形成层叠上下文，子元素 z-index 再大也只在父上下文内比较；
  - 对方元素也形成上下文且父级 z-index 更高/更靠后；
  - `opacity: 0.99`、`transform` 这类"隐形"触发条件——排查时先看祖先是否意外创建了上下文。

## 12. 回流与重绘

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

## 13. transition 与 animation 的区别

| | transition | animation |
| --- | --- | --- |
| 触发 | 需要**状态变化**（hover、class 切换） | 可自动播放 |
| 关键帧 | 只有起止两个状态 | `@keyframes` 任意多帧 |
| 循环/方向 | 不支持 | 支持 `infinite` / `alternate` / 暂停 |
| JS 控制 | 简单（改属性即触发） | 复杂（play state / Web Animations API） |
| 事件 | `transitionend` | `animationend` / `animationiteration` |

- 选型：交互反馈（hover、展开收起）用 transition；自动播放、多帧编排、循环动效用 animation。

## 14. 常见的 CSS 布局单位

- **px**：固定像素（CSS 像素，受 DPR 影响映射物理像素）。
- **%**：相对**祖先元素**（个别相对自身：translate、border-radius）。
- **em**：相对**自身或父元素**的 font-size（嵌套会复利，慎用）。
- **rem**：相对**根元素** html 的 font-size——移动端适配主力的原因：全局只有一处基准。
- **vw / vh**：相对**视口**宽/高（100vw = 满宽）；vmin/vm 取小/大边。
- 追问：vw 与 % 的区别——% 相对祖先，vw 恒相对视口（父级多窄都不影响）；100vh 在移动端地址栏收展时会跳变，可用 `100dvh`（dynamic viewport height）。

## 15. 物理像素、逻辑像素与像素密度（DPR）

- **物理像素**：设备出厂即固定的发光单元数（iPhone 6/7/8 为 750×1334）。
- **逻辑像素（CSS 像素）**：开发时写的 px（同机型为 375×667）——`window.innerWidth` / 设计稿视角。
- **DPR（devicePixelRatio）**= 物理像素 / 逻辑像素（该机型 = 2）。
- **为什么需要 @2x/@3x 图**：1 个 CSS 像素对应 2~3 个物理像素，1x 图被拉伸到多倍屏会模糊——提供 2x/3x 资源保证一个图片像素至少对应一个物理像素。

## 16. 如何解决 1px 问题

- **原因**：CSS 的 1px 在 DPR=2 的屏上用 2 个物理像素渲染，视觉偏粗——CSS 像素 ≠ 物理像素。
- **方案**：
  - **伪元素 + scale（主流）**：`::after` 画 1px 边框再 `transform: scaleY(0.5)`（或整体 scale(0.5)），物理像素级精度，推荐；
  - 直接写 `0.5px`：Safari/Firefox 支持度参差，低版本浏览器直接忽略（变无边框）；
  - **viewport 缩放**：`initial-scale = 1/DPR` 整页缩放——1px 精确了，但文字图片也被无差别缩小，副作用大（老项目 rem 方案里常见，新项目少用）。

## 17. 如何判断元素进入可视区域

- **传统方案（getBoundingClientRect / 偏移量计算）**：
  - `rect.top < window.innerHeight && rect.bottom > 0` 即在视口内（比 offsetTop+scrollTop 组合更直接）；
  - 缺点：scroll 事件高频触发，需节流。
- **IntersectionObserver（现代首选）**：
  - 异步观察交叉状态，不阻塞主线程、不监听 scroll；
  - `new IntersectionObserver(entries => {...}).observe(el)`，`entry.isIntersecting` 判断可见；
  - 应用：图片懒加载、曝光埋点、无限滚动。

## 18. width: 100% 与 auto 的区别

- **width: 100%**：子元素 content 恒等于父元素 content——加 padding/border 后**总宽溢出**（content-box 下）。
- **width: auto**：块级元素的默认值——margin/padding/border 占完后**自动收缩 content**，总宽不溢出（"充满但不超出"）。
- 一句话：**100% 定死 content，auto 让 content 适配剩余空间**；统一 border-box 后两者差异缩小，但 auto 的语义（让出 margin 空间）仍不可替代（如绝对定位下 `left:0; right:0; margin:auto` 居中就依赖 auto）。
