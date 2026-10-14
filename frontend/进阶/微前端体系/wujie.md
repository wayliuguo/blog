# wujie

> 腾讯开源的"无界"微前端，核心创意一句话：**JS 跑在真 iframe 里（隔离最强），UI 渲染进宿主的 shadow DOM（体验同文档）**——把 iframe 方案的隔离优势和微前端方案的同文档优势拼在一起。实战消费与 qiankun/micro-app 共用的 UMD 产物。

## 1. 入门：心智模型迁移

### 1.1 从"二选一"到"都要"

前面三章的隐含矛盾：**隔离强（iframe）就体验差，体验好（qiankun/micro-app）就隔离弱**。wujie 的解法是把两件事拆开：

| 关注点 | 承载者 | 效果 |
|---|---|---|
| JS 运行 | 隐藏 iframe | 独立 Window/Document，**结构性隔离**（同 iframe 方案） |
| UI 渲染 | 宿主 shadow DOM | 弹窗、层级、视觉与宿主同文档融合 |
| DOM 归属 | iframe 的 document | 子应用查询 `document` 拿到自己的 DOM，无感知 |

迁移心智：你已经会 iframe（隔离）和 shadow DOM（样式隔离）——wujie = 把 iframe 的 `body` 内容**搬到**宿主的 shadowRoot 里渲染，DOM 事件通过代理回 iframe。没有新概念，只有新组合。

### 1.2 30 分钟跑通

宿主用 `wujie-vue3` 的 `WujieVue` 组件（`mf-workspace` 已全局注册）：

> 摘自 `./code/mf-workspace/host/src/views/WujiePlan.vue`

```vue
<template>
    <PlanShell title="wujie（腾讯无界）" desc="iframe 保活 + 影子 DOM 渲染的组合拳：JS 天然隔离且可保活（第二次切换秒开），弹窗可以跨应用逃逸。通信走 wujie 内置 bus。注意观察切回 iframe 方案后再回来——wujie 默认保活，重新挂载不重新执行脚本。">
        <WujieVue
            width="100%"
            height="100%"
            name="vue-list"
            :url="listUrl"
            :props="{ orderId: selectedId }"
            @order-select="onListSelect"
            class="wujie-box"
        ></WujieVue>
        <WujieVue
            width="100%"
            height="100%"
            name="react-detail"
            :url="detailUrl"
            :props="{ orderId: selectedId }"
            class="wujie-box"
        ></WujieVue>
    </PlanShell>
</template>
```

### 1.3 上手最小可跑

```cmd
cd code/mf-workspace/vue-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/react-sub && npm run build:qk && npm run preview:qk
cd code/mf-workspace/host && npm run dev
```

打开 `http://127.0.0.1:3030/#/wujie`。**两个观察**：① 列表与详情渲染在宿主页面内（无 iframe 边框、无视觉割裂）——但它们其实运行在隐藏 iframe 里；② 切到其他路由再切回来，子应用**瞬间恢复**——`alive` 模式下 iframe 保活，不重新执行脚本。

## 2. 进阶：核心机制

### 2.1 iframe 运行时：隔离与弹窗的意外收获

子应用的 JS 在 wujie 创建的隐藏 iframe 里执行。这带来两个 qiankun/micro-app 拿不到的性质：

1. **隔离结构性成立**：子应用有自己的 Window/Document/全局变量，Proxy 代理的一切缺口（逃逸、内存泄漏、全局事件串台）在 iframe 里不存在。隔离强度矩阵见[沙箱与隔离机制](/frontend/进阶/微前端体系/沙箱与隔离机制)。
2. **弹窗天然逃逸**：iframe 方案最痛的"弹窗盖不住宿主"在 wujie 里消失了——因为子应用看到的 `document.body` 被 wujie 代理到宿主文档，`document.body.appendChild(modal)` 实际把 modal 挂到了宿主 body 上。**wujie 是五方案里唯一"弹窗开箱即用"的**。

### 2.2 两种模式：alive 保活与重建

- `alive`（默认）：切走路由不销毁 iframe，回来瞬间恢复（`window.$wujie` 实例保留）。适合高频切换的业务子系统。
- `destroy`：卸载即销毁 iframe，下次全新加载。适合内存敏感、低频访问的场景。

工程演示默认保活——你可以实测"切走再切回"的耗时对比 qiankun 的完整重建。

### 2.3 通信：props 下行 + bus 上行

wujie 内置一套双向通道，比 postMessage 舒服得多：

| 方向 | API | 工程落点 |
|---|---|---|
| 宿主 → 子应用 | `<WujieVue :props="...">` | 子应用 `window.$wujie.props` |
| 子应用 → 宿主 | `window.$wujie.bus.$emit(evt, ...args)` | 宿主 `@evt` |
| 双向 | `window.$wujie.bus`（事件总线） | 列表联动 |

工程里点击联动走的 bus：

> 摘自 `./code/mf-workspace/vue-sub/src/env.ts`

```ts
export function reportSelect(orderId: string) {
    // 一个动作按当前环境选择唯一通道，避免双重上报；事件名统一为 order-select
    const env = detectEnv()
    switch (env) {
        // …
        case 'wujie':
            window.$wujie!.bus.$emit('order-select', orderId)
            break
        // …
```

其余分支见 env.ts 完整源码（micro-app 走 dispatch、iframe 走 postMessage、WC 走 CustomEvent）。

宿主侧 `@order-select` 监听 bus 事件（WujieVue 组件自动转发），收到后更新中枢状态。

### 2.4 预加载与共享依赖

wujie 支持 `preloadApp` 提前创建 iframe（消除首开白屏）；`degrade` 属性可在不支持的环境降级为真 iframe 渲染。依赖共享没有 qiankun 的 import-html-entry 去重能力（iframe 各自解析，React/Vue 会各加载一份）——**体积换隔离是 wujie 的定价**，详见[资源加载与依赖共享](/frontend/进阶/微前端体系/资源加载与依赖共享)。

## 3. 实战：统一业务场景

`mf-workspace` 的 wujie 接线端到端实测（headless Chrome）：

- 两个 WujieVue 宿主的 shadow DOM 内渲染出完整列表与详情（断言 `shadowRoot.querySelector('.sub-app')` 命中）；
- 点击列表 `#1002` → `bus.$emit('order-select')` → 宿主 `@order-select` → 中枢状态变 `1002`；
- 子应用消费 UMD 产物（3033/3034）——**wujie 对 classic script 支持完美**，Vite dev 的 ESM 接法在部分场景也可行，但产物是三者（qiankun/micro-app/wujie）最稳的共同形态。

**同一对产物，三种消费**：qiankun 取 lifecycle、micro-app 自挂载、wujie 整页装载——产物层完全一致，接入层自由切换。这是统一工程想传递的架构观：**把"产物形态"和"接入协议"解耦**，选型成本从"迁移工程"降为"换标签"。

## 4. 最小实现：iframe 运行 + 影子渲染的桥梁

wujie 的核心是"JS 在 iframe，DOM 显示在宿主"的桥梁。最小实现（简化到 30 行，省略事件代理与样式收集）：

> 示意片段（无配套脚本）

```ts
function miniWujie(name: string, url: string, host: HTMLElement) {
    // 1. 隐藏 iframe 承载 JS 运行时
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    // 2. iframe 加载完成后，把它的 body 内容搬进宿主 shadow DOM
    iframe.addEventListener('load', () => {
        const doc = iframe.contentDocument!
        const shadow = host.attachShadow({ mode: 'open' })
        // 样式随 DOM 一起搬（真实实现要克隆 <style> 并处理弹窗代理）
        doc.querySelectorAll('style').forEach(s => shadow.appendChild(s.cloneNode(true)))
        shadow.appendChild(doc.querySelector('#root')!.cloneNode(true))
        // 3. 代理子应用的 document 输出——子应用后续 append 的弹窗落到宿主
        // （真实实现：重写 doc.body.appendChild 等 API，见原理篇）
    })
    return { destroy() { iframe.remove(); host.innerHTML = '' } }
}
```

**搬运 DOM + 代理 document，两件事构成 wujie 的全部魔法**。事件如何从 shadow DOM 流回 iframe、弹窗如何代理到宿主 body，展开在[手写 mini 微前端框架](/frontend/进阶/微前端体系/手写%20mini%20微前端框架)。

## 5. 对比与选型边界

| 你需要 | wujie 适配度 |
|---|---|
| 强 JS 隔离 + 好体验 | **唯一同时满足**的方案 |
| 弹窗开箱即用 | 唯一（body 代理） |
| 高频切换的保活性能 | 优（alive 模式） |
| 依赖共享/产物体积 | 差——各 iframe 独立加载依赖 |
| 深度调试 | 中——双层结构（iframe + shadow）排查成本高于单文档 |

下一章[Web Components 方案](/frontend/进阶/微前端体系/Web%20Components%20方案)走另一极端：不要任何运行时，让标准本身当框架。

## 配套代码

| 路径 | 内容 | 章节 |
|---|---|---|
| `./code/mf-workspace/host/src/views/WujiePlan.vue` | WujieVue 声明式接入 + props/bus 通信 | 1.2 / 2.3 / 3 |
| `./code/mf-workspace/vue-sub/src/env.ts` | 子应用 bus.$emit 上行 | 2.3 / 3 |
| `./code/mf-workspace/react-sub/src/App.tsx` | 详情端 bus 订阅 + props 下行适配 | 2.3 |
| `./code/mf-workspace/vue-sub/src/main-qk.ts` | UMD 产物入口（wujie 自挂载分支） | 2.1 / 3 |
