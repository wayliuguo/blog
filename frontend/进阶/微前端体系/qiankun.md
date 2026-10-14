# qiankun

> 微前端的事实标准（single-spa 系）。核心资产是**生命周期协议**：子应用从"一个页面"变成"一个带 mount/unmount 的应用"。实战继续用 `mf-workspace`：宿主 loadMicroApp 加载两个 UMD 产物子应用，通信走 initGlobalState。

## 1. 入门：心智模型迁移

### 1.1 从"嵌页面"到"挂应用"

iframe 的心智是"嵌一个页面"；qiankun 的心智是**"挂载一个组件，只是这个组件来自另一个仓库"**。子应用要回答三个问题（生命周期协议）：

- `bootstrap`：你被首次引入时做一次什么（通常空着）？
- `mount(container)`：挂到哪个容器、怎么渲染？
- `unmount()`：怎么干净地卸载？

写过 React/Vue 组件的你已经会这个协议了——`mount/unmount` 就是 `createApp().mount()` 和 `unmount()`。**qiankun 的全部接入成本 = 把子应用的启动代码包进这三个函数并导出**。

### 1.2 30 分钟跑通

qiankun 子应用的标准形态是 UMD 产物 + 导出生命周期。`mf-workspace` 里 vue-sub 的 UMD 入口：

> 摘自 `./code/mf-workspace/vue-sub/src/main-qk.ts`

```ts
let app: VueApp | null = null

export async function bootstrap() {}

export async function mount(props: { container: HTMLElement | string; setGlobalState?: (s: object) => void }) {
    if (props.setGlobalState) setQiankunStateSetter(props.setGlobalState)
    app = createApp(App)
    app.mount(typeof props.container === 'string' ? document.querySelector(props.container)! : props.container)
}

export async function unmount() {
    app?.unmount()
    app = null
}

// 非 qiankun 环境（micro-app / wujie / 直接打开产物页）自挂载
if (!(window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) {
    mount({ container: '#root' })
}
```

宿主侧用 `loadMicroApp` 手动加载（比 `registerMicroApps` 的路由激活模式更直观，适合先学）：

> 摘自 `./code/mf-workspace/host/src/views/QiankunPlan.vue`

```ts
// loadMicroApp 返回带 mountPromise 的句柄，卸载时必须 unmount，否则内存与事件都留在页面里
onMounted(async () => {
    // 子应用走 UMD 产物（build:qk + preview:qk）：qiankun 拉取 entry html、
    // 提取 UMD script 执行、从 exports 找 bootstrap/mount/unmount
    listApp = loadMicroApp({
        name: 'vue-list',
        entry: 'http://127.0.0.1:3033/',
        container: listRef.value!,
        props: { initialOrderId: '1001' },
    })
    detailApp = loadMicroApp({
        name: 'react-detail',
        entry: 'http://127.0.0.1:3034/',
        container: detailRef.value!,
        props: { initialOrderId: '1001' },
    })
    await Promise.all([listApp.mountPromise, detailApp.mountPromise])
})
```

### 1.3 上手最小可跑

```cmd
cd code/mf-workspace/vue-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/react-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/host && npm run dev
```

打开 `http://127.0.0.1:3030/#/qiankun`。**关键观察**：两个子应用渲染在宿主的 div 容器里（不是 iframe！）——DOM 同文档、样式同文档、事件同一条总线，这是它与 iframe 方案的本质区别。

## 2. 进阶：核心机制

### 2.1 import-html-entry：一切从"拉 HTML"开始

qiankun 接管子应用的第一步是 `fetch` 子应用的 entry html，然后：

1. 解析 html，**摘出所有 script 与 link**；
2. `fetch` 并缓存 CSS，注入宿主文档（带样式隔离处理）；
3. 把 JS 包成 `eval` 执行——这就是沙箱的入口（2.2）；
4. 执行完毕后从 `exports`（UMD 全局变量）里找 `bootstrap/mount/unmount`。

这解释了两个工程约束：**为什么子应用必须是 UMD**（ESM 的 `import` 是静态解析的，import-html-entry 无法在运行时把 `import` 重定向进沙箱）；**为什么 entry html 里的脚本顺序重要**（解析是同步串行的，动态 `import()` 的 chunk 拉取发生在运行时）。

### 2.2 沙箱：Proxy 代理 window

每个子应用运行在一个 `with(proxy)` 包裹的执行环境里：读 `window.xxx` 先查子应用自己的 fake 值，查不到再落到真实 `window`；写同理。效果是"共享一个真正的 window，但各自的改动互相看不见"。

它比 iframe 隔离**弱**：`window.top`、`document`（部分 API）、原生事件、`localStorage` 都是真对象，子应用有办法穿透。隔离强度的完整对比矩阵见[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)，这里只记结论：**Proxy 沙箱防"无意的污染"足够，防"有意的逃逸"不够**。

### 2.3 样式隔离的两个档位

- `strictStyleIsolation: true`：子应用容器套 shadow DOM，样式完全隔离——但弹窗（挂在 body 上）会丢样式，多数工程开不了。
- `experimentalStyleIsolation: true`：给子应用样式规则加属性前缀（`div[data-qiankun-xxx]`）——运行时改写 CSS 文本，弹窗兼容性好，但有动态插入样式的边界 case。

**实践中的多数团队选择：不开隔离，靠 CSS Modules/命名空间约定**。这是 qiankun 被诟病"隔离半成品"的主要原因。

### 2.4 全局通信：initGlobalState

宿主 `initGlobalState` 建立一份**由 qiankun 托管的共享 state**，子应用通过 mount 注入的 props（`onGlobalStateChange` / `setGlobalState`）订阅和更新：

> 摘自 `./code/mf-workspace/host/src/register-micro-apps.ts`

```ts
export const qiankunActions = initGlobalState({ selectedId: hostState.selectedId })

qiankunActions.onGlobalStateChange((state) => {
    if (state.selectedId && state.selectedId !== hostState.selectedId) {
        hostState.selectedId = state.selectedId
        logEvent('qiankun', `onGlobalStateChange → ${state.selectedId}`)
    }
})
```

接收端（react-sub 详情）从 mount props 拿到订阅函数：

> 摘自 `./code/mf-workspace/react-sub/src/App.tsx`

```ts
export function App(props: {
    // qiankun mount 注入的生命周期 props：onGlobalStateChange 订阅宿主共享 state
    onGlobalStateChange?: (fn: (state: { selectedId?: string }) => void) => void
    initialOrderId?: string
    initialContainer?: HTMLElement | string
}) {
```

initGlobalState 是**事件广播**语义（无历史回放、无 selectors）——业务状态复杂时的惯例是它只传"令牌/主题"这类轻状态，业务数据走子应用各自的 API 层。

## 3. 实战：统一业务场景

`mf-workspace` 的 qiankun 接线完整跑通订单场景，**浏览器端到端实测**（headless Chrome）：

- 两个 UMD 产物子应用挂载成功（`.sub-app` 列表 + `.detail` 详情同文档出现）；
- 点击列表 `#1002` → 子应用 `setGlobalState` → 宿主 `onGlobalStateChange` → 中枢状态变 `1002` → 事件日志记录通道。**全程无页面刷新**（对照 iframe 方案的整页重载）；
- 切走路由再切回：两个子应用完整 unmount → mount 重建（loadMicroApp 模式的默认行为，保活需自己缓存实例）。

### 3.1 实测踩到的两个真坑（正文必须记下来）

**坑一：React 子应用的 HMR preamble**。react-sub 用 dev server 接入时，浏览器报：

> 示意片段（无配套脚本）

```
Error: @vitejs/plugin-react can't detect preamble. Something is wrong.
```

`@vitejs/plugin-react` 会在每个组件模块头部插一段"检查 HMR 垫片是否安装"的代码，而 qiankun 沙箱的 eval 环境不满足检查条件。**结论：React 子应用的 qiankun 接线必须走生产产物**（`build:qk`），dev server 接法只适用于 Vue 子应用（配 `vite-plugin-qiankun` 的 `useDevMode`）。这也是"子应用产物矩阵"存在的原因——见 README 的三种形态表。

**坑二：`process is not defined`**。UMD 产物里残留的 `process.env.NODE_ENV`（Vue/React 运行时的 dev 判断）在 qiankun 沙箱里直接 ReferenceError。两层修法，工程里都做了：

> 摘自 `./code/mf-workspace/vue-sub/vite.qk.config.ts`

```ts
export default defineConfig({
    plugins: [vue()],
    // lib 构建不自动替换依赖里的 process.env.NODE_ENV；qiankun 沙箱里没有 process，
    // 必须在构建层替换掉（运行层的兜底垫片在宿主 main.ts）
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
```

> 摘自 `./code/mf-workspace/host/src/main.ts`

```ts
// qiankun 官方 FAQ 的宿主垫片：子应用产物里残留的 process.env 引用
// 在浏览器与 qiankun 沙箱里都没有定义，宿主必须兜底（真实工程高频坑）
const w = window as unknown as { process?: { env: Record<string, string> } }
if (!w.process) w.process = { env: { NODE_ENV: 'production' } }
```

构建层替换是治本，宿主垫片是治标——但生产环境里总有你改不了的子应用产物，所以垫片是 qiankun 宿主的标配。

## 4. 最小实现：生命周期协议 40 行

把 2.1 的"拉 HTML → 执行 → 找生命周期 → mount"写出来，就是 qiankun 的骨架（沙箱与样式处理见原理篇）：

> 示意片段（无配套脚本）

```ts
async function miniLoadMicroApp({ name, entry, container }) {
    const html = await (await fetch(entry)).text()
    const scriptSrc = html.match(/<script src="([^"]+)"/)?.[1]
    // 1. 拉取 UMD 产物并执行（真实实现里这一步在 with(proxy) 沙箱中）
    const code = await (await fetch(new URL(scriptSrc, entry))).text()
    const exports = new Function(`const module = { exports: {} }; ${code}; return module.exports`)()
    // 2. 从 exports 找生命周期——协议的全部
    await exports.bootstrap?.()
    await exports.mount({ container })
    return { async unmount() { await exports.unmount() } }
}
```

**20 行装下 qiankun 的主干**：`fetch html → fetch js → eval → 找三个函数 → 调用`。你手写的每一步都对应 qiankun 源码里的一个模块（import-html-entry / add-sandboxes / loadMicroApp）——原理篇与[手写 mini 微前端框架](/frontend/进阶/微前端体系/手写%20mini%20微前端框架)就是把这条骨架补上沙箱和样式隔离。

## 5. 对比与选型边界

| 你需要 | qiankun 适配度 |
|---|---|
| 多技术栈、子应用团队接受协议改造 | **最成熟**，生态与踩坑资料最多 |
| 子应用零改造 | 差——生命周期协议是硬要求 |
| 强样式/JS 隔离 | 弱——沙箱可逃逸、样式隔离半成品 |
| 性能与保活 | 中——默认卸载重建，保活要自己做 |

下一章[micro-app](/frontend/进阶/微前端体系/micro-app)：把"标签即应用"做到极致，专治"子应用团队不愿改造"。

## 配套代码

| 路径 | 内容 | 章节 |
|---|---|---|
| `./code/mf-workspace/vue-sub/src/main-qk.ts` | Vue 子应用 UMD 入口：生命周期协议 + 环境分流 | 1.2 / 1.3 |
| `./code/mf-workspace/host/src/views/QiankunPlan.vue` | 宿主 loadMicroApp 加载双子应用 | 1.2 / 3 |
| `./code/mf-workspace/host/src/register-micro-apps.ts` | initGlobalState 建立共享 state | 2.4 / 3 |
| `./code/mf-workspace/react-sub/src/App.tsx` | 接收端 onGlobalStateChange 订阅 | 2.4 / 3 |
| `./code/mf-workspace/vue-sub/vite.qk.config.ts` | UMD 产物构建（process define） | 3.1 |
| `./code/mf-workspace/host/src/main.ts` | 宿主 process 垫片 | 3.1 |
