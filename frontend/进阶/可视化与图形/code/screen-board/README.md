# screen-board — 实时交易监控大屏（可视化板块统一业务场景 · 真实可跑）

vite + vue3 + echarts 的最小大屏工程，配套《大屏与可视化工程》《Canvas 2D 基础与性能》等篇的实战层。

## 跑起来

```cmd
cd code\screen-board
npm install
npm run dev        :: http://127.0.0.1:5199
npm run build      :: 产物在 dist/
```

## 实验 ↔ 篇目对照表

| 实验点 | 代码位置 | 对应篇目与小节 |
| --- | --- | --- |
| 等比缩放 + 居中留黑边（分辨率适配） | `src/utils/useFitScreen.js` | 大屏篇 · 分辨率适配 |
| 时间桶聚合 min/max/count（降维 500 倍） | `src/utils/aggregate.js` | 大屏篇 · 数据聚合；探针同源 `screen-lab/aggregate.cjs` |
| 帧内合并：2s 推一批只按 rAF flush 一次 | `src/utils/mock.js` | Canvas 篇 · 帧预算与合并 |
| echarts 生命周期三纪律（init/resize/dispose） | `src/components/EPanel.vue` | 大屏篇 · 7×24 稳定性清单 |
| 告警列表用普通 DOM（交互层与渲染层分工） | `src/components/AlertList.vue` | SVG 篇 · 与 Canvas 的分工 |
| 渲染预算 / 降级阶梯 / 时间切片（探针） | `../screen-lab/`、`../viz-lab/` | 大屏篇 · 三、四、五节 |

## 设计稿约定

1920×1080 写死在 `useFitScreen.js` 的 `DESIGN`；所有面板布局用 grid 划分在 `App.vue`。
