# monitor-lab 重构：Vite+Vue SPA 演示设计

日期：2026-09-24　模块：`frontend/进阶/监控与稳定性/code/monitor-lab`
状态：已与用户确认，进入实施前审阅

## 背景与问题

当前 `monitor-lab/` 同时混有**两代东西**，复杂度高于目标：

- `site/monitor-lab.html`（22KB 单页验证台）＋ `monitor.html / agent.html / error-report.html` 三个**遗留孤儿页**（挂在旧 `enterprise-server.js`，调旧接口 `/api/collect` 与企业版形态 `/api/report`，与新版 `collector.mjs` 对不上，且 README 完全没提及）。
- `scenarios/*`（transport/errors/perf/track/pipeline）+ `harness.mjs` 的**无头 Chrome 自动化套件**；吞吐层与聚合/告警（`aggregate.mjs`/`alert.mjs`/`/api/report`）。

用户诉求：**再简单一点**。要一个 SPA 页面，不同路由演示不同的上报；验证交给读者自己用 DevTools 的 **Console** 和 **Network** 看，而非我自建的日志/聚合面板。

## 目标（已确认）

1. `site/` 换成**一个 Vite + Vue 3 SPA**，路由 `Home / Errors / Perf / Track` 演示三类上报。
2. 验证方式 = DevTools Console（SDK 开发态 logger）+ Network（`/collect` 请求体）。
3. SDK 收成**纯浏览器**：删掉为 Node 自动化服务的 `env` 依赖注入。
4. **删除**自动化场景套件、聚合/告警、旧企业 demo 页。
5. 这套 demo 的边界 = **SDK 的实现与使用**（采集→采样→攒批→发送），不含后端聚合/告警。

## 架构

```
monitor-lab/
├── sdk/                      零依赖浏览器 SDK（演示核心）
│   ├── index.mjs             入口单例 + 插件组装
│   ├── transport.mjs         采样→攒批→sendBeacon/fetch→重试→丢弃
│   ├── errors.mjs / perf.mjs / track.mjs
│   └── dev-logger.mjs        新增：彩色 console 输出（每条事件/每批 flush）
├── app/                      Vite+Vue3 SPA
│   ├── index.html / vite.config.mjs
│   ├── src/main.js / src/router.js
│   └── src/views/
│       ├── Home.vue          入口：路由卡片 + 「打开 DevTools→Console/Network 看上报」
│       ├── Errors.vue        6 类错误触发按钮
│       ├── Perf.vue          制造性能坏情况（长任务/位移/晚到）
│       └── Track.vue         声明式埋点元素（data-track / data-expose）
├── collector.mjs             极简：静态下发(含 build 产物) + POST /collect + JSONL 落盘 + console 打印批次
├── package.json              scripts: dev / build / start(=build+serve) / server
└── data/events.jsonl         运行产物
```

### 采集端（collector.mjs）精简后职责
- 静态下发：`app/` 的 build 产物 + 供 dev 时 `vite` 直连（无 CORS 顾虑则同源，dev 时 `/collect` 由 vite 代理回 collector）。
- 接收 `POST /collect`：清空/校验 batch → 追加到 `data/events.jsonl` → **console 打印每批的摘要**（供服务端侧确认）。
- **删除** `/api/report`、`/api/events`、`/api/reset` 及 `aggregate.mjs`、`alert.mjs`。

### SDK 调整
- 删除 `env` 依赖注入（Node 语义），收敛为浏览器专用；`win` 默认取 `window`。
- 新增 `dev-logger`：`init` 时若 `import.meta.env.DEV` 或显式 `debug:true`，把每次 `enqueue`（事件明细）与 `flush`（批次/条数/字节）彩色打印到 console。

### 运行方式（决定 1：A 与 B 都支持）
- 生产形态 A：`npm run build`（构建 SPA 到 `app/dist`）→ `npm start`（collector 静态下发 build 产物 + 接收 `/collect`）。一条命令跑到单一端口。
- 开发形态 B：`npm run dev`（vite 5173，把 `/collect` proxy 到 collector）＋ `npm run server`（collector，接收端）。改码热更新。

### 路由
- `/#/` Home：三条路由卡片 + 使用提示。
- `/#/errors`、`/#/perf`、`/#/track`：各自触发对应类别上报。用 hash 路由（适合静态下发，无 history 刷新 404 问题）。

## 删除清单
- `scenarios/`（transport/errors/perf/track/pipeline/all）+ `harness.mjs`
- `aggregate.mjs`、`alert.mjs`
- `enterprise-server.js`
- `site/monitor.html`、`agent.html`、`error-report.html`（`monitor-lab.html` 由 SPA 取代）
- package.json 中对应的 `npm scripts`

## 非目标
- 不提供聚合/告警的 UI 或接口（属采集端后端，超出"SDK 实现与使用"边界）。
- 不保留 Node 侧自动化校验。

## 关联文档更新
- `README.md`：目录结构、运行方式改写为 dev/build 两种形态；补"用 Console ／ Network 验证"。
- 复习：`前端监控实战·单页验证.md` 与侧边栏中引用旧 `site/monitor-lab.html` 的路径/章节需同步核对。