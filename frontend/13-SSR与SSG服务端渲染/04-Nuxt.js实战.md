# Nuxt.js 实战

> 级别：中级→高级

按本书四层推进：

- **入门使用**：见 `01-SSR入门与原理` 的四模式总表；
- **进阶**：见 `02-同构渲染与Hydration` 的同构与"水合"原理；
- **实战**：本页——Nuxt 3 的 Nitro 服务器、`routeRules` 声明式渲染、`useAsyncData` 数据获取以及与 Next.js 的逐项对照；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行 `build-time-static.html`，看"构建式为静态"与"到点增量再生成"的最小产出逻辑，与本页 `routeRules` 的 `prerender`、`swr` 一一对应。

Nuxt 3 是 Vue 生态的全栈框架，以内置 Nitro 服务与灵活的 `routeRules` 声明式渲染著称。本文从 Nuxt 3 的 Nitro 服务器讲起，覆盖渲染模式与 `routeRules`、`useAsyncData`/`$fetch` 的数据获取、目录约定，以及并行化与缓存，最后给出与 Next.js 的逐项对照，帮助你快速在两大框架间迁移心智。

## 一、Nuxt 3 核心：Nitro Server

### 1. 为什么产生 Nitro

Nuxt 3 不再把渲染绑定在单一 Node 语义上，而是引入 **Nitro** 作为通用服务器引擎：

- **跨运行时**：同一套服务端代码可部署到 Node、Edge、Cloudflare Workers、AWS Lambda 等。
- **自动 route patterns**：`/api/**` 自动成为服务端 API 路由。
- **内置中间件、静态资源服务、SQLite/缓存等模块化能力**。
- Nitro 兼顾了"同构"与"可移植部署"的需求。

### 2. Nitro 的作用

```
Nuxt 应用
   ├── 客户端（浏览器）：Vue 组件、状态、路由导航
   └── Nitro 服务端：渲染、API 路由（/api/*）、中间件、路由规则
```

默认构建产物里包含一个起服务的高可移植 JS server（`.output/server/index.mjs`），可被多种平台直接加载。

## 二、渲染模式与 routeRules

### 1. 渲染模式声明

Nuxt 通过配置/`routeRules` 声明每段路由的渲染方式：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true,                 // 全局开关：true=SSR，false=纯客户端 SPA
  routeRules: {
    '/':                    { prerender: true },            // SSG
    '/docs/**':             { swr: 60 },                    // ISR/SWR 60 秒
    '/api/**':              { cache: { maxAge: 300 } },     // API 缓存
    '/admin/**':            { ssr: false },                 // 该段纯客户端
    '/products/**':         { prismaticStatic: false },     // 其他策略
  },
})
```

`routeRules` 是 **Nuxt 3 的杀手级特性**——它让你**用声明式配置**决定"哪段路由走 SSG、哪段走 SWR、哪段走纯 CSR"，无需修改业务代码。

### 2. routeRules 常用表

| 规则 | 说明 | 对应渲染 |
|------|------|---------|
| `prerender: true` | 构建时预渲染为静态 HTML | SSG |
| `swr: <seconds>` | 静态 + 定期回源重新验证（stale-while-revalidate） | ISR/SWR |
| `ssr: false` | 该段完全客户端渲染 | CSR |
| `ssr: true` | 强制服务端渲染 | SSR |
| `cache: {...}` | 对响应做 HTTP/CDN 缓存 | 缓存策略 |

## 三、数据获取：useAsyncData / $fetch

### 1. 推荐的数据获取组合

Nuxt 3 提供 `useAsyncData`、`useFetch`（`useFetch` 是 `useAsyncData`+`$fetch` 的语法糖）。核心规则：

- **数据获取必须放在组件 `<script setup>` 顶层（组合式 API）**，以便 Nuxt 在服务端抓取、传输到客户端并复用。
- 用 `$fetch` 调服务端 API，用 `useAsyncData` 包住以支持 SSR 往返。

```vue
<template>
  <div>
    <h1>文章</h1>
    <pre v-text="posts"></pre>
  </div>
</template>

<script setup lang="ts">
// useAsyncData：服务端取数 → 序列化到客户端 → 客户端复用（避免重复请求 / 水合不一致）
const { data: posts, pending, error, refresh } = await useAsyncData(
  'posts',                              // key：服务端与客户端数据对齐的标识
  () => $fetch('/api/posts'),           // 真实请求
  { server: true }                      // 是否启用服务端获取（默认 true）
)
</script>
```

### 2. useFetch 语法糖

```vue
<script setup lang="ts">
// useFetch === useAsyncData(key, () => $fetch(url))
const { data, status } = await useFetch('/api/user', {
  // 可选：多标签缓存、超时、headers 等
})
</script>
```

### 3. key 与服务端→客户端传输

`useAsyncData` 必须提供稳定 `key`，因为服务端把数据注入到 HTML（`__NUXT_DATA__` 或 PWA 脚本），客户端通过 key 找到对应数据，保证两端渲染一致：

```
服务端：useAsyncData('posts', ...) → 渲染 → HTML 内注入 {key:'posts', data:[...]}
客户端：useAsyncData('posts', ...) → 从注入数据中取同 key 数据 → 复用，不重复请求
```

## 四、目录约定与项目结构

### 1. Nuxt 3 核心目录

```
my-nuxt-app/
├── app.vue              # 根组件（可选）
├── pages/               # 路由页面（pages/index.vue → /）
│   └── blog/
│       ├── index.vue    # /blog
│       └── [slug].vue   # /blog/:slug
├── components/          # 全局组件（自动导入）
├── composables/         # 组合式函数（自动导入）
├── layouts/             # 布局（default.vue）
├── middleware/          # 路由中间件
├── server/              # Nitro 服务端
│   ├── api/             # /api/** 服务端 API
│   │   └── posts.ts
│   └── routes/          # 非 API 服务端响应
├── public/              # 静态资源
└── nuxt.config.ts
```

**约定优于配置**：组件、composables 都按目录自动导入，无需手动 import。

### 2. 动态路由与页面数据

```vue
<!-- pages/blog/[slug].vue -->
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useAsyncData(
  `post-${route.params.slug}`,
  () => $fetch(`/api/post/${route.params.slug}`)
)
</script>
<template>
  <article v-text="post?.title"></article>
</template>
```

## 五、并行化与缓存

### 1. 并行数据获取

多个 `useAsyncData` 默认是**并行**的（都在顶部 await 前发起），可显著缩短 TTFB：

```vue
<script setup lang="ts">
const [{ data: posts }, { data: categories }] = await Promise.all([
  useAsyncData('posts', () => $fetch('/api/posts')),
  useAsyncData('categories', () => $fetch('/api/categories')),
])
</script>
```

### 2. 缓存与去重

- `useAsyncData` 同名 key 会被**去重**，同一 key 只发一次请求。
- `hydrated` 状态可判断服务端/客户端。
- 结合 `routeRules`/Nitro 的接口缓存（`/api/**` 的 `cache` 规则）实现多级缓存。

### 3. 惰性与即时刷新

```vue
<script setup lang="ts">
const { data: user, refresh } = await useAsyncData('user', () => $fetch('/api/me'), {
  immediate: true,   // 控制器首次启动即可
})
// 主动刷新（如点击按钮重新拉取）
function reload() { refresh() }
</script>
```

## 六、Nuxt 与 Next 对照

两者映射关系能极大帮助迁移学习：

| 维度 | Next.js（React） | Nuxt（Vue） |
|------|-----------------|-------------|
| 数据获取 | Server Component `await fetch` / `getServerSideProps` | `useAsyncData` + `$fetch` |
| 静态生成 | `generateStaticParams` / `getStaticProps` | `routeRules.prerender` / `generate` |
| ISR/SWR | `revalidate` 字段 / `revalidatePath` | `routeRules.swr` |
| 动态段规则 | `export const dynamic` | 配置级 `routeRules` |
| API 路由 | `app/api/route.ts` | `server/api/*.ts` |
| 中间件 | middleware.ts | `middleware/` + Nitro |
| 客户端组件标记 | `"use client"` | 无需标记，共享脚本 + `<ClientOnly>` |
| 布局 | `layout.js` | `layouts/*.vue` |
| 服务端能力 | Next Server/Functions | Nitro（跨运行时） |

## 八、最小实现：浏览器里演示静态/增量产出的口径

打开 `code/frontend/13-ssr` 的 `build-time-static.html`：玩具构建器在"构建时"把文章数据渲染成静态 HTML 文件表，再演示对单个文件"增量再生成（ISR）"。它与本页 `routeRules.prerender`（构建期静态）和 `routeRules.swr`（到点/按需回源再生成）表达的产物口径一致，可作为理解 Nuxt 声明式渲染的地基。

## 九、面试衔接

本节对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q111-117，可与 Q112 Next 对照理解）：Nitro 跨运行时能力、`routeRules` 声明式渲染、`useAsyncData` 的 key 与两端数据对齐、目录约定与零 import、并行取数及与 Next 的迁移。做真题自测后，进入下一节 `05-ISR与缓存策略`。