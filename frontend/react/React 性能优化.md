# React 性能优化

React 的默认行为是"父组件渲染 → 递归渲染所有子组件"（render 阶段的机制见《React 原理》四章）。性能优化的核心就一句话：**让不需要变化的节点跳过 render**。本文按"组件级缓存 → 数据级缓存 → key 与列表 → 长列表 → 综合原则 → 并发与代码分割"的顺序梳理。

## React.memo：缓存组件，跳过无关子组件渲染

- 默认情况下，父组件 state 变化导致重新渲染时，React 会**递归渲染所有子组件**，无论其 props 是否变化。
- `React.memo` 对组件做一层缓存：props **浅比较相等**时直接跳过该子组件的 render，复用上一次的渲染结果。

> 示意片段（无配套脚本）

```jsx
import React, { useState, useMemo } from 'react'

// 优化：仅当 items 引用变化时才重新渲染
const List = React.memo(function List({ items }) {
    return (
        <ul>
            {items.map(it => <li key={it}>{it}</li>)}
        </ul>
    )
})

export default function App() {
    const [count, setCount] = useState(0)
    // 注意：items 必须用 useMemo 缓存稳定引用，否则 memo 不生效
    const items = useMemo(() => ['a', 'b', 'c'], [])
    return (
        <>
            <button onClick={() => setCount(count + 1)}>count: {count}</button>
            <List items={items} />
        </>
    )
}
```

两个注意点：

- `React.memo` 是**浅比较**。如果传入的 props 是每次渲染都新建的对象/函数（如内联箭头函数），memo 会失效——所以必须配合 `useCallback` / `useMemo` 保持引用稳定。
- 区分：`React.memo` 是"缓存整个组件的渲染"；`useMemo` 是"缓存某个计算结果/数据"。

## useMemo：缓存计算结果

缓存"计算量较大"的派生数据，只有依赖项变化时才重新计算，否则直接返回缓存结果：

> 示意片段（无配套脚本）

```jsx
import { useMemo } from 'react'

function StatisticsPage({ rawData }) {
    // 复杂计算只依赖 rawData，不希望每次渲染都重算
    const sum = useMemo(
        () => rawData.reduce((acc, x) => acc + x, 0), // 复杂计算
        [rawData]                                     // 依赖项
    )
    return <div>总和：{sum}</div>
}
```

**重要提醒**（官方文档原话）："你可以把 useMemo 作为性能优化的手段，但不要把它当成语义上的保证。" `useMemo` 的控制权在 React，不一定保证每次都缓存，目的是全局性能最佳——不要依赖"useMemo 一定会缓存"来保证行为正确性。

## useCallback：缓存函数引用

`useCallback` 是 `useMemo` 的语法糖（`useMemo(() => fn, deps)` 等价于 `useCallback(fn, deps)`），用于**缓存函数引用**，让子组件（配合 `React.memo` 时）不会因为父组件每次渲染产生新函数而重新渲染。

> 示意片段（无配套脚本）

```jsx
import { useCallback, useState } from 'react'

function App() {
    const [count, setCount] = useState(0)
    // 缓存 add，引用稳定，避免触发依赖它的子组件渲染
    const add = useCallback(() => setCount(c => c + 1), [])
    return <Counter onAdd={add} />
}
```

为什么"函数引用变了"会导致重渲染？——《React 原理》4.5 讲过：commit 更新属性时，事件函数即使"长得一样"，每次 render 产生的新引用也会被 `commitUpdate` 判定为"值变了"而重新绑定；`memo` 的浅比较同样按引用判定。`useCallback` 稳定的正是这个引用。

## key 与列表复用

key 是 React diff 的**配对依据**——`reconcileChildren` 的复用判定是"key 与 type 都相同才复用"（见《React 原理》4.3）。key 用得好，列表更新就是"复用 + 最小 DOM 操作"；用不好，就是"全量更新 + 状态错乱"：

> 示意片段（无配套脚本）

```jsx
// 旧的列表
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>

// 新的列表（在头部插入一项）
<ul>
  <li key="x">X</li>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>
```

- **有 key**：React 能识别 `a/b/c` 是"同一个节点被移动"，只新增一个 `x`，复用其余三个 DOM，性能很高。
- **没有 key（或用了 index 作为 key）**：React 只能按索引对号入座（乱序区退化为"隐式 key = 位次"），头部插入后 `index 0` 的 `<li>X</li>` 和原来的 `<li>A</li>` 被视为同一个，导致 A/B/C 被依次"更新"、最后删除一个——性能差，且会出现状态错乱（例如输入框内容串位，因为组件实例被复用到了错误的数据上）。

规约：动态列表务必给稳定的 `key`（业务 id），**不要用 `index` 作为 key**——除非列表是静态不可变的。

## 长列表优化

diff 已经保证"只动该动的节点"，但**节点总数本身**才是长列表的真正开销——几千个 fiber 节点的 beginWork/completeWork 与几千个 DOM 节点的渲染都躲不掉。常见手段按优先级：

- **虚拟列表（windowing）**：只渲染视口内可见的几十条 + 上下缓冲，滚动时替换数据。React 生态常用 [react-window](https://www.npmjs.com/package/react-window) / [react-virtualized](https://www.npmjs.com/package/react-virtualized)。核心思路：外层容器固定高度 + 内部撑起总高度的占位元素 + 绝对定位只渲染可见区。
- **分页 / 无限滚动**：不追求一次渲染全部，交互上分批给数据（配合 IntersectionObserver 触发加载）。
- **减少单条复杂度**：列表项组件用 `React.memo` 包裹，让"不动的行"在数据更新时彻底跳过 render——长列表里命中率极高。

## 减少渲染的综合原则

1. **保持 props 引用稳定**：`useCallback` 缓存函数、`useMemo` 缓存对象，配合 `React.memo` 才能真正跳过渲染。
2. **状态上移 / 下移**：把变化的 state 放到只影响最小范围的组件。例如父组件中的 `count` 若只有某个子组件用到，就把它下沉，避免父组件整棵子树重渲染。
3. **拆分组件**：把大组件拆小，让"局部状态"只在局部触发渲染，避免不必要的全量刷新。
4. **合理分层**：把不变的公共部分（Layout、导航栏）用 `memo` 包裹。
5. **避免内联对象/函数**作为会触发子组件渲染的 props，除非用 `useCallback`/`useMemo` 稳定化。

## 并发特性：useTransition 与 useDeferredValue

React 18 通过 `createRoot` 开启并发渲染：render 阶段可中断（时间切片，见《React 原理》二章），并支持**优先级**——紧急更新（输入、点击）优先，低优先级更新让路。两个常用 API 把"不紧急的更新"标记出来：

> 示意片段（无配套脚本）

```jsx
import { useTransition, useState } from 'react'

function App() {
    const [isPending, startTransition] = useTransition()
    const [tab, setTab] = useState('home')

    const switchTab = next => {
        // 标记为低优先级：切换 tab 不会阻塞当前交互
        startTransition(() => setTab(next))
    }

    return <div>{isPending ? '切换中...' : <TabContent tab={tab} />}</div>
}
```

- `startTransition` / `useTransition` 告诉 React："这次更新不是最紧急的，可以延迟执行，先处理用户更紧迫的交互"；`isPending` 用于展示过渡状态。
- `useDeferredValue(value)` 则用于"延迟计算某个值的派生结果"——输入框保持即时响应，重计算的列表基于旧值先显示。

## 代码分割：lazy 与 Suspense

**代码分割（Code Splitting）**：把打包产物拆成多个文件（chunk），首屏只加载必要的部分，其余按需加载，从而**减小首屏体积、加快首屏渲染**。路由懒加载、抽离公共依赖（react-dom、组件库等 vendors）是常规手段，拆分产物配合 Gzip 压缩（约再压 1/3），且依赖文件不频繁变更、可长时间命中缓存。

`React.lazy + Suspense` 是 React 内置的组件级代码分割方案：

> 示意片段（无配套脚本）

```jsx
import { lazy, Suspense } from 'react'

// 只有真正渲染到该组件时才去加载对应 chunk
const StatPage = lazy(() => import('./StatPage'))
const EditPage = lazy(() => import('./EditPage'))

function App() {
    return (
        <Suspense fallback={<div>加载中...</div>}>
            {/* 路由懒加载的体现 */}
            <EditPage />
        </Suspense>
    )
}
```

`lazy` 让 React 知道"这个组件要动态加载"，`Suspense` 提供加载中的 fallback（占位 UI）。配合 React Router 的 `lazy` 即可实现**路由级懒加载**（进入路由时才下载对应页面代码）。

## 参考

- 上一篇：[React 原理](./React%20原理.md)
- 下一篇：[总结](./总结.md)
- React 官方文档 · 性能优化：<https://react.dev/learn/render-and-commit>
- React 官方文档 · 使用 Suspense 实现懒加载：<https://react.dev/reference/react/lazy>
