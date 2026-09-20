# 模块总结-核心（CSS）
## 知识主线（一句话）
1. 层叠/盒模型/BFC 决定"怎么画"
2. Flex/Grid 决定"怎么排"
3. vw/rem 决定"多端怎么变"
4. transform 让动效走合成层不卡
5. 覆盖顺序、设计令牌、组件级响应式升级为语言特性

## 高频核心点

### 01 CSS 基础与选择器

**盒模型**

- **`content-box` vs `border-box`**：前者 width 不含 padding/border 易撑爆，后者含、更可预期；项目全局 `*{box-sizing:border-box}`
- **`width:100%` vs `auto`**：100% 的内容=父级内容、加 padding 易溢出；`auto` 让包含 padding/border 之和填满父级、不溢出（块级默认）
- **margin 两个坑**：垂直相邻 margin 取较大值不相加；父子 margin 塌陷时子 `margin-top` 冲出父元素——用父级 `overflow:hidden` 或 `flow-root` 解决

**层叠与选择器**

- **层叠四层判定**：`!important` → 来源 → 特异性 → 源码顺序
- **优先级权重**：行内 > ID > 类/伪类/属性 > 标签/伪元素，四位数比较不进位
- **伪类 vs 伪元素**：伪类改状态（`:hover` 单冒号）、伪元素造元素（`::before` 双冒号）
- **单位**：px 绝对、em 相对当前元素会累积、rem 相对根统一、vw/vh 直接跟视口

**BFC**

- **是什么**：块格式化上下文，内部与外部布局互不干扰
- **触发**：`overflow`（非 visible）/ `display:flow-root` / flex / grid / absolute / fixed / float
- **用处**：清浮动包住子元素、防父子 margin 塌陷、两列自适应

### 02 布局

- **文档流与定位**：`static` 默认、`relative` 相对自身不脱离流、`absolute` 相对最近非 static 祖先脱离流、`fixed` 相对视口、`sticky` 滚动吸附
- **隐藏三态**：
  - `display:none` 移除文档流触发重排,不占位，不响应事件
  - `visibility:hidden` 占位只重绘，占位，不响应事件
  - `opacity:0` 占位且可点击走合成层，占位，响应事件
- **Flex 一维**：主轴 `justify-content`、交叉轴 `align-items`；`flex:1` 均分剩余、`flex:0 0 200px` 固定
- **Grid 二维**：`grid-template-columns`/`repeat()`/`fr`；`grid-template-areas` 命名区域摆骨架
- **居中**：flex/grid 通用；`absolute + inset:0 + margin:auto` 定尺寸；`translate(-50%,-50%)` 不知宽高用
- **圣杯/双飞翼**：中间 DOM 靠前 + 两侧固定 + 中间自适应，现代用 Grid 一行实现
- **选型**：页面骨架 Grid、局部行列 Flex、图文环绕才 float

### 03 响应式与移动端

- **viewport 三值**：`width=device-width` 核心、`initial-scale=1` 锁初始缩放、`viewport-fit=cover` 适配刘海屏
- **媒体查询**：`@media (min-width:768px)`；Mobile First 用 `min-width` 向上递进
- **适配四选**：百分比 / flex / rem（依赖 JS，渐被替换）/ vw（无 JS 当前主流，大屏 `max-width` 兜底）
- **dpr**：物理像素/逻辑像素；高清屏需 @2x/@3x 图或 SVG
- **移动端坑**：300ms 点延迟（`width=device-width` 消除）、1px 边框（`scale(0.5)`）、iOS 安全区、`env()` 需 `viewport-fit=cover` 才非零

### 04 动画与变换

- **三套分工**：`transform` 几何变换性能最好、`transition` 被动过渡、`animation` 主动多帧
- **性能铁律**：渲染三环节 layout→paint→composite；只动画 `transform`/`opacity` 跳过前两步走合成层
- **`will-change`**：提前提升合成层减少首帧卡顿，按需添加、用完移除，滥用耗显存
- **`fill-mode`**：入场动画用 `both` 保留末帧避免闪跳

### 05 BEM 与 CSS 规范

- **BEM 三段式**：Block（`card`）、Element（`card__title`）、Modifier（`card--highlighted`）；`__` 连块元素、`--` 连修饰符
- **关键约定**：不写父级链、修饰符挂基础类、命名描述"是什么"而非"什么色"、JS 钩子用 `data-*` 解耦
- **工程化四选一**：全局 CSS（易冲突）/ CSS Module·scoped（组件隔离主流）/ CSS-in-JS（运行时主题）/ Tailwind（JIT 工具类）

### 06 现代 CSS

- **`@layer`**：层先于特异性；未分层=隐式最后一层最强（渐进迁移成立的原因）；落地固定第一行声明层序
- **自定义属性 vs Sass 变量**：自定义属性运行时、可继承、可被 JS 改写；Sass 编译期替换
- **设计令牌**：`:root` 原始令牌 + 语义映射 + 组件消费语义；换主题切 `data-theme`、运行时 `setProperty` 只改一个
- **容器查询**：参照容器宽度（`@container`），组件级适配；媒体查询管设备级
- **`:is()`/`:where()`**：`:is()` 带括号内最高权、`:where()` 清零（基础样式用后者保证可覆盖）
- **兼容基线**：`var()`/`:is()`/`:where()`/`clamp()` 可直接用；`@layer`/`@container`/`:has()` 老内核需 `@supports` 兜底

### 07 综合实战

- **能力对应**：BEM 命名 + Grid/Flex 骨架 + 媒体查询断点 + transform 动效，一张真实页面收口
- **Mobile First**：默认 1 列，`min-width` 向上递进到 2/3 列，大屏只覆盖不动小屏