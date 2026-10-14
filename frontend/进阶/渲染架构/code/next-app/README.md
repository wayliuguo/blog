# next-app —— Next.js 实战工程（App Router 全范式）

对应篇目：`frontend/进阶/渲染架构/Next.js.md`。统一业务场景：订单中心（列表 + 详情 + 新建）。

## 范式 ↔ 页面对照表

| 渲染范式 | 页面 | 关键代码 |
| --- | --- | --- |
| SSG（构建时渲染） | `/`（首页） | `app/page.tsx`，无动态声明 |
| SSR（每请求渲染） | `/orders`（列表） | `export const dynamic = 'force-dynamic'` |
| ISR（10 秒后台重建） | `/orders/[id]`（详情） | `export const revalidate = 10` + `generateStaticParams` |
| Server Action | `/orders/new`（新建） | `app/actions.ts` 的 `createOrder` |
| 约定式骨架/错误边界 | 全局 | `app/loading.tsx` / `app/error.tsx` / `app/not-found.tsx` |
| RSC ↔ 客户端组件 | 混合 | 布局/列表是 Server Component，`new/page.tsx` 带 `'use client'` |

## 跑法

```bash
npm install
npm run dev        # http://localhost:3021
# 或生产模式
npm run build && npm start
```

## 验证（cmd，dev 模式起服务后）

```cmd
curl -s http://localhost:3021/orders | findstr "订单列表"
curl -s http://localhost:3021/orders/1001 | findstr "ISR"
```

ISR 观察：`npm run build && npm start` 后 `curl -I /orders/1001` 看 `x-nextjs-cache` 响应头（实测构建后首请求为 STALE：先回旧内容、同时后台重建，等价 ISR 的四态）；10 秒后再次请求可观察到再次 STALE → HIT 循环。

## 实测读数（2026-10-13，`next build` + `next start`）

```
Route (app)                    Size   First Load JS  Revalidate  Expire
○ /                            172 B         106 kB                ← SSG
ƒ /orders                      172 B         106 kB                ← force-dynamic SSR
● /orders/[id]                 172 B         106 kB      10s      1y
  ├ /orders/1001 … /orders/1005                            ← generateStaticParams 预渲染
○ /orders/new                  753 B         103 kB                ← 'use client' 页也被预渲染壳

GET /orders         -> 200，HTML 含「订单列表（SSR）」
GET /orders/1001    -> 200，x-nextjs-cache: STALE（ISR 后台重建）
GET /orders/9999    -> 200 但内容是 404 页：流式交付下响应头已随壳发出，notFound() 只能换内容换不了状态码
```

