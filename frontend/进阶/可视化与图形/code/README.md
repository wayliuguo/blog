# 可视化与图形 · 配套代码

《frontend/进阶/可视化与图形》模块的配套代码。两个形态并存：

**真实工程**（`npm install` 后可跑，统一业务场景=实时交易监控大屏）：

| 项目 | 内容 | 实跑验证 |
| --- | --- | --- |
| `screen-board/` | vite+vue3+echarts 大屏工程（等比缩放 / 时间桶聚合 / 帧内合并 / 生命周期三纪律） | build 12.76s ✅ + headless CDP 渲染实测 ✅（端口 5199） |

**探针实验台**（零依赖，`node xxx.cjs` 直跑）：

| 目录 | 内容 | 被引篇目 |
| --- | --- | --- |
| `viz-lab/` | 比例尺 / 布局 / 显示列表 / 帧合并 / 降级 / data join（`run.cjs` 七场景自检） | Canvas 篇 · SVG 篇 · 图表引擎篇 · 大屏篇 |
| `viz-bench/` | 三路渲染帧率基准（`bench.cjs` 起服务 + 无头 Chrome 收帧率） | Canvas 篇 · SVG 篇 · WebGL 篇 |
| `screen-lab/` | 时间切片 / 降级阶梯 / 聚合（`run.cjs` 三场景自检） | 大屏篇 |
