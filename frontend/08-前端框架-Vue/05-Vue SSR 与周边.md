# Vue SSR 与周边生态

单页应用（SPA）虽交互流畅，但首屏需等 JS 下载、解析、执行后才能渲染出内容，且内容由 JS 动态生成、爬虫难以直接抓取。服务端渲染（SSR）通过在服务器上把组件渲染成 HTML 再发给浏览器，直接解决首屏与 SEO 问题。本文覆盖什么是 SSR、SSR / CSR / SSG 的对比、Vue SSR 的原理（`createSSRApp`、hydration、同构）、Nuxt.js 简介与目录结构、SSR 数据获取与服务端渲染流程，以及与 React 侧 Next.js 的对照。

> 级别：高级

按本书四层推进：

- **入门使用**：理解 CSR / SSR / SSG 各自的渲染时机与选型、Vue SSR 的 `createSSRApp` + `renderToString` / hydration 概念；
- **进阶**：同构约束（避免在 setup 顶层碰 `window`）、`onServerPrefetch` 服务端拉数、`useFetch` / `useAsyncData` 与水合数据复用；
- **实战**：用 Nuxt 搭一个内容站，切 SSR 模式并让首屏数据在服务端就绪，再观察水合后的交互接管；
- **最小实现掌握原理**：SSR 的"渲染成 HTML 字符串"与模板编译同源 —— 到 `code/frontend/08-vue` 运行 `compiler-demo.html`，看渲染函数如何用数据把模板展开为字符串，这正是 `renderToString` 在服务端所做事情的最小映照。

## 什么是 SSR

**SSR（Server-Side Rendering，服务端渲染）** 是指：当用户请求页面时，服务器执行框架的渲染逻辑，把组件渲染成**完整的 HTML 字符串**返回给浏览器。浏览器拿到 HTML 就能直接展示内容，之后再加载并"接管"页面，使其具备交互能力。

与之相对的是 **CSR（Client-Side Rendering，客户端渲染）**：服务器只返回一个空的 `index.html` 和一堆 JS/静态资源，浏览器下载并执行 JS 后，由 JS 在客户端动态生成 DOM。

SSR 的价值主要体现在：

- **更快的首屏**：浏览器无需等待大量 JS 执行即可看到内容，对弱网、低端设备尤其明显。
- **更好的 SEO**：爬虫抓到的 HTML 里已包含实际正文，利于搜索引擎收录。
- **更好的分享体验**：社交平台抓取（OG 标签、预览图）依赖可读的 HTML。

代价是服务器承担额外渲染压力、部署与开发复杂度上升。因此 SSR 通常用于**内容型 / 面向公网的 SEO 敏感型网站**（博客、电商详情、资讯），后台管理类应用大多继续用 CSR。

## SSR vs CSR vs SSG

除了 SSR 和 CSR，还有 **SSG** 与 **ISR** 等方案。理解四者差异，是选型的前提。

| 方案 | 渲染时机 | HTML 生成 | 首屏 | SEO | 数据时效 | 典型场景 |
|------|---------|----------|------|-----|---------|---------|
| CSR | 客户端 | 浏览器执行 JS 生成 | 慢 | 差 | 实时 | 后台、工具型应用 |
| SSR | 每次请求的服务器 | 每次请求时实时渲染 | 快 | 好 | 实时 | 电商、资讯、登录态页面 |
| SSG | 构建时（一次） | 构建时生成静态 HTML | 极快 | 好 | 静态 | 博客、文档、营销页 |
| ISR | 构建 + 定期/按需 | 构建时生成 + 增量刷新 | 快 | 好 | 接近实时 | 内容更新不频繁的站点 |

核心判断维度：

- **SSG（Static Site Generation，静态站点生成）**：在**构建期**就把所有页面预渲染成静态 HTML 文件，部署到 CDN/静态托管后无需服务器实时计算，性能最好。适合内容变化不频繁的站点。
- **ISR（Incremental Static Regeneration，增量静态再生成）**：以 SSG 为基础，允许在发布后按时间或按需**重新生成个别页面**，兼顾静态性能与内容新鲜度。
- **SSR vs SSG 的选择**：页面依赖"每次请求都不同的数据"（如用户态、实时价格）选 SSR；数据稳定可预知则优先 SSG 以获取极致性能。当两者兼顾时，用"SSG 兜底 + 客户端/局部 SSR 补充"的混合方案。

## Vue SSR 原理

Vue SSR 的目标是"**同一套组件代码，既能跑在服务器，也能跑在客户端**"。实现这一目标的关键有三个概念：`createSSRApp`、`hydration`（水合）与同构（Isomorphic/Universal）。

### createSSRApp 与正常应用的差异

普通 Vue 应用在创建时使用 `createApp`；服务端渲染则使用 `createSSRApp`。`createSSRApp` 的组件实例是**非响应式的**——因为服务端只需渲染一次性 HTML，无需也不应在服务器上维护响应式状态，这能减少服务器开销。

```js
// 服务端创建应用
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

const app = createSSRApp(App)
const html = await renderToString(app)
```

### 同构（Isomorphic）

"同构"指**同一份 Vue 组件源码**在服务端与客户端被复用：服务器用组件渲染出 HTML（`renderToString`），客户端再用同一份组件"接管"这份 HTML。因此组件的写法要满足**同构约束**：

- 不能在 `setup` 顶层直接访问 `window` / `document` 等浏览器对象（服务端不存在），必须放到生命周期钩子或 `onMounted` 里。
- 严格区分**只在服务端执行**（拉取、鉴权）与**只在客户端执行**（事件监听、动画）的代码。
- `renderToString` 是流式/异步的，需用 `await` 等待完整 HTML 输出。

### hydration（水合）

服务器返回的是一段**静态 HTML**，本身不可交互。客户端加载 JS 后，需要做一个"激活"动作，把静态 HTML 上"接"上事件监听、生成对应组件实例、恢复交互能力——这个过程就叫 **hydration（水合/注水）**。

```js
// 客户端代码：与服务端"同款"创建应用，进行水合
import { createSSRApp } from 'vue'
import App from './App.vue'

const app = createSSRApp(App)
// hydration 的关键：mount 到容器时是"接管已有 HTML"，而不是重新渲染
app.mount('#app')
```

- 客户端用 `createSSRApp(...).mount('#app')` 挂载时，Vue 会**复用服务端吐出的既有 DOM**，为其附加响应式与事件，而不是整块替换重渲。
- 这带来一个重要约束：**服务端渲染出的 HTML 结构与客户端第一次渲染出的结构必须一致**（否则会 hydration mismatch 警告），因此不要在客户端首次渲染前改动 DOM 结构（如动态拼接、依赖随机数/当前时间渲染）。

### 完整流程串联

一次 SSR 请求的典型链路：

```
浏览器发起请求
  → 服务器 createSSRApp(组件) 
  → renderToString 渲染出 <div id="app">...</div> 完整 HTML
  → 服务器把 HTML + 引用的 JS/CSS 一并返回
  → 浏览器展示完整 HTML（首屏内容立即可见）
  → 浏览器加载 JS，执行 createSSRApp(组件).mount('#app') 完成水合
  → 页面接管成功，具备完整交互
```

## Nuxt.js 简介

**Nuxt.js** 是 Vue 生态中最主流的**元框架**，它不只是一个 SSR 库，而是一整套约定式框架：集成了 Vue 3、Vue Router、Pinia（通过模块）、构建工具、自动导入、模块系统等，开箱即用地支持 SSR / SSG / 静态托管，并内置了**目录约定**与**自动路由**，让开发者无需手动配置路由表。

### 特点

- **约定式路由**：`pages/` 下的文件结构自动生成路由，无需手写 `routes`。
- **渲染模式可配置**：可在 `nuxt.config.ts` 中切换 `ssr: true/false` 或启用 `ssg` / 混合渲染。
- **自动导入**：组件、组合式函数、API 都可自动导入，无需手写 `import`。
- **模块生态**：官方与社区的模块（Pinia、axios、i18n、Tailwind 等）可一键接入。
- **服务端引擎 Nitro**：内置 Node / Edge 运行时，支持 API 接口（`server/` 目录）、中间件与部署到多种平台。

### 目录结构

一个典型 Nuxt 项目的目录约定如下：

```
my-nuxt-app/
├── app.vue                  # 根组件（应用入口）
├── pages/                    # 约定式路由：文件即路由
│   ├── index.vue            # → / 首页
│   ├── about.vue            # → /about
│   └── articles/
│       └── [id].vue         # → /articles/:id 动态路由
├── components/               # 组件，自动导入
│   └── AppHeader.vue
├── composables/              # 组合式函数，自动导入
│   └── useAuth.ts
├── layouts/                  # 布局组件（可选）
│   └── default.vue
├── server/                   # 服务端目录（Nitro）：API 路由、中间件
│   └── api/
│       └── hello.ts
├── public/                   # 静态资源
├── stores/                   # Pinia（若启用该模块）状态
│   └── user.ts
├── nuxt.config.ts            # 主配置：渲染模式、模块、构建
└── package.json
```

要点：

- `pages/` 中的文件名直接决定 URL 与嵌套层级；`[id]` 表示动态参数。
- `composables/`、`components/` 下的文件会被**自动导入**，页面中直接使用即可。
- `server/` 用于编写同仓库的后端接口，前后端在同一项目内协作。

## SSR 数据获取与服务端渲染流程

SSR 里最核心也最容易出错的是**"数据该在哪里拉取"**。原则是：**首屏所需数据要在服务端就绪**，否则 HTML 里没有数据、水合后又闪一下，SSR 意义就大打折扣。

### 客户端与组合式 API 的拉取问题

在 Vue 纯 SSR 中，若用 `onMounted` 拉数据，这段逻辑**只在客户端**执行——服务端渲染时 `onMounted` 不会触发，从而出现首屏空白。因此需要在"渲染之前"用服务端感知的钩子来拉数据。

### Vue 纯 SSR：asyncData / onServerPrefetch

对于不依赖 Nuxt 的原生 Vue SSR，可在组件中注册钩子，让服务端在渲染前请求数据：

```js
// 组件中
import { onServerPrefetch } from 'vue'

export default {
  setup() {
    const data = ref(null)
    onServerPrefetch(async () => {
      data.value = await fetchList() // 服务端渲染前执行，数据写入 HTML
    })
    return { data }
  },
}
```

- `onServerPrefetch` 在服务端渲染该组件前执行，把结果随 HTML 一起输出；
- 客户端首次渲染时 Reuse 这份数据（`useState`/透传进 hydration 数据池），从而避免重复请求。

### Nuxt：composable useAsyncData / useFetch

在 Nuxt 中推荐使用框架封装的 `useAsyncData` / `useFetch`，它们**同时具备**客户端与服务端拉取能力，且自动处理"服务端渲染进 HTML、客户端水合复用"：

```vue
<script setup>
// useFetch 封装了拉取 + 响应式 + SSR 传输，是最常用的写法
const { data, error, pending } = await useFetch('/api/articles')
</script>

<template>
  <div v-if="pending">加载中...</div>
  <ul v-else>
    <li v-for="a in data" :key="a.id">{{ a.title }}</li>
  </ul>
</template>
```

- `useFetch(url)`：对接口地址的封装，便捷调用。
- `useAsyncData(key, handler)`：更底层，“拉取函数 + 唯一 key”（key 用于水合时数据对齐）。
- 在 `pages/` 或 `components/` 中使用时，Nuxt 会在**服务端渲染期间**并发执行这些数据请求，全部就绪后再输出完整 HTML，完美契合 SSR 的"首屏可见"目标。

### Nginx 或 Node 部署下的流程

无论原生 Vue 还是 Nuxt，SSR 的**对外流程**是统一的：

```
用户 → DNS/CDN → 负载均衡/Nginx → Node SSR 服务
  → (Nuxt 数据层 fetch) → 组件树渲染 → 完整 HTML + 状态注入
  → 响应给浏览器 → 浏览器水合接管
```

需要关注的是：History 模式路由的直连与刷新需回落到 SSR 入口，避免 404；同时首屏接口调用发生在服务端，需确保相关鉴权/cookie 能被传透到后端。

## 与 React 侧 Next.js 的对照

Vue 生态的 SSR 元框架是 **Nuxt**，React 生态对应的是 **Next.js**。Vue 与 React 分别在两个框架上提供了几乎对标的能力：

| 能力 | Vue / Nuxt | React / Next.js |
|------|-----------|-----------------|
| 元框架 | Nuxt.js | Next.js |
| 渲染模式 | `ssr: true/false`、SSG、静态托管 | SSR、SSG、ISR、混合渲染 |
| 约定式路由 | `pages/`（`[id].vue`） | `app/` 目录（`page.tsx`）或 `pages/` |
| 服务端拉数 | `useFetch` / `useAsyncData` | `fetch` + `cache` / `getServerSideProps` / RSC |
| App Router 动态 API | `useAsyncData`/`useFetch` | `fetch` + `unstable_cache` / Server Components |
| 自动导入 | 组件/组合式函数 | 模块/Server Components 相关 |
| 服务端能力 | Nitro（`server/` 目录 + API） | Route Handlers（`app/api/`） |
| 状态池透传 | hydrate 数据 / useState | RSC 与 Client Components 数据串 |

核心思想完全一致：**同一份组件 + 服务端渲染 + 水合接管**。

- SSR 是**框架无关**的通用手段，Vue 与 React 都能实现；Nuxt / Next 只是把"同构、数据获取、目录约定、部署"等全部工程化地封装好。
- 若在 Vue 与 React 之间切换，记住"Nuxt ≈ Next、`useFetch` ≈ `getServerSideProps`/RSC、Nitro ≈ Route Handlers"即可快速迁移。

## 小结

Vue SSR 的核心是"同一份组件，服务端渲染出 HTML，客户端水合接管"。按需在三者中选型：**内容稳定选 SSG，内容实时且需 SEO 选 SSR，后台工具选 CSR**。工程实践上，直接用 Nuxt 会远比裸手搭建 Vue SSR 省心：它把约定式路由、自动导入、服务端数据获取（`useFetch`）与 Nitro 部署能力一并提供，是生产环境做 Vue SSR 的主流选择。

## 最小实现：用 Demo 感受"渲染成字符串"

到 `code/frontend/08-vue` 启动后打开 `compiler-demo.html`：把带占位符的模板字符串编译成"接收数据、返回展开后字符串"的渲染函数。原理一句话：SSR 的 `renderToString` 本质就是"用当前数据把组件模板运行成一段 HTML 字符串"，与这个 demo 的模板→渲染函数思路同源 —— 区别仅在于真实框架用 VNode 层做渲染，而这里用字符串占位来演示最小内核。

## 面试衔接

本节对应 `90-附录-面试体系` 的「框架 - Vue」阶段（高级 99-102）与「工程化/性能」相关题目：SSR 与 CSR / SSG 的取舍、hydration 水合、同构约束、SSR 首屏数据如何就绪、Nuxt 与 Next 的对照。做真题自测后，Vue 章节即告一段落，可回到 `90-附录-面试体系` 用 Vue 板块全套真题做一次完整自测。