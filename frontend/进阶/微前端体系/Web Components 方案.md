# Web Components 方案

> 不引框架，用平台标准本身当微前端骨架：子应用构建成**真正的自定义元素**，宿主认识的是 `<order-list-element>` 这样的 HTML 标签。零运行时、无协议、无沙箱——最轻也最裸的路线。micro-app 就是这条路线的工业化，本章手写它的原理原型。

## 1. 入门：心智模型迁移

### 1.1 从"接框架"到"造标签"

前面四个方案无论怎么包装，接入动作都是"装 SDK/写协议"；Web Components 方案的接入动作是**"子应用把自己编译成一个标准 HTML 元素"**。宿主视角：

> 示意片段（无配套脚本）

```html
<!-- 宿主对子应用的技术栈一无所知，只认识标准标签 -->
<order-list-element selected-id="1002"></order-list-element>
<order-detail-element order-id="1002"></order-detail-element>
```

迁移心智：Vue 的 `defineCustomElement` 你可能见过（SFC 一行变自定义元素）；React 没有官方等价物，需要手写 wrapper（本章 4.2 完整给出）。**元素 = 组件的跨框架编译产物**——attribute 是 props，CustomEvent 是 emit，shadow DOM 是 style scoped 的终极形态。

### 1.2 30 分钟跑通

Vue 子应用侧的 WC 出口（`mf-workspace` 的 vue-sub）：

> 摘自 `./code/mf-workspace/vue-sub/src/wc-entry.ts`

```ts
// wc-entry.ts：Web Components 出口。
// defineCustomElement 把 SFC 组件编译成真正的自定义元素：样式注入 shadowRoot、
// props 映射为 attribute。宿主不 import 任何东西，只认识 <order-list-element> 标签。
//
// 关键坑：lib 构建默认把 <style> 抽成独立 css 文件，shadow DOM 里没有样式。
// 必须用 ?inline 把样式变成字符串，通过组件的 styles 选项让 vue 注入 shadowRoot。
import { defineCustomElement } from 'vue'
import OrderList from './App.vue'
import appStyle from './app.css?inline'

export const OrderListElement = defineCustomElement({
    extends: OrderList,
    props: { selectedId: String }, // 宿主 attribute 下行的入口
    styles: [appStyle],
})

customElements.define('order-list-element', OrderListElement)
```

构建成 iife 单文件（`vite.wc.config.ts` 的 lib 模式），宿主动态插 `<script>` 加载后直接写标签：

> 摘自 `./code/mf-workspace/host/src/views/WcPlan.vue`

```ts
const LIST_JS = 'http://127.0.0.1:3141/order-list-element.js'
const DETAIL_JS = 'http://127.0.0.1:3142/order-detail-element.js'

function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`加载失败：${src}`))
        document.head.appendChild(s)
    })
}

onMounted(async () => {
    try {
        // 产物由各子应用 npm run build:wc 生成，vite preview 静态服务
        await Promise.all([loadScript(LIST_JS), loadScript(DETAIL_JS)])
        loaded.value = true
    } catch (e) {
        alert((e as Error).message + '（先在两个子应用目录执行 npm run build:wc 并启动 npm run preview:wc）')
    }
})
```

### 1.3 上手最小可跑

```cmd
cd code/mf-workspace/vue-sub && npm run build:wc && npm run preview:wc
cd code/mf-workspace/react-sub && npm run build:wc && npm run preview:wc
cd code/mf-workspace/host && npm run dev
```

打开 `http://127.0.0.1:3030/#/web-components`。**观察点**：两个"组件"其实就是两个普通 HTML 标签；打开 DevTools 看元素内部——`#shadow-root (open)`，子应用的 DOM 与样式全部封在 shadow 里。

## 2. 进阶：核心机制

### 2.1 三件套在微前端语境下的含义

| 标准 | 微前端角色 |
|---|---|
| customElements.define | **接入协议**：注册即接入，无需任何框架约定 |
| shadow DOM | **样式与 DOM 隔离**：子应用样式封在元素内，天然不串（不需要 scopecss/strictStyleIsolation） |
| attribute/property | **props 通道**：字符串 attribute 下行，元素内部解析 |
| CustomEvent | **事件通道**：`bubbles + composed` 穿透 shadow 边界冒泡到宿主 |

注意 shadow DOM 的隔离边界：**它只隔离样式与 DOM 结构，不隔离 JS**——所有元素共享同一个 window、同一份全局变量、同一份依赖实例。这使 WC 方案的 JS 隔离强度为五方案最低（为零），隔离矩阵见[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)。

### 2.2 attribute 下行与事件上行的约定

宿主模板里的 `:selected-id="selectedId"` 会变成 attribute 写入，触发元素的 `attributeChangedCallback`——前提是元素用 `observedAttributes` 声明过（React 手写 wrapper 要自己写，Vue 的 defineCustomElement 从 props 自动生成）。事件方向，子应用 dispatch 的 CustomEvent 必须带 `composed: true` 才能穿透 shadow 边界：

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

宿主直接 `@order-select` 监听——和监听原生 input 事件没有区别。**通信协议就是 HTML 标准本身**，没有 initGlobalState、没有 bus、没有 dispatch。

### 2.3 体积与版本的账

WC 方案的宿主**零运行时**（没有 qiankun 的 40KB、micro-app 的 70KB）。代价转嫁给子应用：每个元素的产物都是自包含的（React 子应用产物 ~465KB，含 React 运行时）。多个 WC 子应用共用 React 时会重复加载——共享要靠自己的外部化（`externals` + 宿主提供全局 React）。依赖共享的系统对比见[资源加载与依赖共享](/frontend/进阶/微前端体系/资源加载与依赖共享)。

### 2.4 无沙箱是特性也是债务

同文档执行 = 子应用直接操作全局 window：全局变量冲突、单例库双实例、样式外漏（挂在 body 的弹窗）全部要靠约定。**WC 方案适合的是"自家可控的多个团队"**——牺牲隔离换长期标准化的演进路线，常见于平台级底座的终态（micro-app 本质就是给它补上了沙箱与 scopecss）。

## 3. 实战：统一业务场景

`mf-workspace` 的 WC 接线端到端实测（headless Chrome）：

- 两个自定义元素注册成功（`customElements.get` 命中）、shadow DOM 内渲染出完整列表与详情；
- 点击列表 `#1002`（shadow 内的 li）→ CustomEvent（bubbles+composed）穿透 shadow → 宿主 `@order-select` → 中枢状态变 `1002`；
- 宿主视图里没有一行框架加载代码——只有两个标签。

对比其他四案的宿主代码量：iframe 是 2 个 iframe + 1 个 message 监听；qiankun 是 loadMicroApp ×2 + state 初始化；micro-app/wujie 是标签 + 通信；**WC 是标签 + 通信，且标签即标准**。

## 4. 最小实现

### 4.1 原理侧：元素壳 50 行

micro-app 的原理原型（fetch html + 注入）已在[上一章](/frontend/进阶/微前端体系/micro-app)给出。本章的独特最小实现是另一个问题——**React 子应用怎么变成自定义元素**（React 没有官方 defineCustomElement）。

### 4.2 React 侧手写 wrapper（30 行）

`mf-workspace` 的 react-sub 真实实现：

> 摘自 `./code/mf-workspace/react-sub/src/wc-entry.tsx`

```tsx
// 手写 React 自定义元素 wrapper：React 官方没有 defineCustomElement，
// 这 30 行就是 Web Components 方案章"React 侧最小实现"的全部。
import { StrictMode, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
// ?inline：lib 构建默认抽独立 css，shadow DOM 里必须用字符串注入
import appStyle from './app.css?inline'

class OrderDetailElement extends HTMLElement {
    static get observedAttributes() { return ['order-id'] }
    private root: Root | null = null

    connectedCallback() {
        this.mount()
    }
    disconnectedCallback() {
        this.root?.unmount()
        this.root = null
    }
    attributeChangedCallback() {
        // attribute 下行是 WC 方案唯一的 props 通道
        this.mount()
    }
    private mount() {
        const orderId = this.getAttribute('order-id') ?? '1001'
        if (!this.root) {
            // attachShadow：样式与 DOM 彻底封在元素内部——这就是 shadow DOM 隔离
            const shadow = this.attachShadow({ mode: 'open' })
            const style = document.createElement('style')
            style.textContent = appStyle
            shadow.appendChild(style)
            const host = document.createElement('div')
            shadow.appendChild(host)
            this.root = createRoot(host)
        }
        this.root.render(createElement(StrictMode, null, createElement(App, { initialOrderId: orderId })))
    }
}

customElements.define('order-detail-element', OrderDetailElement)
```

**生命周期三件套对照**：`connectedCallback` ↔ qiankun 的 mount、`disconnectedCallback` ↔ unmount、`attributeChangedCallback` ↔ props 更新——**浏览器元素生命周期就是微前端生命周期协议的原型**，qiankun/micro-app 都是在模仿它。

### 4.3 一个真实的构建坑

Vue 子应用 WC 构建时，`<style>` 会被 lib 构建抽成独立 css 文件——shadow DOM 里没有样式（元素全裸）。修法是 `?inline` 把样式变成字符串、经组件 `styles` 选项注入 shadowRoot（1.2 的 `wc-entry.ts` 与 4.2 的 `appStyle` 都做了这一步）。这个坑在真实工程的出现率极高，因为 lib 构建的默认行为与 shadow 隔离的直觉相反。

## 5. 对比与选型边界

| 你需要 | WC 方案适配度 |
|---|---|
| 宿主零运行时、长期标准化 | **唯一路线** |
| 跨团队/跨公司交付"组件" | 优（标准即契约） |
| JS 隔离 | **无**——同文档共享 window |
| 多个子应用共享依赖 | 要自己做外部化 |
| 弹窗/路由 | 在宿主文档内无墙，但样式要自己处理逃逸 |

五方案收官。回到[方案全景与选型](/frontend/进阶/微前端体系/微前端方案全景与选型)的对比表，每一列现在都对应了一次真实接线。

## 配套代码

| 路径 | 内容 | 章节 |
|---|---|---|
| `./code/mf-workspace/vue-sub/src/wc-entry.ts` | Vue defineCustomElement 出口（样式 ?inline 坑） | 1.2 / 4.3 |
| `./code/mf-workspace/react-sub/src/wc-entry.tsx` | React 手写自定义元素 wrapper | 4.2 |
| `./code/mf-workspace/host/src/views/WcPlan.vue` | 宿主动态加载产物 + 标签声明 | 1.2 / 3 |
| `./code/mf-workspace/vue-sub/src/env.ts` | CustomEvent 上行（bubbles+composed） | 2.2 / 3 |
| `./code/mf-workspace/vue-sub/vite.wc.config.ts` | WC 产物构建（lib iife 固定文件名） | 1.2 |
