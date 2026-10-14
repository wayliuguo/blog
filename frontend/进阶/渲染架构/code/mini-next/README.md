# mini-next —— Next.js 章的最小实现

手写「文件路由 + SSR + hydration」的最小框架，用 esbuild 做构建链。对应篇目：`frontend/进阶/渲染架构/Next.js.md` 的「最小实现」一节。

## 它演示了什么

| mini-next 里的机制 | Next.js 里的对应物 |
| --- | --- |
| `build.mjs` 扫描 `pages/` 生成 `routes.gen.ts` | 文件路由 = 构建期生成的 import 映射 |
| `pages/order/[id].tsx` + `matchRoute` 逐段匹配 | 动态路由段 |
| 页面模块的 `load(params)` | `getServerSideProps` / Server Component 取数（数据先于渲染就位） |
| `renderToString` + `window.__PROPS__` | SSR 产物 = HTML + 注水数据（`<` 转义 `\u003c`） |
| `client-entry.tsx` 的 `hydrateRoot` | hydration：认领已有 DOM 而不是重建 |

## 实验 ↔ 篇目对照表

| 实验 | 跑法 | 对应篇目章节 |
| --- | --- | --- |
| 路由表是构建期生成的 | `npm run build`，看输出 `routes = /, /about, /order/:id` 与 `src/generated/routes.gen.ts` | Next.js.md · 最小实现 · 文件路由 |
| SSR 响应头记耗时 | `npm start` 后 `curl -sI http://localhost:3013/order/1001` 看 `X-Render-Ms` | Next.js.md · 最小实现 · SSR |
| 注水数据下发与转义 | `curl -s http://localhost:3013/` 看 `window.__PROPS__` | Next.js.md · 最小实现 · 注水数据 |
| hydration 复用 DOM | 浏览器打开 http://localhost:3013/ 看 HTML 与 `client.js` 的 hydrateRoot | Next.js.md · 最小实现 · hydration |

## 跑法

```bash
npm install
npm run build
npm start          # http://localhost:3013（PORT 环境变量可覆盖）
```

验证（cmd）：

```cmd
curl -s http://localhost:3013/order/1001 | findstr "订单"
curl -sI http://localhost:3013/order/1001
```

## 实测读数（2026-10-13）

```
npm run build  -> routes = /about, , /order/:id
GET /            -> 200，SSR HTML 含「订单中心」+ window.__PROPS__，X-Render-Ms: 6.1
GET /order/1001  -> 200，含「订单 1001」「机械键盘」，X-Render-Ms: 0.7
GET /order/9999  -> 200，页面内渲染 404 视图（软 404，props.order = null）
未匹配路由        -> 404（renderPage 返回 null 走服务端兜底）
```

注意 React 18 的 SSR 字符串里文本节点间有 `<!-- -->` 分隔标记——这是它做 hydration 对齐的方式之一，与手写渲染器的「childNodes 下标对齐」是同一个问题的两种解法。
