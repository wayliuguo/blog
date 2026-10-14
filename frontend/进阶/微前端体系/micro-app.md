# micro-app

> 京东开源的微前端框架，卖点是**接入成本最低**：宿主写一个 `<micro-app>` 标签，子应用几乎零改造（不用导出生命周期）。它是 Web Components 思路的工业化实现——本章实战消费与 qiankun 共用的 UMD 产物，突出"同一份产物，两种消费姿势"。

## 1. 入门：心智模型迁移

### 1.1 从"挂应用"到"用组件"

qiankun 的接入是"子应用配合协议"；micro-app 的接入是"**宿主像写普通组件一样写标签**"：

> 示意片段（无配套脚本）

```html
<!-- 这就是接入微前端的全部宿主代码 -->
<micro-app name="vue-list" url="http://127.0.0.1:3033/"></micro-app>
```

`<micro-app>` 是一个真正的自定义元素（Web Components），micro-app 在元素内部完成：fetch 子应用 html → 解析脚本与样式 → 执行 JS → 把渲染结果放进元素内。**子应用全程不知道自己被谁加载**——它就是普通页面，自挂载、自运行。

对照你已会的心智：qiankun 子应用是"带 mount/unmount 的组件"；micro-app 子应用是"自渲染的页面"。**协议消失 = 改造消失**，这是它对 qiankun 的核心替代逻辑。

### 1.2 30 分钟跑通

宿主侧唯一的初始化是全局 `start()`（`mf-workspace` 的 host/main.ts）：

> 摘自 `./code/mf-workspace/host/src/App.vue`

```vue
<script setup lang="ts">
// micro-app 全局注册：只需一次 start()，之后 <micro-app> 标签即可用
import microApp from '@micro-zoe/micro-app'

microApp.start({
    tagName: 'micro-app',
    // 实操演示关掉预渲染，让"每次切换重新加载"的行为可观察
    prefetchLevel: 0,
})
</script>
```

MicroAppPlan 视图的完整接线（data 下行 + 事件上行）：

> 摘自 `./code/mf-workspace/host/src/views/MicroAppPlan.vue`

```vue
<template>
    <PlanShell title="micro-app（京东）" desc="像写普通组件一样接微前端：一个 <micro-app> 标签 + data 属性下行 + dispatch 事件上行。子应用不需要导出生命周期。子应用消费 UMD 产物（与 qiankun 共用）。">
        <micro-app
            name="vue-list"
            :url="listUrl"
            :data="{ orderId: selectedId }"
            @datachange="onListData"
            class="micro"
        ></micro-app>
        <micro-app
            name="react-detail"
            :url="detailUrl"
            :data="{ orderId: selectedId }"
            class="micro"
        ></micro-app>
    </PlanShell>
</template>
```

### 1.3 上手最小可跑

```cmd
cd code/mf-workspace/vue-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/react-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/host && npm run dev
```

打开 `http://127.0.0.1:3030/#/micro-app`。两个 `<micro-app>` 元素各自渲染出列表与详情——**宿主代码里没有任何"加载/挂载"逻辑**，声明式标签即接入。

## 2. 进阶：核心机制

### 2.1 自定义元素壳 + HTML 解析

micro-app 的架构一句话：**用 custom element 当容器，内部做"迷你版 import-html-entry"**。`connectedCallback`（元素插入 DOM）触发加载流程：

1. fetch 子应用 entry html；
2. 解析出 script/link，CSS 处理成 scoped（2.2），JS 用 `new Function` 在沙箱里执行（2.3）；
3. 子应用脚本自挂载到元素内部——**这就是"零生命周期协议"能成立的原因**：子应用按普通页面写（`mount('#root')`），DOM 归宿由 micro-app 的容器机制接管。

这也解释了与 qiankun 的一个关键差异：qiankun 要控制 mount/unmount 时序（所以需要协议），micro-app 把时序交给元素生命周期（connectedCallback/disconnectedCallback 天然对应挂载卸载）。

### 2.2 样式隔离：scopecss

micro-app 默认开启 `scopecss`：解析子应用 CSS 文本，给每条规则加前缀（`micro-app[name=vue-list] .sub-app`），效果类似 Vue scoped 但发生在运行时。比 qiankun 的 experimentalStyleIsolation 边界更少（对弹窗同样生效，因为前缀挂的是 micro-app 元素本身）。`<micro-app disable-scopecss>` 可关闭。

### 2.3 JS 沙箱：with + Proxy

与 qiankun 的 Proxy 沙箱同类：`with(proxyWindow)` 包裹执行，写入先落子应用自己的 fake window。隔离强度同 qiankun——防无意污染，不防有意逃逸。对比表见[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)。

### 2.4 数据通信：data 属性 + dispatch

micro-app 的通信是"组件式"的，和 React props/回调几乎同构：

| 方向 | API | 语义 |
|---|---|---|
| 宿主 → 子应用 | `<micro-app :data="obj">` | props 下行，子应用 `window.microApp.getData()` |
| 子应用 → 宿主 | `window.microApp.dispatch(data)` | 事件上行，宿主 `@datachange` |
| 宿主 → 子应用（推送） | `element.setData(obj)` | 子应用 `addDataListener` 收到 |
| 子应用 → 宿主（推送） | 同 dispatch | 宿主 `@datachange` |

工程里列表 → 宿主的 1002 联动就是 dispatch 上行：

> 摘自 `./code/mf-workspace/vue-sub/src/env.ts`

```ts
export function reportSelect(orderId: string) {
    // 一个动作按当前环境选择唯一通道，避免双重上报；事件名统一为 order-select
    const env = detectEnv()
    switch (env) {
        // …
        case 'micro-app':
            window.microApp!.dispatch({ type: 'order-select', orderId })
            break
        // …
```

其余分支见 env.ts 完整源码（qiankun 走注入 setter、wujie 走 bus、WC 走 CustomEvent）。

接收端详情订阅 data 下行：

> 摘自 `./code/mf-workspace/react-sub/src/App.tsx`

```ts
        const onMicroData = (data: Record<string, unknown>) => {
            if (typeof data.orderId === 'string') applyId(data.orderId)
        }

        window.addEventListener('message', onMessage)
        window.addEventListener('order-select', onCustom)
        window.$wujie?.bus.$on('order-select', onWujie)
        window.microApp?.addDataListener(onMicroData)
```

### 2.5 实测踩到的真坑：Vite dev 的 ESM 脚本

micro-app 对 Vite **dev server** 的 ESM module script 支持有路径拼接 bug（实测浏览器报 `Failed to resolve module specifier 'undefined../src/main.ts'`——它对 `type=module` 脚本做运行时转换时 base 取值失败）。**结论与 qiankun 的 preamble 坑殊途同归：走 UMD 产物**。classic script 是 micro-app/qiankun/wujie 三家最稳的共同消费形态——这就是 `mf-workspace` 把三个"远程加载"方案统一到 `build:qk` 产物上的原因。

## 3. 实战：统一业务场景

`mf-workspace` 的 micro-app 接线端到端实测（headless Chrome）：

- 两个 `<micro-app>` 元素渲染出完整列表与详情（与 qiankun 共用同一对 UMD 产物，端口 3033/3034）；
- 点击列表 `#1002` → `window.microApp.dispatch({type:'order-select', orderId})` 上行 → 宿主 `@datachange` 收到 → 中枢状态变 `1002`；
- **全程宿主无"加载代码"**：对比 QiankunPlan.vue 的 loadMicroApp 调用，MicroAppPlan.vue 只有模板声明。

**同产物双姿势**是本章的教学重点：同一份 `vue-list-qk.js`，qiankun 消费它导出的 lifecycle（协议模式），micro-app 无视 lifecycle 自行执行脚本并等应用自挂载（页面模式）。产物不变、消费方式决定接入模式——理解了这一点，"选型"就从"选框架"变成了"选接入姿势"。

## 4. 最小实现：50 行的自定义元素壳

micro-app 的原理原型就是一个自定义元素 + fetch + 注入。把 2.1 的流程写到最小：

> 示意片段（无配套脚本）

```ts
class MiniMicroApp extends HTMLElement {
    connectedCallback() {
        const url = this.getAttribute('url')!
        fetch(url)
            .then(r => r.text())
            .then(html => {
                // 1. 提取脚本与样式（真实实现要处理 link/style/内联 script 全形态）
                const src = html.match(/<script src="([^"]+)"/)?.[1]
                const css = html.match(/<link rel="stylesheet" href="([^"]+)"/)?.[1]
                // 2. 样式 scoped 后注入元素内（简化：直接注入）
                if (css) fetch(new URL(css, url)).then(r => r.text())
                    .then(t => { const s = document.createElement('style'); s.textContent = t; this.appendChild(s) })
                // 3. 脚本在沙箱里执行（真实实现：with(proxy) 包裹，这里简化为全局执行）
                return fetch(new URL(src, url)).then(r => r.text()).then(code => new Function(code)())
            })
    }
    disconnectedCallback() { /* 真实实现：卸载子应用 DOM 与沙箱 */ }
}
customElements.define('mini-micro-app', MiniMicroApp)
```

**fetch → 解析 → 注入 → 执行，四步就是 micro-app 的全部主干**。样式 scoped 与 JS 沙箱两个"复杂度放大器"在[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)里单独展开。

## 5. 对比与选型边界

| 你需要 | micro-app 适配度 |
|---|---|
| 子应用零改造、宿主声明式接入 | **最优**，标签即接入 |
| 样式隔离开箱可用 | scopecss 默认开启，优于 qiankun |
| JS 强隔离 | 弱（同 qiankun 的 Proxy 沙箱） |
| 生态与中文资料 | 较好（京东维护，文档全中文） |
| Vite dev 直连接子应用 | 差——实测路径拼接 bug，走产物 |

下一章[wujie](/frontend/进阶/微前端体系/wujie)：用"真 iframe 运行 JS"换最强隔离，同时保住同文档渲染体验。

## 配套代码

| 路径 | 内容 | 章节 |
|---|---|---|
| `./code/mf-workspace/host/src/App.vue` | microApp.start() 全局注册 | 1.2 |
| `./code/mf-workspace/host/src/views/MicroAppPlan.vue` | 标签声明式接入 + data/@datachange | 1.2 / 2.4 / 3 |
| `./code/mf-workspace/vue-sub/src/env.ts` | 子应用 dispatch 上行 | 2.4 |
| `./code/mf-workspace/react-sub/src/App.tsx` | 详情端 addDataListener 订阅 | 2.4 |
| `./code/mf-workspace/vue-sub/src/main-qk.ts` | UMD 产物入口（micro-app 自挂载分支） | 2.1 / 3 |
