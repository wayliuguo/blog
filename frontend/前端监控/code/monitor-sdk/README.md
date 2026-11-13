# monitor-sdk

内核 + 插件架构的前端监控 SDK，JavaScript 零依赖。八项采集能力：性能、JS 异常、资源异常、请求、路由、用户行为、白屏、自定义上报。

文章：《监控 SDK 设计与实现》——`../../监控SDK设计与实现.md`

## 目录

```
src/
├─ index.js          # 公共出口：init()、插件工厂
├─ config.js         # 默认值 + 默认插件装配顺序
├─ core/
│  ├─ context.js     # 会话 / 用户 / 页面 / 设备快照
│  ├─ event.js       # 事件归一、指纹
│  ├─ sampler.js     # 按类型采样
│  ├─ throttle.js    # 指纹去重
│  ├─ queue.js       # 定长队列 + IndexedDB 离线兜底
│  ├─ scheduler.js   # batch / interval / idle / hidden / manual
│  ├─ transport.js   # sendBeacon 优先 + fetch keepalive + 重试
│  └─ kernel.js      # 装配、流水线、生命周期
└─ plugins/
   ├─ performance.js # PerformanceObserver 全指标，hidden 定稿
   ├─ js-error.js    # error / unhandledrejection / Vue errorHandler
   ├─ resource.js    # 资源加载失败 + 耗时汇总
   ├─ request.js     # fetch / XHR 包裹，失败与慢请求
   ├─ router.js      # history 补丁 + popstate / hashchange
   ├─ behavior.js    # 点击委托 / 曝光 / 滚动深度 / 面包屑
   ├─ whitescreen.js # 米字 33 点采样 + 二次复检
   └─ custom.js      # report() 手动上报
```

依赖方向：`plugins → core（仅 PluginContext）`，`core → 无`。插件只能 `emit`，无法绕过采样、节流与脱敏。

## 使用

```js
import { init } from './src/index.js'

const sdk = init({
    endpoint: 'https://collector.example.com/api/report',
    release: '1.0.0',
    env: 'production',
    sampleRates: { behavior: 0.3 },
    beforeSend(event) {
        if (event.type === 'request' && event.data) event.data.url = event.data.url.split('?')[0]
        return event
    }
})

sdk.report({ name: 'shop.HOME.add_cart', params: { id: 1 } })
sdk.captureError(new Error('业务已知异常'), { flow: 'order' })
sdk.setUser('u_123', { level: 'vip' })
sdk.attachVue(app)
await sdk.flush('manual')
```

运行时读取：`sdk.stats`（sent / failed / sampled / throttled / dropped / restored / lastFlushReason），`sdk.getContext()`。

## 校验

无独立构建步骤：demo 直接以源码引用本目录，能过 `../monitor-demo` 的 `npm run build` 即视为通过。

演示工程见 `../monitor-demo`（Vite + Vue3，含 collector 接收端与 /api/stats 看板）。
