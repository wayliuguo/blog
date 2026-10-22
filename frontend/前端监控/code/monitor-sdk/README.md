# monitor-sdk

自建前端监控 SDK：**初始化 / 异常 / 性能 / 声明上报 / 上报** 五个能力文件，零依赖纯浏览器 JS。

一条上报通道承载三类事件：异常（含调用栈现场）、性能（页面隐藏时定稿的快照）、业务行为（手动 report / 声明式 data-track·data-expose），共用同一套公共字段、采样与投递。手动上报只有一个入口 `report()`——业务侧区分上报类型的二次封装（PV / 点击 / errorReport）在接入层完成（形态同 cash-web 的 `hooks/useReport`）。

## 架构（五个能力文件）

```
src/
├── index.js          # 公共出口：init / report / getCurrentInstance
├── init.js           # 初始化：默认配置、单例、装配采集模块、hidden 收口
├── exceptions.js     # 异常：window error / unhandledrejection / fetch+XHR 请求拦截 / Vue errorHandler
├── performance.js    # 性能：Web Vitals 全指标 + 导航明细 + 请求耗时，hidden 时定稿
├── declarative.js    # 声明上报：data-track 点击委托 / data-expose 曝光
└── report.js         # 上报：report() 手动入口 + 公共字段补全 → 采样 → 节流 → 批量 → sendBeacon 优先
```

依赖方向单向：异常、性能、声明上报只产出事件交给上报通道；装配与生命周期收口集中在初始化。

## 快速使用

```js
import { init } from 'monitor-sdk' // 或相对路径 '../monitor-sdk/src/index.js'

const sdk = init({
    endpoint: 'http://localhost:5189/api/report', // 上报地址：一个 URL 描述事件发到哪
    eventPrefix: 'monishop', // 声明式事件名前缀：平台.行为位
    commonParams: { uid: 'u_123', channel: 'h5' }, // 公参：静态传入，每条事件自动附带
    release: '1.0.0',
    environment: 'development',
    debug: true
})
sdk.attachVue(app) // Vue 工程可选：errorHandler 归一
```

## API 一览

| API | 类别 | 说明 |
| --- | --- | --- |
| `init(options)` | 初始化 | 单例；endpoint/eventPrefix/commonParams/release/双采样率/批量参数 |
| `report(event)` | 上报 | 唯一手动上报入口；event 带 `error`（Error 实例）时 SDK 归一拆出 message/stack |
| `attachVue(app)` | 异常 | Vue errorHandler 归一（app 创建后调用） |
| `flush(reason)` | 上报 | 立即发送队列（hidden 收口已自动） |
| `stats` | 自观测 | `{ sent, retried, dropped, throttled }` |
| `cfg` | 自观测 | 运行时可改采样率（demo 实验室在用） |

业务二次封装示例（demo 的 `useReport.js`）：`trackPageView()`（PV 手动报，路由 afterEach 调用）、`trackClick(pos, params)`、`errorReport(error, tags, extra)`——全部落在 `report()` 一句上。

## 已知取舍

- 性能快照在页面 hidden 时定稿且只算一次：SPA 长会话中后续路由切换不再重复上报整页性能。
- 发送失败按上限重试（默认 2 次），不做退避：教学 SDK 从简。
- 单例常驻，无 destroy/卸载。

## 实测

配套演示工程见 `../monitor-demo`（电商 storefront + 实验室特性总控台），headless Chrome 全流程实测通过。
