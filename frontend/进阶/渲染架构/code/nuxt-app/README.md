# nuxt-app —— Nuxt 3 实战工程（混合渲染 + Nitro server API）

对应篇目：`frontend/进阶/渲染架构/Nuxt.md`。统一业务场景：订单中心（与 next-app 同一场景，便于横向对比）。

## 范式 ↔ 页面对照表

| 范式 | 页面 / 文件 | 关键代码 |
| --- | --- | --- |
| SSR + useFetch 服务端取数 | `/`（首页） | `pages/index.vue` 的 `await useFetch(...)` |
| SWR（等价 ISR） | `/orders`、`/orders/[id]` | `nuxt.config.ts` 的 `routeRules: { '/orders/**': { swr: 10 } }` |
| 纯 CSR | `/client-only` | `routeRules: { ssr: false }` + `onMounted` |
| Nitro server route | `/api/orders*` | `server/api/orders.get.ts` 等 4 个文件 |
| 自动导入 | 全局 | `composables/useOrders.ts`、`server/utils/store.ts` |
| 动态路由 | `/orders/[id]` | `pages/orders/[id].vue` + `route().params.id` |

## 跑法

```bash
npm install
npm run dev        # http://localhost:3022
# 或生产模式
npm run build && npm run preview
```

## 验证（cmd，dev 起服务后；生产模式读数见文末）

```cmd
curl -s http://localhost:3022/api/orders | findstr "1001"
curl -s http://localhost:3022/client-only | findstr "纯 CSR 页"
```

第二条 curl **应该找不到**「纯 CSR 页」——该页 `ssr: false`，服务端只发布局壳，页面文案与内容全靠客户端渲染。

## 实测读数（2026-10-13，生产模式 `nuxt build` + `.output/server/index.mjs`）

```
GET /api/orders        -> 200，含 1001/机械键盘
GET /                  -> 200，HTML 含「订单中心（Nuxt）」（SSR）
GET /orders/1001       -> 200，HTML 含「订单 1001」「机械键盘」（SWR 页首请求回源）
GET /client-only       -> 200，HTML 不含「纯 CSR 页」（ssr:false，只有布局壳）
```

