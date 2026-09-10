# SSR 架构选型与工程实践

> 级别：高级

按本书四层推进：

- **入门使用**：见 `01-SSR入门与原理` 的四模式总表与选型初判；
- **进阶**：见 `02-同构渲染与Hydration` 的同构、"水合"与流式渲染原理；
- **实战**：见 `03-Next.js实战`、`04-Nuxt.js实战`、`05-ISR与缓存策略` 的框架落地与缓存工程；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行目录页的三个 demo——比较首屏 HTML 有无正文（SSR/CSR）、水合、构建期/增量生成（SSG/ISR），为一页复杂多样的架构选型提供直观直觉。

当站点规模、流量和团队能力上来之后，"要不要用 SSR、怎么架构"就变成了一个工程决策。本文提供一套可操作的**选型决策树**，给出 SSR/SSG/SPA 的性能对比，讨论大规模 SSR 的架构（网关、渲染集群、降级），梳理 Node 服务端渲染的服务端运维要点（超时、内存、优雅关闭），并汇总主流框架的对比总表。

## 一、SSR / SSG / SPA 选型决策树

### 1. 决策树

```
开始
├─ 是纯后台/工具型内部应用，几乎不关心 SEO？
│    └─ ✅ SPA（CSR），开发快，无需服务端渲染
├─ 面向公网、依赖 SEO/分享抓取？
│    ├─ 内容变化频繁且带登录态/实时性？
│    │    ├─ 需要极致新鲜 + 多人实时 → SSR
│    │    └─ 内容大体稳定、仅偶发更新 → SSG + ISR/SWR
│    └─ 内容长期/适中稳定？
│         └─ SSG（博客、文档、营销页），极致性能
├─ 混合需求（部分交互 + 部分 SEO）？
│    └─ 混合渲染（SSG 兜底 + 局部 SSR 或 ClientSide Islands）
```

### 2. 关键判断维度

| 维度 | 偏向 SSR | 偏向 SSG |
|------|---------|---------|
| SEO 需求 | 高 | 高 |
| 数据实时性 | 实时（价格/库存/用户态） | 可容忍延迟 |
| 内容更新频率 | 频繁 | 低频 |
| 访问是否需鉴权 | 每次不同 | 基本公共 |
| 服务器资源 | 充裕 | 尽量静态托管 |

## 二、性能对比

### 1. 关键指标对照

| 指标 | SPA | SSR | SSG | ISR |
|------|-----|-----|-----|-----|
| TTFB | 快（静态壳） | 慢（需等服务端） | 极快（CDN） | 快 |
| FCP | 差（等 JS） | 好 | 极好 | 好 |
| LCP | 依赖客户端 | 好（可流式） | 极好 | 好 |
| TTI | 中等 | 受水合影响 | 好 | 好 |
| 服务器开销 | 无 | 高 | 几乎 0 | 低 |

### 2. 优化的性价比顺序（SSR 场景）

1. **提高缓存命中率**（CDN/ISR/SWR）——降本就提速，性价比最高。
2. **流式渲染**压缩 TTFB。
3. **数据获取并行化**，缩短服务端阻塞。
4. **水合优化**（渐进式、按需、Islands）控制 TTI/FID。

## 三、大规模 SSR 架构

### 1. 需要考量的扩展问题

当单个 Node/渲染进程扛不住量，或需要全球低延迟时，架构要分层：

```
用户
 └→ 网关/负载均衡（识别请求、路由、限流、鉴权、缓存）
     ├→ CDN（静态资源 + 可缓存页面）
     ├→ 渲染集群（多实例 Node/Nitro，无状态扩展）
     └→ 数据层（缓存 + 上游服务）
```

### 2. 网关（API Gateway / 边缘）

- **职责**：TLS 终止、路由、鉴权、限流、缓存、日志。
- **帮助**：把可缓存的静态/ISR 请求挡在边缘，减轻渲染层压力。
- **形态**：Nginx、自建 Gateway、Cloudflare/边缘函数。

### 3. 渲染集群：无状态化

要让渲染层能横向扩展，必须**无状态**：

| 要做的事 | 说明 |
|---------|------|
| 状态外置 | Session/缓存移到 Redis/DB，不落本地内存 |
| 数据解耦 | 渲染只依赖数据获取，不进持久状态 |
| 按实例扩展 | 任何实例可服务任意请求，互不依赖 |
| 优雅扩缩 | 配合 K8s HPA 按 CPU/流量扩缩实例 |

```js
// 渲染进程应无状态：不要在标题中持有全局可变 session
// ❌ globalThis.sessionStore = {}
// 应外置到 Redis 等共享存储
```

### 4. 降级（Fallback / Degradation）

高可用最关键的兜底：

- **缓存兜底**：源站异常返回 `stale-if-error` 的旧缓存。
- **静态兜底**：若页面有 SSG/ISR 静态版本，动态渲染失败时回退静态。
- **降级为 CSR**：渲染服务不可用时，返回 SPA 壳让客户端自行渲染。
- **熔断**：数据源频繁失败时停止取数，用降级内容。

降级优先级：`稳定缓存 → 静态版本 → SPA 壳`，保证用户永远"有的看"而非 500。

## 四、Node 服务端渲染的服务端运维

### 1. 超时（Timeout）控制

服务端渲染每个请求的取数/渲染可能很慢，必须设超时，避免请求无限挂起占资源：

```js
// 以 fetch 超时为例
async function fetchWithTimeout(url, ms = 3000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
```

同时给**整请求**设置护栏（如 10s），超过即降级/返回错误。

### 2. 内存（Memory）管理

Node 长驻进程最怕内存泄漏：

- **渲染结果不要进全局缓存**，或设置 TTL 与淘汰策略，否则暴涨。
- **留意同构代码中的全局状态**（模块级对象、未清理的类单例）。
- **reshape 偏置**：用 `--max-old-space-size` 设置上限，配合 PM2/Node 内存看护。
- **监控**：heapUsed、RSS、GC 频率，实时告警。

```
常见泄漏：服务端把每个请求的组件实例/上下文放进一个不清理的单例 map。
```

### 3. 优雅关闭（Graceful Shutdown）

滚动发布/缩容时，不能 kill 掉正在服务请求的进程：

```js
import http from 'node:http'

const server = http.createServer(handler)
server.listen(port)

async function shutdown() {
  console.log('开始优雅关闭')
  server.close(async () => {   // 停止接收新连接
    await flushPendingJobs()   // 清空在途任务/会话
    process.exit(0)
  })
  // 超时兜底强制退出
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

要点：停止接新请求 → 等存量请求完成 → 清理副作用 → 正常退出；配合 Node 集群/角色管理实现滚动更新。

### 4. 监控与告警

- 请求延迟分位（p50/p95/p99）、错误率、回源率、缓存命中率。
- 进程重启、内存、CPU、连接数。
- 渲染失败即降级告警，防止静默降级成为常态。

### 5. 无服务器 / 边缘 SSR

除了自建 Node 渲染集群，无服务器与边缘计算也提供了 SSR 托管形态：

| 形态 | 特点 | 优缺点 |
|------|------|--------|
| 自建 Node 集群 | 完全可控、可调优 | 运维成本高，需处理扩缩与优雅关闭 |
| FaaS（Vercel/AWS Lambda 等） | 按请求计费、自动扩缩 | 冷启动延迟，单请求受运行时时间/内存上限约束 |
| 边缘渲染（Cloudflare/Netlify Edge） | 就近渲染、低 TTFB | 运行环境受限，不适合重计算与大数据量 |

选型要点：

- 追求全球低延迟 → 边缘渲染 + 分层缓存。
- 不希望维护集群 → FaaS，但接受冷启动与平台绑定。
- 需要深度定制与高性能 → 自建集群 + K8s 管理。

> **框架趋势**：Next.js、Nuxt 3（Nitro）都已把"同一套代码可部署到 FaaS/Edge"作为一等公民，避免了传统 SSR 强绑定 Node 部署环境的痛点，这也正是演示代码 + 平台能力的重要结合点。

## 五、主流框架对比总表

| 框架 | 技术栈 | 渲染方式 | 数据获取 | 服务端 | 生态/成熟度 | 适用 |
|------|-------|---------|---------|--------|------------|------|
| Next.js | React | SSG/SSR/ISR/CSR | Server Component / fetch | Next Server/Functions | 最成熟 | 大型全栈 React 站 |
| Nuxt 3 | Vue | SSG/SSR/SWR/CSR | useAsyncData + $fetch | Nitro（跨运行时） | 成熟 | Vue 全栈站 |
| Astro | 多框架 | SSG（默认）/SSR/Islands | 服务端 + framework | 适配器 | 新锐 | 内容站/静态优先 |
| VitePress / Docusaurus | Vue/React | SSG | 构建时 Markdown | 静态托管 | 成熟 | 文档、博客 |
| Remix | React | SSR/hydration | loader/action | Node/边缘 | 中等 | 追求 SSR 优先 |

选择要点：

- 团队技术栈（React → Next，Vue → Nuxt）。
- 是否需要混合渲染 / Islands（Astro）。
- 内容主导低交互 → 纯 SSG 框架（VitePress/Docusaurus）。
- 需要复杂服务端逻辑 → 全栈框架（Next/Nuxt/Remix）。

## 七、最小实现：为架构决策提供直觉的三页 demo

打开 `code/frontend/13-ssr` 目录页，三个 demo 各演示一种核心原理：`ssr-vs-csr.html` 比较"首屏 HTML 里到底有没有正文"、`hydration-demo.html` 演示水合如何让静态直出"活"起来、`build-time-static.html` 演示构建期/增量式产物（SSG/ISR）。当你做选型时，这套直觉能帮你在 SEO、首屏、服务器成本之间快速落位。

## 八、面试衔接

本节是本章收尾，对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q111-117）：选型决策树、SPA/SSR/SSG 的 TTFB/FCP/LCP/TTI 差异、大规模 SSR 分工（网关/渲染集群/数据层）、降级兜底优先级、Node 运维（超时/内存/优雅关闭）与框架对比。至此「13-SSR与SSG服务端渲染」完结，下一章进入「前端工程化 & 基建」（`06-工程化与构建`），把渲染链路放进完整的工程化体系里审视。