# ISR 与缓存策略

> 级别：高级

按本书四层推进：

- **入门使用**：见 `01-SSR入门与原理` 中 ISR 的定义与四模式对比总表；
- **进阶**：见 `02-同构渲染与Hydration`，并从"何时渲染"进入"何时重新生成"的缓存视角；
- **实战**：本页——ISR 增量再生成、按需失效、CDN 与 HTTP 缓存、SWR 语义与多层缓存架构；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行 `build-time-static.html`，用"全量构建 vs 单个页面增量再生成"的可视化复现 ISR 的本体，理解 static 性能与新鲜度的折中。

增量静态再生成（ISR）在业界常与 SWR（stale-while-revalidate）缓存模型相伴出现，其哲学是"**静态的性能 + 动态的新鲜度**"。本文从 ISR 原理讲起，覆盖按需失效、CDN 与 HTTP 缓存策略、SWR 语义，最后落到一套完整的缓存层级架构，帮助你设计分层可靠的内容系统。

## 一、ISR 增量静态再生原理

### 1. 什么是 ISR

ISR（Incremental Static Regeneration，增量增量静态再生成）允许一个站点**在发布后**，无需重新构建整个站点，就能**在线按时间或按需重新生成个别页面**。它介于静态的 SSG 与动态的 SSR 之间：

```
SSG：构建时生成，永不更新          → 快，但不新鲜
SSR：每次请求实时渲染               → 新鲜，但慢且耗服务器
ISR：首次静态生成，之后选择性刷新    → 折中：静态性能 + 按需新鲜
```

### 2. 核心工作方式（时间型 revalidate）

以 Next.js 为例，`revalidate` 声明该页面每 N 秒允许重新验证一次：

```tsx
export default async function BlogPage() {
  const data = await fetch('...', { next: { revalidate: 60 } })
  // ...
}
```

工作流程：

```
1 首次请求：构建时已生成，直接返回缓存的静态 HTML（极快）
2 缓存过期后（>60s）的某次新请求：回到服务器重新生成
3 该新请求的响应返回给页面生成者（如更新缓存），同时
   当前请求可能仍返回旧缓存（stale），后台异步刷新
4 新版本替换缓存，供后续请求使用
```

> **重要**：多数 ISR 实现中，缓存过期后的第一个请求仍是**旧的 stale 响应**（避免把延迟转嫁给用户），后台再重新生成。这正是"静默化存量"的关键设计。

### 3. 与 SSG / SSR 的本质区别

| 特性 | SSG | ISR | SSR |
|------|-----|-----|-----|
| 是否需构建 | 是（全量） | 是（首次，之后增量） | 否 |
| 更新方式 | 重新构建上线 | 时间/按需 | 每次请求 |
| 首屏延迟 | 极小 | 极小（缓存命中） | 有 TTFB |
| 服务器开销 | 几乎为 0 | 低（仅在 revalidate 时） | 高（每请求渲染） |
| 新鲜度 | 差 | 好/可配置 | 实时 |

## 二、按需失效（On-demand Revalidation）

时间型 revalidate 是"被动"，按需失效是"主动"——内容变化时由后端接口触发失效，比定时器更精确、更及时。

### 1. Next.js 按需失效

```ts
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(req: Request) {
  const body = await req.json()
  if (body.path) revalidatePath(body.path)   // 按 URL 路径
  if (body.tag) revalidateTag(body.tag)      // 按标签，一个入口失效多页
  return Response.json({ success: true })
}
```

- `revalidatePath('/blog/some-post')` : 只让该 URL 过期重生成。
- `revalidateTag('posts')` : 把打了 `posts` 标签的所有页面全部失效（适合一批联动内容）。

```tsx
// fetch 时打标签，便于按 tag 批量失效
const data = await fetch('.../posts', { next: { tags: ['posts'] } })
```

### 2. 按需 vs 定时对比

| 维度 | 定时 revalidate | 按需 revalidate |
|------|----------------|----------------|
| 触发 | 轮询时间 | 明确事件（发布/删除） |
| 新鲜度延迟 | 最多 N 秒 | 事件即刷新 |
| 耦合度 | 低 | 需后端起接口（webhook） |
| 适用 | 不定时更新 | 有明确的 CMS 发布事件 |

## 三、CDN 缓存与 HTTP 缓存策略

### 1. 为什么需要 CDN 与 HTTP 缓存

ISR/SWR 生成的是"新鲜但不一定每个请求都需要回源"的响应。为了把静态优势兑现到全球，需要在**边缘 CDN** 再套一层 HTTP 缓存：

```
用户 → CDN 边缘（缓存命中，极快）→ 未命中回源 → 渲染服务/静态存储
```

### 2. HTTP 缓存头：Cache-Control

控制缓存的字段核心：

```
Cache-Control: public, max-age=600, s-maxage=60, stale-while-revalidate=86400
```

| 字段 | 说明 |
|------|------|
| `public` / `private` | 是否允许共享缓存缓存（CDN） |
| `max-age` | 浏览器本地缓存时长（秒） |
| `s-maxage` | CDN（共享）缓存时长，优先于 max-age |
| `stale-while-revalidate` | 过期后仍返回 stale，同时后台刷新 |
| `stale-if-error` | 源站报错时，兜底返回 stale 缓存 |

### 3. SWR 语义与 HTTP 对齐

SWR（stale-while-revalidate）本意就是"**让客户端先拿旧数据，再静默刷新新数据**"。HTTP 层与框架层是两个层面：

- **HTTP 层**：`Cache-Control: stale-while-revalidate` 由代理/CDN 实现。
- **框架层**：ISR `revalidate` 是框架在渲染层做的同类思想。

两者通常配合，形成"边缘缓存 + 渲染层 SWR"。

## 四、SWR 与 stale-while-revalidate

### 1. 前端数据 SWR（客户端库）

`stale-while-revalidate` 还是前端数据请求库的核心思想。以 `swr` 库为例：

```tsx
// 客户端数据获取：先返回缓存（stale），后台重新请求（revalidate）
import useSWR from 'swr'
const { data, error, isValidating } = useSWR('/api/user', fetcher)
```

```
首次请求 → 请求并渲染（loading）
后续导航 → 立即返回上次缓存数据（stale，秒开）
          → 后台重新请求（revalidate）→ 更新 UI
```

相关库：`swr`（React）、UseSWR/VueUse 生态、TanStack Query 等同思想。

### 2. stale vs fresh 的关键取舍

| 取舍 | 说明 |
|------|------|
| 新鲜度 | stale 可能显示旧数据，需明确可接受的过期窗口 |
| 用户体验 | 秒开 vs 实时，通常"先看到内容"优于"空 loading" |
| 一致性 | 需要版本/校验避免旧数据覆盖新数据 |
| 后台刷新 | revalidate 不应阻塞 UI，避免 FID 变差 |

## 五、缓存层级架构

### 1. 多层缓存的完整链路

真实 CDN + ISR 架构通常是一个**多层缓存金字塔**，从最靠近用户到源站逐层递进：

```
① 浏览器缓存（max-age / SWR）
   ↓ 未命中
② CDN 边缘缓存（s-maxage / 边缘 SWR）
   ↓ 未命中
③ 前端框架缓存（Next Data Cache / ISR 页面缓存 / Nuxt SWR 路由缓存）
   ↓ 未命中
④ 渲染服务（Nitro / Node SSR，执行取数与渲染）
   ↓
⑤ 数据源（API / 数据库 / 上游服务）
```

### 2. 每层应缓存什么

| 层 | 缓存对象 | 失效策略 | 命中率追求 |
|----|---------|---------|-----------|
| 浏览器 | 静态资源 + 局部 API | max-age / SWR | 高，减少网络 |
| CDN | 静态 HTML、图片、JS/CSS | s-maxage / purge | 极高 |
| 框架缓存 | 渲染结果 / fetch 数据 | revalidate / tag | 中 |
| 数据层 | 数据库查询/ORM 缓存 | 主动失效 | 中 |

### 3. 综合配置示例：CDN + ISR + SWR 三层联动

生产实践里通常把三套机制组合起来，用最多的流量打中"距用户最近且最便宜"的缓存层：

```ts
// Next.js 侧：渲染层 ISR + HTTP 头对齐边缘 SWR
export async function generateMetadata() {
  // ...
}
export default async function NewsPage() {
  const data = await fetch('.../news', {
    next: { revalidate: 60 },                 // 渲染层 ISR：60s 帧
    headers: { 'Cache-Control': 'public' },
  })
  // ...
}
```

```nginx
# CDN / 反向代理：对齐 s-maxage 与 SWR（示意）
location /news/ {
    proxy_cache my_cache;            # 使用上游缓存区
    proxy_cache_valid 200 60s;       # 与渲染层 revalidate 一致
    add_header X-Cache-Status $upstream_cache_status;
    proxy_ignore_headers Cache-Control X-Accel-Expires;
}
```

> 关键：**渲染层 revalidate 与 CDN 的 s-maxage/stale-while-revalidate 需配套**。若 CDN 缓存比渲染层更长，用户拿到的仍是 CDN 过期缓存，ISR 的新鲜度就白做了。一般把 CDN 的 `s-maxage` 设得比渲染层 revalidate 更长或相同，并开启 `stale-while-revalidate` 兜底。

### 4. 缓存一致性设计要点

- **Cache Key 设计**：`URL + 鉴权标识 + 语言 + 租户`，避免串数据。
- **私有 vs 共享**：登录态、个性化内容必须 `private` / 不入共享缓存。
- **版本与 purge**：内容变更及时 `purge`（CDN）或 `revalidatePath`。
- **兜底降级**：源站挂掉时，用 `stale-if-error` 返回最后良好缓存。
- **监控**：命中率、stale 率、回源量是判断缓存健康的关键指标。

## 七、最小实现：浏览器里演示静态生成与增量刷新

打开 `code/frontend/13-ssr` 的 `build-time-static.html`：一个玩具构建器在"构建时"一次性生成所有静态 HTML 文件，随后"ISR 按钮"只对其中的单个文件增量再生成、其余文件不动。它把"静态性能 + 按需新鲜"这条 ISR 的核心理念，压缩成一组可见的产物变化，帮助记住"只有需要新才能的那页才重建"。

## 八、面试衔接

本节对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q112 ISR 附近）：ISR 思想与 SSG/SSR 异同、按需失效 vs 定时 revalidate、`Cache-Control` 的 max-age/s-maxage/stale-while-revalidate/stale-if-error、SWR 语义与取舍、多层缓存架构与 Cache Key 设计、缓存过期后首请求为何常返回 stale。做真题自测后，进入下一节 `06-SSR架构选型与工程实践`。