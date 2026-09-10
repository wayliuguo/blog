# React 高级与原理

> 级别：高级

按本书四层推进：

- **入门使用**：虚拟 DOM 是"普通对象的树"、render（可中断）+ commit（不可中断）两阶段；
- **进阶**：Fiber 链表与双缓存、diff 三条启发式假设、性能优化三板斧、React 18 并发特性；
- **实战**：在真实项目用 `createRoot` + `React.memo` / `useMemo` / `useCallback` / lazy + Suspense 落地优化；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 3 个 demo——`mini-runtime.html`（createElement + render）、`vdom-diff.html`（最小 diff 生成 patch）、`hooks-demo.html`（hooks 数组实现），正好对应本文的 mini-react 与 Hooks 链表两节。

本文面向已经掌握 React 基础（组件、JSX、Hooks、路由、状态管理）的读者，深入讲解 React 的渲染机制、Fiber 架构、虚拟 DOM、diff 算法、并发特性，以及手写 mini-react 的原理。目标是让你真正理解 React 底层"做了什么、为什么这么做"。

---

## 一、React 渲染机制：render 与 commit 阶段

React 的一次渲染（在内部称为"更新"）完整流程分为三个阶段：**Render（渲染/调度）**、**Commit（提交/挂载）**。

### 1.1 一次非并发渲染的完整流程

React（以经典同步模式为例）把一个 state 更新到屏幕上，经历：

1. **触发更新**：调用 `setState`、`setCount`（dispatch）或 `ReactDOM.createRoot(...).render(...)`。
2. **Render 阶段（可中断，纯计算）**：
   - React 创建/更新 Fiber 树，计算出"差异（delta）"，即哪些节点需要增、删、改。
   - 该阶段**不修改真实的 DOM**，只构建出新的 Virtual DOM 树。
   - 该阶段是纯函数式的，因此**可以被打断、暂停、恢复**（这是并发特性的基础）。
3. **Commit 阶段（不可中断，副作用）**：
   - 把 Render 阶段计算出的变更一次性应用到真实 DOM。
   - 执行副作用（`useEffect`、`useLayoutEffect`、生命周期、`ref` 赋值）。
   - 该阶段**必须同步完成**，一旦开始就不能被打断，否则页面会闪现中间态。

两条关键原则（用 `##` 记牢）：

- **Render 阶段是"纯函数"，不允许有副作用**；副作用一律推迟到 Commit 阶段执行。
- **Commit 阶段是命令式的**，直接操作 DOM，绝对不能半途而废。

### 1.2 render 阶段与 commit 阶段对比

```plaintext
触发 setState
   │
   ▼
┌─────────────────────────────┐
│ Render 阶段（可中断）        │
│ · 构建新虚拟 DOM / Fiber     │
│ · 计算 diff（找差异）         │
│ · 纯函数，无副作用           │
│ · 高优先级可抢占低优先级      │
└─────────────────────────────┘
   │ 产出：变更清单（work in progress 树）
   ▼
┌─────────────────────────────┐
│ Commit 阶段（不可中断）      │
│ · 执行 DOM 增/删/改          │
│ · 执行 useEffect / 生命周期   │
│ · ref 赋值                   │
└─────────────────────────────┘
   │
   ▼
屏幕更新完成
```

### 1.3 为什么 React 要区分"可用中断的 render"和"不可中断的 commit"

用户体感上，一次点击应该"立即响应"。如果一次大更新（如渲染 10000 行表格）阻塞了主线程 100ms，用户点击或输入就会卡顿（掉帧、输入延迟）。把 render 拆成可中断的小任务，就能让高优先级操作（输入、点击）"插队"执行，这就是并发特性的核心价值。

> 类比：渲染就像写一份很长的报告（纯计算，可以先写大纲、随时暂停出去接电话），提交就像盖章（盖了就生效，不能半盖）。

---

## 二、Fiber 架构

### 2.1 为什么要 Fiber：传统递归的问题

在 React 15 及之前，协调（reconciliation）是**递归遍历整棵组件树**完成的。递归的致命缺陷是：**一旦开始就无法中断**。如果树很深，一次递归更新会一直占用主线程，导致页面卡顿，用户输入得不到及时响应。

### 2.2 Fiber 是什么

Fiber 是一个普通的 JavaScript 对象，是对一个组件的"单元工作"的描述，其核心数据结构是**链表**。

每个 Fiber 节点代表一个 React 元素（组件或 DOM 节点），它们通过指针相互连接，构成一棵**双向链表树**：

- `child`：指向第一个子节点
- `sibling`：指向下一个兄弟节点
- `return`：指向父节点

因为有了这种可遍历的链表结构，React 就可以把一份大工作拆成一个个小单元，每次处理一个 Fiber，处理完检查是否有更高优先级任务（是否有空闲时间），再决定继续还是让出主线程。

### 2.3 双缓存（double buffering）机制

React 内部同时维护两棵 Fiber 树：

- **current 树**：当前展示在屏幕上的树。
- **workInProgress 树**：在内存中构建中的新树。

更新时 React 在 workInProgress 上构建新树，完成后一次性把 `current` 指针切换到新树（称为"切换双缓存"）。好处：

- 复用已存在的 Fiber 节点（减少创建开销）。
- 构建过程中如果被打断，current 树不受影响，屏幕始终显示完整画面。
- 切换是原子的，天然满足"Commit 不可中断"的要求。

### 2.4 最小单元的工作循环示例

```javascript
// 极简示意：workLoop 每次处理一个 Fiber 单元
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 时间片用完就让出
  }
  if (!nextUnitOfWork) {
    commitRoot(); // 全部处理完，进入提交阶段
  }
}
```

> 这是 React 调度器（Scheduler）中"时间切片（Time Slicing）"的雏形：利用 `requestIdleCallback` 类似机制获取"空闲时间片段"，分片执行工作。

---

## 三、虚拟 DOM 与 reconciliation（协调）原理

### 3.1 什么是虚拟 DOM

虚拟 DOM（Virtual DOM）就是 React 元素构成的**一棵普通 JS 对象的树**，是真实 DOM 的内存镜像。结构大致如下：

```javascript
const vdom = {
  type: "div",          // 标签名 或 组件
  props: { id: "app", className: "foo", children: [/* 子树 */] },
  children: [...],
};
```

我们手写 JSX 时写：

```jsx
<div className="foo">Hello</div>
```

经 Babel 编译后变成：

```javascript
React.createElement("div", { className: "foo" }, "Hello");
```

最终得到的就是一个描述结构的普通对象——虚拟 DOM。

### 3.2 为什么要用虚拟 DOM

直接操作真实 DOM 成本高昂（DOM 是浏览器中最昂贵的对象之一，每次改动都可能触发重排/重绘）。React 的策略是：

1. 先改"便宜的"虚拟 DOM（普通对象），
2. 通过 diff 算法找出**最小化**的真实 DOM 操作集合，
3. 最后一次性应用到真实 DOM。

### 3.3 reconciliation（协调）与 diff 算法

**协调（Reconciliation）** 指"对比新旧两棵虚拟 DOM 树，找出差异并更新"的过程，其核心是 **diff 算法**。

React 的 diff 不是暴力 O(n³) 逐节点比较，而是基于**三条启发式假设**，将复杂度降到 O(n)：

1. **不同类型的元素 -> 直接重建**：如果新旧树的根节点 type 不同（如 `div` 变 `span`，或组件类型变了），React 直接销毁旧节点及其整棵子树，重建新树。
2. **同一类型 -> 复用 DOM，仅更新 props**：如果 type 相同，React 保留原 DOM 节点，只在 props 上做最小更新（只 update 变化的属性）。
3. **同一级别（兄弟列表）-> 用 key 加速定位**：React 采用**双端比较 / 按索引顺序比较**。当子元素是数组时，通过 `key` 来识别哪些节点是"同一个"，避免不必要的重建。

### 3.4 key 的真正意义

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
- **没有 key（或用了 index 作为 key）**：React 只能按索引对号入座，`index 0` 的 `<li>X</li>` 和原来的 `<li>A</li>` 被视为同一个，导致 A/B/C 被依次"更新"、最后删除一个，性能差且会出现状态错乱的 bug（例如输入框内容串位）。

> 因此：动态列表务必给 `key`，且 **不要用 `index` 作为 key**（除非列表是静态不可变的）。

### 3.5 为什么需要这么细？diff 的目标是"最小化 DOM 操作"

直接重建整个 DOM 树显然能保证正确，但代价巨大。diff 的全部意义就是**以最小的真实 DOM 操作代价**从旧树过渡到新树。

---

## 四、性能优化

> 本节与已有笔记《React 之 ESLint 与性能优化》(pages/UseMemo...) 一脉相承，此处从"原理"维度系统梳理。

### 4.1 React.memo —— 缓存组件，跳过无关子组件渲染

**原理**：默认情况下，父组件 state 变化导致父组件重新渲染时，React 会**递归渲染所有子组件**，无论其 props 是否变化。`React.memo` 对组件做一层缓存，让 React 在 props 是**浅比较相等**的情况下跳过该子组件的渲染。

```jsx
import React from "react";

// 未优化：父组件每次渲染，List 都会重新渲染
// function List({ items }) { ... }

// 优化：仅当 items 引用变化时才重新渲染
const List = React.memo(function List({ items }) {
  return (
    <ul>
      {items.map((it) => <li key={it}>{it}</li>)}
    </ul>
  );
});

export default function App() {
  const [count, setCount] = useState(0);
  // 注意：items 必须用 useMemo 缓存稳定引用，否则 memo 不生效
  const items = useMemo(() => ["a", "b", "c"], []);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>count: {count}</button>
      <List items={items} />
    </>
  );
}
```

**注意**：`React.memo` 是"浅比较"。如果传入的 props 是每次渲染都新建的新对象/新函数（如内联箭头函数），memo 会失效。所以要配合 `useCallback` / `useMemo` 保持引用稳定。

> 区分：`React.memo` 是"缓存整个组件的渲染"；`useMemo` 是"缓存某个计算结果/数据"。

### 4.2 useMemo —— 缓存计算结果

**原理**：缓存"计算量较大"的派生数据，只有当依赖项变化时才重新计算，否则直接返回缓存结果。

```jsx
import { useMemo } from "react";

function StatisticsPage({ rawData }) {
  // 复杂计算只依赖 rawData，不希望每次渲染都重算
  const sum = useMemo(
    () => rawData.reduce((acc, x) => acc + x, 0), // 复杂计算
    [rawData]                                     // 依赖项
  );
  return <div>总和：{sum}</div>;
}
```

**重要提醒**（引用官方文档原话）："你可以把 useMemo 作为性能优化的手段，但不要把它当成语义上的保证。" 即，`useMemo` 的控制权在 React，不一定保证每次都缓存，目的都是全局性能最佳。不要依赖"useMemo 一定会缓存"这种假设来保证行为正确性。

### 4.3 useCallback —— 缓存函数引用

**原理**：`useCallback` 是 `useMemo` 的语法糖（`useMemo(() => fn, deps)` 等价于 `useCallback(fn, deps)`），用于**缓存函数引用**，让子组件（配合 `React.memo` 时）不会因为父组件每次渲染产生新函数而重新渲染。

```jsx
import { useCallback, useState } from "react";

function App() {
  const [count, setCount] = useState(0);
  // 缓存 add，引用稳定，避免触发依赖它的子组件渲染
  const add = useCallback(() => setCount((c) => c + 1), []);
  return <Counter onAdd={add} />;
}
```

### 4.4 减少渲染的综合原则

1. **保持 props 引用稳定**：用 `useCallback` 缓存函数、`useMemo` 缓存对象，配合 `React.memo` 才能真正跳过渲染。
2. **状态上移 / 下移**：把变化的 state 尽量放到只影响最小范围的组件。例如父组件中一个 `count` 状态，若只有某个子组件用到，就把它下沉，避免父组件整棵子树重渲染。
3. **拆分组件**：把大组件拆小，让"局部状态"只在局部触发渲染，避免不必要的全量刷新。
4. **合理分层**：把不变的公共部分（如 Layout、导航栏）用 `memo` 包裹。
5. **避免内联对象/函数**作为会触发子组件渲染的 props，除非用 `useCallback`/`useMemo` 稳定化。

### 4.5 并发特性：时间切片（Time Slicing）与 Concurrent

React 18 的 **并发渲染（Concurrent Mode，语义上称为"并发特性"）** 让 React 在更新时能**中断**低优先级渲染，优先处理高优先级任务。

- **可中断渲染**：Render 阶段可以暂停、恢复、丢弃重做。
- **时间切片**：把一次大渲染拆成多个"时间分片"，每个分片执行一点，保证主线程不被长任务长期占用，从而提升输入/点击的响应速度（减少掉帧、卡顿）。
- **Concurrent 特性的开启方式**：通过 `ReactDOM.createRoot(...)` 即可获得并发渲染能力；配合 `useTransition`、`useDeferredValue`、`startTransition` 标识"低优先级更新"。

```jsx
import { useTransition } from "react";

function App() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState("home");

  const switchTab = (next) => {
    // 标记为低优先级：切换 tab 不会阻塞当前交互
    startTransition(() => setTab(next));
  };

  return (
    <div>
      {isPending ? "切换中..." : <TabContent tab={tab} />}
    </div>
  );
}
```

`startTransition` / `useTransition` 告诉 React："这次更新不是最紧急的，可以延迟执行，先处理用户更紧迫的交互"。`useDeferredValue` 则用于延迟某个值的计算。

### 4.6 代码分割、lazy 与 Suspense

**代码分割（Code Splitting)**：把打包产物拆成多个文件（chunk），首屏只加载必要的部分，其余按需加载，从而**减小首屏体积、加快首屏渲染**。

- 参考已有笔记《代码体积和拆分》：通过路由懒加载、抽离公共依赖（react-dom、antd 等 vendors，`chunks: 'all'`）将 main.js 从 1.5M 降至 35KB。
- 拆分后多个文件配合浏览器/服务端 **Gzip 压缩**（约可再压缩 1/3），且依赖文件不频繁变更，可长时间命中缓存。

**React.lazy + Suspense** 是 React 内置的组件级代码分割方案：

```jsx
import { lazy, Suspense } from "react";

// 只有真正渲染到该组件时才去加载对应 chunk
const StatPage = lazy(() => import("./StatPage"));
const EditPage = lazy(() => import("./EditPage"));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      {/* 路由懒加载的体现 */}
      <EditPage />
    </Suspense>
  );
}
```

`lazy` 让 React 知道"这个组件要动态加载"，`Suspense` 提供一个加载中的 fallback（占位 UI）。配合 React Router 的 `lazy` 即可实现**路由级懒加载**（各页面的代码在进入路由时才下载）。

---

## 五、手写极简 mini-react

为了真正理解 React 原理，下面实现一个最简的 `mini-react`，只包含三步核心：`createElement`、`render`、`diff/commit`。它不追求完整功能，只体现核心逻辑。

### 5.1 createElement：把 JSX 变为虚拟 DOM

```javascript
// createElement.js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      // children 归一化为数组，文本节点单独表达
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  // 文本节点也是一种特殊的元素，type = "TEXT_ELEMENT"
  return { type: "TEXT_ELEMENT", props: { nodeValue: text, children: [] } };
}

// 镜像 React.createElement
export default {
  createElement,
};
```

```jsx
// jx写法经编译后等价于：
// const vdom = miniReact.createElement("div", { id: "app" }, "Hello");
```

### 5.2 render：把虚拟 DOM 变成真实 DOM

```javascript
// render.js
function render(vdom, container) {
  // 1. 根据 type 创建真实 DOM
  const dom =
    vdom.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(vdom.type);

  // 2. 把 props（除 children 外）应用到 DOM 上
  Object.keys(vdom.props)
    .filter((key) => key !== "children")
    .forEach((name) => {
      dom[name] = vdom.props[name];
    });

  // 3. 递归渲染子节点
  vdom.props.children.forEach((child) => render(child, dom));

  // 4. 挂载到父容器
  container.appendChild(dom);
}
```

### 5.3 diff 与 commit：用最小操作更新

完整版 React 有复杂的 diff，mini 版给出核心思路：为每个元素生成一个"补丁"，记录要创建、更新、删除哪些节点。

```javascript
// diffAndCommit.js —— 极简示意
// 核心：对比 oldVDOM 与 newVDOM，产出操作指令
function diff(oldVDOM, newVDOM) {
  const patches = [];

  // 场景1：节点类型不同 -> 替换
  if (oldVDOM.type !== newVDOM.type) {
    patches.push({ op: "REPLACE", new: newVDOM });
    return patches;
  }

  // 场景2：文本节点内容变化 -> 更新文本
  if (newVDOM.type === "TEXT_ELEMENT") {
    if (oldVDOM.props.nodeValue !== newVDOM.props.nodeValue) {
      patches.push({ op: "SET_PROP", key: "nodeValue", value: newVDOM.props.nodeValue });
    }
    return patches;
  }

  // 场景3：同类型，diff props（简化：仅演示属性更新）
  const oldProps = oldVDOM.props;
  const newProps = newVDOM.props;
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  allKeys.forEach((key) => {
    if (key === "children") return; // children 单独递归处理
    if (oldProps[key] !== newProps[key]) {
      patches.push({ op: "SET_PROP", key, value: newProps[key] });
    }
  });

  // 场景3.5：children 递归 diff（list + key 的 diff 此处省略）
  oldVDOM.props.children.forEach((child, i) => {
    const childPatches = diff(child, newVDOM.props.children[i]);
    patches.push(...childPatches);
  });

  return patches;
}
```

```javascript
// commit：把补丁应用到真实 DOM
function commit(dom, patches) {
  patches.forEach((patch) => {
    switch (patch.op) {
      case "REPLACE":
        // 挂载 newNode
        break;
      case "SET_PROP":
        dom[patch.key] = patch.value;
        break;
      default:
        break;
    }
  });
}
```

> mini-react 的价值：当你自己手写过一遍 createElement → render → diff/commit，就会深刻理解"虚拟 DOM 是普通对象"、"渲染分两阶段"、"diff 求最小变更"这些概念的实体含义。

---

## 六、Hooks 实现原理：Fiber 上的 hooks 链表

很多人用 Hooks 却不知其原理。核心答案是：**每个组件（函数式组件）的 Fiber 节点上保存着一个 hooks 链表**，Hooks 只是操作这个链表。

### 6.1 Hooks 为什么"只能放在顶层调用"

因为 hooks 是**按调用顺序**被挂到 Fiber 内的链表 `fiber.memoizedState` 上的。每次渲染，React 按照同样的顺序逐个读取链表的节点。如果 hooks 放在 `if`/循环里，顺序就会变化，第二次渲染时就会错位，导致状态错乱（这就是"不能条件调用 Hooks"的原因）。

```javascript
// 伪代码：组件 Fiber 上的 hooks 链表
fiber = {
  type: MyComponent,
  memoizedState: null, // hooks 链表头
  // ...
};
```

### 6.2 一个 Hook 节点（以 useState 为例）

```javascript
// 伪代码：每个 hook 是一个链表节点
const hook = {
  memoizedState: null, // 该 hook 保存的状态（useState 值 / useEffect 的 deps 等）
  queue: null,         // 待更新的 update 队列
  next: null,          // 指向下一个 hook（构成链表）
};
```

### 6.3 渲染时如何"取出"hook

- 第一次渲染：React 依次为每个 `useXxx` 创建新节点，`memoizedState` 指向当前的 `fiber.memoizedState` 链表。
- 后续渲染：React 沿链表 `next` 移动，复用上一次的 hook 节点，从中读取旧 state，并把新 setState 加入 `queue`。

```javascript
// 伪代码：useState 的极简原理（基于 fiber 上的当前 hook）
let currentHookIndex = 0;        // 当前组件已消费的 hook 序号
let workInProgressHook = null;   // 当前正在处理的 hook 链表节点

function useState(initialValue) {
  // 若是第一次渲染，创建链表节点
  if (workInProgressHook === null) {
    // 在链表中挂一个节点，并赋值 initialValue
  }
  // 否则复用已有的节点、读取旧值
  const hook = workInProgressHook;
  const setState = (newValue) => {
    hook.queue.push(newValue); // 入队更新
    scheduleUpdateOnFiber(fiberNode); // 触发重渲染
  };
  workInProgressHook = workInProgressHook.next; // 指向下一个 hook，保持顺序
  return [hook.memoizedState, setState];
}
```

### 6.4 为什么每个组件之间有独立的 hook 状态

因为每个**函数组件都有一个属于自己的 Fiber 节点**，`memoizedState` 挂在各自 Fiber 上，互不干扰。React 通过 `currentFiber` 这个全局指针知道"现在处理的是哪个组件的 hooks"。

### 6.5 useEffect 与依赖比较

`useEffect` 的原理也在这条链表上：React 把 `deps` 存在 hook 节点里，每次渲染时**浅比较旧的 deps 与新的 deps**，若不同才执行副作用，并在 Commit 阶段触发回调。

---

## 七、总结

- **渲染分两阶段**：Render（纯计算、可中断）+ Commit（副作用、不可断）。
- **Fiber**：用链表把渲染拆成可中断的小单元，支持并发与时间切片。
- **虚拟 DOM + diff**：普通对象做内存镜像，靠三条启发式（类型不同重建、类型相同只改 props、同层用 key）把复杂度压到 O(n)。
- **优化三板斧**：`React.memo` 缓存组件、`useMemo` 缓存数据、`useCallback` 缓存函数，配合引用稳定与状态下沉减少渲染；用 `lazy` + `Suspense` + 代码分割减小首屏体积。
- **并发特性**：`createRoot` + `startTransition` / `useTransition` / `useDeferredValue` 实现可中断渲染，提升交互响应。
- **mini-react**：createElement → render → diff/commit 三步即见骨架。
- **Hooks 原理**：状态挂在组件对应的 Fiber 上，是一条按调用顺序排列的链表——所以必须在顶层、按固定顺序调用。

## 最小实现：把原理跑起来

本文第五、六节已给出 mini-react 的源码骨架。建议到 `code/frontend/07-react` 亲自运行三个可交互 demo：`mini-runtime.html` 用原生 JS 完成了 createElement → render → onUpdate 的完整闭环；`vdom-diff.html` 让你直观看到 diff 吐出的"我是文案 A → 文案 B / 新增节点"这类 patch；`hooks-demo.html` 用数组复刻了 useState / useEffect 的按顺序存取。原理一句话：虚拟 DOM 是普通对象、渲染分两阶段、diff 求最小变更，而这些都能用几十行原生 JS 跑通。

## 面试衔接

本节对应 `90-附录-面试体系` 的「React 原理」板块：虚拟 DOM 与 diff、render/commit、Fiber 与并发、key 的作用、Hooks 顺序原理、React.memo / useMemo / useCallback。这部分是 React 面试高分题，做真题自测后，「React 原理」独立模块即告完结——这是「前端框架 - React」的核心原理层，与前面的基础/进阶篇共同构成完整 React 知识链。