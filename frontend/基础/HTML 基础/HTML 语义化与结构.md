# HTML 语义化与结构

## 标签的三种形态

HTML 用**标签**描述"这里是什么内容"。

> 示意片段（无配套脚本）

```html
<p>这是段落</p>        <!-- 成对标签：开始 <p> + 结束 </p> -->
<img src="a.png" />     <!-- 自闭合：没内容，不需结束标签 -->
<br />                 <!-- 换行 -->
```

标签会嵌套出层级（父 / 子 / 兄弟），写时要**正确嵌套、有缩进、命名见名知意**。

## 文档骨架：每个页面都长这样

> 示意片段（无配套脚本）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>我的网页</title>
    <meta name="description" content="页面描述，用于 SEO" />
  </head>
  <body>
    <h1>你好，世界！</h1>
  </body>
</html>
```

| 部分 | 作用 |
| ---- | ---- |
| `<!DOCTYPE html>` | 声明 HTML5，让浏览器用标准模式渲染 |
| `<html>` | 根元素，`lang` 声明语言 |
| `<head>` | 元信息（`title`/`meta`/`link`/`style`），不显示 |
| `<body>` | 所有可见内容 |

> 记住 `meta` 里的 `name="description"` 是给搜索引擎看的描述，别漏。

## 语义化标签：结构即含义

语义化 = **用含义贴切的标签**描述内容。先用一张页面看全景：

> 示意片段（无配套脚本）

```html
<header>   <!-- 页头：Logo、导航 -->
  <h1>我的博客</h1>
  <nav><a href="#">首页</a><a href="#">关于</a></nav>
</header>
<main>     <!-- 主体（每页建议一个） -->
  <article>
    <h2>文章标题</h2>
    <section><h3>小节</h3><p>正文</p></section>
  </article>
  <aside><h3>侧边栏</h3></aside>   <!-- 独立但相关的辅助内容 -->
</main>
<footer>   <!-- 页脚：版权 -->
  <p>© 2026</p>
</footer>
```

| 标签 | 用途 |
| ---- | ---- |
| `header` / `footer` | 页面或区块的头部 / 底部 |
| `nav` | 导航链接 |
| `main` | 主体（每页一个） |
| `article` | 独立可复用内容（一篇博客、一条新闻） |
| `section` | 有主题的区块 |
| `aside` | 侧边栏 |

> 反例是用一堆 `<div>` 硬堆：`<div class="header">`。`div` 没含义，语义化让你一眼看懂结构，也让机器（爬虫、读屏器）看懂。`div`/`span` 仍有用，但**优先语义化**。

## 常用内容标签

- **标题**`h1`~`h6`：层级按序，`h1` 每页一个。
- **文本**：`p` 段落、`strong` 加粗强调、`em` 斜体、`mark` 高亮、`pre` 保留空格/换行。
- **列表**：`ul` 无序、`ol` 有序、`dl/dt/dd` 定义列表。
- **链接**`<a>`：`href` 目标；`target="_blank"` 新窗口；页面内用 `href="#id"` 锚点。
- **图片**`<img>`：`src` 必填，`alt` 强烈建议（图挂时的文字，也是无障碍/SEO 信息）。
- **表格**：`table > thead/tbody > tr > th/td`；`colspan` 跨列、`rowspan` 跨行。

## 全局属性（任意标签可用）

| 属性 | 作用 |
| ---- | ---- |
| `id` | 页面内唯一（JS/锚点用） |
| `class` | 可多个空格分隔（CSS/JS 定位） |
| `data-*` | 自定义数据，JS 用 `dataset` 读取 |
| `hidden` | 隐藏元素 |

> 示意片段（无配套脚本）

```html
<div id="app" class="container" data-uid="1001">…</div>
<script>document.querySelector("div").dataset.uid; // "1001"</script>
```

## 响应式图片：`picture` 与 `srcset`

同一张图在不同设备给不同规格，不用 CSS 也能做：

> 示意片段（无配套脚本）

```html
<!-- 按屏幕宽度换图（纯 HTML 属性，无需 CSS） -->
<img
  src="small.jpg"
  srcset="small.jpg 600w, large.jpg 1200w"
  sizes="(max-width: 600px) 600px, 1200px"
  alt="说明"
/>

<!-- picture 更精细：按媒体条件选不同源 -->
<picture>
  <source media="(min-width: 900px)" srcset="wide.jpg" />
  <source media="(min-width: 500px)" srcset="mid.jpg" />
  <img src="small.jpg" alt="兜底图" />   <!-- 最后一个 img 必填且作兜底 -->
</picture>
```

`srcset` 的 `600w/1200w` 是告诉浏览器图片真实宽度，由它按屏幕选；最后一个 `<img>` 是兼容兜底，**必填**。

## 更精细的语义标签

> 示意片段（无配套脚本）

```html
<figure>
  <img src="chart.png" alt="销量图" />
  <figcaption>图1：年度销量（图注会跟着图走）</figcaption>
</figure>
<time datetime="2026-09-10">今天</time>   <!-- 机器可读时间，利于 SEO -->
<address>联系地址…</address>
<details><summary>点我展开</summary>这里的内容默认收起</details>
```

## SEO 与 meta 优化前缀

- 标题层级 `h1`（一个）→ `h6` 让爬虫读懂主次；
- `meta name="description"` 显示在搜索结果的摘要；
- `img` 的 `alt` 参与图片搜索与无障碍；
- `<picture>/<figure>/<time>` 提供更丰富的语义给爬虫和读屏器。

> 完整 SEO/性能策略属于后续工程化与浏览器章节；这里只先建立"语义化 ↗ SEO/可访问性"的直觉。

把第二层能力串成一个完整页面（可直接保存为 `index.html` 打开）：

> 示意片段（无配套脚本）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="关于前端入门的一点心得" />
    <title>我的技术博客</title>
  </head>
  <body>
    <header>
      <h1>我的技术博客</h1>
      <nav>
        <ul>
          <li><a href="#home">首页</a></li>
          <li><a href="#articles">文章</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <!-- 头图：不同屏幕换图 -->
      <picture>
        <source media="(min-width: 900px)" srcset="banner-wide.jpg" />
        <img src="banner.jpg" alt="博客横幅" />
      </picture>
      <article>
        <h2>用语义化标签重写你的页面</h2>
        <time datetime="2026-09-10">2026-09-10</time>
        <section aria-label="正文">略，正常段落…</section>
      </article>
    </main>
    <footer>
      <p>© 2026 · <address>反馈请发邮件到 hi@blog.com</address></p>
    </footer>
  </body>
</html>
```

## 常用的 meta 标签

`meta` 是文档的"元信息"，不显示但影响编码、SEO、移动适配。除了 `charset` / `viewport` / `description`，常用的还有：

| meta | 作用 |
| ---- | ---- |
| `<meta name="keywords" content="HTML,前端">` | 关键词（早期 SEO 用，现已基本失效） |
| `<meta name="author" content="作者">` | 作者信息 |
| `<meta name="robots" content="noindex">` | 告诉爬虫是否收录/跟链（`noindex`/`nofollow`） |
| `<meta http-equiv="refresh" content="0;url=...">` | 页面重定向/定时刷新 |
| `<meta http-equiv="X-UA-Compatible" content="IE=edge">` | 兼容旧 IE 的渲染模式（legacy 项目） |

viewport 字段逐个说清楚：

| 字段 | 含义 |
| ---- | ---- |
| `width=device-width` | 布局视口宽度 = 设备宽度 |
| `height` | 视口高度（极少用） |
| `initial-scale` | 初始缩放比例 |
| `maximum-scale` / `minimum-scale` | 最大 / 最小缩放 |
| `user-scalable` | 是否允许用户缩放（禁用违反可访问性，见模块面试题） |

## 脚本与资源加载：`src`/`href` 与 `defer`/`async`

**`src` 与 `href` 的区别**：`href` 是"引用"，在当前文档和目标资源之间**建立联系**（`<a>`、`<link>`），不替换内容、可并行下载不阻塞；`src` 是"加载并嵌入"（`<script>`、`<img>`、`<iframe>`），需要下载后执行 / 渲染，浏览器解析到同步 `script` 时会**暂停解析**直到下载并执行完——这也是 JS 放底部 / 用 `defer` 的原因。

**`defer` 与 `async` 的区别**：两者都不阻塞 HTML 解析（下载与解析并行），区别在执行时机：

> 示意片段（无配套脚本）

```html
<script defer src="a.js"></script>   <!-- 下载并行，HTML 解析完才执行，且按文档顺序 -->
<script async src="b.js"></script>   <!-- 下载并行，下载完立刻执行，不保序 -->
```

- `defer`：HTML 解析完成后、`DOMContentLoaded` 触发前，按文档顺序执行——适合依赖 DOM 的业务脚本。
- `async`：下载完立刻执行（可能在解析中途）——适合独立无依赖的统计脚本。
- `type="module"`：自带 defer 语义 + 严格模式 + 模块作用域，Vite 产物入口默认用它。

三种方式的执行时机对比：

| 方式 | 下载 | 执行时机 | 对 `DOMContentLoaded` 的影响 |
| --- | --- | --- | --- |
| 默认（同步） | 阻塞 HTML 解析 | 遇到即执行 | 推迟（解析被阻塞） |
| `defer` | 与解析并行 | 解析完成后、`DOMContentLoaded` 之前 | 推迟到脚本执行之后 |
| `async` | 与解析并行 | 下载完立即执行 | 不推迟 |

记忆要点：`defer` 的脚本"排在解析后面"，所以 `DOMContentLoaded` 要等它执行完才触发；`async` 是"下载完插队即走"，`DOMContentLoaded` 不等它。这也是业务脚本用 `defer`、统计脚本用 `async` 的原因。

> 预加载指令 `dns-prefetch` / `preconnect` / `preload` / `prefetch` 的选型，详见 `网络与浏览器` 模块。

## HTML5 新增了什么

- **语义化标签**：`header`/`nav`/`main`/`article`/`section`/`aside`/`footer`（见第 3 节）。
- **媒体标签**：`<video>`、`<audio>` 原生播放音视频，配 `controls`/`autoplay`/`muted` 等属性。
- **表单增强**：新类型（`email`/`url`/`number`/`search`/`range`/`color`/`date`/`time`…）、新属性（`placeholder`/`autofocus`/`required`/`pattern`…）、原生约束校验——细节见 `表单与标签`。
- **进度条与度量器**：`<progress>`（任务进度，不确定值不加 `value`）与 `<meter>`（度量，如磁盘用量）。
- **Web 存储**：`localStorage`（持久）与 `sessionStorage`（会话级）——详见 `网络与浏览器`。
- **DOM 查询**：`document.querySelector()` / `querySelectorAll()`——详见 `JavaScript 核心`。
- **拖放**：`draggable` + `dragstart`/`dragover`/`drop` 事件实现拖拽。
- **画布**：`<canvas>` 提供 2D/3D 绘图 API。

## iframe 的优缺点

`<iframe>` 在页面内嵌另一个文档（内联框架）。

**优点**：
- 加载慢的内容（如广告）可独立加载、并行下载脚本；
- 可做跨子域通信与第三方内容嵌入（地图、支付表单）。

**缺点**：
- 会**阻塞主页面的 `load` 事件**（要等 iframe 加载完）；
- 部分搜索引擎不索引 iframe 内容；
- 多个 iframe 产生多个独立文档，维护与调试成本高；安全上要防点击劫持（`X-Frame-Options`/`frame-ancestors`）。

## `<!DOCTYPE html>` 到底做了什么

不带它，浏览器可能进**怪异模式（Quirks Mode）**——按旧 IE 的怪癖规则渲染，你写的 CSS 会听话很怪。声明它 = 让浏览器开**标准模式**。一句话：**DOCTYPE 是告诉浏览器"按谁的规则渲染"的开关**。回到本页顶部删掉它再看下布局差别，是最直观的验证。

## HTML 如何变成一棵"结构树"

浏览器拿到 HTML 后，会把它解析成一棵**DOM 树**——每个标签变成树上的一个节点，父子嵌套变成树的父子关系：

> 示意片段（无配套脚本）

```
        <html>
       /      \
   <head>      <body>
              /      \
          <h1>       <p>
```

任何前端框架、JS 操作（`document.querySelector`）、爬虫解析，本质都是在这棵树上找节点和挂事件。**你现在就能验证**：DevTools → Elements 面板显示的就是这棵树的实时样子，右键可增删改节点。详见浏览器渲染章节，但以上直觉已足以理解语义化为什么重要。

## 为什么语义化能提升 SEO 与无障碍

- **对爬虫（SEO）**：它不"看"网页，只"读"结构树。`<nav>/<article>/<main>` 和 `h1` 层级能让它瞬间分清正文与导航，正确索引内容。
- 对读屏器（无障碍）：你闭眼，靠听读屏器浏览。语义化让它能"跳过导航直接读正文"、"把图读成 alt 文字"。`div` 堆出的页面只会被读成一串无意义容器。

## 配套代码

本篇的可运行示例在仓库 `frontend/基础/HTML 基础/code/site/script-loading/`（对应正文「脚本与资源加载」小节）。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/script-loading/sync.html` | 默认（同步）：脚本阻塞解析，页面内容约 2s 后才渲染（白屏） | 脚本与资源加载 |
| `./code/site/script-loading/defer.html` | `defer`：下载不阻塞渲染，解析完成后、`DOMContentLoaded` 前执行 | 脚本与资源加载 |
| `./code/site/script-loading/async.html` | `async`：不阻塞渲染、不推迟 `DOMContentLoaded`，下载完立即执行 | 脚本与资源加载 |

启动方式：在 `code` 目录执行 `node server.js`（即 `npm start`），打开 `http://localhost:5174/` 进入示例目录，依次打开三个验证页，在浏览器控制台（F12）观察日志。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 下一篇：[表单与标签](./表单与标签.md)
