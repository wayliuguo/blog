# monitor-lab

监控与稳定性模块的配套验证台。**边界 = SDK 的实现与使用**：采集（错误/性能/埋点）→ 采样 → 攒批 → 发送。后端只保留一个极简接收端，聚合/告警不做——那是采集端后端的事，超出本 demo。

它用一个 **Vite + Vue 3 SPA** 按路由演示三类上报：

- `/#/errors`　六类错误（六种抓法、指纹频控）
- `/#/perf`　　三类性能降级（RUM 采集、LCP/CLS 越晚越准、指标评级）
- `/#/track`　声明式埋点（PV/会话/曝光/点击/脱敏）

**验证交给读者自己用 DevTools 看**：页面上不造日志面板。

- **Console**　看 SDK 开发态彩色日志：每条事件入队打一行 `[monitor] 采集`、每批发送打一行 `[monitor] 发送`
- **Network**　看 `POST /collect` 的 `events` 请求体（攒批 / 定时两触发）
- **采集端终端**　看 `▼ 收到 N 条` 的批次摘要与 `data/events.jsonl` 落盘

## 目录结构

```
monitor-lab/
├── sdk/                      零依赖浏览器 SDK（演示核心）
│   ├── index.mjs            init 单例 + 插件组装 + 生命周期收口 + dev-logger 开关
│   ├── transport.mjs        采样 → 攒批 → sendBeacon/fetch → 失败重试 → 溢出丢弃
│   ├── errors.mjs / perf.mjs / track.mjs   三类采集插件
│   └── dev-logger.mjs       开发态彩色 console：每条入队 / 每批发送
├── app/                      Vite+Vue3 SPA（Vite 开发态 & build 产物都指到这里）
│   ├── vite.config.mjs      root=app，dev 时 /collect 代理回采集端
│   └── src/                  main/router/App + views/{Home,Errors,Perf,Track}.vue
├── collector.mjs             极简采集端：静态下发 app/dist + POST /collect + 落盘 + 打印批次
├── package.json              scripts：dev / build / start / server / preview
└── data/events.jsonl         运行产物（已 gitignore）
```

## 运行方式

### 开发形态（改码热更新，两个终端）

```bash
npm install                # 首次：装 Vite / Vue
npm run server             # 终端 1：采集端，端口 5189
npm run dev                # 终端 2：Vite，端口 5173
# 浏览器打开 http://localhost:5173/ （dev 时 /collect 由 vite 代理回 5189）
```

### 生产形态（一条命令到单一端口）

```bash
npm run start              # 内部 = vite build + node collector.mjs
# 浏览器打开 http://localhost:5189/（collector 静态下发 app/dist，刷新不 404）
```

两种形态都靠 hash 路由（`#/errors` 等），静态下发时刷新不会 404。

## 怎么验证

1. 打开某页（如 `#/errors`），按几个按钮。
2. F12 → Console：依次出现 `[monitor] 采集 <类别> …`，攒够 5 条或满 3 秒后出现 `[monitor] 发送 N 条 ✓`。
3. Network：确认每次发送都有一条 `POST /collect`，翻看请求体的 `events` 数组是不是刚才那几类。
4. 切后台 / 关页：`visibilitychange → hidden` 触发收口，上报 LCP / CLS 终值。
5. 回采集端终端：看 `▼ 收到 N 条`，`data/events.jsonl` 已逐条追加。

> 本 demo `init` 用 `throttleMs: 0`（错误不频控，点几次报几次）+ `debug:true`（强制开 Logger）。SDK 默认 `throttleMs: 3000`；Logger 缺省跟随 Vite 开发态 `import.meta.env.DEV`，生产也能用 `debug:true` 强行打开。

## 设计取舍

- **只有一个接收端**：`POST /collect` → 校验 → 落盘 → 打印摘要。不做 /api/report、聚合、告警——SDK 演示不掺服务端后端。
- **SDK 纯浏览器**：删除 Node 侧 `env` 依赖注入，所有浏览器 API 直接从 `window` / `navigator` / `fetch` 取。`sendBeacon` 优先（卸载也能送达且不阻塞主线程），不支持则回退 `fetch`。
- **dev-logger 不改行为**：只包一层 `enqueue` / `flush` 打日志，数据路径原样走，避免"为了演示改了采集逻辑"。
- **`data/` 落盘**：每批事件追加进 `data/events.jsonl`，说明"批次可落盘、可重放"；运行产物已忽略。