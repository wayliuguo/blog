# mini-nuxt —— Nuxt 章的最小实现

手写「Vue SSR + hydration」的最小框架：esbuild 加载 `.vue` SFC（两遍编译），对应篇目：`frontend/进阶/渲染架构/Nuxt.md` 的「最小实现」一节。

## 它演示了什么

| mini-nuxt 里的机制 | Nuxt 里的对应物 |
| --- | --- |
| `vue-plugin.ts`：esbuild onLoad 编译 SFC | Vite 的 vue 插件（mini-vite 的核心） |
| 同一个 SFC 编两遍：server 出 `ssrRender`、client 出 `render` | Nuxt 的 SSR 构建（服务端/客户端双产物） |
| `pages/` 扫描 + `routes.gen.ts` | Nuxt 的文件路由 |
| 页面组件的 `asyncData({ params })` | `useAsyncData`（数据先于渲染就位） |
| `createSSRApp` 每请求新建 + `renderToString` | Nitro 渲染管道的最内核 |
| `createSSRApp().mount('#root')` 复用已有 DOM | hydration（对比 `createApp` 的整棵重建） |

## 实验 ↔ 篇目对照表

| 实验 | 跑法 | 对应篇目章节 |
| --- | --- | --- |
| SFC 双遍编译 | `npm run build`，对比 `src/vue-plugin.ts` 里 server/client 两种模式 | Nuxt.md · 最小实现 · SFC 编译 |
| SSR 响应头记耗时 | `npm start` 后 `curl -sI http://localhost:3014/order/1001` 看 `X-Render-Ms` | Nuxt.md · 最小实现 · SSR |
| 注水数据下发 | `curl -s http://localhost:3014/` 看 `window.__PROPS__` | Nuxt.md · 最小实现 · 注水数据 |
| hydration | 浏览器打开 http://localhost:3014/ ，`client.js` 里是 `createSSRApp` + `mount` | Nuxt.md · 最小实现 · hydration |

## 跑法

```bash
npm install
npm run build
npm start          # http://localhost:3014（PORT 环境变量可覆盖）
```

验证（cmd）：

```cmd
curl -s http://localhost:3014/order/1001 | findstr "订单"
curl -sI http://localhost:3014/order/1001
```

## 实测读数（2026-10-13）

```
npm run build  -> routes = , /order/:id
GET /            -> 200，SSR HTML 含「订单中心（Vue SSR）」+ window.__PROPS__，X-Render-Ms: 8.8
GET /order/1001  -> 200，含「订单 1001」「机械键盘」
GET /order/9999  -> 200，页面内渲染 404 视图（props.order = null）
Vue warn         -> 0（两端 props 对齐，无失配告警）
```

与 mini-next 的对照读数：React 的 SSR 字符串用 `<!-- -->` 分隔文本节点，Vue 的用 `<!--[-->`/`<!--]-->` 包住列表段——两家框架都在为 hydration 对齐埋锚点，只是锚点形态不同。
