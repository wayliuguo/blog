# WXML、WXSS 与基础语法

小程序的一个页面由四个文件组成：`.wxml`（模板）、`.wxss`（样式）、`.js`（逻辑）、`.json`（配置）。这套写法和 Web 三件套长得很像，但**像的地方比不同的地方更危险**——WXML 有 <code v-pre>{{ }}</code> 却没有 DOM，WXSS 有 `rpx` 却没有通配符选择器，事件绑定也是自己的一套写法。带着 H5 的直觉写小程序，语法层面就会先踩一轮。

这篇按「WXML → WXSS → 事件 → 页面骨架」把语法层过一遍。配套代码是一个**迷你编译器**：把这里每条规则跑成可读的 HTML 产物（`npm run render`），所以「能写什么 / 会报什么错」都能在本机复现。真机上同一套规则由微信的 WXML / WXSS 编译器实现，对照着看即可。

## 一、WXML：模板 + 数据绑定

WXML 不是 HTML，它只做两件事：**描述结构**和**把数据填进去**。结构由标签负责，数据由 <code v-pre>{{ }}</code> 负责。

### 1. <code v-pre>{{ }}</code> 里只能放表达式

<code v-pre>{{ }}</code> 里接受的是**一个表达式**：运算、三元、成员访问、方法调用都行；但不能出现语句。实测把一句 `var` 声明写进插值，编译期直接拦住：

> 摘自 `./code/demos/bad-expr.wxml`（运行：`npm run render`）

```html
<view class="card">
    <text>{{ var total = item.price * item.count; }}</text>
    <text>{{ total }}</text>
</view>
```

```
Error: 表达式不支持「语句关键字」：{{ var total = item.price * item.count; }}
```

规则就是一句话：**<code v-pre>{{ }}</code> 求的是一个值，不是执行一段代码**。判断逻辑写在逻辑层，展示用的加工逻辑交给 WXS（见第 3 篇）。

拦不住"语句"会出大问题：H5 里习惯在模板里就地算一步、存个中间变量，在小程序里必须换成"先在 `setData` 前算好"或"用三元表达式/方法调用一次算完"。

### 2. 列表渲染：`wx:for` 与 `wx:key`

`wx:for` 遍历数组，默认的循环变量是 `item` 与 `index`，取值同样是表达式：

> 摘自 `./code/demos/list.wxml`（运行：`npm run render`）

```html
<view class="card">
    <view class="title">{{ title }}</view>

    <view class="item" wx:for="{{ items }}" wx:key="id">
        <text class="idx">{{ index + 1 }}</text>
        <text class="name">{{ item.name }}</text>
        <text class="price">¥{{ (item.price / 100).toFixed(2) }}</text>
    </view>

    <view class="empty" wx:if="{{ items.length === 0 }}">还没有商品</view>
    <view class="count" wx:else>共 {{ items.length }} 件</view>
</view>
```

数据来自同目录的 `.js`：

> 摘自 `./code/demos/list.js`（运行：`npm run render`）

```js
module.exports = {
    title: '今日特价',
    items: [
        { id: 1001, name: '苹果', price: 599 },
        { id: 1002, name: '香蕉', price: 1290 },
        { id: 1003, name: '樱桃', price: 3990 }
    ]
}
```

编译产物（顶层节点按行输出，便于和源码对照）：

```
<div class="card"><div class="title">今日特价</div><div class="item"><span class="idx">1</span><span class="name">苹果</span><span class="price">¥5.99</span></div><div class="item"><span class="idx">2</span><span class="name">香蕉</span><span class="price">¥12.90</span></div><div class="item"><span class="idx">3</span><span class="name">樱桃</span><span class="price">¥39.90</span></div><div class="count">共 3 件</div></div>
```

三件事在同一段产物里都能看到：`index + 1` 从 0 起步（产物里是 1 / 2 / 3）、`(item.price / 100).toFixed(2)` 这种链式调用在插值里合法、`wx:for` 与 `wx:if` 这类指令**不进 HTML**（产物里只有数据与标签）。

`wx:key` 是这段里唯一"不写也能跑"的字段，但代价不小。去掉它之后编译器给出的警告：

> 摘自 `./code/demos/nokey.wxml`（运行：`npm run render`）

```html
<view class="card">
    <view class="item" wx:for="{{ items }}">{{ item.name }}</view>
</view>
```

```
<div class="card"><div class="item">苹果</div><div class="item">香蕉</div></div>
[warn] 第 2 行 wx:for 缺少 wx:key：列表重排时无法复用节点，会整段重建
```

产物看起来一模一样，差别在**更新阶段**：列表重排、插入、删除时，渲染层靠 `wx:key` 认出"这两个是同一节点"，认不出来就只能整段重建。加上 `wx:key="id"`（数组元素是对象，key 取元素的稳定字段）之后重建退化成移动。

对**基本类型数组**（`['a','b','c']`）来说 `wx:key="id"` 是错的写法，这时应该用 `wx:key="*this"`——编译器同样会报出来：

> 摘自 `./code/demos/bad-key.wxml`（运行：`npm run render`）

```html
<view class="card">
    <view class="item" wx:for="{{ tags }}" wx:key="id">{{ item }}</view>
</view>
```

```
<div class="card"><div class="item">热门</div><div class="item">包邮</div><div class="item">新品</div></div>
[warn] 第 2 行 wx:key="id" 用错了：数组元素是string，这种列表应该写 wx:key="*this"
```

### 3. 条件渲染：`wx:if` / `wx:elif` / `wx:else` 与 `hidden`

条件分支是一个整体，三个指令要**连写**，中间不要插别的节点：

> 摘自 `./code/demos/cond.wxml`（运行：`npm run render`）

```html
<view class="tip" hidden="{{ !visible }}">hidden：节点还在渲染树里，只是被 display:none 藏起来</view>

<view class="tip" wx:if="{{ visible }}">wx:if：条件为真才把节点放进渲染树</view>
<view class="tip" wx:elif="{{ loading }}">wx:elif：上一个条件为假时才会看这里</view>
<view class="tip" wx:else>wx:else：兜底分支</view>
```

同一份模板换三组数据，产物里的节点数量和内容都不同：

```
--- visible=true, loading=false
<div class="tip">hidden：节点还在渲染树里，只是被 display:none 藏起来</div>
<div class="tip">wx:if：条件为真才把节点放进渲染树</div>

--- visible=false, loading=true
<div class="tip" style="display:none">hidden：节点还在渲染树里，只是被 display:none 藏起来</div>
<div class="tip">wx:elif：上一个条件为假时才会看这里</div>

--- visible=false, loading=false
<div class="tip" style="display:none">hidden：节点还在渲染树里，只是被 display:none 藏起来</div>
<div class="tip">wx:else：兜底分支</div>
```

**`hidden` 与 `wx:if` 的差别就摆在产物里**：第二组数据下，`hidden` 那个节点变成了 `<div class="tip" style="display:none">`——**节点仍然存在**，只是被藏起来；`wx:if` 与 `wx:elif` 则是"没命中的分支根本不产出节点"。所以选型看两件事：

- 切换频繁、需要保留节点状态（表单输入、滚动位置、`<video>` 实例）→ `hidden`
- 初始就不需要、节点重、只在少数条件下出现 → `wx:if`

`wx:for` 给的不是数组也会在编译期报错，而不是渲染出一片空白：

> 摘自 `./code/demos/bad-for.wxml`（运行：`npm run render`）

```html
<view class="card">
    <view class="item" wx:for="{{ summary }}" wx:key="id">{{ item }}</view>
</view>
```

```
Error: 第 2 行：wx:for 的值必须是数组，实际是object
```

### 4. 模板复用：`template` / `import` / `include`

WXML 没有组件化的概念（那是自定义组件的事），只有三层复用手段：

> 示意片段（无配套脚本）

```html
<!-- 1. 定义模板：只渲染 wxml，样式不跟着走 -->
<template name="goodsItem">
    <view class="item">{{ name }} · ¥{{ price }}</view>
</template>

<!-- 2. 用模板：data 必须显式传进去，模板内拿不到页面 data -->
<template is="goodsItem" data="{{ name: item.name, price: item.price }}" />
```

> 示意片段（无配套脚本）

```html
<!-- import：只导入 template 定义，且只认 <template/> 部分 -->
<import src="../tpl/goods.wxml" />

<!-- include：把目标文件的**除 template / wxs 之外**的全部内容拷进来（相当于内联展开） -->
<include src="../common/footer.wxml" />
```

三者的边界值得记牢：`template` 是"带参数的片段"，要手动传 `data`；`import` 有作用域（只能拿到被导入文件里的 template，不会把导入的文件的 import 也带进来）；`include` 是**文本级复制**，被包含文件里的 `template` 与 `wxs` 会被忽略。用得越多，调试越难定位——这也是后面跨端框架的一大动机。

## 二、WXSS：尺寸单位与选择器

WXSS 是 CSS 的子集 + 一个关键扩展：`rpx`。

### 1. `rpx`：750rpx 恒等于屏幕宽度

`rpx` 是"响应式像素"，规则只有一条：**规定 750rpx 正好是屏幕宽度**，于是

```
px = rpx × 屏幕宽度 / 750
```

> 摘自 `./code/mini/wxss.js`（运行：`npm run render`）

```js
/** rpx → px：750rpx = 屏宽 */
function rpxToPx(rpx, screenWidth) {
    return (rpx * screenWidth) / 750
}
```

用一份真实样式跑一遍，就能看出"设计稿按 750 宽出图"这句话的含金量：

> 摘自 `./code/demos/rpx.wxss`（运行：`npm run render`）

```css
/* 同一份 WXSS 在不同机型上的实际尺寸：750rpx = 屏幕宽度 */
.card {
    width: 690rpx;
    margin: 24rpx auto;
    border-radius: 16rpx;
    font-size: 28rpx;
    border-width: 2rpx;
}
```

```
机型                     屏宽    690rpx     28rpx      16rpx      2rpx
iPhone SE · 320          320     294.4px    11.9467px  6.8267px   0.8533px
iPhone 8 · 375           375     345px      14px       8px        1px
iPhone 14 · 390          390     358.8px    14.56px    8.32px     1.04px
iPhone 14 Pro Max · 430  430     395.6px    16.0533px  9.1733px   1.1467px
```

375 屏宽下的完整换算结果：

```
.card {
    width: 345px;
    margin: 12px auto;
    border-radius: 8px;
    font-size: 14px;
    border-width: 1px;
}

/* 下面两条是「清单之外」的写法，用选择器检查器把它们挑出来 */
* {
    box-sizing: border-box;
}

.card[data-id] {
    padding: 0 15px;
}
```

两点结论：

- **690rpx 在 320 上是 294.4px、在 430 上是 395.6px**，两边都正好占住屏宽减边距的 92%。设计稿按 750 出图、开发者照抄数字，等比缩放在小程序里是**免费**的——这也是为什么这套单位值得用。
- **`28rpx` 在 320 上会算出 11.9467px**，这类小数浏览器自己会处理，但"1px 细线"这种要求精确的场景，`2rpx` 在 375 上是 1px、在 320 上只有 0.85px，想要稳定的一像素请直接用 `1px`（或用 `transform: scaleY()` 那套老办法）。

### 2. 选择器：官方清单只有几种

WXSS 支持的选择器清单很短：`.class`、`#id`、`element`、`element, element`、`::after`、`::before`。清单之外的写法（通配符、属性选择器、兄弟/子代组合器）都不在支持范围内——检查器会把它们挑出来：

```
[out] 第 8 行 * 不在 WXSS 支持的选择器清单内
[out] 第 13 行 .card[data-id] 不在 WXSS 支持的选择器清单内
```

这条规则的实践含义很直接：**类选择器就是主力**。H5 里常见的 <code v-pre>* { box-sizing: border-box }</code> 全局重置、`li:nth-child(2n)` 斑马纹、`[data-state="loading"]` 状态样式，在小程序里都得换写法——用类名表达状态（`.item--even`、`.btn--loading`），或者把 `box-sizing` 写到每个具名容器上。这条限制反过来也是好事：它逼着状态都落到类名上，样式作用域更清楚。

### 3. 样式的作用域与 `@import`

> 示意片段（无配套脚本）

```css
/* app.wxss：全局样式，所有页面与组件都能用 */
page {
    background: #f6f7f9;
}

/* 页面 wxss 里引别的文件，用相对路径、可以省略后缀 */
@import './common/theme.wxss';
```

作用域规则分三层：`app.wxss` 是全局层；页面的 `.wxss` 作用于该页面；**组件的样式默认隔离**（组件内不继承页面选择器，页面也选择不到组件内部）——跨端框架"样式莫名不生效"的排查，最后基本都落在这条上。需要穿透时开 `styleIsolation`，但那是权衡不是默认项。

## 三、事件绑定与 `dataset`

小程序的事件写法是 `bind`（冒泡）/ `catch`（阻止冒泡）加事件名，冒号可省略：

> 示意片段（无配套脚本）

```html
<view class="btn" data-id="{{ item.id }}" bindtap="onTap">点我</view>
<view class="mask" catchtap="noop" bindtouchmove="onMove">遮罩</view>
```

> 示意片段（无配套脚本）

```js
Page({
    onTap(e) {
        // 自定义数据从 currentTarget.dataset 读，不是 target
        const id = e.currentTarget.dataset.id
        // 事件对象里还有 type / timeStamp / detail / touches
        console.log(e.type, id)
    }
})
```

三条容易写错的：

1. **`data-*` 一律是字符串**：<code v-pre>data-id="{{ item.id }}"</code> 传数字进来，`dataset.id` 拿到的是 `'1001'`。要数字就 `Number(e.currentTarget.dataset.id)`。
2. **用 `currentTarget` 而不是 `target`**：`target` 是真正被点中的那个子节点（比如按钮里的 `<text>`），`currentTarget` 才是绑定了事件的那个节点——和 Web 事件对象的语义一致（见 [DOM 与浏览器 API](../JavaScript%20核心/DOM%20与浏览器%20API.md)）。
3. **事件要跨线程**：`bindtap` 的回调在逻辑层执行，事件对象由渲染层序列化过来。所以事件绑定的粒度值得留意——给长列表的每一项都绑一个 `bindtap` 是常规做法，但在超长列表里，把监听器收到容器上、用 `data-*` 区分项，能省掉一批跨线程通信（思路与 Web 侧的事件委托相通）。

## 四、一个页面的最小骨架

四个文件各司其职，注册入口只有两个 `Page` / `Component` 调用：

> 示意片段（无配套脚本）

```js
// pages/detail/index.js —— 页面：用 Page 注册，data 里放"视图要用的数据"
Page({
    data: {
        title: '',
        items: []
    },
    onLoad(query) {
        // 只在这里读一次路由参数
        this.fetch(query.id)
    },
    async fetch(id) {
        const res = await request(`/api/detail?id=${id}`)
        // 只把视图要用的字段 setData 过去，别把整个 res 塞进 data
        this.setData({ title: res.title, items: res.items })
    }
})
```

> 示意片段（无配套脚本）

```json
{
    "pages": ["pages/index/index", "pages/detail/index"],
    "window": {
        "navigationBarTitleText": "示例",
        "backgroundColor": "#f6f7f9"
    },
    "subpackages": [{ "root": "pkgOrder", "pages": ["list/index"] }],
    "preloadRule": {
        "pages/index/index": { "network": "all", "packages": ["pkgOrder"] }
    }
}
```

`app.json` 里 `pages` 数组的**第一项就是启动页**，这项顺序错了会直接改启动路径；`subpackages` 与 `preloadRule` 是启动优化的抓手（见第 4 篇）。页面自己的 `.json` 只写本页配置（导航栏标题、是否允许下拉刷新、用到的自定义组件 `usingComponents`），不要重复全局项。

## 配套代码

配套代码是 `frontend/基础/小程序/code/` 下的一个零依赖迷你编译器：把 `demos/` 里的 WXML / WXSS 编译成可读的 HTML，打印产物、警告与编译期报错。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/demos/list.wxml` | `wx:for` + `wx:key="id"`、<code v-pre>{{ index + 1 }}</code> 与 <code v-pre>{{ (item.price / 100).toFixed(2) }}</code> 这类表达式、`wx:if` / `wx:else` 配对 | 列表渲染：`wx:for` 与 `wx:key` · 条件渲染：`wx:if` / `wx:elif` / `wx:else` 与 `hidden` |
| `./code/demos/list.js` | 列表数据源：对象数组（每项带稳定 `id`） | 列表渲染：`wx:for` 与 `wx:key` |
| `./code/demos/list.wxss` | 列表样式里用的 rpx 值（690rpx 卡片、28rpx 字号、16rpx 圆角） | `rpx`：750rpx 恒等于屏幕宽度 |
| `./code/mini/wxss.js` | `rpx → px` 换算公式、按屏宽批量换算、按官方清单核对选择器 | `rpx`：750rpx 恒等于屏幕宽度 · 选择器：官方清单只有几种 |
| `./code/demos/rpx.wxss` | 一份含 rpx 的真实样式，外加 `*` 与属性选择器两条「清单之外」的写法 | `rpx`：750rpx 恒等于屏幕宽度 · 选择器：官方清单只有几种 |
| `./code/demos/cond.wxml` | 同一份模板换三组数据，看 `hidden` 与 `wx:if` / `wx:elif` / `wx:else` 的产物差别 | 条件渲染：`wx:if` / `wx:elif` / `wx:else` 与 `hidden` |
| `./code/demos/nokey.wxml` | `wx:for` 不写 `wx:key`：产物不变，编译期警告 | 列表渲染：`wx:for` 与 `wx:key` |
| `./code/demos/bad-key.wxml` | 基本类型数组上写了 `wx:key="id"`：编译期警告，应改用 `*this` | 列表渲染：`wx:for` 与 `wx:key` |
| `./code/demos/bad-key.js` | 基本类型数组作为数据源（`['热门','包邮','新品']`） | 列表渲染：`wx:for` 与 `wx:key` |
| `./code/demos/bad-expr.wxml` | 把 `var` 声明写进 <code v-pre>{{ }}</code>：编译期报错 | <code v-pre>{{ }}</code> 里只能放表达式 |
| `./code/demos/bad-for.wxml` | `wx:for` 的值不是数组：编译期报错 | 列表渲染：`wx:for` 与 `wx:key` |
| `./code/mini/expr.js` | <code v-pre>{{ }}</code> 表达式的静态检查清单（语句关键字 / 分号 / 赋值号 / 箭头函数 / 宿主对象） | <code v-pre>{{ }}</code> 里只能放表达式 |
| `./code/mini/wxml.js` | WXML 解析与渲染：指令处理、`wx:key` 校验、`hidden` → `display:none`、<code v-pre>{{ }}</code> 插值与转义 | 整节（WXML） |
| `./code/mini/run-demos.js` | 把 `demos/` 跑成结构化结果，终端输出与预览页共用 | 配套代码（运行方式） |
| `./code/render.js` | `npm run render` 的终端输出：产物、警告、编译期报错、rpx 换算表、选择器清单核对 | 整节（全部实测输出） |
| `./code/server.js` | `npm start` 的预览页：源码与编译产物左右对照，附实际的渲染效果（端口 5185） | 配套代码（运行方式） |

两种运行方式：

- `npm run render` —— 终端打印全部结果，文中所有实测输出都来自这条命令。
- `npm start` —— 打开 `http://localhost:5185/`，源码与产物左右对照，还能直接看编译出来的 HTML 渲染效果。

迷你编译器只覆盖本文讨论的规则：<code v-pre>{{ }}</code> 插值、`wx:if` / `wx:elif` / `wx:else`、`wx:for` 与 `wx:key`、`hidden`、rpx 换算与选择器核对。`wxs`、`import` / `include`、自定义组件、事件系统都不在其中（正文里以「示意片段（无配套脚本）」标注）。它不替代微信开发者工具——`Page` / `Component` 注册、真机渲染、`setData` 跨线程行为仍要在开发者工具里验证。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 下一篇：[小程序生命周期与路由](./小程序生命周期与路由.md)
- 相关：[双线程架构与渲染机制](./双线程架构与渲染机制.md)（`setData` 与 WXS 的运行位置）· [原生与跨端框架差异](./原生与跨端框架差异.md)（模板限制如何变成框架的动机）
