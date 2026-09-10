# CSS 基础与选择器

> 级别：初级

CSS（Cascading Style Sheets，层叠样式表）是前端三件套之一，负责为 HTML 结构"化妆"。本文讲清 CSS 的核心地基。按本书四层推进：

- **入门使用**：引入方式、选择器、层叠优先级、盒模型、单位、继承、BFC（都是常用必会）；
- **进阶**：优先级权重精确计算、margin 塌陷、BFC 三类用途（能讲清"为什么"）；
- **实战**：见本章 `06-综合实战`，由布局与响应式串联完成；
- **最小实现掌握原理**：本章末到 `code/frontend/02-css` 里动手运行 box-sizing / 优先级 / BFC 三个最小 demo，眼见为实。

## CSS 是什么

CSS 是一门**描述文档（HTML）呈现样式**的样式表语言。它的核心特征是一个词——**层叠（Cascading）**：多条规则可能同时作用于同一个元素，浏览器按照一套规则决定最终哪条生效。理解"层叠"与"优先级"，是理解 CSS 一切行为的钥匙。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>CSS 示例</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Hello CSS</h1>
  </body>
</html>
```

## CSS 引入方式

CSS 有四种引入方式，各有适用场景。

### 1. 行内样式（内联样式）

直接写在标签的 `style` 属性上，优先级最高（除 `!important` 外）。

```html
<p style="color: red; font-size: 16px;">我是行内样式</p>
```

缺点：结构与样式耦合，难以复用，不推荐在生产中使用。

### 2. 内嵌样式（嵌入式）

写在 HTML 的 `<style>` 标签中，放在 `<head>` 里。

```html
<head>
  <style>
    p {
      color: blue;
    }
  </style>
</head>
```

适用：单页测试、邮件模板等少量样式的场景。

### 3. 外链样式（外联式）

通过 `<link>` 引入独立 `.css` 文件，**最推荐**的方式。

```html
<head>
  <link rel="stylesheet" href="css/style.css" />
</head>
```

优点：样式与结构分离、可缓存、可复用、便于维护。

### 4. 导入式 `@import`

在 CSS 文件内部使用 `@import` 引入其他 CSS。

```css
/* style.css */
@import url("reset.css");
body {
  color: #333;
}
```

⚠️ 注意：`@import` 会阻塞渲染且造成额外的 HTTP 请求，性能较差，生产环境尽量避免。

> 优先级：行内样式 > 内嵌样式 / 外链样式 > 浏览器默认样式；`@import` 属于外链的一种变形，但通常晚于 `<link>` 内样式加载。

## 层叠与优先级

当多条规则冲突时，浏览器如何决定？遵循四层规则，**从上到下、逐层判定**，越靠后者越优先：

1. **重要性（`!important`）**：带 `!important` 的声明优先。
2. **来源**：用户 `!important` > 作者 `!important` > 作者普通样式 > 用户普通样式 > 浏览器默认样式。
3. **优先级/权重（specificity）**：`!important` 相同时比权重。
4. **源码顺序**：权重相同时，后出现的声明覆盖先出现的。

### 优先级权重计算

权重的计算规则是把选择器拆分为若干"位"相加（约定俗成的四位数表示法，位数之间不产生进位）：

| 权重位 | 计分 | 包含内容 |
|--------|------|----------|
| 内联样式 | 1, 0, 0, 0 | 写在 `style` 属性里的声明 |
| ID 选择器 | 0, 1, 0, 0 | `#id` |
| 类/伪类/属性选择器 | 0, 0, 1, 0 | `.class`、`:hover`、`[type="text"]` |
| 类型/伪元素选择器 | 0, 0, 0, 1 | `div`、`p`、`::before` |

例如：

```css
/* 权重 0,0,1,1 */
div p {
  color: gray;
}
/* 权重 0,0,2,0 */
.container .title {
  color: green;
}
/* 权重 0,1,0,0 */
#intro {
  color: blue;
}
```

规则总结：

- **内联样式 > ID > 类/属性/伪类 > 标签/伪元素 > 通配符 `*`（0,0,0,0）**。
- 权重相同则看**源码顺序**，后者覆盖前者。
- `!important` 权重最高；同一 `!important` 再次按上面权重比较。**慎用 `!important`**，它会破坏可维护性。

> 记忆口诀：分数比较从小到大——内联 > ID 选择器 > 类选择器 > 标签选择器。

## 选择器

选择器用于告诉浏览器"我要给哪些元素加样式"。按类型与组合方式分类如下。

### 基本选择器

```css
/* 标签选择器（类型选择器）：命中所有 <p> */
p {
  color: blue;
}

/* 类选择器：命中 class="title" 的元素 */
.title {
  font-size: 20px;
}

/* ID 选择器：命中 id="header" 的元素（页面中应唯一） */
#header {
  height: 60px;
}

/* 通配选择器：命中所有元素 */
* {
  margin: 0;
}
```

> 推荐尽量使用**类选择器**（BEM 等规范的基础），标签选择器命中面太宽，ID 选择器权重过高且不可复用。

### 属性选择器

根据元素的属性和属性值来匹配：

```css
/* 拥有 href 属性的 <a> */
a[href] {
  color: blue;
}
/* href 的值精确等于 */
input[type="submit"] {
  cursor: pointer;
}
/* href 的值以 http 开头 */
a[href^="http"] {
  color: orange;
}
/* href 的值以 .pdf 结尾 */
a[href$=".pdf"] {
  color: red;
}
/* href 的值包含 blog */
a[href*="blog"] {
  color: purple;
}
/* class 属性值中包含空格分隔的 fl 单词 */
[class~="fl"] {
  float: left;
}
```

### 伪类与伪元素

**伪类**描述元素的状态，以单个冒号 `:` 开头：

```css
a:hover {
  color: red;
}
input:focus {
  border-color: blue;
}
li:first-child,
li:last-child {
  font-weight: bold;
}
li:nth-child(2n) {
  background: #f5f5f5; /* 偶数行 */
}
```

**伪元素**生成虚拟的子元素，以双冒号 `::` 开头（`::before`/`::after`/`::first-line` 等）：

```css
a::after {
  content: " ↗";
}
div::first-line {
  font-weight: bold;
}
```

> 记忆要点：伪类改**状态**（后加一个冒号），伪元素造**元素**（双冒号）。

### 组合选择器（后代 / 子 / 兄弟）

```css
/* 后代选择器（空格）：div 内部所有 p */
div p {
  color: gray;
}

/* 子选择器（>）：div 的直接子元素 p */
div > p {
  color: red;
}

/* 相邻兄弟（+）：紧随 h2 之后的第一个 p */
h2 + p {
  margin-top: 0;
}

/* 通用兄弟（~）：h2 之后所有兄弟 p */
h2 ~ p {
  color: green;
}
```

组合别滥用，选择器越具体命中面越窄，但过度嵌套会降低可读性与性能。

## 盒模型（Box Model）

每一个元素在页面上都是一个矩形"盒子"。盒模型定义了盒子各部分的组成：

```
┌─────────────────────────────────────┐
│              margin（外边距）          │
│  ┌───────────────────────────────┐  │
│  │           border（边框）         │  │
│  │   ┌───────────────────────┐   │  │
│  │   │   padding（内边距）      │   │  │
│  │   │   ┌───────────────┐   │   │  │
│  │   │   │    content     │   │  │  │
│  │   │   └───────────────┘   │   │  │
│  │   └───────────────────────┘   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- **content**：内容区，由 `width` / `height` 决定。
- **padding**：内边距，内容与边框的距离，可撑大盒子。
- **border**：边框。
- **margin**：外边距，盒子与外部元素的间距，**不占盒子尺寸**。

### 标准盒模型 vs 怪异盒模型

由 `box-sizing` 决定 `width` / `height` 到底算哪部分：

```css
/* 标准盒模型：width = content */
.box {
  box-sizing: content-box; /* 默认值 */
  width: 100px;
  padding: 10px;
  border: 1px solid #000;
  /* 实际总宽度 = 100 + 10*2 + 1*2 = 122px */
}

/* 怪异盒模型（IE 盒模型）：width = content + padding + border */
.box {
  box-sizing: border-box;
  width: 100px;
  padding: 10px;
  border: 1px solid #000;
  /* 实际总宽度固定为 100px，content 被压缩为 78px */
}
```

> **实际项目强烈建议全局统一用 `border-box`**，这样设定宽度即"最终宽度"，避免 padding 把布局撑爆。常用的全局重置：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

## margin 塌陷与合并

margin 会产生两个让初学者困惑的"坑"。

### 1. margin 合并（相邻边距折叠）

**垂直方向**上相邻（或父子元素之间）的两个 margin 不会相加，而是取**较大值**。

```html
<style>
  .a { height: 50px; margin-bottom: 30px; background: red; }
  .b { height: 50px; margin-top: 20px; background: blue; }
</style>
<div class="a"></div>
<div class="b"></div>
```

这里两个 div 之间的间距是 `max(30, 20) = 30px`，而不是 50px。

**水平方向不会合并**，只有垂直（上下）方向才会合并。

### 2. 父子 margin 塌陷（外边距溢出）

当父元素是**块级**且没有 padding/border、也没有触发 BFC 时，子元素的 `margin-top` 会"冲"出父元素，作用到父元素之外：

```html
<style>
  .parent { background: #eee; }
  .child { margin-top: 50px; }
</style>
<div class="parent">
  <div class="child">子元素</div>
</div>
```

结果父元素顶部并没有 padding，而是整个父元素被顶下来 50px（margin 溢出）。解决办法（任选）：

```css
/* 1. 给父元素加 padding / border */
.parent { padding-top: 1px; }

/* 2. 给父元素设置 overflow: hidden（触发 BFC） */
.parent { overflow: hidden; }

/* 3. 父元素加 display: flow-root */
.parent { display: flow-root; }

/* 4. 改用子元素的 padding */
```

## 单位

CSS 单位分为**绝对单位**与**相对单位**两类。

### 绝对单位

`px`（像素）最常用；`pt`（点）、`cm`、`mm`、`in`（英寸）在屏幕端几乎不用。`px` 是固定的物理像素（逻辑上），是最直观最可控的单位。

### 相对单位

| 单位 | 相对什么 | 说明 |
|------|---------|------|
| `%` | 父元素（宽高） | 宽高百分比相对父元素内容区 |
| `em` | **当前元素**的字体大小 | `1em = 当前 font-size`，会**继承累积** |
| `rem` | **根元素 `<html>`** 的字体大小 | `1rem = html 的 font-size`，全局统一 |
| `vw` | 视口宽度 | `1vw = 视口宽度的 1%` |
| `vh` | 视口高度 | `1vh = 视口高度的 1%` |

```css
html {
  font-size: 16px; /* 根字体 */
}
.box {
  font-size: 2em;   /* = 32px，相对自身父级（此处相对父元素字体） */
  padding: 1rem;    /* = 16px，相对根 */
  width: 50vw;      /* 视口宽度的一半 */
  height: 100vh;    /* 一屏高度，常用于全屏背景 */
  margin: 5%;       /* 相对父元素宽度的 5% */
}
```

要点：

- `em` 会随嵌套逐层继承累积，容易产生"越套越大/越小"的坑，通常用于**局部组件内部**。
- `rem` 是移动端适配的主角（详见响应式章节），通过改根字体一条命令全局缩放。
- `vw/vh` 直接跟视口挂钩，做全屏/半屏布局很方便，注意移动端 `100vh` 受地址栏影响可能偏大。

## 继承（Inheritance）

CSS 属性有的可继承、有的不可继承。

- **可继承**：偏向文字的，如 `color`、`font-size`、`font-family`、`line-height`、`text-align`、`cursor` 等。
- **不可继承**：偏向盒子的，如 `width`、`height`、`margin`、`padding`、`border`、`background`、`position`、`display` 等。

显式控制继承的关键字：

```css
div {
  color: inherit;    /* 强制继承父元素 */
  color: initial;    /* 使用浏览器默认值 */
  color: unset;      /* 可继承属性=inherit，否则=initial */
}
```

> 利用继承可以统一全局字体/颜色：在 `body` 或 `:root` 上设置一次，子孙自动继承。

## BFC（块格式化上下文）

BFC（Block Formatting Context）是页面上的**一块独立渲染区域**，它内部与外部的布局互不干扰。创建 BFC 后能解决很多布局问题。

### 如何触发 BFC

满足以下任一条件即可：

```css
/* 常见触发方式 */
.bfc {
  overflow: hidden;        /* 常用 */
  /* overflow: auto;  display: flow-root; */
  display: inline-block;
  display: flex;           /* 或 grid */
  position: absolute;      /* 或 fixed、sticky */
  float: left;             /* 或 right */
}
```

### BFC 的作用

**1. 解决父元素高度塌陷（清除浮动影响）**

当子元素 float 后父元素包裹不住，给父元素开 BFC 可重新包住子元素。

**2. 避免父子 margin 塌陷**

给父元素开 BFC，子元素的外边距就不会溢出。

**3. 阻止元素被浮动元素覆盖（两列自适应），实现两栏布局**

```css
.container {
  width: 600px;
}
.aside {
  width: 200px;
  float: left;
}
.main {
  overflow: hidden; /* 触发 BFC，不与浮动重叠，自动占满剩余宽度 */
}
```

> 现代布局已优先用 Flex/Grid，但 BFC 的概念依然是理解布局机制、排查怪异问题的底层能力。

## 最小实现：用 Demo 验证原理

到 `code/frontend/02-css` 启动后打开这三个 demo，把书里的结论亲手验证一遍：

- `box-sizing.html`：同一元素对比 `content-box` 与 `border-box` 的实际占位，亲眼看 padding 是否"撑爆"设定宽度；
- `specificity.html`：四种选择器命中同一元素，看最终由哪条规则生效，理解"权重 + 源码顺序"；
- `bfc.html`：触发与不触发 BFC 时父元素的包裹差异，验证 BFC 三类用途之一（避免父子 margin 塌陷）。

> 原理一句话：CSS 没有"手写"可言，重在**观察各属性如何影响盒模型与渲染上下文**。这页即"最小实现"。

## 面试衔接

本节对应 `90-附录-面试体系` 的「CSS 基础」板块：优先级排序、`box-sizing` 区别、margin 塌陷 vs 合并、`em`/`rem`、BFC（定义/触发方式/作用）。做真题自测后，进入下一节 `02-布局`。