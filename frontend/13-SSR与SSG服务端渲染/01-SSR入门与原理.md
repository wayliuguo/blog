# SSR 入门与原理

> 级别：中级

按本书四层推进：

- **入门使用**：本页——从 CSR 与 SSR 的本质差异讲起，理清 SSR / SSG / ISR 四种渲染模式，回答"为什么需要 SSR"以及 SSR 的完整工作流程；
- **进阶**：见 `02-同构渲染与Hydration`——同一套代码两端跑、"水合"、水合不匹配与流式/渐进式水合；
- **实战**：见 `03-Next.js实战`、`04-Nuxt.js实战` 两个框架落地，以及 `05-ISR与缓存策略`、`06-SSR架构选型与工程实践` 的工程决策；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行，用一段 JS 模拟"服务端先把字符串渲染成 HTML 再插入"，对比 CSR 的首屏挂载顺序，直观看懂"首屏 HTML 里到底有没有正文"这一决定 SEO 与首屏的关键。

服务端渲染（SSR）是解决单页应用（SPA）"首屏慢、SEO 差"两大痛点的经典方案。本文从 CSR 与 SSR 的本质差异讲起，系统梳理为什么需要 SSR、SSR 的完整工作流程，以及 SSR 引入的成本与局限，帮助你在"到底该不该用 SSR"上建立清晰判断。

## 一、从 CSR 到 SSR：渲染模式全景

### 1. 什么是 CSR（客户端渲染）

CSR 是最常见的纯前端渲染模式。浏览器请求 `index.html` 时，服务器只返回一个**近乎空白的壳**和一堆 `<script>` 标签；浏览器必须下载、解析、执行全部 JS 后，由 JS 在运行时动态创建 DOM 并挂载到页面。

```
浏览器 → 请求 / → 服务器返回空壳 index.html + 应用 JS
浏览器 → 下载并执行 JS → 创建 DOM → 挂载 → 页面可见
```

一个典型的 SPA 入口往往长这样：

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>我的应用</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

```js
// main.js（Vue 3）
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```

浏览器看到的 `<div id="app">` 是空的，直到 JS 执行完毕才被填充真实内容。这带来两个致命问题：

- **白屏时间长**：在 JS 下载 + 解析 + 执行这段时间内，用户看到的是空白页。
- **SEO 差**：爬虫（尤其是一次性抓取的 Googlebot 或低配爬虫）拿到的 HTML 里没有正文，无法索引内容。

### 2. 什么是 SSR（服务端渲染）

SSR 把"渲染成 HTML"这一步放到服务器上：浏览器请求某个 URL，服务器**实时执行渲染逻辑**，返回一份**包含完整正文的 HTML 字符串**。浏览器拿到即可直接展示，之后再加载轻量级 JS 完成"接管"（即水合，见下一篇）。

```
浏览器 → 请求 /post/1 → 服务器执行渲染 → 返回完整 HTML（含正文）
浏览器 → 直接渲染 HTML 首屏可见 → 加载 JS → 水合接管交互
```

以 Vue 为例，服务端渲染的核心代码非常直白：

```js
// server.js
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

async function handleRequest(req, res) {
  const app = createSSRApp(App)
  // 注意：这里拿到的是一个 Promise（Vue 3 支持异步组件/async setup）
  const html = await renderToString(app)
  res.end(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app">${html}</div>
      </body>
    </html>
  `)
}
```

### 3. 什么是 SSG（静态站点生成）与 ISR

- **SSG**：在**构建期**一次性把所有页面预渲染成静态 HTML 文件，部署后无需服务器实时计算，性能极致，缓存在 CDN 上。
- **ISR**（增量静态再生成）：以 SSG 为基础，允许发布后按时间或按需**增量重新生成个别页面**，兼顾静态性能与内容新鲜度（详见第 5 篇）。

### 4. 四大模式对比总表

| 维度 | CSR | SSR | SSG | ISR |
|------|-----|-----|-----|-----|
| 渲染时机 | 客户端（运行时） | 每次请求的服务端 | 构建期（一次） | 构建期 + 增量 |
| HTML 生成者 | 浏览器 JS | 服务器 | 构建工具 | 服务器（后台异步） |
| 首屏速度 | 慢 | 快 | 极快 | 快 |
| SEO | 差 | 好 | 好 | 好 |
| 数据时效 | 实时 | 实时 | 静态 | 接近实时 |
| 服务器负载 | 无 | 高 | 无（静态托管） | 低 |
| 典型场景 | 后台、工具 | 电商、资讯、登录页 | 博客、文档、营销页 | 更新不频繁的动态站 |

## 二、为什么需要 SSR

### 1. SEO：内容可被爬虫索引

核心诉求是"爬虫拿到的 HTML 里有正文"。对电商、资讯、博客这类面向公网、依赖自然流量的站点，SEO 是刚需。

可能你听说"Google 现在能执行 JS"，确实，Googlebot 具备渲染 JS 的能力，但：

- 渲染排在**首次抓取之后**，二次抓取会延迟收录与排名权重。
- 百度、Twitter/微信分享等爬虫不执行（或很少执行）JS。
- 社交分享卡片（OG 协议）依赖 HTML 里的 `<meta>` 标签，CSR 下这些标签无法动态生成。

```html
<!-- SSR 时代，服务器直接输出 OG 标签，社交平台可正确预览 -->
<meta property="og:title" content="一篇关于 SSR 的文章" />
<meta property="og:description" content="深入理解服务端渲染的原理与权衡。" />
<meta property="og:image" content="https://example.com/cover.png" />
```

### 2. 更快的首屏：TPI（感知性能）提升

SSR 在首屏上的优势不只是"快"，更是"快得可感知"：

- 首屏 HTML 无需等待 JS 就能显示 → **FCP（First Contentful Paint）** 显著提前。
- 对弱网、中低端手机尤其明显——这类设备下载 + 解析大体积 JS 很慢。
- SSR 页面的 **TTI（Time to Interactive）** 关键是水合开销，需要后续优化（见第 2 篇）。

> 注意：SSR 提升的是 **FCP**，对 **LCP（Largest Contentful Paint）** 的提升取决于首屏最大元素是否由服务端输出。而如果水合做得不好，**FID / TBT** 可能反而变差。

### 3. 更好的分享与用户体验

- 社交平台/IM 抓取页面生成预览卡片时，需要可读的非 JS HTML。
- 弱网环境下用户能尽快"看到内容"，即使交互尚未就绪。
- 对实时数据的登录态页面（如订单、购物车），SSR 可直接在服务端拿到鉴权后数据渲染。

## 三、SSR 工作流程

### 1. 一次请求的完整生命周期

```
1 浏览器发起请求 /article/42
   ↓
2 服务器路由匹配，找到该路由对应的组件与数据获取逻辑
   ↓
3 服务端执行数据获取（调 API / 查 DB），得到数据 state
   ↓
4 用数据渲染整棵组件树 → 得到 HTML 字符串
   ↓
5 把数据序列化注入 HTML（win.__INITIAL_STATE__），连同 HTML 一起返回
   ↓
6 浏览器下载并执行客户端 JS
   ↓
7 客户端读取 __INITIAL_STATE__，创建 App 并挂载（水合）
   ↓
8 完成接管，后续导航由客户端 SPA 模式进行
```

### 2. 数据获取与状态注入

SSR 的关键难点是**服务器与客户端必须有同一份初始数据**。服务端把数据序列化后注入页面，客户端水合时读取这份数据，才能保证两端渲染结果一致。

```html
<!-- 服务器输出的 HTML 尾部会附带这样的数据注入脚本 -->
<script>
  window.__INITIAL_STATE__ = { "article": { "id": 42, "title": "SSR 原理" } }
</script>
```

```js
// 客户端入口拿到这份状态
const state = window.__INITIAL_STATE__
```

### 3. 伪代码：一个最小 SSR 数据流

```js
// 伪代码：演示 SSR 的"取数 → 渲染 → 注水"
async function ssrRenderPage() {
  // 1. 服务端取数据
  const article = await fetchArticle(articleId)
  // 2. 用数据渲染组件树
  const app = createSSRApp(ArticlePage, { article })
  const appHtml = await renderToString(app)
  // 3. 返回完整 HTML + 注入状态
  return wrapHtml(appHtml, { article })
}
```

## 四、SSR 的代价与局限

SSR 不是银弹，引入它带来的成本与风险必须正视。

### 1. 服务器压力：渲染不是免费的

每一次请求都要在服务器上执行整棵树渲染，这比纯静态文件服务昂贵得多。CPU 密集的组件、大量 DOM 节点都会放大开销。

- **TTFB（Time To First Byte）变长**：服务器需要先等数据 + 渲染完成才能返回首字节。
- **并发能力下降**：每个请求占用 CPU/内存，扛不住突发流量。
- 因此 **SSR 必须配缓存**（渲染结果缓存、数据缓存、CDN），否则很容易被打挂。

### 2. 流式渲染（Streaming）

传统 SSR 会"等全部渲染完再一次性返回"，导致 TTFB 较长。**流式渲染**允许服务器边渲染边把结果分块发给浏览器（详见第 2 篇），大幅改善 TTFB。

### 3. 定时任务 / 副作用被绕过

同构代码中，凡是在 `setup`/渲染期执行的定时器、订阅、全局副作用，在 SSR 下会产生问题：

- 服务器渲染完即返回，**事件监听、定时器永远不执行或泄漏**。
- 不恰当的副作用可能导致**内存泄漏**或**重复执行**。

```js
// ❌ setup 中直接开定时器，SSR 下不会被清理，属于副作用泄漏
export default {
  setup() {
    setInterval(() => { /* 想做点什么 */ }, 1000)
  },
}
```

```js
// ✅ SSR 安全做法：用生命周期钩子区分环境，并在 onUnmounted 清理
import { onMounted, onServerPrefetch, onBeforeUnmount } from 'vue'
export default {
  setup() {
    let timer = null
    onMounted(() => {
      if (typeof window !== 'undefined') timer = setInterval(() => {})
    })
    onBeforeUnmount(() => timer && clearInterval(timer))
  },
}
```

### 4. 其他代价清单

| 代价 | 说明 |
|------|------|
| 开发复杂度 | 需要处理同构（两端差异）、环境区分、禁用 window/document 直用 |
| 部署复杂度 | 需要 Node 运行时，或不规则函数环境的容器化部署 |
| 开发体验 | 前端工具链（如 CSS-in-JS、某些库）对服务端支持参差 |
| 稳定性 | 服务端代码异常直接导致请求 500，需降级与监控 |
| 内存 | 长驻 Node 进程，内存泄漏更致命 |

## 五、SSR vs CSR vs SSG 如何选型

一个实用的判断思路（详见第 6 篇决策树）：

- **内容型、SEO 敏感、数据稳定** → SSG（博客、文档、营销页）。
- **内容型、SEO 敏感、数据实时/带登录态** → SSR（电商、资讯、社区）。
- **工具型、后台、几乎不关心 SEO** → CSR（管理后台、编辑器）。
- **更新不频繁的动态内容** → ISR 是 SSG 与 SSR 的折中。

## 六、最小实现：浏览器里演示 SSR 思想

打开 `code/frontend/13-ssr`（`node server.js` 后访问 `http://localhost:5186/`），进入 `ssr-vs-csr.html`：一个"模拟服务器"函数先把完整 HTML 字符串拼好再 insert 进页面（服务端渲染视角），另一个先挂空白壳再由 JS 填充（CSR 视角），直观对比两种顺序下"首屏 HTML 里有没有正文"以及爬虫视角的差别——这正是 SEO 与首屏快慢的分水岭。诚实说明：真 SSR 需要 Node 服务端在每次请求时就把组件渲染成字符串返回，demo 只是把这一步"搬进浏览器"做等价演示（详见 `00-入门与环境` 的 Node 与 dev-server 思路）。

## 七、面试衔接

本节对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q111-117，重点 Q111 CSR/SSR、Q112 SSR/SSG/ISR）：CSR/SSR/SSG 渲染时机与 SEO 差异、SSR 改善 FCP 而非 TTI、请求到水合的完整流程、引入的成本，以及何时该用哪种渲染模式。做真题自测后，进入下一节 `02-同构渲染与Hydration`。