# 同构渲染与 Hydration

> 级别：高级

按本书四层推进：

- **入门使用**：见 `01-SSR入门与原理`——从 CSR/SSR 差异理解什么是 SSR、为什么需要它，以及完整工作流；
- **进阶**：本页——同构代码原则、"水合（Hydration）"的完整过程、水合不匹配（mismatch）、流式渲染与渐进式水合；
- **实战**：见 `03-Next.js实战`、`04-Nuxt.js实战`——Server Component 与 useAsyncData 就是把"同构 + 水合"落到真实框架；
- **最小实现掌握原理**：到 `code/frontend/13-ssr` 运行 `hydration-demo.html`，页面初始已有服务端直出的静态标签、JS 随后为按钮补事件与状态，看清水合"认领存量 DOM"的最小形态。

SSR 的核心难点不在于"服务端能渲染"，而在于"同一套代码两端都要能跑，并且渲染结果一致"。这就是**同构（Isomorphic / Universal）**渲染。"水合（Hydration）"是连接服务端 HTML 与客户端交互的关键一步。本文深入同构代码原则、从服务端渲染到水合的完整过程、水合不匹配（hydration mismatch）问题的成因与解决，以及流式渲染与渐进式水合，最后给出 React 与 Vue 的对比。

## 一、同构渲染的基本原则

### 1. 什么是同构

同构渲染（Universal Rendering / SSR）指**一套业务组件代码**，既能跑在 Node 服务端生成 HTML，也能跑在浏览器端接管交互。

```
同一份组件源码
   ├── 服务器环境：renderToString → HTML 字符串
   └── 浏览器环境：createRoot().hydrateRoot → 接管事件
```

### 2. 同构代码的基本原则

要让代码"一套两端跑"，必须遵守若干约束：

| 原则 | 说明 | 错误示例 |
|------|------|---------|
| 不直接访问浏览器 API | 渲染期禁直接 `window` / `document` | `setup` 里读 `window.location` |
| 环境区分 | 用运行时能力判断，而非打包时硬编码 | 直接 `typeof window` 判断 |
| 渲染确定性 | 相同输入必须产出相同 HTML | 渲染期读取随机数 / Date.now |
| 生命周期分离 | 浏览器专属逻辑放挂载后钩子 | 在 `setup` 中开监听 |
| 单例数据不共享 | 每请求独立 app 实例与 store | 模块顶层存全局可变 state |
| 引用的值序列化 | 传给组件的数据必须是可序列化的 | 把函数 / Date 塞进 props |

### 3. 环境判断的正确姿势

```js
// ✅ 推荐：用特性探测，而非硬编码环境变量
export const isClient = typeof window !== 'undefined'
export const isServer = typeof window === 'undefined'

// 业务代码示例
export function useIsClient() {
  return typeof window !== 'undefined'
}
```

副作用（副作用如事件绑定）必须放进挂载后钩子，渲染时绝不能执行：

```js
// ✅ Vue 3 中浏览器专属操作放 onMounted，SSR 部署时可安全跳过
import { onMounted } from 'vue'
export default {
  setup() {
    onMounted(() => {
      window.addEventListener('scroll', handler)
    })
  },
}
```

## 二、从服务端渲染到 Hydration

### 1. 什么是 Hydration（水合）

服务端把 HTML 输出给浏览器后，浏览器显示了静态内容但**没有任何交互能力**。"水合"就是把**事件监听器、组件状态、虚拟 DOM** 绑定到已有 HTML DOM 上，使其"活"起来。

白话类比：服务端输出的是"干瘪的骨架/蜡像"，水合就是"赋予它生命"。

```
服务端：renderToString(App)  →  <div id="root">...静态 HTML...</div>

客户端：
  createRoot(container).hydrateRoot(
    container, React.createElement(App)
  )
  // 不重建 DOM，而是"认领"现有 DOM 并绑定事件与状态
```

### 2. 服务端输出模板（通用形态）

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Hydration 示例</title>
  </head>
  <body>
    <div id="root">   <!-- 服务端已渲染好的静态内容 -->
      <div class="user-card">
        <h1>张三</h1>
        <button>关注</button>
      </div>
    </div>
    <!-- 数据注入点 -->
    <script>
      window.__INITIAL_STATE__ = { user: { name: '张三' } }
    </script>
    <script src="/assets/client.js"></script>
  </body>
</html>
```

### 3. 水合的目标与挑战

- **目标**：不重建已存在的 DOM，而是在其上挂载事件与虚拟 DOM，减少首屏开销。
- **挑战**：如果服务端与客户端渲染的 HTML 不一致，水合会抛错或产生难以排查的 DOM 异常。这就是 **水量不匹配（Hydration Mismatch）**。

## 三、水合不匹配问题与解决

### 1. 什么是水合不匹配

服务端渲染出的 HTML 与客户端首次渲染出的 HTML 不一致，React 会在开发环境直接报错并重渲染，Vue/Nuxt 也会给出 warning，甚至导致事件绑定错乱、样式闪烁。

### 2. 常见成因

| 成因 | 示例 |
|------|------|
| 渲染期读取浏览器 API | `new Date()` / `screen.width` |
| 渲染期读取随机值 | `Math.random()`、不稳定的本地存储 |
| 运行时插件如前端框架注入不同 | 浏览器扩展更改 DOM |
| 国际化（locale）两端不一致 | 客户端默认语言与服务端不同 |
| CSS-in-JS / 样式顺序不一致 | 服务端与客户端样式生成顺序不同 |
| 浏览器自动改写属性 | 输入框自动补全、`<option>` 选中态 |

最典型的例子——**时间显示**：

```jsx
// ❌ 服务端得到"服务器此时时间 14:00"，客户端水合时变成"浏览器 15:00"
// 两个时间字符串不同 → hydration mismatch
export default function Post({ date }) {
  return <time>{format(new Date())}</time>
}
```

### 3. 解决方案

**方案 A：保证渲染确定性**——把不确定值推迟到客户端渲染。

```jsx
// ✅ React 推荐的"挂载后再渲染"模式
import { useEffect, useState } from 'react'
export default function Now() {
  const [now, setNow] = useState(null)
  useEffect(() => setNow(new Date()), [])
  // 首帧渲染 null，与服务端 null 一致；挂载后再更新时间
  return <time>{now ? format(now) : '计算中...'}</time>
}
```

```vue
<!-- ✅ Vue 3 中让客户端专属 UI 在挂载后再渲染 -->
<template>
  <p v-if="mounted">服务器时间: 当前时间</p>
</template>
<script setup>
import { ref, onMounted } from 'vue'
const mounted = ref(false)
onMounted(() => (mounted.value = true))
</script>
```

**方案 B：抑制服务端渲染该部分**（尽力而为，但会失去该部分 SSR 收益）。

```jsx
// React 中让某子树完全跳过 SSR
// <ClientOnly> 方案 / suppressHydrationWarning
<div suppressHydrationWarning>{unstable_content}</div>
```

```vue
<!-- Vue 生态：vue3 常用 <ClientOnly> 组件，或 Nuxt 内建 <ClientOnly> -->
<ClientOnly>
  <!-- 只在浏览器渲染的组件 -->
</ClientOnly>
```

**方案 C：正确性排错**——把时间、随机值、浏览器能力检测全部隔离到纯客户端模块。

> React 的 `suppressHydrationWarning` 和 Vue/Nuxt 的 `<ClientOnly>` 只是"关闭提示"，并非修复根因。真正做法是让两端输出确定一致或把差异部分延后渲染。

## 四、流式渲染（Streaming SSR）与渐进式水合

### 1. 传统 SSR 的问题：整包返回

传统 SSR 会等**整棵组件树**渲染完并拿到所有数据，再把**完整 HTML 一次性**发给浏览器。如果某个首屏后组件很慢、数据依赖多层网络请求，TTFB 会被拖得很长。

```
传统 SSR：等待全部 → 一次性发送  → TTFB 很长
流式 SSR：外壳先发 → 内容边渲边发 → TTFB 大幅缩短
```

### 2. 什么是 Streaming SSR

服务器在 HTML 外壳（`<html>`/`<head>`/骨架）就绪后**立刻**把首块发给浏览器，边渲染边把后续 `<div>` 等通过流式传输推给浏览器，浏览器可以**并行下载静态资源**。

- **优势**：TTFB 显著降低，首屏更快；慢数据源不再阻塞首块。
- **React 支持**：`renderToPipeableStream`（Node）与 `renderToReadableStream`（Web Stream）。

```jsx
// React 18 流式 SSR：外壳先发，Suspense 边界流式补充
import { renderToPipeableStream } from 'react-dom/server'

res.socket.on('error', () => res.end()) // 客户端断开时终止
const stream = renderToPipeableStream(<App />, {
  onShellReady() {
    res.setHeader('Content-Type', 'text/html')
    stream.pipe(res)              // 头块就绪即可发包
  },
  onShellError() {
    res.statusCode = 500
  },
  onAllReady() { /* 全部就绪回调 */ },
})
```

### 3. 渐进式水合（Progressive Hydration）

与流式渲染配合，浏览器**不必等整棵组件树**都能交互，而是**按块（chunk）逐步水合**：

- 数据一到，某块就绪就立刻水合它。
- 用户滚到某区域才水合该区域（按需水合）。
- 非关键交互组件降低优先级，先让主屏可交互。

```
进度： 外壳(shell) 就绪 → 流式补充正文 → 各块依次水合 → 全站可交互
      TTFB ↓            FCP ↓            FID/TBT 被稀释
```

社区实践如 **Qwik**、**Astro（Partial Hydration / Islands）**、React 的 `lazy` + Suspense 都朝着"**按需、逐步水合**"优化。

## 五、React 的 hydrateRoot 与 Vue 的 renderToString

### 1. React 侧

前文已见 `renderToPipeableStream`，客户端水合用 `hydrateRoot`（React 18，替代旧的 `ReactDOM.hydrate`）：

```jsx
// 客户端入口：hydrateRoot 水合既有 HTML，不重建 DOM
import { hydrateRoot } from 'react-dom/client'
import App from './App'

const container = document.getElementById('root')
hydrateRoot(container, <App />)
```

关键点：

- 不再用 `createRoot`（那是 CSR 用），水合用 `hydrateRoot`。
- React 18 彻底支持 **Suspense + 流式 SSR**。
- `renderToPipeableStream` 需要 Node 流；`renderToReadableStream` 用于支持 Web Stream 的运行时（如部分边缘函数）。

### 2. Vue 3 侧

```js
// server.js：Vue 3 服务端渲染
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

const app = createSSRApp(App)
const html = await renderToString(app)
```

vue 3 同样推进了流式渲染（`renderToNodeStream`），并把组合式 API、Teleport、异步组件等与现代 React 对齐：

| 能力 | React 18 | Vue 3 |
|------|----------|-------|
| 服务端入口 | `renderToPipeableStream` / `renderToReadableStream` | `renderToString` / `renderToNodeStream` |
| 客户端水合 | `hydrateRoot`（React 18）；旧版 `hydrate` | `createSSRApp().mount()`（自动判断水合） |
| 流式 | ✅ Tae 面 | ✅ 逐步完善 |
| 部分水合 | 需搭配 Suspense / lazy | 需借助第三方（如 `vue-server-renderer` 定制 / Nuxt ClientOnly） |
| `createApp` vs `createSSRApp` | 统一 | SSR 专用 `createSSRApp`（数据偏置校验等不同） |

> **注意**：Vue 3 中要在水合时保持状态一致，服务端与客户端应使用同一 `createSSRApp` 语义并传入相同初始数据；Vue 不强制 `hydrate` API，`mount('#app')` 在检测到有既有 HTML 时会自动进行水合。

## 七、最小实现：浏览器里演示水合

打开 `code/frontend/13-ssr` 的 `hydration-demo.html`：页面初始化时已存在服务端直出的静态"计数器"标签（看得见、但点按钮无反应），点"仿真水合"后 JS 才为既有按钮补上事件与状态，使页面"活"起来。这一"不重建 DOM、只认领存量节点再附事件"的过程正是水合的雏形——真实框架的 `hydrateRoot` / `createSSRApp` 也遵循同一思想。

## 八、面试衔接

本节对应 `90-附录-面试体系` 的「SSR 与同构渲染」板块（`05-答案-高级` Q113 Hydration、Q117 渐进式水合等）：同构代码约束、水合与服务端渲染的关系、mismatch 成因与修复、流式 SSR 与传统 SSR 差异、渐进式/部分水合、`hydrateRoot` 与 `createSSRApp`。做真题自测后，进入下一节 `03-Next.js实战`。