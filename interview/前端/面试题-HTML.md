# 面试题 · HTML

## 1. src 和 href 的区别

**一句话：src 嵌入资源（替换元素内容），href 建立关联（引用外部资源）。**

| | 作用 | 是否阻塞 HTML 解析 | 典型标签 |
| --- | --- | --- | --- |
| `src` | 将资源**嵌入**当前标签位置 | 仅**同步 script** 阻塞（加载+执行完才继续解析）；img/video 等并行下载不阻塞 | script / img / iframe |
| `href` | 建立当前文档与资源的**关联** | 不阻塞 | link / a |

- 推论：
  - script 放底部或加 defer/async，就是为了规避 src 阻塞；
  - CSS 用 `<link>` 而非 `@import`——@import 在 CSS 内部发起请求，串行链更长。

## 2. 对 HTML 语义化的理解

- **概念**：按内容结构选标签，让标签名表达「这块是什么」。
- **价值**：
  - 机器友好：SEO 爬虫、屏幕阅读器都能解析结构；
  - 开发友好：可读性、可维护性高。
- 常用语义化标签：
  - `header`：头部；
  - `nav`：导航；
  - `main`：主内容（每页一个）；
  - `article`：独立成篇的内容；
  - `section`：主题区块；
  - `aside`：侧边栏；
  - `footer`：底部。

## 3. script 标签中 defer 和 async 的区别

| 加载方式 | 加载阶段 | 执行时机 | 多脚本顺序 |
| --- | --- | --- | --- |
| 无属性 | **阻塞** HTML 解析 | 加载完立即执行 | 按文档顺序 |
| `defer` | 与解析**并行** | 解析完成后、`DOMContentLoaded` 之前 | **保证按文档顺序** |
| `async` | 与解析**并行** | 加载完立即执行 | **不保证**（谁先加载完谁先执行） |

- 一句话：**defer = 并行加载、延后按序执行；async = 并行加载、立即乱序执行**。

## 4. 常用的 meta 标签

| meta | 作用 |
| --- | --- |
| `charset="UTF-8"` | 编码（放 head 最前，让解析器尽早确定编码） |
| `name="viewport"` | 移动端视口适配 |
| `name="keywords"` / `name="description"` | SEO 关键词 / 页面描述 |
| `name="robots"` | 控制爬虫索引与链接跟踪（index/nofollow…） |
| `http-equiv="refresh"` | 页面重定向/刷新（少用） |

- viewport 常用参数：`width=device-width`、`initial-scale`、`maximum-scale`、`user-scalable`。
- **head 里还有**：
  - Open Graph / Twitter Card：控制社交平台分享卡片；
  - `<link rel="canonical">`：多 URL 同内容时指定权威地址，避免 SEO 权重分散；
  - `theme-color`：PWA 浏览器 UI 配色。

## 5. HTML5 有哪些更新

- **语义化标签**：header/nav/main/article/section/aside/footer。
- **媒体**：`video` / `audio`（+ `source` 多格式兜底）。
- **表单增强**：
  - 新类型：`email` / `url` / `number` / `range` / `color` / `date` / `time` / `search` 等（自带校验与专用键盘）；
  - 新属性：`placeholder` / `autofocus` / `required` / `pattern`（正则校验）/ `multiple`；
  - 新事件：`oninput` / `oninvalid`。
- **绘图**：`canvas`（JS 绘制位图）、内联 SVG。
- **存储**：localStorage / sessionStorage（替代 Cookie 的本地存储）。
- **Web API**：Web Workers、WebSocket、Geolocation、拖放 API、`querySelector(All)`。
- 其他：`progress/meter` 进度条、历史管理 `history.pushState`。

## 6. iframe 的优点和缺点

iframe：在当前页面内嵌另一个文档的行内框架。

- **优点**：
  - **隔离性**：天然样式/脚本隔离，加载慢内容（广告/第三方）不影响主页面；可跨子域通信；
  - 脚本可并行下载，不与主页面资源争抢执行。
- **缺点**：
  - **阻塞主页面 onload 事件**（onload 不触发会影响某些初始化逻辑与 performance 统计）；
  - 爬虫不索引其内容，**不利 SEO**；
  - 多 iframe 难管理、内存开销大。

- **现代实践（追问）**：
  - `loading="lazy"`：延迟屏外 iframe；
  - `sandbox`：白名单收权（禁脚本/表单/同源）；
  - `allow`：按需授予权限；
  - SEO 敏感页慎用（爬虫不索引其内容）。

## 7. 资源提示：preload / prefetch / preconnect / dns-prefetch

考察点在「什么时候用哪个」：

| 提示 | 作用 | 典型场景 |
| --- | --- | --- |
| `preconnect` | 提前完成 DNS + TCP + TLS 建连 | 第三方字体 CDN、API 域名 |
| `dns-prefetch` | 只提前 DNS 解析（preconnect 的兜底） | 不支持 preconnect 的浏览器 |
| `preload` | **当前页马上要用**，提前高优加载 | 关键字体、首屏大图、关键 CSS |
| `prefetch` | **将来可能用**，空闲时低优预取 | 下一页路由 chunk |
| `modulepreload` | 预加载并解析 ES module 依赖图 | Vite 构建自动注入 |

- **高频陷阱**：
  - preload 字体必须带 `crossorigin`（同源也要），否则走 CORS 模式会**二次下载**；
  - preload 滥用会挤占关键资源带宽，反而拖慢 LCP。

## 8. 跨标签页通信有哪些方式

| 方式 | 适用面 |
| --- | --- |
| `localStorage` + `storage` 事件 | 同源轻量方案；**触发变化的页自己不收到**事件 |
| `BroadcastChannel` | 同源广播，现代首选，API 直观 |
| `SharedWorker` | 多标签共享一个 Worker，集中状态/中转 |
| `postMessage`（window） | 跨窗口（iframe/新开窗），**可跨域**，需校验 origin |
| WebSocket / SSE | 需服务端中转（多端同步） |

- Cookie + setInterval 轮询：过时方案，提及用于对比。
