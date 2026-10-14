# mf-workspace：微前端统一实战工程

一个宿主 + 一对子应用（Vue 订单列表 / React 订单详情），**同一业务场景跑通五种微前端接线**：
`iframe` / `qiankun` / `micro-app` / `wujie` / `Web Components`。

对应篇目：`iframe 方案` `qiankun` `micro-app` `wujie` `Web Components 方案`，以及三篇原理篇（沙箱/通信/资源加载）均引用本工程的接线代码。

## 工程结构

```
host/        Vue3 宿主（端口 3030）：布局、路由、五种方案视图、中枢状态 store
vue-sub/     Vue3 子应用：订单列表
react-sub/   React18 子应用：订单详情
```

子应用有三种产物形态——这正是真实微前端工程的产物矩阵：

| 形态 | 端口 | 消费方 | 说明 |
|---|---|---|---|
| dev server | 3031 / 3032 | iframe 接线、本地调试 | vite dev，完整 HMR |
| UMD 产物 | 3033 / 3034 | qiankun / micro-app / wujie | `build:qk` + `preview:qk`，生命周期协议或自挂载 |
| 自定义元素产物 | 3141 / 3142 | Web Components 接线 | `build:wc` + `preview:wc`，iife 单文件 |

| 宿主视图 | 实验内容 | 对应篇目 |
|---|---|---|
| `host/src/views/IframePlan.vue` | postMessage 协议 + 宿主中枢转发 | iframe 方案 |
| `host/src/views/QiankunPlan.vue` | loadMicroApp + initGlobalState（消费 UMD 产物） | qiankun |
| `host/src/views/MicroAppPlan.vue` | `<micro-app>` 标签 + data/dispatch（消费 UMD 产物） | micro-app |
| `host/src/views/WujiePlan.vue` | WujieVue + props/bus（消费 UMD 产物） | wujie |
| `host/src/views/WcPlan.vue` | 自定义元素标签 + attribute/CustomEvent | Web Components 方案 |
| `vue-sub/src/env.ts` | 子应用环境探测与上行通道切换 | 全部 |
| `react-sub/src/App.tsx` | 接收端五通道下行适配 | 全部 |
| `vue-sub/src/main-qk.ts` / `react-sub/src/main-qk.tsx` | UMD 入口：qiankun 走生命周期，micro-app/wujie 自挂载 | qiankun / micro-app / wujie |
| `react-sub/src/wc-entry.tsx` | React 手写自定义元素 wrapper（~30 行） | Web Components 方案 |

## 起服务

```cmd
cd code/mf-workspace/host && npm install --ignore-scripts && npm run dev
cd code/mf-workspace/vue-sub && npm install --ignore-scripts && npm run dev
cd code/mf-workspace/react-sub && npm install --ignore-scripts && npm run dev

:: qiankun / micro-app / wujie 接线消费 UMD 产物（两个子应用各自执行）
cd code/mf-workspace/vue-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/react-sub && npm run build:qk && npm run preview:qk

:: Web Components 接线消费自定义元素产物
cd code/mf-workspace/vue-sub && npm run build:wc && npm run preview:wc
cd code/mf-workspace/react-sub && npm run build:wc && npm run preview:wc
```

浏览器打开 `http://127.0.0.1:3030`，顶部导航在五种方案间切换。

- **iframe**：点击列表 → postMessage → 宿主中枢 → 详情 iframe 整页刷新（观察代价）。
- **qiankun**：点击列表 → setGlobalState → 宿主 onGlobalStateChange。切换路由再回来会重新 mount。
- **micro-app**：data 属性下行、dispatch 上行，子应用零生命周期改造（自挂载）。
- **wujie**：props 下行、bus 上行；iframe 保活，第二次挂载秒开。
- **Web Components**：标签即应用，attribute 下行、CustomEvent 上行。

## 通信约定（跨方案统一）

事件名统一 `order-select`，载荷 `{ orderId }`；每方案映射：

| 方案 | 上行（列表→宿主） | 下行（宿主→详情） |
|---|---|---|
| iframe | `parent.postMessage` | 详情 iframe `message` 监听 |
| qiankun | `setGlobalState` | `onGlobalStateChange` |
| micro-app | `window.microApp.dispatch` | `addDataListener` / data 属性 |
| wujie | `window.$wujie.bus.$emit` | bus `$on` / props |
| Web Components | `CustomEvent`（bubbles+composed） | `attributeChangedCallback` |

## 实测踩过的坑（正文有展开）

- **@vitejs/plugin-react 的 HMR preamble 在 qiankun 沙箱里失效**（`can't detect preamble`）——React 子应用的 qiankun 接线必须走生产产物，dev 接法只适用于无状态调试。
- **micro-app 对 Vite dev 的 ESM 脚本路径拼接有 bug**（`undefined../src/main.ts`）——走 UMD 产物最稳。
- **qiankun 沙箱里没有 `process`**——子应用产物残留 `process.env.NODE_ENV` 时宿主报 `process is not defined`。两层修法：子应用构建 `define: { 'process.env.NODE_ENV': '"production"' }` + 宿主入口垫片（qiankun 官方 FAQ 方案）。
- **UMD 产物是 classic script**：qiankun 拉取 entry html 后提取执行；micro-app/wujie 不调生命周期协议、期待应用自挂载。
- **defineCustomElement 的样式默认被 lib 构建抽成独立 css**——shadow DOM 里必须用 `?inline` 把样式变成字符串注入（见 `wc-entry.ts`）。

## 已知边界

- `npm install --ignore-scripts`（本机 esbuild postinstall EBUSY，见构建体系板块）。
- qiankun dev 模式依赖 `vite-plugin-qiankun useDevMode`（vue-sub dev 保留此能力用于联调）；生产实践统一 UMD 产物 + import-html-entry。
