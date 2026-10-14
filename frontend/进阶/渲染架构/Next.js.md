# Next.js

Next.js 把「渲染方案选型」从架构决策降级成了**文件约定**：`page.tsx` 默认静态、一行 `force-dynamic` 切 SSR、一行 `revalidate` 切 ISR、一行 `'use client'` 画 RSC 边界。本篇按「入门迁移 → 核心机制 → 实战 → 最小实现」四层展开，统一业务场景是订单中心，配套两个真实工程：实战工程 `code/next-app`（Next.js 15 全范式）与最小实现 `code/mini-next`（手写文件路由 + SSR + hydration）。

## 一、定位与心智模型迁移

### 1.1 Next.js 在解决什么：把渲染范式的选择权交给文件

React 只回答「组件怎么渲染」，不回答「HTML 什么时候生成」。渲染架构篇的对比表里 CSR / SSR / SSG / ISR 的选择，在无框架的 React 工程里是自建 Node 服务、手写 renderToString、手管缓存的工程活；Next.js 的做法是**把这四种取值映射成文件系统里的声明**，构建器读声明、出产物，开发者只管写组件。

对 Vue/Nuxt 背景的读者，心智迁移可以对着这张表做——两套框架解决同一个问题，术语几乎一一对应：

```
| 你已会（Vue / Nuxt）         | Next.js 对应物                  | 本质            |
|------------------------------|---------------------------------|-----------------|
| pages/ 目录文件路由          | app/ 目录 + page.tsx 约定       | 构建期生成路由表|
| definePageMeta / layout.vue  | layout.tsx / loading.tsx / error.tsx | 约定式外壳与边界 |
| useAsyncData / useFetch      | RSC 里直接 await + fetch 缓存   | 数据先于渲染就位|
| routeRules: { ssr/swr }      | dynamic / revalidate 导出常量   | 按路径声明渲染范式 |
| server/api/ 文件即接口       | route.ts 或 Server Action       | 服务端写操作    |
| ref / computed               | useState / useMemo              | 客户端响应性    |
```

两个**不对应**的地方要专门记：① Next 默认所有组件是 **Server Component**（在服务端求值、代码不进客户端包），交互组件要显式 `'use client'`——Nuxt 正好相反，默认全是客户端组件；② Next 15 的动态路由 `params` 是 **Promise**，页面组件必须 `await params`，这是 RSC 异步化的产物，迁移时最容易踩。

### 1.2 上手：最小可跑应用

`code/next-app` 是一个零 mock 的完整 Next.js 15 工程，依赖只有 next / react / react-dom：

> 摘自 `./code/next-app/package.json`

```json
{
  "name": "next-app",
  "version": "1.0.0",
  "private": true,
  "description": "Next.js 实战工程：App Router 全范式（SSG/SSR/ISR/RSC/Server Action）",
  "scripts": {
    "dev": "next dev -p 3021",
    "build": "next build",
    "start": "next start -p 3021"
  },
  "dependencies": {
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.2"
  }
}
```

跑起来（cmd，仓库根）：

```cmd
chcp 65001
cd frontend\进阶\渲染架构\code\next-app
npm install
npm run build && npm start
```

`next build` 的路由表本身就是最好的教材——**每个页面的渲染范式在构建输出里一目了然**（实测 2026-10-13，Next 15.5.27）：

```
Route (app)                    Size   First Load JS  Revalidate  Expire
○ /                            172 B         106 kB                ← Static：SSG
ƒ /orders                      172 B         106 kB                ← Dynamic：每请求 SSR
● /orders/[id]                 172 B         106 kB      10s      1y
  ├ /orders/1001 … /orders/1005                            ← generateStaticParams 预渲染
○ /orders/new                  753 B         103 kB                ← 'use client' 页也有预渲染壳
```

三行符号对应三种交付路径：`○` 构建时渲染（SSG）、`ƒ` 每请求渲染（SSR）、`●` 构建时预渲染 + `Revalidate 10s` 后台重建（ISR）。**同一份工程里四条路径并存且互不干扰**，这就是「选型交给文件」的直观形态。

## 二、App Router：文件路由与约定式外壳

### 2.1 路由表是文件树，外壳是 layout

App Router 的路由表由 `app/` 下的目录结构决定：目录名是路径段，`page.tsx` 使该路径可访问，`[id]` 目录是动态段。`layout.tsx` 是共享外壳——导航切换时它**不重渲染**，只有 children 换：

> 摘自 `./code/next-app/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = { title: '订单中心 · next-app' }

// layout.tsx 是 App Router 的根布局：所有页面共享这层外壳，导航切换时不重渲染
export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="zh-CN">
            <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '24px auto' }}>
                <nav>
                    <Link href="/">首页</Link> · <Link href="/orders">订单列表</Link>
                </nav>
                <hr />
                {children}
            </body>
        </html>
    )
}
```

与 `layout.tsx` 同族的约定文件还有三个，各自接住一种加载态：`loading.tsx`（同层路由切换时的骨架，自动生效）、`error.tsx`（错误边界，必须是客户端组件）、`not-found.tsx`（404 视图）。**约定式外壳的价值在于：加载态与错误态不再是每个页面手写的样板，而是路由树上的节点**——放得越深，作用范围越小。

### 2.2 Next 15 的 params 是 Promise：RSC 异步化的直接后果

> 摘自 `./code/next-app/app/orders/[id]/page.tsx`

```tsx
// Next 15：params 是 Promise，必须 await
export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const order = store.get(id)
    if (!order) notFound()
    return (
        <main>
            <h1>订单 {order.id}（ISR：10 秒后台重建）</h1>
            <p>{order.title} · ¥{order.amount} · {order.status}</p>
            <Link href="/orders">返回列表</Link>
        </main>
    )
}
```

页面组件可以是 `async` 函数——这是 RSC 最重要的形态变化：**组件体里直接 await 取数，数据先于渲染就位，不再需要 useEffect 加 loading 三件套**。代价是 `params` 从对象变成了 Promise（静态化构建时按路径逐个求值，动态化请求时才求值）。

## 三、渲染范式：一行声明切换交付路径

### 3.1 默认即 SSG：静态是 Next 的缺省值

不写任何声明的页面在构建时渲染一次。首页只读内存数据、内容不随请求变化，是标准 SSG：

> 摘自 `./code/next-app/app/page.tsx`

```tsx
import Link from 'next/link'
import { store } from '../lib/store'

// 首页是纯静态内容：构建时渲染一次（SSG），请求路径上零渲染
export default function Home() {
    const orders = store.list()
    const total = orders.reduce((s, o) => s + o.amount, 0)
    return (
        <main>
            <h1>订单中心</h1>
            <p>共 {orders.length} 笔订单，累计金额 ¥{total}</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        <Link href={`/orders/${o.id}`}>#{o.id} {o.title}</Link>
                    </li>
                ))}
            </ul>
            <Link href="/orders">查看订单列表（SSR）→</Link>
        </main>
    )
}
```

判断依据沿用渲染架构篇的决策树：内容变化频率低于构建频率，SSG 的请求路径零渲染就是净收益。

### 3.2 force-dynamic：数据会被写操作改写时，不能静态化

订单列表页的数据会被 Server Action 新增（4.2 节），构建期渲染的 HTML 会立刻过期，声明 `force-dynamic` 切成每请求 SSR：

> 摘自 `./code/next-app/app/orders/page.tsx`

```tsx
import Link from 'next/link'
import { store } from '../../lib/store'

// 列表页声明 force-dynamic：每次请求都 SSR（存储会被 Server Action 改写，不能静态化）
export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
    const orders = store.list()
    return (
        <main>
            <h1>订单列表（SSR）</h1>
            <p>本页每次请求都在服务端重新渲染，Server Action 新增的订单立即可见。</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        <Link href={`/orders/${o.id}`}>#{o.id} {o.title} · ¥{o.amount} · {o.status}</Link>
                    </li>
                ))}
            </ul>
            <Link href="/orders/new">新建订单（Server Action）→</Link>
        </main>
    )
}
```

注意代价仍然是渲染架构篇那笔账：SSR 每次都重渲染、重等慢数据源。能静态的别 dynamic。

### 3.3 revalidate：ISR 在 Next 里就是一个数字

详情页是「已知 id 构建期预渲染、内容可容忍 10 秒陈旧」的教科书 ISR 场景，声明只要两行：

> 摘自 `./code/next-app/app/orders/[id]/page.tsx`

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { store } from '../../../lib/store'

// 已知 id 构建期预渲染，其余请求时动态渲染；revalidate=10 即 ISR（10 秒后台重建）
export const revalidate = 10

export async function generateStaticParams() {
    return store.list().map((o) => ({ id: o.id }))
}
```

`generateStaticParams` 返回的路径在构建期全部预渲染（实测输出里 `/orders/1001`…`/orders/1005` 五条）；没列出的 id 落到请求时动态渲染。**ISR 的四态（回源/命中/过期返回旧内容/重建后命中）在 Next 里原样成立**，实测构建后首次请求详情页：

```
GET /orders/1001 -> 200，x-nextjs-cache: STALE
```

`STALE` 说明命中了构建期的旧 HTML、同时后台开始重建——渲染架构篇说的「用户永远不等重建」在真实框架里就是这一个响应头。

### 3.4 RSC 边界：默认在服务端，交互才 'use client'

新建订单页有表单交互，必须是客户端组件——但注意**只有这个文件是客户端组件，布局与列表仍是服务端组件**：

> 摘自 `./code/next-app/app/orders/new/page.tsx`

```tsx
'use client'

// 客户端组件：只有表单交互需要 JS，页面其余部分仍是服务端组件
import { useState } from 'react'
import { createOrder } from '../../actions'

export default function NewOrderPage() {
    const [error, setError] = useState<string | null>(null)
    return (
        <main>
            <h1>新建订单（Server Action）</h1>
            <form
                action={async (formData) => {
                    const res = await createOrder(formData)
                    if (res?.error) setError(res.error)
                }}
            >
                <p>
                    <input name="title" placeholder="商品标题" required />
                </p>
                <p>
                    <input name="amount" type="number" min="1" placeholder="金额" required />
                </p>
                <button type="submit">提交</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </main>
    )
}
```

实测构建输出里 `/orders/new` 仍是 `○ (Static)`——**'use client' 不等于「不预渲染」**：它的 HTML 壳照样构建期生成，JS 只负责交互。RSC 的判据是「这个组件需不需要浏览器能力」，不是「要不要下发 HTML」。

## 四、实战：订单中心的写操作与验证

### 4.1 Server Action：写操作不需要手写接口

表单提交直接调用服务端函数，`app/actions.ts` 整文件声明 `'use server'`：

> 摘自 `./code/next-app/app/actions.ts`

```ts
'use server'

// app/actions.ts —— Server Action：表单直接调用服务端函数，无需手写 API 路由
import { redirect } from 'next/navigation'
import { store } from '../lib/store'

export async function createOrder(formData: FormData): Promise<{ error: string } | undefined> {
    const title = String(formData.get('title') ?? '').trim()
    const amount = Number(formData.get('amount') ?? 0)
    if (!title || amount <= 0) {
        return { error: '标题必填且金额需大于 0' }
    }
    const id = store.add({ title, amount, status: 'pending' })
    redirect(`/orders/${id}`)
}
```

数据层是进程内存储（与 mini 系列共用同一份订单场景），`lib/store.ts` 挂在 `globalThis` 上，Server Action 与 RSC 共享同一份内存。校验失败返回错误对象、成功 `redirect` 跳详情——Server Action 让「表单 → 服务端校验 → 落库 → 跳转」整条链不需要手写一个 API 路由。生产场景把 `store.add` 换成数据库调用即可，范式不变。

### 4.2 跑起来验证

生产模式起服务后（cmd）：

```cmd
curl -s http://localhost:3021/orders | findstr "订单列表"
curl -s -I http://localhost:3021/orders/1001 | findstr /i "x-nextjs-cache"
```

实测读数（2026-10-13）：

```
GET /orders         -> 200，HTML 含「订单列表（SSR）」
GET /orders/1001    -> 200，x-nextjs-cache: STALE（ISR 后台重建）
GET /orders/9999    -> 200 但内容是 404 页
```

第三条读数值得单独说：流式交付下**响应头已随壳发出，`notFound()` 只能换内容、换不了状态码**——「404 页 + 200 状态」是流式渲染的固有代价，监控状态码的人要知道这一点，别只盯 4xx 比例。

## 五、最小实现：mini-next，手写文件路由 + SSR + hydration

Next 的四大机制拆开都不神秘。`code/mini-next` 用 react + esbuild 把它们各写一遍，总量三百来行。

### 5.1 文件路由 = 构建期生成的 import 映射

扫描 `pages/` 目录、把文件名翻译成路由 pattern，这一步发生在构建期：

> 摘自 `./code/mini-next/build.mjs`

```js
// ① 扫描 pages/：index.tsx -> "/"；order/[id].tsx -> "/order/:id"
function scanRoutes(dir, prefix = '') {
    const routes = []
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
            routes.push(...scanRoutes(full, `${prefix}/${name}`))
        } else if (name.endsWith('.tsx')) {
            const base = name.replace(/\.tsx$/, '')
            let pattern = base === 'index' ? prefix : `${prefix}/${base}`
            pattern = pattern.replace(/\[\w+\]/g, (m) => `:${m.slice(1, -1)}`)
            const rel = relative('pages', full).replaceAll('\\', '/')
            routes.push({ pattern, file: `../../pages/${rel}` })
        }
    }
    return routes
}
```

> 摘自 `./code/mini-next/build.mjs`

```js
// ② 生成 routes.gen.ts：文件路由的本质是「构建期生成的 import 映射」
writeFileSync(
    'src/generated/routes.gen.ts',
    routes.map((r, i) => `import * as page${i} from '${r.file}'`).join('\n') +
        '\nimport type { Route } from "../match"\n' +
        'export const routes: Route[] = [\n' +
        routes.map((r, i) => `  { pattern: '${r.pattern}', page: page${i} },`).join('\n') +
        '\n]\n',
)
```

实测 `npm run build` 输出 `routes = /about, , /order/:id`——与 Next 的 `Route (app)` 表是同一件事的最小形态。**「约定优于配置」的落地物就是这段生成代码**：没有任何运行时扫描，路由表在构建期就是一份静态 import 列表。

### 5.2 SSR：数据先于渲染就位

服务端入口把「匹配路由 → 取数 → renderToString」串成一条线：

> 摘自 `./code/mini-next/src/server-entry.ts`

```ts
export async function renderPage(pathname: string) {
    const matched = matchRoute(routes, pathname)
    if (!matched) return null
    // 数据先于渲染就位：load 在服务端跑完，props 才交给组件
    const props = matched.page.load ? await matched.page.load(matched.params) : {}
    const html = renderToString(createElement(matched.page.default, props))
    return { html, props }
}
```

`load()` 是 `getServerSideProps` 的最小对应物：只在服务端执行、`await` 完才渲染、props 随 HTML 下发。服务本身是三十行原生 `node:http`（`server.mjs`），响应头里记 `X-Render-Ms` 方便实测。

### 5.3 注水数据下发：HTML + __PROPS__

渲染架构篇说过「SSR 的产物是 HTML + 注水数据」，最小实现里它就是模板里的一个 script：

> 摘自 `./code/mini-next/src/html.ts`

```ts
export function renderHtml(root: string, props: unknown, entry: string): string {
    // props 里的 < 转义成 \u003c，防止 JSON 里出现 </script> 提前闭合标签
    const payload = JSON.stringify(props).replace(/</g, '\\u003c')
    return `<!doctype html>
<html><body><div id="root">${root}</div>
<script>window.__PROPS__=${payload}</script>
<script src="${entry}"></script></body></html>`
}
```

实测响应（`GET /order/1001`）：HTML 里内容与数据同到，`window.__PROPS__={"order":{"id":"1001","title":"机械键盘","amount":399,"status":"paid"}}`。**内容随 HTML 一起来，中间只隔着一次解析**——这就是 SSR 的 FCP 紧贴 TTFB 的原因，在最小实现里看得见摸得着。

### 5.4 hydration：hydrateRoot 认领已有 DOM

> 摘自 `./code/mini-next/src/client-entry.tsx`

```tsx
const matched = matchRoute(routes, location.pathname)
if (matched) {
    hydrateRoot(document.getElementById('root')!, createElement(matched.page.default, window.__PROPS__))
}
```

客户端用同一份路由表、同一份数据（`window.__PROPS__`）算出同一棵树，`hydrateRoot` 按下标认领服务端已有的 DOM。实测一个有教学价值的细节：React 18 的 SSR 字符串里，相邻文本节点之间有 `<!-- -->` 注释——

```
<h1>订单 <!-- -->1001</h1>
```

这就是 React 为 hydration 对齐埋的锚点：没有它，`订单` 和 `1001` 两个文本节点会在 HTML 解析时合并成一个，客户端对齐就乱了。**渲染架构篇「对齐单位是 childNodes 下标」的结论，React 用注释锚点来守**。

### 5.5 实测读数

```
npm run build  -> routes = /about, , /order/:id
GET /            -> 200，SSR HTML 含「订单中心」+ window.__PROPS__，X-Render-Ms: 6.1
GET /order/1001  -> 200，含「订单 1001」「机械键盘」，X-Render-Ms: 0.7
GET /order/9999  -> 200，页面内渲染 404 视图（软 404，props.order = null）
未匹配路由        -> 404（renderPage 返回 null 走服务端兜底）
```

与 mini-nuxt 的对照读数（见 Nuxt 篇 5.4）：React 用 `<!-- -->` 分隔文本节点，Vue 用 `<!--[-->`/`<!--]-->` 包住列表段——**两家框架都在为 hydration 对齐埋锚点，只是锚点形态不同**。

## 六、对比与适用边界

```
| 维度           | Next.js                     | 无框架 React SPA        | 自研 mini（mini-next）    |
|----------------|-----------------------------|-------------------------|---------------------------|
| 渲染范式       | 文件约定四选一，页级混用    | 只有 CSR                | 手写什么就有什么          |
| 路由           | 构建期生成 + 中间件         | react-router 运行时     | 构建期生成 import 映射    |
| 服务端能力     | RSC / Server Action / 缓存  | 无                      | load() 最小取数           |
| 心智成本       | 约定多、黑盒深              | 低                      | 零黑盒，全部可见          |
| 适用           | 内容+交易混合的正式产品     | 后台工作台、壳内页      | 理解原理、特殊定制运行时   |
```

选 Next 的时机：**需要 SEO 或首屏内容性能，且页面以「读」为主、交互局部化**。两个反例：全交互密集的后台工作台（SSR 只增加服务端成本，CSR 即可）；需要深度定制渲染管线到 Next 约定装不下的场景（先读 mini-next 这种最小实现，再决定要不要绕开框架）。

**三条最容易踩的边界**：① Next 15 的 `params` 是 Promise，迁移老代码直接点 `.id` 会拿到 Promise；② `'use client'` 组件照样有预渲染壳，别用它判断「是否 SSR」；③ 流式交付下 `notFound()` 换不了状态码（4.2 实测），状态码监控要配合内容判断。

## 配套代码

| 路径 | 说明 |
| --- | --- |
| `./code/next-app/package.json` | Next.js 15 实战工程依赖与脚本 |
| `./code/next-app/app/layout.tsx` | 根布局：约定式外壳 |
| `./code/next-app/app/page.tsx` | 首页：SSG 缺省范式 |
| `./code/next-app/app/orders/page.tsx` | 列表页：force-dynamic SSR |
| `./code/next-app/app/orders/[id]/page.tsx` | 详情页：revalidate ISR + generateStaticParams |
| `./code/next-app/app/actions.ts` | Server Action 写操作 |
| `./code/next-app/app/orders/new/page.tsx` | 客户端组件 + 表单 |
| `./code/mini-next/build.mjs` | 最小实现：扫描 pages 生成路由表 + 双产物构建 |
| `./code/mini-next/src/server-entry.ts` | 最小实现：匹配路由 → 取数 → renderToString |
| `./code/mini-next/src/html.ts` | 最小实现：HTML + 注水数据组装 |
| `./code/mini-next/src/client-entry.tsx` | 最小实现：hydrateRoot 认领已有 DOM |
| `./code/mini-next/server.mjs` | 最小实现：原生 http 服务（含 X-Render-Ms） |

## 参考

- 本模块总结：[总结](./总结.md)
- 上游概念：[全景](./全景.md)
- Vue 侧对照：[Nuxt](./Nuxt.md)
