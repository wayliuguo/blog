# Next.js 实战

> 级别：中级→高级

按本书四层推进：

- **入门使用**：见 `01-SSR入门与原理` 的四模式总表，先理解 SSR / SSG / ISR / CSR 概念；
- **进阶**：见 `02-同构渲染与Hydration` 的同构与"水合"原理，这是理解 Server/Client Component 边界的前提；
- **实战**：本页——Next.js 如何在一个框架里落地 SSR / SSG / ISR 与 Server Component / Client Component；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行 `build-time-static.html`，用玩具构建器复现"构建期生成静态 HTML + ISR 增量再生成"的产出逻辑，与本页三模式一一对应。

Next.js 是 React 生态中最主流的全栈框架，把 SSR、SSG、ISR、客户端渲染统一在一个框架里，并通过 App Router / Server Component 重新定义了数据获取与渲染的编写方式。本文从核心模型讲起，覆盖两大路由体系、路由与数据获取、SSR/SSG/ISR 三模式、Server Component 与 Client Component 的边界，以及缓存与渲染"静默化"。

## 一、Next.js 核心模型

### 1. 文件系统即路由

Next.js 用**文件系统约定**定义路由：`app/`（App Router）或 `pages/`（Pages Router）目录下的文件对应不同 URL。

- 旧：`pages/**` 下的 `index.js`、`[id].js`。
- 新：`app/**` 下的 `page.js`、`layout.js`、`route.js` 等。

### 2. Pages Router vs App Router

Next.js 有两种路由模型，理解它们的历史与取舍很重要：

| 维度 | Pages Router（旧） | App Router（新，默认） |
|------|-------------------|----------------------|
| 渲染能力 | SSG/SSR/ISR 靠函数导出 | 默认 React Server Component + 声明式 |
| 数据获取 | `getServerSideProps` / `getStaticProps` | `fetch` / `generateStaticParams` / Server Component |
| 布局 | 单页面级布局，无嵌套 Layout | 支持嵌套 `layout.js` 与共享布局 |
| 服务器组件 | 无 | ✅ 默认页面即 Server Component |
| 缓存粒度 | 粗 | 细粒度、分层缓存 |
| 渐进增强 | — | 重点解决加载态与骨架 |

> App Router 是未来方向，新项目一律用它；Pages Router 用于理解历史与老项目兼容。

## 二、路由与数据获取

### 1. Pages Router：getServerSideProps / getStaticProps

旧模型中，数据获取通过专门的导出函数标记渲染策略：

```jsx
// pages/index.js（Pages Router）
export async function getServerSideProps(context) {
  const { params } = context          // 路由参数
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()
  return { props: { posts } }          // 每次请求执行 → SSR
}
```

```jsx
// pages/article/[id].js —— SSG，构建时生成
export async function getStaticProps({ params }) {
  const article = await fetchArticle(params.id)
  return { props: { article } }
}
// 指示哪些路径在构建时生成
export async function getStaticPaths() {
  const paths = await fetchAllIds()
  return { paths, fallback: false }
}
```

### 2. App Router：Server Component 中的数据获取

新模型在**服务端组件里直接 `async` + `await`**：

```tsx
// app/blog/page.tsx （App Router，默认 Server Component）
export default async function BlogPage() {
  const res = await fetch('https://api.example.com/posts', { next: { revalidate: 60 } })
  const posts = await res.json()
  return <>
    <h1>博客</h1>
    {posts.map(p => <PostCard key={p.id} post={p} />)}
  </>
}
```

- 无需 `getServerSideProps` / `getStaticProps`，直接 `await` 就是服务端数据获取。
- `next: { revalidate }` 控制缓存更新（对应 ISR）。
- 动态路径用 `generateStaticParams`（取代旧的 `getStaticPaths`）。

```tsx
// app/blog/[slug]/page.tsx
export default async function PostPage({ params }) {
  const post = await fetchPost(params.slug)
  return <article>{post.title}</article>
}
// 构建时预生成哪些路径
export function generateStaticParams() {
  return [
    { slug: 'hello-world' },
    { slug: 'ssr-guide' },
  ]
}
```

## 三、SSR / SSG / ISR 三模式

### 1. 三种模式的核心差异

| 模式 | 触发方式 | 数据获取 | 何时渲染 |
|------|---------|---------|---------|
| SSG | 构建期 + `generateStaticParams` | 构建时 `fetch`/直接取数 | 构建时，静态 HTML |
| SSR | 请求时（默认不缓存） | 请求时 `fetch`（`cache: 'no-store'`） | 每次请求 |
| ISR | `revalidate` / `on-demand` | 定期或按需触发 | 构建 + 增量刷新 |

### 2. 代码示例对照

```tsx
// ① SSG：构建时抓取，之后使用静态 HTML
export default async function Page() {
  const data = await fetch('.../pages', { cache: 'force-cache' })
  // 或 generateStaticParams 限定路径
}

// ② SSR：每次请求实时渲染（不缓存）
export default async function Page() {
  const data = await fetch('.../user', { cache: 'no-store' })
  // 等价于强制服务端渲染
}

// ③ ISR：构建时生成 + 每 60 秒增量刷新
export default async function Page() {
  const data = await fetch('.../content', { next: { revalidate: 60 } })
}
```

### 3. ISR 按需失效（On-demand Revalidation）

Next.js 提供 API 路由或 `revalidatePath`/`revalidateTag` 手动失效缓存：

```ts
// app/api/revalidate/route.ts —— 按需失效 ISR 缓存
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { path, tag } = await req.json()
  if (path) revalidatePath(path)          // 按路径失效
  if (tag) revalidateTag(tag)             // 按标签失效
  return NextResponse.json({ revalidated: true })
}
```

## 四、Server Component 与 Client Component

### 1. 两者边界与心智模型

- **Server Component（默认）**：在服务器运行，可 `await` 数据，无交互、无状态、不可用浏览器 API，输出静态视图。
- **Client Component**：用 `"use client"` 标记，可在客户端运行 hooks、事件、状态，对应交互 UI。

```tsx
// app/page.tsx —— 默认是 Server Component
import Counter from './Counter'   // 引用的 Client Component

export default function Page() {
  return <>
    {/* 服务端渲染静态部分 */}
    <ServerOnlyList />
    {/* 客户端交互组件 */}
    <Counter initial={5} />
  </>
}
```

```tsx
// app/Counter.tsx
'use client'               // 声明为 Client Component
import { useState } from 'react'

export default function Counter({ initial }: { initial: number }) {
  const [n, setN] = useState(initial)
  return <button onClick={() => setN(n + 1)}>{n}</button>
}
```

### 2. 何时用哪一种

| 需求 | 使用 |
|------|------|
| 直接访问数据库 / 内部服务 | Server Component |
| 字面渲染静态 / SEO 内容 | Server Component |
| 状态、事件、`useEffect` | Client Component |
| 第三方客户端库（图表/表单） | Client Component |
| 同一组件混合使用 | 拆成 Server 壳 + Client 芯 |

## 五、缓存与渲染"静默化"

### 1. Next.js 的分层缓存

Next.js 引入了"**静默（区）静默化渲染（Static rendering / Full Route Cache）**"，即把**默认渲染静默化为静态**，仅在需要时动态化：

- **Full Route Cache（整路由缓存）**：尽可能把整条路由静态化缓存。
- **Data Cache**：服务端组件 `fetch` 结果的多层缓存。
- **Router Cache**：客户端内存中的路由缓存，加速导航。
- **Segment Cache**：App Router 中可独立流式渲染与缓存的路由段。

### 2. 通过 `export const dynamic` 显式声明

```tsx
// app/page.tsx —— 显式声明渲染与缓存行为
export const dynamic = 'force-dynamic'   // 强制 SSR（不走全覆盖静态缓存）
export const revalidate = 60             // 秒级 ISR 周期
export const dynamicParams = true        // 是否允许运行期动态生成 params

export default async function Page() {
  const data = await fetch('...', { cache: 'no-store' })
  return <div>{JSON.stringify(data)}</div>
}
```

### 3. 静默化的收益与风险

- **收益**：默认尽可能静态 → 更快的响应、更低的服务器开销、更好的 CDN 缓存。
- **风险**：误把依赖动态输入的组件静默化后，可能出现过期/共享错误数据（如登录态泄漏）。

> 关键心智：**"默认缓存，按需动态"**。新用户数据或登录态页面务必用 `dynamic='force-dynamic'` 或 `useSearchParams` 等触发动态化。

## 七、最小实现：浏览器里演示 SSG 与 ISR 的产出

打开 `code/frontend/13-ssr` 的 `build-time-static.html`：玩具构建器在"构建时"把一组文章数据渲染成一份静态 HTML 文件表，再演示"对单个文件增量再生成（ISR）"而其余文件不变。这让你直观建立"构建期生成静态产物 + 按需刷新单个页面"的心智，与 `getStaticProps`/`generateStaticParams` + `revalidate` 的本质一致。

## 八、面试衔接

本节对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q112 Next.js 三模式）：Pages/App Router 区别、`getServerSideProps` 与 Server Component 数据获取、SSR/SSG/ISR 在 Next 的落地与适用场景、按需失效与分层缓存。做真题自测后，进入下一节 `04-Nuxt.js实战`。