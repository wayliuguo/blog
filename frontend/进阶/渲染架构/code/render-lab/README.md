# render-lab · 渲染架构配套实验台

零依赖，只要有 Node 22 与本机 Chrome 就能跑，不需要 `npm install`、不需要外网。

它自己实现了一套最小可运行的渲染层（vdom → 字符串 / DOM），所以**同一个页面能用七种方式交付**：
CSR、SSR、SSG、ISR、流式、岛化，以及注水的四种失配变体。文章里的每一个数字都来自它的 stdout。

## 怎么跑

```bash
cd frontend/进阶/渲染架构/code/render-lab
npm run list        # 看有哪些场景
npm run panorama    # 四种交付方式的首屏时间线（无头 Chrome）
npm run ssr         # SSR / SSG / ISR 的服务端耗材与注水数据体积
npm run stream      # 流式渲染的分段到达、乱序补位、首字节对照
npm run hydrate     # 注水：一致 / 价格口径不一致 / 标签不一致 / 直接重建
npm run island      # 岛化：省掉哪些模块、省了多少字节
npm run all         # 一次跑完（任一场景失败则以非 0 退出）
```

场景脚本自己起服务器（端口用 0 让系统分配）、自己开无头 Chrome，跑完自动退出，不会和 `npm start` 抢端口。

手动浏览：

```bash
npm start           # http://localhost:5189/（端口被占自动 +1）
# /?mode=csr|ssr|ssg|isr|stream|island|hydrate&variant=clean|price|tag|rerender
# 加 &jslag=300 模拟「框架运行时在慢网下下载 + 解析」的开销
```

## npm script 与场景对照

| script | 文件 | 做什么 | 篇目 |
| ------ | ---- | ------ | ---- |
| `npm run panorama` | `scenarios/panorama.mjs` | CSR / SSR / SSG / 流式四种交付方式在 `jslag=0` 与 `jslag=300` 两套网络条件下的 TTFB、FCP、内容出现时刻、JS 字节；流式分段到达 | 渲染方案全景 |
| `npm run ssr` | `scenarios/ssr.mjs` | SSR 连发三次的耗时、SSG 与 ISR 的命中/过期/后台重建；HTML 里结构与注水数据各占多少；`renderToString` 产物样本 | SSR 与同构实现 |
| `npm run stream` | `scenarios/stream.mjs` | 每段内容的到达时刻；与非流式 SSR 的首字节对照；乱序补位顺序；浏览器侧 FCP 与入口执行时刻 | SSR 与同构实现 |
| `npm run hydrate` | `scenarios/hydrate.mjs` | 四个变体的复用/新建/丢弃/改写/失配账，叠加 MutationObserver 数到的真实 DOM 突变 | SSR 与同构实现 |
| `npm run island` | `scenarios/island.mjs` | 全量 hydration 与岛激活的 JS 文件数、字节数、复用节点数、按钮是否点得动；逐个模块列出岛化后不再下载的那些 | 新兴渲染范式 |
| `npm start` | `server.js` | 手动浏览七种 mode，端口 5189 | 全模块 |

## 目录结构

| 路径 | 作用 |
| ---- | ---- |
| `src/vdom.mjs` | `h()`、组件求值 `resolve()`、属性落地 `applyProps()`、节点计数 |
| `src/render-string.mjs` | 服务端：`renderToString()`、属性序列化、转义 |
| `src/render-stream.mjs` | 流式：`Await` 边界、`renderSections()`、页面运行时 `STREAM_RUNTIME` |
| `src/render-dom.mjs` | 客户端：`createNode()`、`renderDOM()`（CSR 与兜底重建） |
| `src/hydrate.mjs` | 接管已有 DOM：`hydrate()` / `hydrateRoot()`，返回复用、新建、丢弃、改写、失配的账 |
| `src/island.mjs` | 岛的服务端那一半：把标记挂到子树根元素上 |
| `src/activate.mjs` | 岛的浏览器那一半：按 `data-island` 找组件并接管 |
| `src/app.mjs` | 页面树本身（两端共用一份） |
| `src/data.mjs` | 数据源：把「快数据」与「慢数据」分开，是流式能成立的前提 |
| `harness/routes.mjs` | 共享路由表：七种 mode 的产物都从这里出去 |
| `harness/server.mjs` | 测量用服务（端口 0）+ 等页面上报 |
| `harness/probe.mjs` | Node 侧时间测量：原生 `http` 客户端，能分辨「响应头 / 首段内容 / 完成」三个时刻 |
| `harness/chrome.mjs` | 启动本机无头 Chrome（零依赖，不用 puppeteer） |
| `server.js` | 手动浏览服务，端口 5189，占用自动 +1 |

## 页面与 mode

| mode | 内容从哪来 | 客户端入口 | 看点 |
| ---- | ---------- | ---------- | ---- |
| `csr` | 空壳，全靠 JS | `entry-csr.mjs` | 首屏三条腿：HTML → JS → 接口 |
| `ssr` | 每次请求渲染 | `entry-full.mjs` | 内容随 HTML 到，服务端等齐慢数据 |
| `ssg` | 服务启动前渲染一次 | `entry-full.mjs` | 运行时零成本，内容不随请求变 |
| `isr` | 缓存 + TTL 600ms | `entry-full.mjs` | 冷启动回源 / 命中 / 过期先给旧的再后台重建 |
| `stream` | 分段下发，边界处先发兜底 | `entry-full.mjs` | 壳 3ms 就出去，慢接口回来再补位 |
| `island` | 每次请求渲染（不下发数据） | `entry-islands.mjs` | 客户端只下载交互点那几行 |
| `hydrate` | 同 `ssr` | `entry-full.mjs` | `variant=clean\|price\|tag\|rerender` 四种接管方式 |

## 端点与约定

| 端点 / 参数 | 行为 | 用途 |
| ---- | ---- | ---- |
| `/?mode=…` | 返回对应交付方式的完整页面 | 全部对照实验 |
| `/?jslag=300` | 给 `/src/` 下的 JS 响应加 300ms 延迟（写 Cookie，后续请求同受影响） | 放大「下载 + 解析」这类网络开销 |
| `/api/data` | 立即返回壳数据 | CSR 的第一跳 |
| `/api/data?reviews=1` | 等 260ms 的慢接口，返回全量数据 | CSR 与「一次取全」的形态 |
| `POST /report` | 页面把指标交回来 | 场景收数 |
| `/src/*`、`/pages/*` | 静态资源，`no-store` | 模块与页面脚本 |
| 响应头 `X-Render-Mode` | `ssr` / `ssg` / `isr-miss` / `isr-hit` / `isr-stale` / `stream` / `island` / `csr` | 场景据此区分走了哪条路径 |
| 响应头 `X-Render-Ms` | 服务端自己记的耗时 | SSR 与 SSG/ISR 的对照 |

## 已知边界

- **慢数据是模拟的**：`loadReviews` 260ms、`loadRecommend` 130ms 都是 `setTimeout`。真实慢接口的方差远大于此，本实验台要的是「可复现的对照」，不是「线上分位数」。
- **`jslag` 不是网络模拟器**：它只延迟 `/src/` 的响应，用来看「JS 下载与解析到达之前，页面能不能出内容」这件事，不代替真实弱网。
- **无头 Chrome 的绝对值有抖动**：每次冷启动能差上百毫秒，所以浏览器侧场景都跑两轮取更干净的一轮，读的是**同一轮内各方案的相对差**。
- **`FCP` 偶尔为空**：无头 Chrome 有时不把 paint 条目推给观察器，实验台在回报前会再从性能缓冲区捞一次；仍取不到时显示 `—`，此时以「内容出现时刻」为准。
- **浏览器侧的分段时刻会被解析调度拉平**：流式的服务端分段是准确的（原生 http 客户端量到 3ms / 141ms / 265ms 这三次写入），但浏览器可能把已经到达的两段一起解析，所以「段的先后」要看服务端那一列。
- **岛激活复用了同一套 `hydrate` 实现**：真实框架里岛运行时比全量 hydration 更小，本实验台省下的是组件的业务代码，不是运行时本身。
- **RSC、HTTP/3 与边缘渲染没有实测**：RSC 需要 React 服务端运行时、QUIC 需要服务端支持、边缘渲染需要跨地区节点，本机都不具备，正文里这三部分只讲原理与取舍，不给数字。
