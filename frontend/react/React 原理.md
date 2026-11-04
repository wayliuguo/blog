# React 原理

> 本篇所有 `摘自` 代码块来自配套的可断点实现 `code/react/mini-react/lib/`——按 React 源码包结构分层拆分（`shared.js` → `scheduler.js` → `hooks.js` → `reconciler.js` → `dom.js` → `index.js`，纯 JS 零依赖，`<script>` 按序加载后经 `window.MiniReact` 统一使用，全量 JSDoc 注释）。正文每讲一个机制，就落到对应文件的函数上解析一次；demo 见 `code/react/mini-react/demo/demo-app.html`（官网 CDN 用法一页跑完挂载 → 调度 → hooks → keyed diff → 卸载）。demo 的组件用 `h`（即 `createElement`）直写、不引入 babel/JSX——真实 React 里 JSX 由构建工具编译成 `createElement` 调用，mini-react 从一开始就站在**编译产物层**，见 1.3。篇末「五、关键执行链路」与 demo 六个按钮逐节对齐，章节对照与断点建议见「配套代码」。

## 一、React 整体架构

React 采用**分层 + 包拆分**设计，核心包按职责可以划分为四大类地图：

> 示意片段（无配套脚本）

```
React 包结构
├── react               对外 API：createElement / useState / useEffect……
│                       只负责"声明"：造 Element、标记当前渲染者在用哪个 Hook
│
├── scheduler           独立调度包（react-reconciler 依赖它）
│                       时间分片 + 宏任务循环：让"大更新"可以被切成小片让出主线程
│
├── react-reconciler    协调器核心（平台无关）
│                       Fiber 架构、diff（reconciliation）、commit 编排
│
└── react-dom           浏览器宿主
                        createRoot、DOM 实例创建/属性 diff、事件绑定（ReactFiberConfigDOM）
```

### 1.1 模块之间的协作关系

> 示意片段（无配套脚本）

```
JSX ──构建工具编译──► createElement(type, props, children) = React Element
                     （只描述"长什么样"的普通对象）            〔详见 1.3〕
                          │
                 root.render(element) 触发更新
                          │
        scheduler 宏任务起跑 ◄── setState 只记 action + 请求调度    〔详见 2.4 · 4.4〕
                          │
        reconciler（render 阶段，可中断）                          〔详见 4.1~4.3〕
           │  beginWork 向下 → completeWork 向上，逐 fiber 推进
           │  产出：带 flags 记账（Placement/Update/Deletion）的 workInProgress 树
           ▼
        react-dom / commit（不可中断）                             〔详见 4.5〕
           │  mutation：先删后插/更新 → passive：跑 useEffect
           ▼
                     真实 DOM（双缓冲树交换角色，current 指向新树）
```

- **react** 负责"声明"：`createElement` 造出描述 UI 的 Element 对象，Hooks 在渲染期间记录"该读写哪条状态"。
- **scheduler** 负责"切片"：把一次大更新拆进宏任务循环，每片最多 5ms，干不完续排下一片——这是 render 阶段可中断的物理基础。
- **react-reconciler** 负责"计算"：把旧 Fiber 树与新 Element 树 diff 成一棵带变更记账的新树，全程不碰 DOM。
- **react-dom** 负责"落地"：commit 阶段执行真实的 DOM 增删改与属性 diff，跑 useEffect。

一句话总结：**用 Element 描述、用 Fiber 计算、用调度切片、用 commit 落地。**

### 1.2 对应到 mini-react 的分层

配套实现按同样的包结构拆文件，加载顺序即依赖顺序：

| lib 文件 | 对应源码包 | 职责 |
| --- | --- | --- |
| `lib/shared.js` | `packages/shared` + ReactWorkTags / ReactFiberFlags | FiberTag（节点种类）/ FiberFlags（变更记账）/ Element 防伪标记 / 类型判断 |
| `lib/scheduler.js` | `packages/scheduler` | MessageChannel 宏任务循环 + 5ms 时间分片 |
| `lib/hooks.js` | `react-reconciler/ReactFiberHooks` | renderWithHooks 上下文 + hooks 链表 + useState / useEffect |
| `lib/reconciler.js` | `packages/react`（createElement）+ `react-reconciler`（Fiber / diff / 工作循环） | Element 工厂 + Fiber 树与双缓冲 + keyed diff + 调度衔接 |
| `lib/dom.js` | `packages/react-dom`（ReactFiberConfigDOM） | 实例创建 / 插入移除 / 属性初始铺设与更新 diff |
| `lib/index.js` | `react-reconciler/ReactFiberCommitWork` + `react-dom` 的 createRoot | commit 三段式 + createRoot 装配 + `window.MiniReact` 聚合 |

`shared.js` 只放"人人都要用、自己却不依赖任何人"的常量与工具，所以被所有其他模块引用也不会形成循环依赖：

> 摘自 `./code/react/mini-react/lib/shared.js`

```js
/**
 * Fiber 用 tag 区分节点种类，beginWork / completeWork / commit 都按它分派。
 * 数值直接取自真实 React 的 WorkTags，方便对照源码。
 *
 * @example
 *   fiber.tag === FiberTag.FunctionComponent // 函数组件：type 是函数
 *   fiber.tag === FiberTag.HostComponent     // 宿主元素：type 是 'div' 这类标签名
 */
const FiberTag = {
    FunctionComponent: 0, // 函数组件（真实 React 同款数值）
    HostRoot: 3, // 根节点：createRoot 的容器对应一个 HostRoot fiber
    HostComponent: 5, // 普通 DOM 元素（type 是字符串标签名）
    HostText: 6 // 纯文本（type 为 null，内容由 props.nodeValue 承载）
}
```

> 摘自 `./code/react/mini-react/lib/shared.js`

```js
/**
 * render 阶段在 fiber 上"记账"，commit 阶段按位读取执行——render 全程不碰 DOM，
 * 碰 DOM 的动作全部推迟到 commit，这正是 React 可中断渲染的前提。
 *
 * @example
 *   fiber.flags = FiberFlags.Placement // 新插入
 *   fiber.flags |= FiberFlags.Update   // 在已有标记上叠加"更新"位
 *   commit 时：flags & Placement 非 0 → 执行插入
 */
const FiberFlags = {
    NoFlags: 0, // 无事可做
    Placement: 2, // 插入 / 移动（复用节点换位置也是 Placement：insertBefore 即移动）
    Update: 4, // 更新已有 DOM 实例的属性 / 文本
    Deletion: 8 // 删除。教学版把删除记在被删 fiber 自己身上（React 18 记在父 fiber 的 ChildDeletion=128）
}
```

`tag` 定"我是什么"，`flags` 定"commit 该为我做什么"——两个常量表贯穿全篇，后面每个阶段都按它们分派。

### 1.3 JSX 与 React Element

JSX 是语法糖，它不是运行时的一部分——`<div>` 这类写法会被构建工具（Babel / SWC / Vite 的 esbuild）编译成函数调用。同一段 UI 的两种写法对照：

> 示意片段（无配套脚本）

```jsx
<div className="box" onClick={handleClick}>
  count = {count}
</div>
```

编译产物（等价代码，真实 React 由构建工具完成这一步）：

> 示意片段（无配套脚本）

```js
React.createElement(
    'div',                       // type：标签名（也可以是函数组件）
    { className: 'box', onClick: handleClick }, // config：属性（key 也在这里）
    'count = ',                  // children：可变参数，文本或嵌套 Element
    count
)
```

mini-react 不引入 babel，demo 直接写编译产物——`createElement` 提供短别名 `h`，读起来接近 JSX。它造出的 Element 就是"虚拟 DOM"的节点：一个普通 JS 对象。

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 创建 React Element——JSX 编译产物的运行时形态。
 * `<div onClick={f} key="k">hello {n}</div>` 编译后就是
 * `h('div', { onClick: f, key: 'k' }, 'hello ', n)`。
 *
 * 关键点（与真实 React 一致）：
 *   - key 从 config 里单独拎出来，不进 props；
 *   - 孩子最终都挂在 props.children 上（单个孩子不包数组，多个是数组）；
 *   - 文本孩子归一化成"文本元素"（type 为 null，nodeValue 承载内容）——
 *     真实 React 把这一步放在 reconcile 的 createChild 里，教学版提前到这里；
 *   - null / undefined / boolean 孩子归一化成 null（渲染时直接丢弃）。
 *
 * @param {string|Function|null} type - 标签名 / 函数组件 / null（文本元素）
 * @param {Object|null} config - JSX 属性对象（key 在这里）
 * @param {...*} children - 孩子（可变参数）
 * @returns {Object} element：{ $$typeof, type, key, props }
 *
 * @example
 *   h('li', { key: t.id }, '#', t.id, ' ', t.text)
 *   // → { $$typeof, type: 'li', key: '1', props: { children: [文本元素 ×3] } }
 */
function createElement(type, config, ...children) {
    let key = null
    const props = {}
    if (config !== null && config !== undefined) {
        for (const propName in config) {
            if (propName === 'key') {
                key = String(config.key) // key 单独存放，参与 diff 但不属于 DOM 属性
            } else {
                props[propName] = config[propName] // ref / contextType 等教学版不支持，原样透传
            }
        }
    }
    if (children.length === 1) {
        props.children = normalizeChild(children[0]) // 单孩子不包数组（typeof props.children 有两种形态）
    } else if (children.length > 1) {
        props.children = children.map(normalizeChild)
    }
    return { $$typeof: REACT_ELEMENT_TYPE, type, key, props }
}

/** createElement 的短别名：demo 与文档统一用它，读起来接近 JSX。 */
const h = createElement
```

孩子的归一化规则——文本变"文本元素"、空值直接丢、嵌套数组摊平：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 孩子归一化：文本 → 文本元素；空值/布尔 → null（丢弃）；嵌套数组保持数组（diff 前 flatten）。
 *
 * @param {*} child - createElement 收到的任意孩子
 * @returns {Object|null}
 */
function normalizeChild(child) {
    if (child === null || child === undefined || typeof child === 'boolean') return null
    if (isString(child) || isNumber(child)) {
        // 文本元素：type 为 null 的特殊 Element，fiber tag 会是 HostText
        return { $$typeof: REACT_ELEMENT_TYPE, type: null, key: null, props: { nodeValue: String(child) } }
    }
    if (isArray(child)) return child.map(normalizeChild)
    return child // 已经是 Element
}
```

三个值得注意的设计：

- **key 单独拎出来**：key 参与 diff 配对，但不是 DOM 属性，不能混进 props（4.3 的复用判定只看 `key` 与 `type`）。
- **孩子都挂 props.children**：单个孩子不包数组、多个孩子是数组——所以读 `props.children` 前先问一句"是不是数组"。
- **文本也是"元素"**：`type: null` 的特殊 Element 承载文本。为什么？diff 与 commit 需要**统一的节点单位**——不管孩子是元素还是文本，都走同一套 reconcile / flags / commit 流程，不需要分支特判。
- **`$$typeof` 防伪标记**：真实 React 用 `Symbol.for('react.element')`，防止"长得像 element 的普通对象"被误当元素渲染。

## 二、Fiber 架构与调度

Fiber 是 React 的"机制基石"位——Vue3 里这个位置站着"编译 + 响应式"，React 则把宝押在**可中断的渲染架构**上。本章讲清三件事：Fiber 节点长什么样（2.2）、两棵树怎么交替（2.3）、大更新怎么被切成小片（2.4）。

### 2.1 为什么要 Fiber：递归的问题

React 15 及之前，协调（reconciliation）是**递归遍历整棵组件树**完成的。递归的致命缺陷是：**一旦开始就无法中断**。树很深时，一次更新会一直占用主线程，用户输入得不到及时响应。

React 16 起的答案是：把"递归渲染"改写成**链表树上的循环**。Fiber 就是一个普通 JS 对象，代表"一个待处理的单元工作"；处理完一个 fiber 就有机会检查时间片、决定继续还是让出。这就是并发特性（时间切片、优先级抢占）的数据结构基础。

### 2.2 FiberNode：一个对象的三重角色

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 创建一个 fiber 节点。React 里它同时承担三重角色：
 *   ① vdom 节点（type/key/props）  ② 调度与 diff 的工作单元  ③ 链表树节点。
 *
 * 全部字段：
 *   tag / type / key     —— 节点身份，diff 用它们判断"能不能复用"
 *   props                —— 本轮的属性（React 区分 pendingProps/memoizedProps，教学版合一）
 *   stateNode            —— 宿主 fiber 指向真实 DOM 实例；HostRoot 指向容器
 *   return/child/sibling —— 链表化的树（不用 children 数组，深度遍历不依赖递归栈）
 *   index                —— 在兄弟中的位次，keyed diff 的移动判定要读它
 *   alternate            —— 双缓冲指针，指向对面树上"同位置"的 fiber
 *   flags                —— 给 commit 阶段的记账（Placement/Update/Deletion）
 *   memoizedState        —— 函数组件：hooks 链表头
 *   updateQueue          —— 函数组件：本次 render 收集的 effect 数组
 *
 * @param {number} tag - FiberTag 之一
 * @param {Object|null} props - 属性
 * @param {string|null} key - 复用标识
 * @returns {Object} fiber
 */
function createFiber(tag, props, key) {
    return {
        tag,
        type: null, // 由 createFiberFromElement / 装配处补上
        key,
        props,
        stateNode: null,
        return: null,
        child: null,
        sibling: null,
        index: 0,
        alternate: null,
        flags: FiberFlags.NoFlags,
        memoizedState: null,
        updateQueue: null
    }
}
```

三重角色对应三组字段：

| 角色 | 字段 | 说明 |
| --- | --- | --- |
| vdom 节点 | `tag` / `type` / `key` / `props` | 描述"这个位置长什么样"，diff 的复用判定只看 `key` + `type` |
| 工作单元 | `flags` / `index` / `memoizedState` / `updateQueue` | render 阶段记账，commit 阶段照单执行；hooks 状态也挂在它身上 |
| 链表树节点 | `return` / `child` / `sibling` | 用三个指针代替 children 数组——**深度遍历不依赖递归栈**，走到哪一步都能停下、记录、恢复 |

链表化的树是可中断的关键：递归的"现场"存在调用栈里，一中断就没了；链表的"现场"存在数据里——`nextUnitOfWork` 一个游标就够。

由 Element 建 fiber 时按 type 分派 tag：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 由 Element 建 fiber：按 type 分派 tag。
 *
 * @param {Object} element - React Element
 * @returns {Object} 全新 fiber（alternate 为 null → commit 视为新挂载）
 */
function createFiberFromElement(element) {
    const tag = element.type === null ? FiberTag.HostText
        : isString(element.type) ? FiberTag.HostComponent
        : FiberTag.FunctionComponent
    const fiber = createFiber(tag, element.props, element.key)
    fiber.type = element.type
    return fiber
}
```

### 2.3 双缓冲树：current 与 workInProgress

React 内部同时维护**两棵 Fiber 树**：

- **current 树**：当前展示在屏幕上的树（它的宿主 fiber 的 `stateNode` 指着真实 DOM）。
- **workInProgress 树**：正在内存中构建的新树。

双缓冲的核心动作只有一个函数——为 current fiber 造出 wip 副本（或反向）：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 双缓冲的核心：为 current fiber 造出 workInProgress 副本（或反向）。
 * 复用 type/key/stateNode/memoizedState——所以"更新"天然继承 DOM 实例与 hooks；
 * alternate 互指，下一次再更新时两棵树交换角色。
 *
 * @param {Object} current - 对面树上的 fiber
 * @param {Object|null} props - 本轮新属性
 * @returns {Object} wip fiber
 *
 * @example
 *   wip = createWorkInProgress(currentFiber, element.props) // diff 复用的标准动作
 */
function createWorkInProgress(current, props) {
    const wip = createFiber(current.tag, props, current.key)
    wip.type = current.type
    wip.stateNode = current.stateNode // 宿主 fiber：DOM 实例直接继承（不重建）
    wip.alternate = current
    current.alternate = wip
    wip.memoizedState = current.memoizedState // hooks 链表交接（hooks.js 据此回放）
    wip.index = current.index
    return wip
}
```

三个要点：

- **复用即继承**：`stateNode`（DOM 实例）和 `memoizedState`（hooks 链表）直接从 current 拷过来——"更新"天然不重建 DOM、不丢状态，只换 `props`。
- **alternate 互指**：两棵树之间"同位置"的 fiber 互为影子，diff 时随时可以回看旧树。
- **切换是原子的**：commit 完成时 `currentRootFiber = wipRoot` 一句换根（4.5），屏幕上永远是完整画面——构建过程被打断也不会闪现中间态。

判断一个 fiber 是"新挂载"还是"更新复用"，就看 `alternate`：`createFiberFromElement` 造的 fiber 没有旧影子 → 新挂载；`createWorkInProgress` 造的有 → 更新。

### 2.4 时间分片调度器（scheduler.js）

`packages/scheduler` 是独立的 npm 包，react-reconciler 依赖它。它要解决的问题是：**render 阶段的计算怎么让出主线程**。答案是宏任务循环 + 时间分片：

- 每个宏任务里最多干 **5ms** 的活（一帧 16.6ms 里给 render 留的预算），干不完把剩余工作排到下一个宏任务；
- 浏览器因此在切片之间有机会处理绘制与输入——长任务不再卡死页面；
- 同一宏任务里的多次 setState 只排一次任务——**这也是批处理的底座**。

通道选择上，React 优先用 `MessageChannel` 而不是 `setTimeout`：postMessage 几乎立刻排进宏任务队列，且不像 `setTimeout` 有 4ms 以上的嵌套钳制，是浏览器里最快的"可让出"手段：

> 摘自 `./code/react/mini-react/lib/scheduler.js`

```js
// React 选通道的优先级：MessageChannel > setTimeout。postMessage 几乎立刻排进
// 宏任务队列，且不像 setTimeout 有 4ms 以上的嵌套钳制，是浏览器里最快的"可让出"手段。
const channel = new MessageChannel()
const port = channel.port2
let isMessageLoopRunning = false
let hostCallback = null // 本次宏任务要执行的回调（performRootWork）
let deadline = 0 // 当前时间片的截止时刻（毫秒时间戳）

// 每片 5ms：React 默认 frameInterval（一帧 16.6ms 里给 render 留的预算）
const SLICE_SIZE = 5

channel.port1.onmessage = performWorkUntilDeadline
```

三个函数串起整个循环——`shouldYield` 问"该让了吗"、`performWorkUntilDeadline` 执行一个时间片、`scheduleCallback` 排任务：

> 摘自 `./code/react/mini-react/lib/scheduler.js`

```js
/**
 * 当前时间片是否已用完。workLoop 每推进一个 fiber 前都会问它一次。
 *
 * 真实 React 还会检查 frameYieldTime / 优先级抢占（紧急 lane 不让出），
 * 教学版只做"5ms 一片"的最小实现，但让出时机与 React 一致：逐 fiber 检查。
 *
 * @returns {boolean} true = 该让出了（本片到此为止）
 *
 * @example
 *   while (nextUnitOfWork !== null && !shouldYield()) { ... } // workLoop 的骨架
 */
function shouldYield() {
    return performance.now() >= deadline
}

/**
 * 执行一个时间片：重置 5ms 截止线 → 跑回调 → 回调说没跑完就续排下一个宏任务。
 * （源码 performWorkUntilDeadline）
 */
function performWorkUntilDeadline() {
    if (hostCallback === null) {
        isMessageLoopRunning = false
        return
    }
    const callback = hostCallback
    hostCallback = null
    isMessageLoopRunning = false
    const startTime = performance.now()
    deadline = startTime + SLICE_SIZE // 打开 5ms 的时间片窗口
    let hasMoreWork = false
    try {
        hasMoreWork = callback() // 回调返回 true = 还有 fiber 没跑完
    } finally {
        if (hasMoreWork) {
            // 时间片耗尽但 render 没完成：把同一个回调排进下一个宏任务继续。
            // 这就是"长任务被切片"的机制本身——浏览器因此有机会处理绘制与输入。
            scheduleCallback(callback)
        }
    }
}

/**
 * 排一个回调到宏任务循环。重复调用只保留最新回调、不重复占通道——
 * 多次 setState 各自调它，最终只有一次 render 由此出发（批处理的基础）。
 *
 * @param {Function} callback - 返回 boolean 的任务：true = 未完成需要续排
 *
 * @example
 *   scheduleCallback(performRootWork) // reconciler 的 ensureRootIsScheduled 调它
 */
function scheduleCallback(callback) {
    hostCallback = callback
    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true
        port.postMessage(null) // 起一个宏任务，onmessage → performWorkUntilDeadline
    }
}
```

```
scheduleCallback(callback)
  输入: 返回 boolean 的任务（true = 未完成需要续排）
  输出: 任务进入宏任务循环（重复调用只保留最新回调、不重复占通道）
  过程: isMessageLoopRunning 防重 → port.postMessage 起宏任务 → onmessage → performWorkUntilDeadline
performWorkUntilDeadline()
  输入: hostCallback（本次宏任务要跑的工作）
  输出: callback() 返回 true 时把同一个回调续排进下一个宏任务
  过程: deadline = now + 5ms 开时间片窗口 → 跑回调 → finally 里看返回值决定续排
```

两个容易忽略的设计：

- **`hostCallback` 单槽而不是队列**：同一时刻只会有一个"从根 render"的任务在管道里，重复调用只覆盖槽位——这正是"多次 setState 合并成一次 render"的物理实现（4.4 的 `scheduleRootUpdate` 配合）。
- **让出的粒度是 fiber 而不是任意语句**：`workLoop` 每推进一个 fiber 前问一次 `shouldYield`，所以中断点永远落在"一个 fiber 处理完"的边界上，恢复时从 `nextUnitOfWork` 游标继续即可。

### 2.5 工作循环：递归改循环

有了链表树和时间片，"递归渲染"就能改写成循环。`performUnitOfWork` 是循环的一步——处理一个 fiber，返回下一个：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 推进一个 fiber：先 beginWork 向下（返回孩子就继续深入），
 * 没孩子了就 completeWork 向上（顺着 sibling / return 找下一个待办）。
 *
 * 这就是 React 把"递归渲染"改写成"循环 + 游标"的形态——每一步之间
 * 都可以检查时间片，这就是可中断渲染的全部秘密。
 *
 * @param {Object} fiber - 当前 fiber
 * @returns {Object|null} 下一个 fiber（整棵树跑完返回 null）
 */
function performUnitOfWork(fiber) {
    const child = beginWork(fiber) // 向下：diff 出孩子 fiber 链
    if (child !== null) return child
    let completed = fiber
    while (completed !== null) {
        completeWork(completed) // 向上：给宿主 fiber 补 DOM 实例
        if (completed.sibling !== null) return completed.sibling // 有弟弟 → 处理弟弟
        completed = completed.return // 没弟弟 → 回到父亲，找父亲的弟弟
    }
    return null
}
```

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 时间片循环：只要还有活且时间片没用完，就推进下一个 fiber。
 *
 * @returns {boolean} true = 时间片耗尽、树还没跑完
 */
function workLoop() {
    while (nextUnitOfWork !== null && !shouldYield()) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    }
    return nextUnitOfWork !== null
}
```

```
performUnitOfWork(fiber)
  输入: 当前 fiber（游标所指的工作单元）
  输出: 下一个要处理的 fiber（null = 整棵树跑完）
  过程: beginWork 向下（有孩子返回孩子）→ 没孩子则 completeWork 向上（有弟弟返回弟弟，
        没弟弟顺着 return 回溯找父亲的弟弟）——与"先序遍历 + 后完成"同构
workLoop()
  输入: nextUnitOfWork 游标
  输出: true = 时间片耗尽、树还没跑完（scheduler 据此续排下一个宏任务）
  过程: while (还有活 && 时间片没用完) 推进下一个 fiber——每步之间都可中断
```

`beginWork` 与 `completeWork` 就是"处理一个 fiber"的两段式——向下 diff 孩子（4.1）、向上补宿主实例（4.2），下一章展开。


## 三、Hooks 原理

Hooks 的全部秘密藏在一句话里：**每个函数组件的 Fiber 节点上挂一条按调用顺序串起来的 hook 链表，Hooks 只是操作这条链**。这解释了两个经典问题：状态存在哪（3.2）、为什么 Hooks 不能写在条件/循环里（3.2）、setState 之后为什么立刻读还是旧值（3.3）。

### 3.1 渲染上下文：renderWithHooks

beginWork 渲染函数组件时，先做一次"上下文切换"——记下当前正在渲染的 fiber，让 `useState` / `useEffect` 知道自己属于谁：

> 摘自 `./code/react/mini-react/lib/hooks.js`

```js
// 正在渲染函数组件的 wip fiber；renderWithHooks 进出时设置/清空。
// React 的 Hooks 全靠它 + workInProgressHook 定位"我该读写哪条 hook"。
let currentlyRenderingFiber = null
let workInProgressHook = null // 本次渲染正在装配的 hook（链表尾指针）
let currentHook = null // 旧 fiber（alternate）链上同位置的 hook，更新时逐个对齐

/**
 * beginWork 渲染函数组件前的准备工作 + 真正执行组件函数。
 *
 * 关键点：updateQueue 在这里初始化为空数组——本次 render 里 useEffect
 * 收集到的 effect 都记在这上面，commit 之后统一执行（源码同名机制的简化）。
 *
 * @param {Object} fiber - 函数组件的 wip fiber（fiber.type 是组件函数）
 * @returns {*} 组件函数的返回值（React Element），交给 reconcileChildren
 *
 * @example
 *   // beginWork 的 FunctionComponent 分支：
 *   const children = renderWithHooks(fiber) // 内部执行 fiber.type(fiber.props)
 */
function renderWithHooks(fiber) {
    currentlyRenderingFiber = fiber
    fiber.updateQueue = [] // 本次 render 的 effect 收集区
    workInProgressHook = null
    currentHook = null
    const children = fiber.type(fiber.props) // 执行组件函数（可能递归触发子组件渲染）
    // 渲染完毕立即清上下文：防止 Hooks 被组件函数之外的地方误用
    currentlyRenderingFiber = null
    workInProgressHook = null
    currentHook = null
    return children
}
```

```
renderWithHooks(fiber)
  输入: 函数组件的 wip fiber
  输出: 组件函数的返回值（React Element，交 reconcileChildren diff）
  过程: 置上下文（currentlyRenderingFiber / 空链尾 / 空对齐指针）→ 执行组件函数
        （期间 useState/useEffect 经全局指针读写这条 fiber）→ finally 清上下文
```

`updateQueue` 是本次 render 的 **effect 收集区**：useEffect 在渲染期间只"登记"，真正执行推迟到 commit 的 passive 段（4.5）——这就是"render 阶段无副作用"原则在 hooks 层的落实。

### 3.2 hooks 链表：状态按调用顺序排排坐

挂载路径：新建 hook 接到 `fiber.memoizedState` 链尾；更新路径：从旧 fiber 的链上取"同位置"的 hook 配对：

> 摘自 `./code/react/mini-react/lib/hooks.js`

```js
/**
 * 挂载路径：新建一个 hook，接到 fiber.memoizedState 这条链的末尾。
 *
 * @returns {Object} hook：{ memoizedState, queue, next }
 *   - memoizedState：useState 存 state；useEffect 存 effect 对象
 *   - queue：useState 的 action 队列（本渲染与旧 hook 共享同一对象）
 */
function mountWorkInProgressHook() {
    const hook = { memoizedState: null, queue: { pendingActions: [] }, next: null }
    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = hook // 链表头挂到 fiber 上
    } else {
        workInProgressHook.next = hook
    }
    workInProgressHook = hook
    return hook
}

/**
 * 更新路径：从旧 fiber 的 hook 链上取"同位置"的 hook，生成与之配对的新 hook。
 * 两个关键共享：
 *   ① queue 共享——dispatch 往旧 hook 的队列里 push 的 action，这里能读到；
 *   ② 链表按调用顺序对齐——所以 Hooks 必须无条件调用，顺序一变就对不上号。
 *
 * @returns {Object} 与旧 hook 配对的新 hook
 */
function updateWorkInProgressHook() {
    if (currentHook === null) {
        // 本次 render 的第一个 hook：从旧 fiber 的链头开始
        const currentFiber = currentlyRenderingFiber.alternate
        currentHook = currentFiber ? currentFiber.memoizedState : null
    } else {
        currentHook = currentHook.next // 后续 hook：沿旧链往后走一格
    }
    if (currentHook === null) {
        // 旧链上没有对应位置（首次出现的 hook）→ 按挂载处理。
        // 真实 React 会在开发模式下报警"Hooks 顺序变了"，教学版从简。
        return mountWorkInProgressHook()
    }
    const hook = { memoizedState: currentHook.memoizedState, queue: currentHook.queue, next: null }
    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = hook
    } else {
        workInProgressHook.next = hook
    }
    workInProgressHook = hook
    return hook
}
```

```
mountWorkInProgressHook()
  输入: void（隐式依赖 currentlyRenderingFiber / workInProgressHook 两个全局指针）
  输出: 新 hook（接到 fiber.memoizedState 链尾）
  过程: 建 { memoizedState, queue, next } → 链头空则挂头、否则接尾 → 尾指针后移
updateWorkInProgressHook()
  输入: void（currentHook 沿旧链对齐）
  输出: 与旧 hook 配对的新 hook
  过程: currentHook 首次从旧 fiber 链头取、否则 next 一格 → 旧链没有该位置则退化为挂载 →
        新 hook 继承旧 memoizedState、共享旧 queue → 接入新链尾
```

**为什么 Hooks 不能写在 `if` / 循环里？** 链表是按**调用顺序**对齐的：第一次渲染 `useState`、`useEffect` 依次挂成 `[state] → [effect]`；下次渲染如果 `if` 分支少调了一个 Hook，`currentHook` 沿旧链走一格就对到了错误的位置上——状态错位、错乱。状态本身不在闭包里，而在链表位置上，位置就是身份。

**为什么每个组件的状态互不干扰？** 每个函数组件有自己的 fiber，`memoizedState`（链表头）挂在各自 fiber 上；`currentlyRenderingFiber` 全局指针保证 Hooks 读写的是"正在渲染的这个组件"的链。

### 3.3 useState：记动作，等回放

`useState` 的核心思路是**把"结算"推迟到下次 render**：dispatch 只记动作（push 进 `hook.queue.pendingActions`）+ 请求调度；真正把 action 依序"回放"成新 state 的时机，是下一次渲染时 `useState` 被再次调用的那一刻：

> 摘自 `./code/react/mini-react/lib/hooks.js`

```js
/**
 * 状态钩子。挂载时初始化 state；更新时把队列里的 action 依序"回放"出新 state。
 *
 * 注意 dispatch 里只有"记动作 + 请求调度"两步——setState 之后立刻读变量
 * 拿到的还是旧值，因为结算要等下一次 render（这与 React 行为一致）。
 *
 * @param {*} initialState - 初始状态（函数则惰性求值）
 * @returns {Array} [state, dispatch]
 *
 * @example
 *   const [message, setMessage] = useState('Hello React!')
 *   const [count, setCount] = useState(0)
 *   setCount(count + 1)       // 记一个直接值
 *   setCount(c => c + 1)      // 记一个基于上次 state 的函数
 */
function useState(initialState) {
    const isMount = currentlyRenderingFiber.alternate === null
    const hook = isMount ? mountWorkInProgressHook() : updateWorkInProgressHook()

    if (isMount) {
        hook.memoizedState = isFunction(initialState) ? initialState() : initialState
    } else {
        // 回放：从"上次提交的 state"出发，把本次 render 前积累的所有 action 依序结算。
        // 队列不在这一步清空——被中断的 render 丢弃后重放仍能算对，
        // 等 commit 成功后由 clearPendingActions 统一清（见 index.js）。
        let state = hook.memoizedState
        const actions = hook.queue.pendingActions
        for (const action of actions) {
            state = isFunction(action) ? action(state) : action
        }
        hook.memoizedState = state
    }

    // dispatch 闭包抓住 hook：无论哪个 render 发出的 dispatch，
    // 都写到同一个共享队列（hook.queue 与旧 hook 共享）→ 不会丢更新
    const dispatch = action => dispatchSetState(hook, action)
    return [hook.memoizedState, dispatch]
}

/**
 * setState 的真身：记下动作 + 请求一次根级重渲染。
 * （源码 dispatchSetState 还带 eagerState 急切计算优化，教学版从简）
 *
 * @param {Object} hook - dispatch 所属的 hook（queue 上记动作）
 * @param {*|Function} action - 新值或更新函数
 */
function dispatchSetState(hook, action) {
    hook.queue.pendingActions.push(action)
    scheduleRootUpdate() // reconciler 里定义：合并调度一次从根开始的 render
}
```

```
useState(initialState)
  输入: 初始状态（函数则惰性求值）
  输出: [state, dispatch]
  过程: 挂载 → 建 hook 存初始值；更新 → 从共享 queue 把 pendingActions 依序回放出
        新 state（函数 action 收上一次 state，直接值直接覆盖）
dispatchSetState(hook, action)
  输入: 新值或更新函数
  输出: void（副作用：action 入队 + 请求一次根级 render）
  过程: hook.queue.pendingActions.push(action) → scheduleRootUpdate()
```

四个关键设计：

- **setState 后同步读是旧值**：dispatch 只记了动作，`message` 这个变量要到下一次 render 时才被重新赋值——与 React 行为一致（实测对照见 5.2）。
- **函数式更新 `c => c + 1`**：回放时 action 收上一次回放的 result——所以"基于上次 state"的更新在批处理下也正确（5.3）。
- **queue 共享**：更新路径的 `updateWorkInProgressHook` 让新 hook 与旧 hook **共用同一个 queue 对象**——render 之前任何时刻 push 的 action 都不会丢。
- **队列在 render 时不清空**：被时间片打断的 render 会被整体丢弃重来（4.4），重放后结果仍正确；等 commit 成功才由 `clearPendingActions` 统一清（4.5）。

### 3.4 useEffect：登记进收集区，commit 后先清后建

> 摘自 `./code/react/mini-react/lib/hooks.js`

```js
/**
 * 副作用钩子。挂载：effect 进收集区，commit 后必执行。
 * 更新：先比 deps——没变就什么都不记（旧 effect 原样保留，destroy 继续有效）；
 *       变了就把旧 destroy 带进新 effect，commit 后先清后建。
 *
 * deps 传 undefined（不写第二参）= 每次渲染都执行，与 React 语义一致。
 *
 * @param {Function} create - 副作用函数，返回值作为清理函数（destroy）
 * @param {Array} [deps] - 依赖数组
 *
 * @example
 *   useEffect(() => { log('message 变了') }, [message])
 *   useEffect(() => { log('挂载了'); return () => log('卸载了') }, [])
 */
function useEffect(create, deps) {
    const isMount = currentlyRenderingFiber.alternate === null
    const hook = isMount ? mountWorkInProgressHook() : updateWorkInProgressHook()

    if (isMount) {
        const effect = { create, deps: deps === undefined ? null : deps, destroy: null }
        hook.memoizedState = effect
        currentlyRenderingFiber.updateQueue.push(effect) // 进本次 render 的收集区
        return
    }

    const oldEffect = currentHook.memoizedState
    if (areHookInputsEqual(deps, oldEffect.deps)) {
        hook.memoizedState = oldEffect // deps 没变：新链直接复用旧 effect，不进收集区
        return
    }
    // deps 变了：destroy 带着旧清理函数，flush 时"先 destroy 再 create"
    const effect = { create, deps: deps === undefined ? null : deps, destroy: oldEffect.destroy }
    hook.memoizedState = effect
    currentlyRenderingFiber.updateQueue.push(effect)
}

/**
 * 依赖数组浅比较。任一侧为 null/undefined（没写 deps）→ 视为变化，每次都执行。
 * 逐位 Object.is：与 React 的 areHookInputsEqual 同款（NaN 正确、+0/-0 区分）。
 *
 * @param {Array|null} nextDeps - 本次声明的 deps
 * @param {Array|null} prevDeps - 上次的 deps
 * @returns {boolean} true = 依赖没变，effect 跳过
 */
function areHookInputsEqual(nextDeps, prevDeps) {
    if (nextDeps === null || prevDeps === null) return false
    if (nextDeps.length !== prevDeps.length) return false
    for (let i = 0; i < nextDeps.length; i++) {
        if (!Object.is(nextDeps[i], prevDeps[i])) return false
    }
    return true
}
```

```
useEffect(create, deps)
  输入: 副作用函数 + 依赖数组（undefined = 每次渲染都执行）
  输出: void（副作用：effect 登记进 fiber.updateQueue，等 commit 执行）
  过程: 挂载 → 直接登记（commit 后必执行）；更新 → areHookInputsEqual 浅比较 deps，
        没变复用旧 effect 不登记（依赖数组的优化效果），变了带旧 destroy 登记
```

三个要点：

- **deps 没变 = 完全跳过**：新链直接复用旧 effect、不进收集区——commit 的 passive 段遍历收集区时根本看不到它，这就是"依赖数组省执行"的机制本体。
- **先 destroy 再 create**：deps 变了的新 effect 带着 `oldEffect.destroy`，commit 后先跑旧清理再建新的（4.5 的 `flushPassiveEffects`）。
- **浅比较**：`Object.is` 逐位比较——传对象字面量 `{}` 每次渲染都是新引用，deps 永远"变了"（这是《React 性能优化》里 useMemo/useCallback 存在的直接原因）。

## 四、运行时原理

> 示意片段（无配套脚本）

```
      setState / root.render(element)
           │ 4.4 调度衔接：action 入队 → scheduleRootUpdate → 宏任务 performRootWork
           ▼
   prepareFreshStack ◄──── 2.3 双缓冲：为 current 根造 wip 副本，游标指向它
           ▼
   workLoop 逐 fiber 推进 ◄──── 2.5 递归改循环（每步可让出，见 2.4）
           │
   beginWork ────────► 4.1 向下：组件执行 / 孩子.elements
           ▼
   reconcileChildren ─► 4.3 keyed diff：头同步 → 尾同步 → 乱序区（复用/新建/删除记账）
           ▼
   completeWork ─────► 4.2 向上：创建/复用 DOM 实例，flags 记账（不插入！）
           ▼
   commitRoot ───────► 4.5 mutation（先删后插）→ passive（useEffect）→ 切换 current
           ▼
       真实 DOM
```

心智模型一句话：**render 阶段只建树和记账（可中断、不碰 DOM），commit 阶段照单执行（不可中断、一次落定）**。4.1~4.5 按这张图各讲一环；实测运行数据集中在五章。

### 4.1 beginWork：向下，diff 出孩子 fiber 链

beginWork 处理 fiber 的"向下"部分——按 tag 分派，算出孩子 elements 并交给 `reconcileChildren` diff 成孩子 fiber 链。它只建树和记账，不碰 DOM：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 处理传入 fiber 的"向下"部分：算出孩子 elements 并 diff 成孩子 fiber 链。
 * 只负责建 fiber 树和记账，不碰 DOM（DOM 操作全部推迟到 commit）。
 *
 * @param {Object} fiber - 正在处理的 fiber
 * @returns {Object|null} 第一个孩子 fiber（无孩子返回 null）
 */
function beginWork(fiber) {
    switch (fiber.tag) {
        case FiberTag.HostRoot:
            // 根：pendingProps 就是 createRoot().render(element) 的那个 element
            return reconcileChildren(fiber, [fiber.props])
        case FiberTag.FunctionComponent:
            // 函数组件：执行组件函数（hooks.js 上下文内），拿孩子 elements
            return reconcileChildren(fiber, [renderWithHooks(fiber)])
        case FiberTag.HostComponent:
            // 宿主元素：props.children 就是孩子
            return reconcileChildren(fiber, [fiber.props.children])
        case FiberTag.HostText:
        default:
            return null // 文本没有孩子
    }
}
```

```
beginWork(fiber)
  输入: 正在处理的 fiber
  输出: 第一个孩子 fiber（无孩子返回 null）
  过程: 按 tag 分派——HostRoot 取 render(element) 的 element / FunctionComponent 跑
        renderWithHooks 执行组件函数 / HostComponent 取 props.children → 全部交给
        reconcileChildren diff 成孩子链
```

| tag | 孩子从哪来 | 说明 |
| --- | --- | --- |
| `HostRoot` | `fiber.props`（即 render(element) 的 element） | 根的"孩子"就是应用根组件 |
| `FunctionComponent` | `renderWithHooks(fiber)` 的返回值 | 执行组件函数；hooks 在此上下文内工作（三章） |
| `HostComponent` | `fiber.props.children` | Element 阶段已归一化的孩子 |
| `HostText` | — | 文本没有孩子，beginWork 直接返回 null |

### 4.2 completeWork：向上，宿主实例的创建与复用

beginWork 返回 null（没孩子）后，completeWork 给 fiber"收尾"——宿主 fiber 在这里创建/复用 DOM 实例并记账。注意：**创建实例 ≠ 插入 DOM**——插入统一由 commit 按 Placement 执行：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 处理 fiber 的"收尾"部分：宿主 fiber 在这里创建/复用 DOM 实例并记账。
 * 注意：创建实例 ≠ 插入 DOM——插入统一由 commit 按 Placement 执行，
 * 这让"先删后插、锚点定位"有单一的执行时机。
 *
 * @param {Object} fiber - 无孩子的 fiber（beginWork 返回 null 后落到这里）
 */
function completeWork(fiber) {
    if (fiber.tag === FiberTag.HostComponent) {
        if (fiber.alternate !== null && fiber.alternate.stateNode !== null) {
            fiber.flags |= FiberFlags.Update // 复用旧实例：commit 时 diff 属性
        } else {
            fiber.stateNode = createInstance(fiber.type) // dom.js：document.createElement
            setInitialProperties(fiber.stateNode, fiber.props) // dom.js：初始属性趁节点还游离在文档外时铺好
            fiber.flags |= FiberFlags.Placement // 新实例：commit 时插入
        }
    } else if (fiber.tag === FiberTag.HostText) {
        if (fiber.alternate !== null && fiber.alternate.stateNode !== null) {
            fiber.flags |= FiberFlags.Update
        } else {
            fiber.stateNode = createTextInstance(fiber.props.nodeValue) // dom.js：createTextNode
            fiber.flags |= FiberFlags.Placement
        }
    }
    // FunctionComponent / HostRoot 没有 stateNode，什么都不做
}
```

```
completeWork(fiber)
  输入: 无孩子的 fiber（beginWork 返回 null 后落到这里）
  输出: void（副作用：宿主 fiber 拿到 stateNode，flags 记上 Placement 或 Update）
  过程: 有旧影子（alternate.stateNode）→ 复用实例记 Update；没有 → createElement/
        createTextNode 建实例 + 趁游离在文档外铺初始属性 + 记 Placement
```

为什么初始属性要趁节点**游离在文档外**时铺？节点一旦插入文档，改属性就可能触发中间态的重排/重绘；游离状态下铺好再插入，插入时就是"成品节点"。

### 4.3 reconcileChildren：同位复用 + keyed diff

这是 React diff 的全部家当（源码 `ReactChildFiber.js`）。先立三条启发式（React 官方文档同款）——它们把 O(n³) 的树比较降到 O(n)：

1. **不同类型的元素 → 直接重建**：type 变了（`div` 变 `span`、组件换成别的组件），销毁旧子树、重建新树。
2. **同类型 → 复用实例，只更新 props**：DOM 实例从 `createWorkInProgress` 继承（2.3），commit 时只 diff 属性。
3. **同层兄弟列表 → 用 key 加速配对**：跨层级不比较，只在同一父节点的孩子间 diff；key 用来识别"列表里哪个节点是哪个节点"。

#### 4.3.1 算法总览与复用判定

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 核心算法（对齐 React reconcileChildFibers 的多轮结构）：
 *   第一轮 从头同步：key 与 type 都相同的成对复用，遇到不同立即停；
 *   快速通道 旧链耗尽   → 剩余新 elements 全部挂载（新列表更长）
 *   快速通道 新链耗尽   → 剩余旧 fibers 全部删除（旧列表更长）
 *   第二轮 从尾同步：两头都剩 → 先把公共尾巴对齐，缩小乱序区；
 *   乱序区  以 key 建 map：新表逐个找旧 fiber——找到就复用（用 lastPlacedIndex
 *           判定要不要"移动"），找不到就新建；map 里剩下的旧 fiber 全部删除。
 *
 * @param {Object} wipFiber - 父 fiber（孩子链挂它的 child/sibling）
 * @param {Array} elements - 孩子elements（扁平化、去掉 null 之后）
 * @returns {Object|null} 第一个孩子 fiber
 *
 * @example
 *   // [a,b,c,d,e] → [a,d,f,b,e]（key 同步走一遍）：
 *   // 头同步接住 a；尾同步接住 e；乱序区：d 复用原位、f 新建、b 移动、c 删除
 */
function reconcileChildren(wipFiber, elements) {
    // 扁平化嵌套数组 + 丢掉 null（JSX 里条件渲染 {ok && <X/>} 的常态）
    const children = elements.flat(Infinity).filter(el => el !== null && el !== undefined)
    const current = wipFiber.alternate
    let oldFiber = current !== null ? current.child : null

    // 统一的"往结果链尾部追加"：head/tail 两个游标贯穿四个阶段，
    // 避免"头指针 + 局部子链拼接"容易接错头的经典 bug
    let head = null
    let tail = null
    const append = fiber => {
        if (tail === null) head = fiber
        else tail.sibling = fiber
        tail = fiber
    }
```

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * diff 复用判定：key 与 type 都相同才复用（React 的 key 策略本体）。
 *
 * @param {Object} fiber - 旧 fiber
 * @param {Object} element - 新 element
 * @returns {boolean}
 */
function isReusable(fiber, element) {
    return fiber.key === element.key && fiber.type === element.type
}

/**
 * 收尾：孩子链头挂到父 fiber 的 child 上，父 return 指回父 fiber。
 *
 * @param {Object} wipFiber - 父 fiber
 * @param {Object|null} head - 孩子链头
 * @returns {Object|null} 链头
 */
function finishChildren(wipFiber, head) {
    wipFiber.child = head
    for (let node = head; node !== null; node = node.sibling) {
        node.return = wipFiber
    }
    return head
}
```

```
reconcileChildren(wipFiber, elements)
  输入: 父 fiber + 孩子 elements（可含嵌套数组 / null）
  输出: 孩子链头（挂到 wipFiber.child，各节点 return 回指父 fiber）
  过程: flatten + 滤 null → 头同步 → 快速通道（旧耗尽全挂 / 新耗尽全删）→
        尾同步 → 乱序区（key 索引 + lastPlacedIndex 判移动）→ finishChildren 收尾
```

复用判定 `isReusable` 就是三条启发式的第 1、3 条的代码形态：**key 与 type 都相同才算同一个节点**。这也解释了两个日常规约：key 是 diff 的配对依据而不是 DOM 属性（1.3）；用 index 当 key 时，插入/删除会让"同 index"的节点被误认成同一个——内容串位、状态错乱。

#### 4.3.2 头同步与两条快速通道

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
    // —— 第一轮：从头同步 ——
    let newIdx = 0
    for (; newIdx < children.length && oldFiber !== null; newIdx++) {
        const element = children[newIdx]
        if (!isReusable(oldFiber, element)) break // 类型或 key 对不上 → 进入后面的分支
        const newFiber = createWorkInProgress(oldFiber, element.props)
        newFiber.index = newIdx
        append(newFiber)
        oldFiber = oldFiber.sibling
    }

    // 快速通道：旧链耗尽（或本来就是挂载）→ 剩余新 elements 批量 mount
    if (oldFiber === null) {
        for (; newIdx < children.length; newIdx++) {
            const newFiber = createFiberFromElement(children[newIdx])
            newFiber.index = newIdx
            newFiber.flags |= FiberFlags.Placement
            append(newFiber)
        }
        return finishChildren(wipFiber, head)
    }

    // 快速通道：新链耗尽 → 剩余旧 fibers 全部删除（旧列表更长的收尾）
    if (newIdx >= children.length) {
        for (; oldFiber !== null; oldFiber = oldFiber.sibling) {
            deletions.push(oldFiber)
        }
        return finishChildren(wipFiber, head)
    }
```

头同步从队首点名：key + type 相同 → `createWorkInProgress` 复用（0 宿主操作），遇到不同**立即停**——"跳过不匹配的继续往后找同类"是乱序区的活，这里不做。两条快速通道覆盖最常见场景：**尾部追加**（新列表更长，剩余新 elements 全记 Placement）与**尾部移除**（旧列表更长，剩余旧 fiber 全进 deletions）。实测演示见 5.5。

#### 4.3.3 尾同步与乱序区

两头都有剩余时，先把公共尾巴对齐（缩小乱序区），再进乱序区做 key 配对：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
    // 剩余旧 fibers 收进数组：单链表只能从头往后走，"从尾同步"需要反向下标
    const remainingOld = []
    for (let f = oldFiber; f !== null; f = f.sibling) remainingOld.push(f)

    // —— 第二轮：从尾同步（两头都有剩余时，先把公共尾巴摘出去）——
    let newEnd = children.length - 1
    const tailFibers = [] // 从尾往头收集复用的尾巴 fiber（tailFibers[0] 是最靠后的孩子）
    while (
        remainingOld.length > 0 &&
        newEnd >= newIdx &&
        isReusable(remainingOld[remainingOld.length - 1], children[newEnd])
    ) {
        const oldTail = remainingOld.pop() // 从旧数组尾部摘
        const newFiber = createWorkInProgress(oldTail, children[newEnd].props)
        newFiber.index = newEnd
        tailFibers.push(newFiber)
        newEnd--
    }
    // 尾巴 fibers 属于孩子链的"最后一段"，等乱序区追加完再倒序补上（tailFibers[0] 是最靠后的孩子）
```

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
    // —— 乱序区：newIdx..newEnd 与 remainingOld 里剩下的旧 fibers ——
    // key → 旧 fiber 的映射（教学版假定乱序区元素都有 key；无 key 退化为按"隐式 key"即位次配对）
    const existingFibers = new Map()
    for (let i = 0; i < remainingOld.length; i++) {
        const f = remainingOld[i]
        // 隐式 key = 它在旧列表中的位次（前面已被头同步/尾同步消耗的位次不会出现在这里）
        existingFibers.set(f.key === null ? `__idx_${newIdx + i}` : f.key, f)
    }

    let lastPlacedIndex = 0 // 已处理复用节点在旧链中的最大 index——移动判定基准
    for (; newIdx <= newEnd; newIdx++) {
        const element = children[newIdx]
        const mapKey = element.key === null ? `__idx_${newIdx}` : element.key
        const old = existingFibers.get(mapKey)
        existingFibers.delete(mapKey)
        let newFiber
        if (old !== undefined && old.type === element.type) {
            // 复用：要不要动？旧 index 小于已锚定的最大 index → 它前面的兄弟被挪走了/删了 → 必须移动
            newFiber = createWorkInProgress(old, element.props)
            newFiber.index = newIdx
            if (old.index < lastPlacedIndex) {
                newFiber.flags |= FiberFlags.Placement // 复用节点"移动"也是 Placement（insertBefore）
            } else {
                lastPlacedIndex = old.index
            }
        } else {
            newFiber = createFiberFromElement(element) // 全新挂载
            newFiber.index = newIdx
            newFiber.flags |= FiberFlags.Placement
        }
        append(newFiber)
    }
    for (let i = tailFibers.length - 1; i >= 0; i--) append(tailFibers[i]) // 尾巴段最后入链：倒序追加 = 链表正序
    // map 里没被摘走的 = 新列表里已经不存在的旧 fiber → 删除
    existingFibers.forEach(fiber => deletions.push(fiber))
    return finishChildren(wipFiber, head)
}
```

```
乱序区
  输入: 新列表剩余段 children[newIdx..newEnd] + 旧链剩余 fibers（remainingOld）
  输出: 复用/新建的 fiber 依序 append 进结果链；查无此 key 的旧 fiber 进 deletions
  过程: 旧 fibers 以 key 建 Map（无 key 用隐式位次）→ 新表逐个查表——
        查到且 type 同 → createWorkInProgress 复用，old.index < lastPlacedIndex 则记
        Placement（移动）；查不到 → createFiberFromElement 新建记 Placement →
        最后 Map 里剩谁删谁
```

**移动判定的直觉**：`lastPlacedIndex` 记录"已处理复用节点在旧链里的最大位次"。新表从左往右扫，如果一个复用节点的旧位次**小于**这个值，说明它前面的某个兄弟被挪走/删掉了，它必须跟着挪（记 Placement，DOM 层 `insertBefore` 即移动）；一路递增说明旧序与新序一致，原地不动。

**五幕走读**——demo「乱序 + 插删」按钮：todos `[a, b, c, d, e]`（key 1~5）→ `[a, d, f, b, e]`（key 1、4、6、2、5）。ul 的孩子 fiber 链旧序 `a(1) b(2) c(3) d(4) e(5)`，新 elements 序 `a(1) d(4) f(6) b(2) e(5)`：

```
第 1 幕 头同步：a ✓ 复用（index 0）；b vs d ✗ 停 → newIdx = 1
第 2 幕 快速通道：两头都有剩，不触发
第 3 幕 尾同步：e ✓ 复用；d vs b ✗ 停 → newEnd = 3，tailFibers = [e]
        remainingOld = [b(index1), c(index2), d(index3)]
第 4 幕 乱序区（children[1..3] = d, f, b）：
        索引  {key2: b, key3: c, key4: d}，lastPlacedIndex = 0
        d → 查到（index 3）→ 3 ≥ 0 → 不动，lastPlacedIndex = 3
        f → 查无 → 新建 + Placement（挂载）
        b → 查到（index 1）→ 1 < 3 → Placement（移动）
        Map 里剩 key3(c) 没人认领 → deletions
第 5 幕 入链：乱序区结果 [d', f', b'] 追加后接尾巴 e → 链序 a d f b e
```

diff 全程只在 fiber 上记账，宿主操作交给 commit：**remove c + insert f + insert b（= 移动）共 3 次 DOM 动作，a、e 一根手指都不动**。实测留痕见 5.4。

#### 4.3.4 与 Vue patchKeyedChildren 的异同

Vue3 的 `patchKeyedChildren`（《Vue3 原理》5.3.4）与 React 的乱序区算法同源——都是双端同步 + key 索引，但两处分叉值得对照：

| 环节 | React（reconcileChildren） | Vue（patchKeyedChildren） |
| --- | --- | --- |
| 头同步 / 尾同步 | 相同：key + type 相同成对复用，遇不同即停 | 相同 |
| 快速通道 | 相同：一边耗尽 → 剩余全挂载 / 全删除 | 相同 |
| 乱序区索引 | key → **旧 fiber** 的 Map，新表逐个查 | keyToNewIndex（key → 新下标）+ 反查产出 newIndexToOldIndexMap |
| 移动判定 | **lastPlacedIndex 贪心**（O(n)）：旧位次逆序即记 Placement | **LIS 最长递增子序列**（O(n log n)）：LIS 命中的节点保证不挪，把移动次数压到最少 |
| 落 DOM 时机 | diff 只记账（flags），commit 统一按先序插入/移动 | diff 过程中直接 mount / insert（从后往前找 anchor） |
| 无 key 退化 | 隐式 key = 位次（`__idx_n`） | 按下标硬对齐（`s2 + (j - s1)`） |

两个算法追求的目标一致（最小化真实 DOM 操作），差别在"移动次数最少"这件事上的取舍：React 的 lastPlacedIndex 是 O(n) 贪心，某些乱序形态下移动次数不是全局最优；Vue 用二分求 LIS 保证最少移动，代价是 O(n log n)。另外 React 把"动 DOM"统一推迟到 commit（render/commit 分离更彻底），Vue 在 diff 中就地落 DOM——这是两套架构最大的工程取向差异。

### 4.4 调度衔接：setState → 合并成一次从根开始的 render

reconciler 侧的调度状态机——`setState` 的终点不是渲染，而是"把待办挂到根上"：

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
// ============================================================
// render 阶段的全局工作状态（源码 ReactFiberWorkLoop.js 的同名变量）
// ============================================================
let currentRootFiber = null // 已上屏的 HostRoot fiber（current 树的根）
let wipRoot = null // 正在构建的 HostRoot fiber（wip 树的根）
let nextUnitOfWork = null // 下一个要推进的 fiber（时间片循环的游标）
let deletions = [] // 本轮 diff 判定的删除（commit 先删后插）
let pendingRootElement = null // render(element) 等待处理的根元素
let hasPendingRootWork = false // 是否有等待处理的 render（挂载或任意 setState 都会置位）
let isWorkScheduled = false // 是否已有一次 render 在调度管道里（合并重复调度）
let renderCount = 0 // 教学观测：从根发起的 render 次数（demo 用它验证批处理）
```

> 摘自 `./code/react/mini-react/lib/reconciler.js`

```js
/**
 * 请求一次更新。只在"还没有 render 在管道里"时真正排任务——
 * 同一宏任务里的多次 setState 在这里被合并成一次 render（批处理）。
 */
function scheduleRootUpdate() {
    hasPendingRootWork = true
    if (isWorkScheduled) return
    isWorkScheduled = true
    scheduleCallback(performRootWorkAndRelease)
}

/**
 * performRootWork 的包装：先解除"占用"再干活——commit 执行 useEffect 时
 * 组件里若又 setState，能立刻排上新一轮 render，不会丢更新。
 *
 * @returns {boolean} true = 时间片耗尽还有剩余工作
 */
function performRootWorkAndRelease() {
    isWorkScheduled = false
    return performRootWork()
}

/**
 * 一次 render 的完整过程：准备新工作栈 → 循环推进 fiber → 跑完就 commit。
 *
 * @returns {boolean} true = 时间片耗尽还有剩余工作（scheduler 会续排下一个时间片）
 */
function performRootWork() {
    if (nextUnitOfWork === null) {
        // 全新 render：可能是 render(element) 挂载，也可能只是某个 setState 的重渲染
        if (!hasPendingRootWork) return false
        hasPendingRootWork = false
        prepareFreshStack(pendingRootElement !== null ? pendingRootElement : currentRootFiber.props)
        pendingRootElement = null
    } else if (hasPendingRootWork) {
        // 上一个 render 被时间片打断、期间又来了新更新：
        // 丢弃进行中的 render 从头再算（action 都记在 hook 队列上，丢了 wip 也不丢更新）
        hasPendingRootWork = false
        prepareFreshStack(pendingRootElement !== null ? pendingRootElement : currentRootFiber.props)
        pendingRootElement = null
    }

    const hasMoreWork = workLoop()
    if (!hasMoreWork) commitRoot() // 树跑完 → 进入 commit（index.js）
    return hasMoreWork
}

/**
 * 开新工作栈：为 current 根造 wip 副本，游标指向它，清空删除清单。
 *
 * @param {Object} element - 根 elements
 */
function prepareFreshStack(element) {
    renderCount++ // 教学观测：每次"从根重渲染"计数 +1
    wipRoot = createWorkInProgress(currentRootFiber, element)
    wipRoot.flags = FiberFlags.NoFlags
    deletions = []
    nextUnitOfWork = wipRoot
}
```

```
scheduleRootUpdate()
  输入: void（隐式：hasPendingRootWork 置位）
  输出: 一次排进 scheduler 的 render 任务（重复调用被 isWorkScheduled 挡掉）
  过程: hasPendingRootWork = true → 管道空闲才 scheduleCallback（多次 setState 合并成一次）
performRootWork()
  输入: 全局状态（nextUnitOfWork / hasPendingRootWork / pendingRootElement）
  输出: true = 时间片耗尽还有剩余工作（scheduler 续排）；false = 树跑完已 commit
  过程: 开新工作栈（或丢弃被新更新打断的半成品 render 重开）→ workLoop →
        跑完即 commitRoot
```

批处理的完整链路：3 次 setState → 3 次 `dispatchSetState` → 3 次 `scheduleRootUpdate`，但 `isWorkScheduled` 让第 2、3 次只置位 `hasPendingRootWork` 就返回；宏任务到来时 `performRootWork` 只跑一次，回放队列里已积累的全部 action（实测见 5.3）。

还有一处巧设计：**被时间片打断的 render 遇上新更新，直接丢弃从头再算**——看起来浪费，其实很划算：hooks 的 action 都记在 `hook.queue` 上（3.3），队列在 commit 前不清空，丢弃 wip 树不丢任何更新；重算的成本低于维护"部分完成"状态的一致性成本。

### 4.5 commit 三阶段：mutation → passive → 切换 current

render 阶段产出的 wip 树带着全套 flags 记账，commit 照单执行。commit 一旦开始**不可中断**——DOM 必须一次性落到一致状态：

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * commit 三段式（教学版对齐 React 的执行顺序，省略 beforeMutation）：
 *   ① mutation：先执行所有删除，再按树的先序遍历执行插入/更新
 *   ② passive：遍历提交后的树，执行 useEffect（先旧 destroy 再新 create）
 *   ③ 切换 current：wipRoot 顶替 currentRootFiber——双缓冲树交换角色，
 *      hooks 的 pendingActions 也随之清空（state 已结算进 memoizedState）
 */
function commitRoot() {
    const root = wipRoot

    // —— mutation：删除优先（React 同款：先删后插，避免锚点被待删节点干扰）——
    for (const fiber of deletions) commitDeletion(fiber)
    if (root.child !== null) commitMutationEffects(root.child)

    // —— passive：useEffect（真实 React 把它排到"绘制之后"的宏任务，教学版就地执行）——
    flushPassiveEffects(root.child)

    // —— 切换 current：双缓冲交接 ——
    currentRootFiber = root
    wipRoot = null
    deletions = []
    clearPendingActions(root.child) // action 已结算进 memoizedState，队列清空防重放
}
```

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 先序遍历 wip 树执行 DOM 变更。先序保证"左边的兄弟先落位"——
 * 后面 fiber 的插入锚点（getHostSibling）因此总是已就位。
 *
 * @param {Object} fiber
 */
function commitMutationEffects(fiber) {
    if (fiber.flags & FiberFlags.Placement) {
        commitPlacement(fiber) // 新挂载 + 复用节点的"移动"，在 DOM 层是同一个动作
        fiber.flags &= ~FiberFlags.Placement // 已落位：清标记，后续锚点判定才能把它当"稳定节点"
    } else if (fiber.flags & FiberFlags.Update) {
        if (fiber.tag === FiberTag.HostText) {
            commitTextUpdate(fiber.stateNode, fiber.props.nodeValue) // 文本：只改 nodeValue
        } else if (fiber.tag === FiberTag.HostComponent) {
            // 元素：实例复用，diff 两份属性表（旧表在 alternate 上）
            commitUpdate(fiber.stateNode, fiber.alternate.props, fiber.props)
        }
        fiber.flags &= ~FiberFlags.Update
    }
    if (fiber.child !== null) commitMutationEffects(fiber.child)
    if (fiber.sibling !== null) commitMutationEffects(fiber.sibling)
}
```

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 把 fiber 的 DOM 实例插到它该在的位置。
 * 锚点 = 新树里"它后面的第一个已在文档中的宿主节点"；找不到就 appendChild。
 * 函数组件 fiber 也会带 Placement（首次挂载时），但它没有 stateNode——
 * 直接跳过，它的宿主孩子各自带 Placement 标记、由自己的 commitPlacement 落位。
 *
 * @param {Object} fiber - 带 Placement 标记的 fiber
 */
function commitPlacement(fiber) {
    if (fiber.tag !== FiberTag.HostComponent && fiber.tag !== FiberTag.HostText) return
    const parentFiber = getHostParentFiber(fiber) // 向上找最近的宿主父节点
    const parentDOM = parentFiber.stateNode // HostRoot 是容器，HostComponent 是元素
    const before = getHostSibling(fiber)
    if (before !== null) {
        insertBefore(parentDOM, fiber.stateNode, before)
    } else {
        appendChild(parentDOM, fiber.stateNode)
    }
}

/**
 * 向上找最近的宿主父节点（函数组件没有 stateNode，会被跳过）。
 *
 * @param {Object} fiber
 * @returns {Object} HostComponent 或 HostRoot fiber
 */
function getHostParentFiber(fiber) {
    let parent = fiber.return
    while (parent !== null && parent.tag !== FiberTag.HostComponent && parent.tag !== FiberTag.HostRoot) {
        parent = parent.return
    }
    return parent
}
```

```
commitRoot()
  输入: wipRoot（render 产出的新树）+ deletions（待删清单）
  输出: void（副作用：DOM 落定、useEffect 执行、current 切换、action 队列清空）
  过程: 先删（避免锚点被待删节点干扰）→ mutation 先序插入/更新 → passive 跑
        useEffect → 双缓冲换根 → clearPendingActions
commitMutationEffects(fiber)
  输入: wip 树任意节点
  输出: void（副作用：按 flags 执行插入/移动/更新，执行完清标记）
  过程: 先序遍历——Placement → commitPlacement；Update → 文本改 nodeValue /
        元素 diff 两份属性表；孩子、兄弟递归
```

插入位置的关键是锚点——"插在谁前面"。`getHostSibling` 是 commit 里最绕的函数，三条规则：

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 找插入锚点：从本 fiber 的弟弟开始，在新树里找"第一个已落定位置的宿主节点"。
 *
 * 三条规则：
 *   ① 弟弟是函数组件 → 下钻它的孩子（DOM 挂在更深处）；
 *   ② 带 Placement 标记的候选一律跳过——新挂载的还没进文档，
 *      待移动的最终位置未定（它自己 commit 时会换到正确位置），
 *      只有"原地不动"的节点才是稳定锚点；
 *   ③ 一路没有 → return null → appendChild 兜底。
 *
 * @param {Object} fiber
 * @returns {Node|null} 锚点节点
 */
function getHostSibling(fiber) {
    let node = fiber
    siblings: while (true) {
        // 没有弟弟 → 看父节点：宿主/根就放弃（锚点必须与自己在同一个宿主父节点里，
        // 继续爬只会爬出子树的 DOM 父节点）；函数组件没有 stateNode，穿过它继续找
        while (node.sibling === null) {
            const parent = node.return
            if (
                parent === null ||
                parent.tag === FiberTag.HostRoot ||
                parent.tag === FiberTag.HostComponent
            ) {
                return null
            }
            node = parent
        }
        node = node.sibling
        while (node.tag !== FiberTag.HostComponent && node.tag !== FiberTag.HostText) {
            // 弟弟是函数组件：带 Placement 的整棵都是新的，下钻也没意义
            if (node.flags & FiberFlags.Placement) continue siblings
            if (node.child === null) continue siblings
            node = node.child
        }
        // 宿主候选：新挂载 / 待移动都位置未定，不能当锚点
        if (node.flags & FiberFlags.Placement) continue siblings
        return node.stateNode
    }
}
```

```
getHostSibling(fiber)
  输入: 带 Placement 的 fiber（要找它的插入位置）
  输出: 锚点 DOM 节点（insertBefore 用）或 null（appendChild 兜底）
  过程: 从弟弟开始向右找第一个宿主节点——函数组件下钻孩子、带 Placement 的候选
        跳过（位置未定）、无弟弟向上穿函数组件父节点；爬到宿主/根还没找到就 null
```

规则②与 commitMutationEffects 的"落位后清 Placement 标记"是一对：先序遍历保证左边的兄弟先落位、落位即清标记，于是右边的 fiber 找锚点时，左侧节点要么本来就稳定、要么已落位变稳定——锚点永远可靠。

删除则反向：**找到子树里第一个宿主节点，摘它一个 = 摘整棵 DOM 子树**，同时同步执行所有函数组件的 effect 清理：

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 删除一个 fiber 子树：
 *   ① 递归找出所有函数组件，同步执行它们的 useEffect destroy（React 在
 *      mutation 阶段执行"卸载型 passive effect"，与真实顺序一致）；
 *   ② 找到子树里第一个宿主节点，从宿主父节点摘除——宿主节点一摘，整棵 DOM 子树跟着走。
 *
 * @param {Object} fiber - 待删除子树的根
 */
function commitDeletion(fiber) {
    let hostNode = null
    const walk = f => {
        if (f.tag === FiberTag.FunctionComponent) {
            let hook = f.memoizedState // hooks 链表：逐个执行 effect.destroy
            while (hook !== null) {
                const effect = hook.memoizedState
                if (effect !== null && effect !== undefined && isFunction(effect.destroy)) {
                    effect.destroy()
                    effect.destroy = null
                }
                hook = hook.next
            }
        }
        if (hostNode === null && (f.tag === FiberTag.HostComponent || f.tag === FiberTag.HostText)) {
            hostNode = f.stateNode // 子树的第一个宿主节点：摘它 = 摘整棵
            return
        }
        for (let child = f.child; child !== null; child = child.sibling) walk(child)
    }
    walk(fiber)
    if (hostNode === null) return
    const parentFiber = getHostParentFiber(fiber)
    removeChild(parentFiber.stateNode, hostNode)
}
```

```
commitDeletion(fiber)
  输入: 待删除子树的根
  输出: void（副作用：子树内全部 effect.destroy 执行 + 第一个宿主节点从 DOM 摘除）
  过程: 递归 walk——函数组件沿 hooks 链逐个跑 destroy（清理定时器/订阅）；命中第一个
        宿主节点记下并停；最后 removeChild 摘掉它（整个 DOM 子树随之离场）
```

passive 段执行 useEffect——遍历提交后的树，只处理"进了收集区"的 effect：

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 遍历提交后的树，执行本次 render 收集的 effect：
 *   先跑旧 destroy（清理），再跑新 create（建立），create 的返回值记为新 destroy。
 * 没进收集区的 effect（deps 没变的）完全不动——这正是依赖数组的优化效果。
 *
 * @param {Object} fiber - 已提交树的任意节点
 */
function flushPassiveEffects(fiber) {
    if (fiber === null) return
    if (fiber.tag === FiberTag.FunctionComponent && fiber.updateQueue !== null) {
        for (const effect of fiber.updateQueue) {
            if (isFunction(effect.destroy)) effect.destroy() // 先清理旧的
            effect.destroy = effect.create() || null // 再建立新的
        }
        fiber.updateQueue = null
    }
    if (fiber.child !== null) flushPassiveEffects(fiber.child)
    if (fiber.sibling !== null) flushPassiveEffects(fiber.sibling)
}

/**
 * 提交完成后清空各 hook 的 pendingActions：
 * 队列里的 action 已经结算进 memoizedState，不清掉下次 render 会重放。
 *
 * @param {Object} fiber
 */
function clearPendingActions(fiber) {
    if (fiber === null) return
    if (fiber.tag === FiberTag.FunctionComponent) {
        let hook = fiber.memoizedState
        while (hook !== null) {
            hook.queue.pendingActions = []
            hook = hook.next
        }
    }
    if (fiber.child !== null) clearPendingActions(fiber.child)
    if (fiber.sibling !== null) clearPendingActions(fiber.sibling)
}
```

```
flushPassiveEffects(fiber)
  输入: 已提交树的任意节点
  输出: void（副作用：收集区里的 effect 先 destroy 后 create）
  过程: 函数组件且 updateQueue 非空 → 逐个先跑旧清理、跑 create 并把返回值记为新
        destroy → 清空收集区 → child / sibling 递归（deps 没变的 effect 不在收集区，零开销）
clearPendingActions(fiber)
  输入: 已提交树的任意节点
  输出: void（副作用：全部 hook 的 pendingActions 清空）
  过程: 递归函数组件的 hooks 链——action 已结算进 memoizedState，不清会重放
```

最后一块拼图在 dom.js——commit 阶段的"手"。元素更新走属性 diff 三步：旧的没了 → 移除；新的多了/变了 → 写入；值没变的一律不碰：

> 摘自 `./code/react/mini-react/lib/dom.js`

```js
/**
 * 更新属性：拿"旧属性表 vs 新属性表"做三步 diff。
 * ① 旧的没了 → 移除；② 新的多了/变了 → 写入；③ 值没变的键一律不碰。
 *
 * @param {HTMLElement} instance - 复用的 DOM 实例
 * @param {Object} prevProps - 上一轮属性（fiber.alternate.props）
 * @param {Object} nextProps - 本轮属性（fiber.props）
 *
 * @example
 *   commitUpdate(el, { className: 'a', onClick: f1 }, { className: 'b', onClick: f1 })
 *   // → 只写 className，事件 f1 相同不重新绑定
 */
function commitUpdate(instance, prevProps, nextProps) {
    // ① 移除：旧有新无（或新值为 null/undefined/false 的清除语义）
    for (const key in prevProps) {
        if (key === 'children') continue
        const nextValue = nextProps[key]
        if (nextValue === undefined) {
            removeProperty(instance, key, prevProps[key])
        } else if (nextValue === null || nextValue === false) {
            removeProperty(instance, key, prevProps[key])
        }
    }
    // ② 新增 / 更新：值不同才动（事件函数也要换——闭包里捕获的 state 得是新值）
    for (const key in nextProps) {
        if (key === 'children') continue
        const prevValue = prevProps[key]
        const nextValue = nextProps[key]
        if (nextValue === undefined || nextValue === null || nextValue === false) continue // 上一步已处理
        if (nextValue !== prevValue) {
            setProperty(instance, key, nextValue, prevValue)
        }
    }
}
```

> 摘自 `./code/react/mini-react/lib/dom.js`

```js
/**
 * 写一个属性，按类别分派到最合适的 DOM API。
 * 顺序：事件 → className → style 对象 → 清除语义 → 表单 property → setAttribute。
 *
 * @param {HTMLElement} instance - 目标元素
 * @param {string} key
 * @param {*} value
 * @param {*} prevValue - 事件属性用它解绑旧回调；初始铺属性时为 undefined
 */
function setProperty(instance, key, value, prevValue) {
    if (isEventKey(key)) {
        const eventName = key.slice(2).toLowerCase() // onClick → click
        if (prevValue) instance.removeEventListener(eventName, prevValue)
        instance.addEventListener(eventName, value)
        return
    }
    if (key === 'className') {
        instance.className = value || ''
        return
    }
    if (key === 'style' && isObject(value)) {
        // 对象 style：逐条写入；旧有新无的条目清空（增量 diff 在 commitUpdate 层做，这里兜底清残留）
        if (isObject(prevValue)) {
            for (const styleName in prevValue) {
                if (!(styleName in value)) instance.style[styleName] = ''
            }
        }
        for (const styleName in value) instance.style[styleName] = value[styleName]
        return
    }
    if (value === null || value === undefined || value === false) {
        removeProperty(instance, key, prevValue)
        return
    }
    if (SHOULD_USE_PROPERTY.test(key)) {
        instance[key] = value // value/checked 等写 property，不写 attribute
        return
    }
    instance.setAttribute(key, value)
}
```

```
commitUpdate(instance, prevProps, nextProps)
  输入: 复用的 DOM 实例 + 新旧两份属性表
  输出: void（副作用：属性 diff 落到 DOM）
  过程: 旧有新无 → removeProperty；值不同（含事件闭包）→ setProperty；值相同零操作
setProperty(instance, key, value, prevValue)
  输入: 单个属性写入
  输出: void（副作用：按类别落到最合适的 DOM API）
  过程: 事件解绑旧绑新 → className → style 对象增量 → 清除语义（null/false → remove）
        → value/checked 写 property → 其余 setAttribute
```

注意事件处理函数：即使闭包"长得一样"，每次 render 产生的新函数引用也会触发解绑旧绑新——因为闭包里捕获的 state 必须是新值。这也是《React 性能优化》里 `useCallback` 稳定引用能省掉重复绑定的原理。


## 五、关键执行链路

本章把前面四章的机制串成"数据改动的完整旅程"，分镜走读。每条链路对应 demo（`code/react/mini-react/demo/demo-app.html`）的一个按钮，实测留痕与正文描述一致——建议开着 demo 点一遍，再在断点建议处单步跟一次。

demo 的组件是一个函数组件，`useState` 持有 message / count / todos，两个 useEffect 分别对应"挂载"与"[message] 依赖"；挂载后把三个 setState 通过 `onReady` prop 递给页面层，页面按钮因此能在组件外触发更新（组件内的 count + 1 按钮走 onClick 闭包，链路相同）。

### 5.1 挂载：createRoot().render(h(App)) → DOM 出现

> 摘自 `./code/react/mini-react/lib/index.js`

```js
/**
 * 官网用法的第一半：createRoot(container) 拿到根。
 * 返回的对象上挂 render（初次挂载 + 后续全部更新的统一入口）与 unmount。
 *
 * 教学版支持单根（模块级全局状态，与真实 React 多 Root 并存不同）。
 *
 * @param {HTMLElement} container - 挂载容器
 * @returns {{render: Function, unmount: Function}}
 *
 * @example
 *   const root = MiniReact.createRoot(document.getElementById('app'))
 *   root.render(h(App, null))
 */
function createRoot(container) {
    const rootFiber = createFiber(FiberTag.HostRoot, null, null)
    rootFiber.stateNode = container
    currentRootFiber = rootFiber // current 树的起点

    let isUnmounted = false
    return {
        /**
         * 渲染 / 更新的统一入口：只记下最新的根元素并请求调度。
         * 多次调用在调度层被合并（同一宏任务只 render 一次）。
         */
        render(element) {
            if (isUnmounted) {
                console.warn('MiniReact: root 已卸载，render 无效（重新加载页面可重看挂载）')
                return
            }
            pendingRootElement = element
            scheduleRootUpdate()
        },
        /** 卸载：执行所有 useEffect destroy + 摘除 DOM。之后 render 不再生效。 */
        unmount() {
            if (isUnmounted) return
            isUnmounted = true
            pendingRootElement = null
            hasPendingRootWork = false
            if (currentRootFiber.child !== null) {
                commitDeletion(currentRootFiber.child) // destroy + 摘 DOM，一套逻辑复用删除链路
            }
            clearContainer(container)
            wipRoot = null
            nextUnitOfWork = null
        }
    }
}
```

```
挂载链路（触发：页面加载即执行 createRoot(...).render(h(App, { onReady })))
createRoot(container)     建 HostRoot fiber（stateNode = 容器），current 树起点
  └► render(h(App))       pendingRootElement = element → scheduleRootUpdate()
      └► scheduler        scheduleCallback(performRootWorkAndRelease) → MessageChannel 宏任务
          └► performRootWork
              ├► prepareFreshStack     为 HostRoot 造 wip 副本（双缓冲起点），renderCount=1
              ├► workLoop
              │    ├► beginWork(HostRoot)        reconcileChildren：App 是全新 element
              │    ├► beginWork(App)             函数组件 → renderWithHooks：
              │    │                               useState ×3 建 hooks 链表
              │    │                               useEffect ×2 登记进 updateQueue
              │    ├► beginWork(div/p/button/ul) 宿主 fiber 逐个 diff（全是新建）
              │    └► completeWork               createElement / createTextNode 建实例
              │                                    （游离在文档外铺属性）+ 记 Placement
              └► commitRoot
                   ├► mutation   commitMutationEffects 先序遍历：每个宿主 fiber
                   │             commitPlacement → getHostSibling 找锚点 → appendChild
                   ├► passive    flushPassiveEffects：useEffect([]) 执行 → onReady 递出
                   │             setState 集合；useEffect([message]) 执行 → lifeMark 留痕
                   └► 切换 current  currentRootFiber = wipRoot，clearPendingActions
```

实测留痕（demo）：`#app` 渲染出 message / count / count + 1 按钮 / 五条列表；`useEffect 留痕`面板显示「挂载完成（useEffect([]) 已执行）」。

断点建议：`scheduler.js` 的 `scheduleCallback`（看宏任务怎么排上）；`reconciler.js` 的 `performUnitOfWork`（单步看 fiber 逐个推进）；`hooks.js` 的 `mountWorkInProgressHook`（看 hooks 链表建立）。

### 5.2 更新 · 改 message：setState 同步读 vs 宏任务后

触发方式：demo「改 message」按钮——`setMessage(m => (m === 'Hello React!' ? 'Hello MiniReact!' : 'Hello React!'))`。

```
更新链路（与挂载共用的部分只列差异）
dispatchSetState(hook, action)   action 入 hook.queue.pendingActions
  └► scheduleRootUpdate          hasPendingRootWork = true；管道空闲 → scheduleCallback
      └► performRootWork
          ├► prepareFreshStack    为 current 根造 wip 副本；renderCount=2
          ├► workLoop
          │    ├► beginWork(App)  renderWithHooks 重新执行组件函数：
          │    │                    useState → updateWorkInProgressHook 配对旧 hook，
          │    │                    回放 pendingActions：message 结算成新值
          │    │                    useEffect([message])：deps 变了 → 带旧 destroy 登记
          │    │                    message 文本元素：type/key 相同 → 复用 fiber，记 Update
          │    └► completeWork     文本 fiber 有旧影子 → 记 Update（实例继承，不重建）
          └► commitRoot
               ├► mutation         commitTextUpdate：只改 nodeValue——文本更新不换节点
               ├► passive          先跑上一次的 destroy（「上一次 effect 的清理执行」）
               │                   再跑新 create（「useEffect([message]) 触发：message=新值」）
               └► 切换 current
```

实测留痕（demo 的 tickMark）：点击瞬间同步读 DOM——

```
同步读=「Hello React!」（DOM 未动） → 宏任务后读=「Hello MiniReact!」（已落定）
```

同步读到的还是旧值，因为 dispatch 只记了 action（3.3）；render+commit 发生在 MessageChannel 排的宏任务里，连页面自己的 `setTimeout(0)` 都排它后面。依赖数组的两个效果同屏可见：message 不变的 render（比如点「count + 1」）里 `[message]` effect 完全不执行；变了则先清后建。

断点建议：`dispatchSetState`（看 action 入队）；`updateWorkInProgressHook`（看 queue 共享与回放）；`commitTextUpdate`（看文本更新只动 nodeValue）。

### 5.3 更新 · 一次改三项：批处理

触发方式：demo「一次改三项（批处理）」按钮——同一宏任务里连发 3 个 setState：

```js
appApi.setMessage('批处理写入')
appApi.setCount(c => c + 1)
appApi.setTodos(t => t.slice(1))
```

```
3 × dispatchSetState → 3 × scheduleRootUpdate
    第 1 次：isWorkScheduled=false → scheduleCallback 排上任务
    第 2、3 次：isWorkScheduled=true → 只置 hasPendingRootWork 就返回（4.4）
宏任务 → performRootWork（只跑一次）
    ├► prepareFreshStack        renderCount +1（只 +1！）
    └► workLoop → commitRoot
         各 useState 回放自己队列里积累的 action：
           message：['批处理写入']       → '批处理写入'
           count：[c => c + 1]          → 旧值 + 1（函数式更新拿的是回放结果）
           todos：[t => t.slice(1)]     → 去掉首项 → keyed diff：头同步全命中
                                          → 快速通道（旧链耗尽）→ 剩余全记 Placement
```

实测留痕（demo 的 tickMark）：`3 次 setState → 从根 render 次数=1（批处理：合并为 1 次）`——`__internal.getRenderCount()` 的前后差值就是"从根 render"的次数。

函数式更新在这里的价值：`c => c + 1` 回放时收到的是**回放链上的上一个结果**——即使三个 action 分属不同 hook 的队列，每个 hook 的多次 action 也依序结算，不会互相覆盖。

断点建议：`scheduleRootUpdate`（看第 2、3 次调用被 `isWorkScheduled` 挡掉）；`useState` 的回放循环（看 3 个 action 依序结算）。

### 5.4 更新 · 乱序 + 插删：keyed diff 全算法

触发方式：demo「乱序 + 插删（keyed diff 全算法）」按钮——todos `[a,b,c,d,e]` → `[a,d,f,b,e]`。算法逐幕推演已在 4.3.3 完整走读，这里补宿主视角：

```
diff 结论（fiber 记账）          commit 宿主动作（mutation 先删后插）
  a  复用 · 原地                  无
  d  复用 · 原地（3 ≥ 0）          无
  f  新建 · Placement            insertBefore（锚点：复用后落位的 b）
  b  复用 · 1 < 3 → Placement    insertBefore（移动 = 同一个动作）
  e  复用 · 尾同步                无
  c  无人认领 → deletions        removeChild（先删阶段执行）
```

实测留痕（demo 渲染区）：列表变为 `#1 a / #4 d / #6 f / #2 b / #5 e`——与 Vue demo 的同数据按钮（`[a,b,c,d,e] → [a,d,f,b,e]`）结果完全一致，可跨框架对照两种 diff 的产物。

锚点正确性依赖 mutation 的两个设计（4.5）：先删后插（c 先离场，不会干扰 f/b 的锚点判定）；先序遍历落位后清 Placement（右侧 fiber 找锚点时左侧已稳定）。

断点建议：`reconcileChildren` 的乱序区（看 `existingFibers` Map 与 `lastPlacedIndex` 的变化）；`getHostSibling`（看 f 的锚点怎么找到 b、b 的锚点为什么是 e）。

### 5.5 更新 · 新列表更长 / 旧列表更长：快速通道

这两条链路是 4.3.2 两条快速通道的实测：

```
「新列表更长（追加一项）」
  [a,b,c,d,e] → [a,b,c,d,e,新6]
  头同步 a b c d e 全部命中 → oldFiber === null
  → 快速通道①：剩余新 elements 批量记 Placement
  → commit：只有 新6 一次 appendChild，前 5 项零 DOM 操作

「旧列表更长（移除末项）」
  [a,b,c,d,e] → [a,b,c,d]
  头同步 a b c d 全部命中 → newIdx 越过 children.length
  → 快速通道②：剩余旧 fiber（e）进 deletions
  → commit：先删阶段 removeChild(e)，前 4 项零 DOM 操作
```

实测留痕（demo 渲染区）：追加后末尾多出 `#6 新6`；移除后最后一项消失，其余项原样（DOM 节点复用，不重建）。

断点建议：`reconcileChildren` 的两条快速通道分支（看 `oldFiber === null` 与 `newIdx >= children.length` 的判定）。

### 5.6 卸载：useEffect destroy → 摘 DOM

触发方式：demo「卸载」按钮——`root.unmount()`：

```
unmount()
  └► commitDeletion(currentRootFiber.child)     复用删除链路（4.5）
       ├► 递归 walk：App（函数组件）hooks 链逐个跑 effect.destroy
       │    → lifeMark：「↳ 上一次 effect 的清理执行」（有 destroy 就清）
       ├► 命中第一个宿主节点（App 的 div）→ removeChild 摘整棵
       └► clearContainer 清空容器
  之后 render 全部无效（isUnmounted 拦截，console 警告）
```

实测留痕（demo）：`#app` 清空；`useEffect 留痕`面板追加「↳ unmount：全部 effect 清理执行完毕，DOM 已摘除」；再点任何页面按钮无反应。重新加载页面可重看完整挂载链路。

卸载与 keyed diff 的删除共用同一条 `commitDeletion` 链路（4.5）——"从 React 树上摘掉"这件事只有一套语义：先清理副作用，再摘宿主节点。

断点建议：`commitDeletion`（看 destroy 的同步执行与"摘一个 = 摘整棵"）。

## 配套代码

| 主题 | 代码位置 | 建议断点 |
| --- | --- | --- |
| Element 工厂（JSX 编译产物层） | `./code/react/mini-react/lib/reconciler.js` · createElement / normalizeChild | `createElement`：看 Element 长什么样 |
| FiberNode 与双缓冲 | `./code/react/mini-react/lib/reconciler.js` · createFiber / createWorkInProgress | `createWorkInProgress`：看 DOM 实例与 hooks 如何继承 |
| 时间分片调度器 | `./code/react/mini-react/lib/scheduler.js` | `performWorkUntilDeadline`：看 5ms 切片与续排 |
| 工作循环（递归改循环） | `./code/react/mini-react/lib/reconciler.js` · performUnitOfWork / workLoop | `performUnitOfWork`：单步看 fiber 如何被逐个推进 |
| Hooks：上下文与链表 | `./code/react/mini-react/lib/hooks.js` · renderWithHooks / mount / update | `updateWorkInProgressHook`：看新旧链表如何配对 |
| Hooks：useState / useEffect | `./code/react/mini-react/lib/hooks.js` · useState / dispatchSetState / useEffect | `dispatchSetState`：看 action 入队 + 排调度 |
| diff：beginWork / completeWork | `./code/react/mini-react/lib/reconciler.js` · beginWork / completeWork | `completeWork`：看实例创建与 flags 记账 |
| diff：keyed diff 全算法 | `./code/react/mini-react/lib/reconciler.js` · reconcileChildren | 乱序区：看 key Map 与 lastPlacedIndex 判移动 |
| 调度衔接与批处理 | `./code/react/mini-react/lib/reconciler.js` · scheduleRootUpdate / performRootWork | `scheduleRootUpdate`：看重复调度被合并 |
| commit 三阶段 | `./code/react/mini-react/lib/index.js` · commitRoot / commitMutationEffects / commitPlacement | `commitRoot`：看先删后插与三段式顺序 |
| 锚点定位 | `./code/react/mini-react/lib/index.js` · getHostSibling | `getHostSibling`：看"插在谁前面"的三条规则 |
| effect 执行与卸载清理 | `./code/react/mini-react/lib/index.js` · flushPassiveEffects / commitDeletion | `flushPassiveEffects`：看先 destroy 后 create |
| 宿主操作（DOM 增删改 + 属性 diff） | `./code/react/mini-react/lib/dom.js` | `commitUpdate`：看三步属性 diff |
| 装配入口与 API 聚合 | `./code/react/mini-react/lib/index.js` · createRoot / window.MiniReact | `createRoot`：看 HostRoot fiber 与 render/unmount |
| 一页跑完全部链路 | `./code/react/mini-react/demo/demo-app.html` | 六个按钮依次对应 5.1~5.6 的链路 |

加载顺序即依赖顺序：`shared.js → scheduler.js → hooks.js → reconciler.js → dom.js → index.js`，全部经 `window.MiniReact` 统一使用。demo 的「断点标注」面板给出了与五章一一对应的断点清单，照着五章边点边跟即可。

## 参考

- 上一篇：[React 使用 CSS](./React%20使用%20CSS.md)
- 下一篇：[React 性能优化](./React%20性能优化.md)
- 本模块总结：[总结](./总结.md)
- React 官方文档（架构与并发渲染）：[react.dev](https://react.dev)
- React 源码仓库：[facebook/react](https://github.com/facebook/react)——`packages/scheduler`、`packages/react-reconciler`、`packages/react-dom`
