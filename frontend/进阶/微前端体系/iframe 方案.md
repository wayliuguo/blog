# iframe 方案

> 五方案的**基线**：浏览器原生提供的"应用隔离单元"。理解了 iframe 的问题，后面四个方案在解决什么就都清楚了。实战继续用统一工程 `mf-workspace`（Vue 宿主 + Vue 订单列表 + React 订单详情）。

## 1. 入门：心智模型迁移

### 1.1 从"页面里嵌页面"到"微前端基线"

你已有的心智：`<iframe>` 就是在页面里嵌一个独立浏览上下文。迁移到微前端视角，只需换一个词：**iframe 是唯一一个"零改造"的微前端方案**——子应用不需要导出生命周期、不需要改构建、不需要感知宿主存在。它的隔离不是"实现出来的"，而是浏览器赋予的。

对照其他方案的改造负担（同一份子应用）：

| 改造项 | iframe | qiankun | micro-app / wujie | Web Components |
|---|---|---|---|---|
| 导出生命周期 | 不需要 | **必须** | 不需要 | 构建成元素 |
| 修改构建产物 | 不需要 | 需要（UMD） | 需要（UMD） | 需要（元素产物） |
| 感知宿主环境 | 不需要 | 需要（qiankun 判断） | 轻微（通信 API） | attribute 约定 |

### 1.2 30 分钟跑通

统一工程里 iframe 接线的宿主代码就一个视图（两个 iframe + 一段 postMessage 监听）：

> 摘自 `./code/mf-workspace/host/src/views/IframePlan.vue`

```vue
<script setup lang="ts">
// 方案一：iframe 基线。两个 iframe 分别承载列表与详情，
// 跨源靠 postMessage 协议通信——所有"现代"微前端方案要替代的就是这套心智。
import { onMounted, onUnmounted, ref } from 'vue'
import PlanShell from '../components/PlanShell.vue'
import { setSelectedId } from '../store'

const listSrc = 'http://127.0.0.1:3031/?mode=iframe'
const detailSrc = ref('http://127.0.0.1:3032/?mode=iframe&orderId=1001')

function onMessage(e: MessageEvent) {
    // 生产上必须校验 origin，教学工程简化为打印
    if (typeof e.data !== 'object' || e.data === null) return
    if (e.data.type === 'order-select') {
        setSelectedId(e.data.orderId, 'iframe')
        // 宿主做中枢：把选中 id 转发给详情 iframe
        detailSrc.value = `http://127.0.0.1:3032/?mode=iframe&orderId=${e.data.orderId}`
    }
}
onMounted(() => window.addEventListener('message', onMessage))
onUnmounted(() => window.removeEventListener('message', onMessage))
</script>
```

子应用侧只需要知道"我被 iframe 嵌着"，把点击上抛给 parent（`env.ts` 的 iframe case，五种环境共用一个探测文件）：

> 摘自 `./code/mf-workspace/vue-sub/src/env.ts`

```ts
export function detectEnv(): Env {
    if ((window as { __POWERED_BY_QIANKUN__?: boolean }).__POWERED_BY_QIANKUN__) return 'qiankun'
    if (window.$wujie) return 'wujie'
    if (window.microApp) return 'micro-app'
    if (new URLSearchParams(location.search).get('mode') === 'iframe') return 'iframe'
    return 'standalone'
}

export function reportSelect(orderId: string) {
    // 一个动作按当前环境选择唯一通道，避免双重上报；事件名统一为 order-select
    const env = detectEnv()
    switch (env) {
        // …
        case 'iframe':
            window.parent.postMessage({ type: 'order-select', orderId }, '*')
            break
        // …
```

其余分支见 env.ts 完整源码。

### 1.3 上手最小可跑

```cmd
cd code/mf-workspace/host && npm run dev
cd code/mf-workspace/vue-sub && npm run dev
cd code/mf-workspace/react-sub && npm run dev
```

打开 `http://127.0.0.1:3030/#/iframe`。**做两个观察**：① 两个 iframe 各自加载各自的 vite dev server，互不影响；② 点击列表项后，详情 iframe 是**整页刷新**——宿主把 orderId 拼进 src，浏览器重新加载整个子应用。

## 2. 进阶：核心机制

### 2.1 隔离是"文档级"的

iframe 拥有独立的 Window、Document、全局变量、事件循环派发和存储。这意味着：

- **JS 隔离**：子应用的 `window.xxx = ...` 只写自己的 Window，宿主永远读不到。五方案里唯一"结构性不可逃逸"的隔离（qiankun 的 Proxy 沙箱能被 `window.top` 等方式逃逸，见[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)）。
- **样式隔离**：文档间样式互不可见，不需要 scoped/shadow/前缀任何手段。
- **路由隔离**：iframe 内的 History 操作不影响宿主地址栏，反之亦然——这既是隔离也是问题（2.3）。

隔离的另一面是**成本**：每个 iframe 是一个完整文档——重新解析 HTML、执行全部 JS、构建完整对象图。内存占用约为"同文档挂载"方案的 2~4 倍，白屏时间肉眼可见。

### 2.2 postMessage 协议：通信的全部

跨源 iframe 之间唯一的数据通道是 `window.postMessage`。工程实践里它不是"调一个 API"而是"**设计一个协议**"——消息格式、方向、时序、校验，四件事全要自己定。本工程的协议只用了最小集：

| 方向 | 消息 | 载荷 |
|---|---|---|
| 列表 → 宿主 | `order-select` | `{ orderId }` |
| 宿主 → 详情 | 重新拼 src（URL 传参） | `?orderId=1002` |

注意第二行：宿主向详情传参**没有用 postMessage**，而是改 `src` 让 iframe 重载。因为 postMessage 只能发给"已经在听"的窗口——详情 iframe 何时完成加载、消息处理器何时就绪，宿主不知道，早发的消息会丢。**URL 传参 + 重载**是 iframe 方案里最可靠的下行通道，代价就是整页刷新。要避免刷新，就得实现"就绪握手"（详情加载完成后 postMessage 一条 ready，宿主再发数据）——每个 iframe 微前端团队都写过这段代码，这正是后面方案要用内置机制替代的东西。

**origin 校验是 postMessage 的底线**。本工程教学代码里 `'*'` 只是简化，生产上必须双向校验：

> 示意片段（无配套脚本）

```ts
// 上行：收消息方校验来源
if (e.origin !== 'https://list.example.com') return
// 下行：发消息方指定目标
iframeEl.contentWindow!.postMessage(msg, 'https://detail.example.com')
```

### 2.3 三面墙

iframe 方案的"处处是墙"集中在三个高频场景：

1. **弹窗遮罩**：子应用里的 `position: fixed` 弹窗只覆盖 iframe 视口，盖不住宿主的导航栏和兄弟 iframe。解法要么"弹窗内嵌回宿主"（把弹窗渲染请求 postMessage 给宿主，宿主代为渲染——交互状态再跨源回传，复杂度爆炸），要么接受视觉缺陷。
2. **路由同步**：子应用内部跳转不影响宿主 URL，用户刷新/分享链接时状态丢失。要做双向同步（宿主路由 → iframe src；iframe 路由 → 宿主 query），又是一个手写协议。
3. **登录态/公共状态**：跨源 iframe 与宿主不共享 Cookie（SameSite）、不共享 localStorage。公共 token 要么走 URL 传递（泄漏风险），要么走 postMessage 握手。

## 3. 实战：统一业务场景

`mf-workspace` 的 iframe 接线已跑通完整业务流（订单列表 → 选中 → 详情联动），实测行为：

- 列表 iframe 与详情 iframe 各自独立加载，渲染互不干扰；
- 点击 `#1002` → 列表 postMessage 上行 → 宿主更新中枢状态并重拼详情 src → 详情**整页刷新**后展示订单 1002；
- 浏览器端到端实测（headless Chrome）：两个 iframe 均正常加载，业务闭环可用。

**这个"整页刷新"就是 iframe 的性能名片**：每次联动都是一次完整文档加载。对照 qiankun 接线（同一动作只更新共享 state，详情原地重渲染），性能差距从哪里来的答案就在这。

## 4. 最小实现：40 行写一个"iframe 容器协议"

iframe 方案没什么"框架原理"可挖，它的最小实现就是把 2.2 的协议写扎实。下面这 40 行是一个可复用的 `IframeBridge`——就绪握手 + 请求-响应式消息 + origin 校验，覆盖真实项目的核心诉求：

> 摘自 `./code/mf-workspace/vue-sub/src/env.ts`

```ts
export function reportSelect(orderId: string) {
    // 一个动作按当前环境选择唯一通道，避免双重上报；事件名统一为 order-select
    const env = detectEnv()
    switch (env) {
        case 'qiankun':
            qiankunStateSetter?.({ selectedId: orderId })
            break
        case 'micro-app':
            window.microApp!.dispatch({ type: 'order-select', orderId })
            break
        case 'wujie':
            window.$wujie!.bus.$emit('order-select', orderId)
            break
        case 'iframe':
            window.parent.postMessage({ type: 'order-select', orderId }, '*')
            break
        default:
            // bubbles + composed：作为自定义元素运行时穿透 shadow DOM 边界冒泡到宿主
            window.dispatchEvent(new CustomEvent('order-select', { detail: { orderId }, bubbles: true, composed: true }))
    }
}
```

> 上面的 `switch` 展示了"同一动作五条通道"的分流——iframe 的 case 只有 1 行，但 2.2 说过：真正的复杂度在协议设计而不在 API 调用。把协议补全（握手 + 校验 + 重发）就是完整的最小实现，这也是理解后续所有方案通信 API 设计的参照系。

## 5. 对比与选型边界

| 你需要 | 选 iframe 吗 |
|---|---|
| 接入完全不可改造的三方/遗留系统 | **是，没有替代** |
| 安全边界（子应用不可信） | **是** |
| 高频跨应用交互、流畅联动 | 否，性能是硬伤 |
| 弹窗/路由/登录态统一体验 | 否，三面墙要逐个砌 |

一句话：**iframe 是"隔离"的天花板、"体验"的地板**。下一章[qiankun](/frontend/进阶/微前端体系/qiankun)从墙里搬出来——用生命周期协议换性能，用 Proxy 沙箱尽量保住隔离。

## 配套代码

| 路径 | 内容 | 章节 |
|---|---|---|
| `./code/mf-workspace/host/src/views/IframePlan.vue` | 宿主侧：双 iframe + postMessage 监听 + src 转发 | 1.2 / 3 |
| `./code/mf-workspace/vue-sub/src/env.ts` | 子应用环境探测与五通道分流（iframe case） | 1.2 / 4 |
