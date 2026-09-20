# 现代 CSS

前五篇讲的都是"怎么用 CSS 把页面写对"：选择器优先级、布局、响应式、动画、BEM 与规范。这一篇讲的是**语言本身在这十年补上了哪些能力**——过去要靠命名纪律（BEM）、靠 `!important`、靠 JS 补的类名、靠多写一个选择器列表去解决的问题，现在有语言级的答案。

四个主题：**层叠层**把覆盖顺序变成显式声明、**自定义属性**把值抽成可继承可改写的令牌、**容器查询**让组件按自己被放多宽变形、**新选择器与函数**收掉一批"为了选中/算出一个值"而被迫加的类名与 JS 状态。

本篇所有结论都在配套 demo 里由浏览器自己的计算值佐证：每个页面都把 `getComputedStyle` 的结果打进页面末尾，你打开就能核对，而不是只看到一句"这样写会赢"。

## 层叠层：把覆盖顺序写成显式声明

### 层序决定胜负，源码位置不算数

CSS 的老问题是"谁覆盖谁"由三个隐式变量决定：特异性、源码顺序、`!important`。项目一大，就变成引入顺序竞赛——谁最后被 `<link>` 进来谁赢，于是出现"把样式表拆成 10 个文件还要求严格顺序"这种脆弱约定。BEM 解决的是其中的命名冲突，但解决不了覆盖顺序。

`@layer` 把覆盖顺序提成一条可以写在 CSS 里的**声明**：先把层的先后写清楚，之后同一条规则写在哪一行都不影响结果。

> 摘自 `./code/site/modern-css-layer.css`（运行：`npm start`）

```css
/* ① 先声明层序 reset → components → utilities：普通声明里越靠后的层越强 */
@layer reset, components, utilities;

/* ② 层序决定胜负，源码位置不算数：utilities 的规则写在最前面也能靠层序反超 */
@layer utilities {
    #layer-order .box {
        color: #2563eb;
    }
}
@layer reset {
    #layer-order .box {
        color: #71717a;
    }
}
@layer components {
    #layer-order .box {
        color: #b45309;
    }
}
```

三条规则用的是**同一个选择器**、同样的特异性，唯一变量是所属的层。把页面丢给无头 Chrome 读计算值：

> 实测（`chrome --headless=new --dump-dom` 读页面内 `getComputedStyle` 的输出）

```
① #layer-order    color        = rgb(37, 99, 235)
```

`rgb(37, 99, 235)` 就是 `#2563eb`，即 `utilities` 层的值——尽管它写在源码最前面、也尽管 `reset` 层紧随其后。**层与层之间先比层序，同层内部才轮得到特异性与源码顺序。**

### 层比特异性更靠前

这一点比"源码顺序不算数"更容易踩坑：很多人以为层内写个 `#id .class` 就一定能覆盖层外的一个 `.class`。实际顺序是**层先于特异性**。

> 摘自 `./code/site/modern-css-layer.css`（运行：`npm start`）

```css
/* ③ 层比特异性更靠前：分层的高特异性（ID + 类）压不过未分层的低特异性（一个类） */
@layer components {
    #layer-vs-spec .plain {
        border-color: #dc2626;
    }
}
.plain {
    border-color: #16a34a;
}
```

```
② #layer-vs-spec   border-color = rgb(22, 163, 74)
```

`rgb(22, 163, 74)` 是 `#16a34a`——层外那条**只有一个类**的规则赢了层内 **ID + 类**的规则。原因是 CSS 层叠的排序规则里，"层"排在"特异性"前面：`origin/importance → 层 → 特异性 → 源码顺序`。

顺带解释了一个常见现象：**没写进任何层的样式处在"隐式的最后一层"**，所以它们天然压过所有分层样式。这也是渐进迁移能成立的原因——老代码不动、不写 `@layer`，新代码进层，老代码仍然赢。

### `!important` 会把层序反过来

`!important` 不是"更高级的 !important"，它在分层体系里的排序规则是**反的**：最早声明的层最强，未分层的 `!important` 反而最弱。

> 摘自 `./code/site/modern-css-layer.css`（运行：`npm start`）

```css
/* ④ !important 把层序反过来：最早声明的层最强，未分层反而最弱 */
@layer reset {
    #layer-important .box {
        color: #71717a !important;
    }
}
@layer utilities {
    #layer-important .box {
        color: #2563eb !important;
    }
}
#layer-important .box {
    color: #16a34a !important;
}
```

```
③ #layer-important color       = rgb(113, 113, 122)
```

`rgb(113, 113, 122)` = `#71717a`，即**最早声明的 `reset` 层**。三条都带 `!important`，赢的是第一条声明的层；层外那条 `!important` 权重最低。

同层内部则没有反转，还是看源码顺序：

> 摘自 `./code/site/modern-css-layer.css`（运行：`npm start`）

```css
/* ⑤ 同一个层内部，仍然是源码顺序决定胜负 */
@layer components {
    #layer-inside .box {
        color: #7c3aed;
    }
    #layer-inside .box {
        color: #0d9488;
    }
}
```

```
④ #layer-inside    color       = rgb(13, 148, 136)
```

### 落地：层序声明一次，引入顺序不再敏感

工程上的写法通常是固定四五层，把"谁该覆盖谁"写死在第一行：

> 示意片段（无配套脚本）

```css
@layer reset, vendor, components, utilities;
```

- `reset`：归零、基础排版（最早声明 → 普通声明里最弱，被后面任何一层覆盖；但它的 `!important` 最强）
- `vendor`：第三方组件库、UI 框架整包引入
- `components`：业务组件自己的样式
- `utilities`：工具类、局部覆写

这样安排的收益很具体：**第三方库整包引入后不再需要"引入顺序"这种隐式约定**，业务侧要覆写就写进后面的层，不用堆特异性、不用 `!important`。它和 BEM 也不冲突——BEM 让类名可读、可定位，`@layer` 负责让覆盖关系确定，两者管的是不同的两件事。

## 自定义属性：把「值」抽成令牌

### 和 Sass 变量差在「编译期还是运行时」

这是最常被问到的一题。Sass 变量（`$brand: #2563eb`）是**编译期**的文本替换，产物 CSS 里只有 `#2563eb`，变量本身消失了；CSS 自定义属性（`--brand: #2563eb`）是**运行时**真实存在的属性，会随 DOM 继承、能被 JS 读写、能被媒体查询与容器查询重新赋值。

这个差别直接决定了几件事：主题切换能不能不做两份产物、组件级主题能不能只靠 CSS 完成、运行时能不能让用户自定义主色。

> 摘自 `./code/site/modern-css-tokens.css`（运行：`npm start`）

```css
/* ① 设计令牌集中在 :root 声明一次 */
:root {
    --brand: #2563eb;
    --space: 12px;
    --radius: 8px;
}

/* ② 换主题 = 重新赋值，而不是重写每一条用到它的规则 */
[data-theme='dark'] {
    --brand: #60a5fa;
    --space: 20px;
}
```

用到令牌的组件侧一行都不改：

> 摘自 `./code/site/modern-css-tokens.css`（运行：`npm start`）

```css
.token-box {
    background: var(--brand);
    color: #fff;
    padding: var(--space);
    border-radius: var(--radius);
    font-weight: 600;
    margin-top: 0.4rem;
}
```

在 `<html>` 上挂一个属性再读计算值：

```
:root 上的 --brand                  = #2563eb
作用域外 .token-box 的 background    = rgb(37, 99, 235)
--- 切换 data-theme="dark" ---
:root 上的 --brand                  = #60a5fa
作用域外 .token-box 的 background    = rgb(96, 165, 250)
```

注意 `--brand` 读出来还是 `#2563eb` 这个**原始 token**，而用它算出来的 `background` 是 `rgb(...)`——令牌保存的是待代入的"值"，只有被 `var()` 使用时才参与类型计算与继承。

### 令牌要能覆盖，也要能兜底

两件事一起做：局部重定义（组件级主题）、`var()` 兜底（写错名字不至于整条声明失效）。

> 摘自 `./code/site/modern-css-tokens.css`（运行：`npm start`）

```css
/* ④ 局部作用域：在子树里重新定义同名令牌，只影响这棵子树 */
.scope {
    --brand: #dc2626;
    outline: 2px dashed #9ca3af;
    padding: 0.6rem;
    margin-top: 0.4rem;
}

/* ⑤ 令牌不存在时用兜底值，避免整条声明失效 */
.fallback {
    background: var(--not-defined-anywhere, #f59e0b);
    padding: var(--space);
    border-radius: var(--radius);
    font-weight: 600;
    color: #111827;
    margin-top: 0.4rem;
}
```

```
作用域内 .token-box 的 background    = rgb(220, 38, 38)     ← .scope 里的重定义只影响子树
作用域外 .token-box 的 background    = rgb(37, 99, 235)     ← 外面仍是 :root 的值
兜底 var(--x, #f59e0b) 的 background = rgb(245, 158, 11)    ← 名字不存在，用逗号后的兜底值
```

同一个类、同一个组件，放进 `.scope` 就换色、放外面就还原——这就是"组件级主题"最省的实现方式，不用为它加一个 `.token-box--danger` 变体。

### `@property` 让令牌有类型、能决定继不继承

**没有注册的自定义属性一律继承，值只是一段 token 串**。`@property` 可以给令牌声明类型、初始值，以及是否继承：

> 摘自 `./code/site/modern-css-tokens.css`（运行：`npm start`）

```css
/* ③ 注册过的自定义属性有类型，可以规定"不继承" */
@property --no-inherit {
    syntax: '<length>';
    initial-value: 0px;
    inherits: false;
}
:root {
    --no-inherit: 40px;
}
```

```
--- 继承：注册 vs 未注册 ---
父元素 --no-inherit (inherits:false) = 40px
子元素 --no-inherit (inherits:false) = 0px     ← 没继承，回落到 initial-value
父元素 --space      (未注册)         = 12px
子元素 --space      (未注册)         = 12px    ← 未注册的一律继承
```

注册带来的第二个好处是**类型**：声明成 `<angle>`、`<length>`、`<number>` 之后，这类令牌才能参与过渡与动画的插值（未注册的只能整体跳变），所以"用 CSS 变量驱动渐变角度/进度条"这类效果依赖 `@property`。

代价要记住：`inherits: false` 意味着子元素拿不到父元素的值，写组件库时如果想把间距令牌传下去，就别关继承。

### 颜色也能当算式

令牌化之后的自然需求是"由主色派生出浅色、半透明色、hover 色"。过去要在设计稿里额外标几个十六进制，现在可以直接算：

> 摘自 `./code/site/modern-css-tokens.css`（运行：`npm start`）

```css
/* ⑥ 颜色也能当算式：由主色派生浅色 / 半透明色，不用再手抄第二、第三个十六进制 */
.mix-light {
    background: color-mix(in oklab, var(--brand) 80%, #ffffff);
}
.mix-translucent {
    background: color-mix(in srgb, var(--brand) 25%, transparent);
}
.oklch-tone {
    background: oklch(0.72 0.15 250);
}
```

```
color-mix(in oklab, var(--brand) 80%, #fff) = oklab(0.636903 -0.0213139 -0.170826)
color-mix(in srgb,  var(--brand) 25%, transparent) = color(srgb 0.145098 0.388235 0.921569 / 0.25)
oklch(0.72 0.15 250)                       = oklch(0.72 0.15 250)
```

三点值得注意：

- 结果的颜色空间就是你在 `color-mix(in <空间>, ...)` 里指定的那个，浏览器不会偷偷转成 `rgb`（所以上面第一行输出的是 `oklab(...)`）。要跟老代码混用就写 `in srgb`。
- 混 `transparent` 得到的是带 alpha 的颜色（`/ 0.25`），可以直接替代"主色 + 透明度"的一套硬编码值。
- `oklch()` 用感知亮度 `L` 描述颜色，做"同一色相、不同明度"的色阶（hover / active / 禁用）比手调十六进制准得多。

## 容器查询：媒体查询管页面，容器查询管组件

媒体查询的参照物永远是**视口**，而组件的实际处境是"被放进了多宽的容器"。同一个卡片放进侧栏（280px）和主内容区（520px），视口完全一样——媒体查询给出的答案也完全一样，于是只能靠"父级传一个 `.card--compact` 类"或"复制两套样式"来解决。

容器查询把参照物换成**容器自己的宽度**。前提是容器要显式声明为查询容器：

> 摘自 `./code/site/modern-css-container.css`（运行：`npm start`）

```css
/* ① 容器查询的前提：容器先声明 container-type，浏览器才会为它建"查询上下文" */
.panel {
    box-sizing: border-box;
    container-type: inline-size;
    container-name: panel;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px;
    background: #fafafa;
}
.panel--narrow {
    width: 280px;
}
.panel--wide {
    width: 520px;
}
```

组件侧写法与媒体查询几乎一样，只是把 `@media` 换成 `@container`（可以带容器名做限定）：

> 摘自 `./code/site/modern-css-container.css`（运行：`npm start`）

```css
@container panel (min-width: 360px) {
    .card {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .card__avatar {
        margin-bottom: 0;
        flex: none;
    }
}
```

同一个 `.card` 放进两个宽度不同的容器，页面视口不变：

```
① 窄容器 280px 容器宽度 = 280px  |  .card display = block
② 宽容器 520px 容器宽度 = 520px  |  .card display = flex
③ 可拖容器：容器宽度 = 380px  |  .card display = flex
视口宽度 = 1184px（两个容器始终处在同一个视口里）
```

作为对照，同一页里还写了一条只认视口的媒体查询：

> 摘自 `./code/site/modern-css-container.css`（运行：`npm start`）

```css
/* ③ 对照：媒体查询只认视口，两个容器宽度差一倍它也给出同一个答案 */
.mq-probe {
    --mq: off;
}
@media (min-width: 360px) {
    .mq-probe {
        --mq: on;
    }
}
```

```
① 窄容器 280px    └─ @media 给出的 --mq = on（同一视口下两个容器完全一样）
② 宽容器 520px    └─ @media 给出的 --mq = on（同一视口下两个容器完全一样）
```

一个容器宽 280px、另一个 520px，媒体查询给出的答案都是 `on`。这就是为什么"组件级响应式"必须用容器查询：

- **媒体查询**负责设备/视口级决策：栅格列数、字号体系、要不要显示侧栏、要不要切成移动布局。
- **容器查询**负责组件级决策：卡片横排还是竖排、表格要不要收成卡片、按钮里的图标要不要藏起来。

两个工程注意点：

- `container-type: inline-size` 建立的是**行内轴尺寸containment**——容器的宽度不能再由内容撑开。所以它必须有确定的宽度来源（父容器、显式 `width`、flex/grid 分配），否则会出现"内容被压扁"的意外。上面 demo 里三个容器都显式给了宽度，原因就在这里。
- 高度仍由内容决定（只约束行内轴），所以卡片按容器宽度换形不会连带把高度锁死。

## 现代选择器与函数：收掉一批"为了选中/算值"的额外成本

### `:is()` 带权，`:where()` 清零

`:is()` / `:where()` 解决"一长串选择器写三遍"的重复，但两者的特异性行为相反：`:is()` 取括号里**最高**的那个，`:where()` 恒为 `0`。

> 摘自 `./code/site/modern-css-selectors.css`（运行：`npm start`）

```css
/* ① :is() 会把括号内最高特异性带出来；:where() 恒为 0 */
:is(#ghost-a, .probe-a) {
    color: #dc2626;
}
.probe-a {
    color: #16a34a;
}
:where(#ghost-b, .probe-b) {
    color: #dc2626;
}
.probe-b {
    color: #16a34a;
}
```

两段写法只差 `:is` / `:where`，括号里都混了一个永远不会命中的 `#ghost-*`：

```
① A 段 color = rgb(220, 38, 38)（:is 带权 → 红）
① B 段 color = rgb(22, 163, 74)（:where 清零 → 绿）
```

A 段里 `:is(#ghost-a, .probe-a)` 带上了 `#ghost-a` 的 ID 权重（`1,0,0`），压过 `.probe-a`；B 段里 `:where()` 权重是 `0,0,0`，于是 `.probe-b` 反超。这条差异决定了各自的用途：

- **`:where()` 用来写基础样式 / 重置样式**：权重为 0，业务侧随便一条规则都能覆盖它，不会出现"引入了重置库就改不动"的情况。
- **`:is()` 用来写业务选择器**：缩短列表、复用权重，但要知道它会继承括号里最高的那个权重。

### `clamp()`：一个值写完三档

字号响应式过去要写三四个断点，`clamp(下限, 理想值, 上限)` 一个值搞定：低于下限取下限、高于上限取上限、中间按"理想值"走。

> 摘自 `./code/site/modern-css-selectors.css`（运行：`npm start`）

```css
/* ② clamp(下限, 理想值, 上限)：三段分支都能被读出来 */
.fluid-clamped {
    font-size: clamp(1rem, 1rem + 2vw, 1.75rem);
}
.fluid-free {
    font-size: clamp(1rem, 0.5rem + 1vw, 3rem);
}
```

在 1184px 视口、根字号 16px 下：

```
② 触到上限的 font-size = 28px
② 落在中间档的 font-size = 19.84px
   视口宽度 = 1184px，根字号 = 16px
```

- `1rem + 2vw` = 16 + 23.68 = 39.68px，超过上限 1.75rem（28px）→ 取 **28px**，安全地停在设计上限。
- `0.5rem + 1vw` = 8 + 11.84 = 19.84px，落在 16px 与 3rem 之间 → 原样取 **19.84px**。

**理想值要混合 `rem` 与 `vw`**：只用 `vw` 的字号在用户缩放浏览器时不会跟着变，违反可访问性的"文字可放大"要求；`rem + vw` 既跟随视口、又尊重用户的根字号设置。

### `aspect-ratio`：给一个方向就能锁比例

占位图、视频框、卡片封面以前靠 padding-top 百分比 hack：

> 摘自 `./code/site/modern-css-selectors.css`（运行：`npm start`）

```css
/* ③ aspect-ratio：只给宽就能锁定比例 */
.thumb {
    width: 160px;
    aspect-ratio: 16 / 9;
    background: linear-gradient(135deg, #a5b4fc, #4f46e5);
    border-radius: 6px;
}
```

```
③ .thumb 实测 160 × 90px（16 / 9 = 1.778）
```

只写了宽，高由浏览器算出来（160 ÷ 1.778 = 90）。它的附加收益是**预留空间**：图片没加载完时盒子已经占好位置，不会发生布局跳动（CLS）。

### `:has()`：按后代状态给容器上样式

`:has()` 被叫做"父选择器"，它让"容器"可以按内部状态上样式——过去这类需求基本都要加一个 JS 状态类。

> 摘自 `./code/site/modern-css-selectors.css`（运行：`npm start`）

```css
/* 有内容就高亮：:placeholder-shown 不依赖窗口焦点，脚本/无头浏览器都能验证 */
.field:has(input:not(:placeholder-shown)) {
    border-color: #2563eb;
}
/* 必填且非法：空着时整个 .field 变红 */
.field:has(input:required:invalid) {
    border-color: #dc2626;
}
/* 真人在浏览器里聚焦时再加一圈光晕：:focus 依赖窗口焦点，无头环境下不匹配 */
.field:has(input:focus) {
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
```

```
④ 第 1 行（必填）空着   border-color = rgb(220, 38, 38)    ← :has(input:required:invalid) 命中
④ 第 2 行（非必填）空着 border-color = rgb(229, 231, 235)  ← 默认灰
④ 两行都填上内容后 border-color = rgb(37, 99, 235) / rgb(37, 99, 235)
```

必填框空着 → 整个容器变红；填上内容 → 变蓝；都不用 JS 去同步状态类。

两个坑：

- **`:focus` 在无头环境不匹配**。上面第三条规则依赖窗口焦点，无头 Chrome（`--dump-dom`）里 `document.activeElement` 已经是那个 input，但 `:focus` 不成立——所以笔者的探针改用 `:placeholder-shown` 做证据。写自动化测试时遇到"看起来没生效"的 `:focus` / `:focus-visible`，先确认窗口有没有焦点。
- **别把选择器开得太宽**。`:has()` 需要在 DOM 变化时检查子树，`body:has(.error)` 会让引擎盯着整页；约束到具体容器（`.form:has(.error)`），并尽量用子代组合器（`:has(> .error)`）缩小子树，成本就下来了。

### 动效也要留退路

用户系统里可能开了"减少动态效果"（前庭功能障碍、晕动症患者会关掉动画）。这不是可选项，属于无障碍基线：

> 摘自 `./code/site/modern-css-selectors.css`（运行：`npm start`）

```css
/* ⑤ 动效降级：系统开了"减少动态效果"就别再动 */
.pulse {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    background: #fde68a;
    animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
    50% {
        transform: scale(1.12);
    }
}
@media (prefers-reduced-motion: reduce) {
    .pulse {
        animation: none;
    }
}
```

用 Chrome 的 `--force-prefers-reduced-motion` 开关把两个分支都跑一遍：

```
prefers-reduced-motion: reduce = false → .pulse animation-name = pulse
prefers-reduced-motion: reduce = true  → .pulse animation-name = none
```

降级的做法值得讲究：**不是把所有动效禁掉**，而是把"位移、缩放、视差"这类容易引起不适的动效换成透明度变化或直接去掉，保留状态反馈（比如颜色过渡）。上面 demo 就是整体关掉——最保守的那一档。

## 哪些能直接上，哪些要先确认基线

这几项特性的浏览器支持差别不小，落地前值得分开对待：

- **可以无脑用**：`var()` / 自定义属性、`:is()` / `:where()`、`clamp()`、`aspect-ratio`、`color-mix()`。这些在主流浏览器里已经稳定多年。
- **先确认基线**：`@layer`、`@container`、`:has()`。这三个是 2022～2023 年才在三大内核凑齐的——`@layer` 自 Chrome 99 / Safari 15.4 / Firefox 97，`@container` 自 Chrome 105 / Safari 16 / Firefox 110，`:has()` 自 Chrome 105 / Safari 15.4 / Firefox 121（Firefox 最晚，2023 年底才默认开启）。它们现在都已是 Baseline 的"广泛可用"，消费者业务直接上没问题；**政企、内嵌 WebView、老安卓机型**这类受众要单独确认。
- **需要兜底时用特性查询**，而不是猜：

> 示意片段（无配套脚本）

```css
/* 默认给一套保守写法，支持 :has() 时再增强 */
.field {
    border-color: #e5e7eb;
}
@supports selector(:has(input:required:invalid)) {
    .field:has(input:required:invalid) {
        border-color: #dc2626;
    }
}
```

`@supports selector(...)` 可以直接把选择器能力当条件，比"靠 UA 判断"可靠得多。查基线用 caniuse 或 MDN 页脚的兼容表；构建侧可以用 Browserslist 把目标浏览器的范围固化成配置。

## 配套代码

四个页面都在仓库 `frontend/基础/CSS/code/site/`，各自把探针结果打在页面末尾——打开就能看到本文引用的那些计算值。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/modern-css-layer.css` | 层序压过源码顺序、层压过特异性、`!important` 反转层序、同层内源码顺序，四组用同一选择器对照（页面 `modern-css-layer.html`） | 层叠层：把覆盖顺序写成显式声明 |
| `./code/site/modern-css-tokens.css` | 令牌与 `var()` 兜底、子树重定义、`data-theme` 换肤、`@property` 的继承开关、`color-mix()` 与 `oklch()` 颜色算式（页面 `modern-css-tokens.html`） | 自定义属性：把「值」抽成令牌 |
| `./code/site/modern-css-container.css` | `container-type` + `@container` 让同一组件在 280px / 520px 容器里换形；同页的媒体查询对两个容器给出同一答案（页面 `modern-css-container.html`，可拖动改宽度） | 容器查询：媒体查询管页面，容器查询管组件 |
| `./code/site/modern-css-selectors.css` | `:is()` 带权 / `:where()` 清零、`clamp()` 三档、`aspect-ratio` 锁比例、`:has()` 表单状态、`prefers-reduced-motion` 降级（页面 `modern-css-selectors.html`） | 现代选择器与函数 |

启动方式：在 `code` 目录执行 `npm start`（即 `node server.js`），打开 `http://localhost:5175/`，从示例目录进入四个新页面。

本文引用的实测值来自页面内的 `getComputedStyle` 探针，复现命令（在仓库根执行，`--force-prefers-reduced-motion` 用于看动效降级分支）：

> 示意片段（无配套脚本）

```
chrome --headless=new --dump-dom --window-size=1200,900 \
  "file:///.../frontend/基础/CSS/code/site/modern-css-layer.html"
```

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[BEM 与 CSS 规范](./BEM%20与%20CSS%20规范.md)
- 下一篇：[综合实战](./综合实战.md)
