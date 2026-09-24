# monitor-lab

监控与稳定性模块的配套实验台。**零依赖**：只用 Node 内置模块，浏览器侧用本机已装的无头 Chrome（不装 puppeteer）。

它回答一件事：**前端怎么把「线上到底好不好」变成可查询、可告警的数据** —— 采集（错误/性能/埋点）→ 传输（采样、攒批、重试）→ 聚合（秒桶、分位值）→ 告警（阈值、连续命中、静默期、恢复）。

## 目录结构

```
monitor-lab/
├── sdk/                     前端 SDK（浏览器 ESM，Node 也能直接 import）
│   ├── index.mjs            init 单例 + 插件组装 + 生命周期收口
│   ├── transport.mjs        采样 → 攒批 → sendBeacon/fetch → 失败重试 → 溢出丢弃
│   ├── errors.mjs           6 类错误捕获 + 指纹频控
│   ├── perf.mjs             PerformanceObserver 采集 + Core Web Vitals 评级
│   └── track.mjs            PV / 会话 / 曝光 / 点击 / 停留
├── collector.mjs            采集端：静态下发 + POST /collect + 聚合告警 API（端口 5189）
├── aggregate.mjs            秒桶 → 分位值 → 滑动窗口汇总
├── alert.mjs                告警规则：阈值 + 连续 N 次 + 静默期 + 恢复通知
├── harness.mjs              脚手架：对齐表格 / 起采集端 / 起无头 Chrome / 等上报
├── scenarios/               5 个可跑场景 + all.mjs
├── site/                    单页验证台（浏览器打开即可手动验证三类数据）
│   └── monitor-lab.html     三个面板（错误 / 性能 / 埋点）+ 一键跑全部 + /api/report 聚合面板
│                            ?scenario=errors|perf|track 预置对象限实验台的自动化序列
├── enterprise-server.js     旧版一体化闭环服务（端口 5188，示例过渡保留）
└── data/                    运行产物：events.jsonl（已 gitignore）
```

## 场景一览

| 命令 | 场景 | 会看到什么 | 对应篇目 |
| --- | --- | --- | --- |
| `npm run transport` | 上报传输层 | 12 条事件逐条发 12 次请求、攒批发 3 次；采样 100%/50%/10% 的实际接受率；重试轮数与放弃条件；队列溢出丢弃 40/50 | 前端监控 SDK 实现 |
| `npm run errors` | 错误监控 | 无头 Chrome 实跑捕获 6 类错误（运行时 / Promise / 资源 / 接口 / 网络 / 跨域）及各自字段；指纹频控把 6 条捕获压成 4 条出端 | 前端监控体系 · 四 |
| `npm run perf` | 性能与体验监控 | TTFB/FCP/LCP/CLS/TBT 实测值与评级；cls 与 clsRaw 的口径对照；140ms 长任务 → TBT 90ms；一次 flush 的字节数 | 前端监控体系 · 五 |
| `npm run track` | 埋点与行为分析 | 8 条事件流（PV → 2 条首屏曝光 → 2 次委托点击 → 自定义事件 → 滚动后曝光 → 停留）；小看板与漏斗 | 前端监控体系 · 六 |
| `npm run all` | 全部场景 | 依次跑上面 5 个 | — |
| `npm run site` | 单页验证台 | 端口 5189，浏览器打开 `/monitor-lab.html`：三个面板手动触发错误 / 性能 / 埋点，点「刷新聚合」从 `/api/report` 看秒桶 / 分位 / KPI | 前端监控体系 / 前端监控实战·单页验证 |
| `npm start` | 采集端（同 site） | 端口 5189，也是自动化场景 & 单页验证台的接收端，用 `/api/report` 看聚合 | — |

## 运行方式

```bash
cd frontend/进阶/监控与稳定性/code/monitor-lab
npm run all          # 一次跑完 5 个场景（会自动起无头 Chrome）
npm start            # 起采集端，然后手动打开 http://localhost:5189/
```

- 场景里的采集端用 `PORT=0` 让系统分配空端口，不会跟正在手动浏览的 5189 冲突。
- 找不到 Chrome 时用环境变量指定：`CHROME_PATH=/path/to/chrome npm run errors`。

## 设计取舍

- **端口用 0**：自动化场景自己起服务、自己收尾，端口冲突是最常见的"跑不起来"原因，直接交给系统分配。
- **env 依赖注入**：`sdk/*.mjs` 里所有浏览器 API 都从 `env`（默认 `globalThis`）取，所以同一份 SDK 代码在浏览器和 Node 里都能跑，场景才能在 Node 侧验证传输层与频控逻辑。
- **秒桶 + 分位值**：聚合的粒度是「1 秒一个桶」，桶内先计数再算 P50/P75/P95/P99。平均值会被大量快请求稀释，只有分位值能反映"慢的那部分用户"。
- **告警三件套**：`consecutive`（连续命中几次才推）、`silenceMs`（静默期内不重复推）、`resolved`（指标回到阈值内推恢复）。缺了任何一条，线上要么漏报要么告警轰炸。
- **告警时间用桶的 ts**：告警描述的是数据本身，不是收包时刻，所以 `evaluate` 收到的是桶时间戳而不是服务器当前时间。
- **`data/` 落盘**：采集端把每批事件追加进 `data/events.jsonl`，说明"批次可落盘、可重放"；这是运行产物，已忽略。
