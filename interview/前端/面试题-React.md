# 面试题 · React

## 一、React 基础

### 1. JSX 是什么？编译之后变成什么？

- JSX 是 JS 的语法扩展，浏览器不识别，需要 Babel 编译。
- React17 之前编译成 React.createElement，必须引入 React；
- React17 之后自动 runtime 编译成 jsx/jsxs，自动导入 runtime 包，不用手动 import React。
- JSX 不是 HTML，属性要驼峰，大括号内部可以执行 JS。

```
// JSX源码
const el = <div className="box">hello</div>

// 老版本编译产物
const el = React.createElement(
  'div',
  { className: 'box' },
  'hello'
)

// 新版本编译产物
const el = jsx('div', { className: 'box', children: 'hello' })

createElement、jsx 执行返回普通 JS 对象（ReactElement，虚拟 DOM）
{
  $$typeof: Symbol.for('react.element'),
  type: 'div',
  props: { className: 'box', children: 'hello' },
  key: null,
  ref: null
}
```
### 2. React 的单向数据流是什么含义？
- state 只能从父组件流向子组件
- 子组件不能直接修改父传过来的props，想要修改父的数据，只能通过父传给它的回调函数通知父组件修改

```
// 父
function Parent() {
  const [count, setCount] = useState(0)
  return <Child count={count} onAdd={() => setCount(c => c + 1)} />
}

// 子
function Child({ count, onAdd }) {
  return <button onClick={onAdd}>{count}</button>
}
```
### 3. React 事件系统？
- React 合成事件是基于原生 DOM 事件封装的事件系统，采用事件委托机制实现。
- React17 之前委托到 document，React18 之后委托到 root 容器，不会直接给每个DOM 绑定监听器。
- 当原生事件冒泡到 root 后，React 根据 target 找到对应的 Fiber，沿着 Fiber 树收集 handler，自己模拟捕获和冒泡流程，传给回调的是合成事件（SyntheticEvent）对象，可以通过 nativeEvent 拿到原生事件。
- 成事件的 stopPropagation 只能阻止合成事件在 Fiber 树的传播，不能阻断原生 DOM 事件冒泡；
- 合成事件的优势是：
  - 抹平浏览器兼容差异：不同浏览器事件 API、event 属性不一样，统一一套 SyntheticEvent 接口
  - 性能：大量节点只需要一份原生监听，新增 / 删除 DOM 不用反复绑定解绑事件
  - 和 Fiber 架构适配：事件是挂载在 Fiber 节点上，组件销毁自动清理，不用手动 removeEventListener
- 为什么React17 之后事件委托从 document 改到了 root？
  - document 全局唯一，微前端多React 实例共存时容易冲突
  - 改到 root 后作用域限制在各自根节点，拜托全局 document 影响，所以子应用事件隔离更彻底。
- 伪代码理解
```
// 1. jsx 事件属性存进 fiber 的 props
function beginWork(current, workInProgress, renderLanes) {
  if (workInProgress.tag === HostComponent) {
    const props = workInProgress.pendingProps;
    // props 里面包含 onClick、onClickCapture 这些函数
    // 这里仅仅是存起来，不绑定任何DOM事件
    workInProgress.memoizedProps = props;
  }
}
// 2. 初始化 root 的时候，统一注册委托监听器
function listenToAllSupportedEvents(rootContainer) {
  // 遍历所有原生事件名：click、input、keydown...
  for (const eventType of allNativeEvents) {
    // 原生捕获阶段监听
    rootContainer.addEventListener(
      eventType,
      dispatchEvent,
      true
    );
    // 原生冒泡阶段监听
    rootContainer.addEventListener(
      eventType,
      dispatchEvent,
      false
    );
  }
}
// 3. 原生事件触发,根据 target 找到对应的 Fiber,沿着 Fiber 树收集 handler，构造合成对象，js 模拟事件传播执行 handler
// 原生事件触发后执行这个函数
function dispatchEvent(nativeEvent, rootContainer) {
  // 1. 拿到原生DOM目标
  const nativeTarget = nativeEvent.target;
  // 2. 根据DOM节点，找到对应的Fiber节点（关键：DOM → Fiber映射）
  const targetFiber = getEventTarget(nativeTarget);

  // 3. 分两个阶段收集：捕获阶段、冒泡阶段
  // 捕获：从root Fiber往下走到 targetFiber
  const captureListeners = accumulateSinglePhaseListeners(
    targetFiber,
    eventName,
    true // isCapture
  );
  // 冒泡：从 targetFiber 向上走到 root Fiber
  const bubbleListeners = accumulateSinglePhaseListeners(
    targetFiber,
    eventName,
    false
  );

  // 4. 构造合成事件对象 SyntheticEvent
  const syntheticEvent = createSyntheticEvent(nativeEvent);
  function createSyntheticEvent(nativeEvent) {
    const synthetic = {
      nativeEvent,
      isPropagationStopped: false,
      stopPropagation() {
        // 仅仅标记这个flag！只影响上面循环的break
        this.isPropagationStopped = true;
        // 这里不会调用 nativeEvent.stopPropagation()
      },
      preventDefault() {
        nativeEvent.preventDefault();
      }
    };
    return synthetic;
  }

  // 5. 先执行捕获回调，再执行冒泡回调（模拟事件传播）
  for (const listener of captureListeners) {
    listener(syntheticEvent);
    if (syntheticEvent.isPropagationStopped) break;
  }
  for (const listener of bubbleListeners) {
    listener(syntheticEvent);
    if (syntheticEvent.isPropagationStopped) break;
  }
}
```

## 二、函数组件与 state

### 1. setState 是同步还是异步？批处理机制是什么？

- setState 函数本身是同步执行的，它会同步把更新加入 fiber 的更新队列，然后调用 scheduleUpdateOnFiber 交给调度器；但是 state 的计算、组件渲染是异步调度的，所以同步代码里拿不到新 state，本质是闭包快照
- 批处理就是把同一个上下文连续多次 setState 合并，只触发一次渲染。React18 开启自动批处理，不管是事件、setTimeout、Promise 里都会自动批；想要打破批处理强制同步渲染可以用 flushSync。连续更新推荐用函数式更新，保证多次更新依次生效

```
import { useState, flushSync } from 'react'

export default function BatchDemo() {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    console.log('点击开始，count：', count)
    setCount(c => c + 1)
    setCount(c => c + 1)
    console.log('set之后，count：', count) // 闭包，还是旧值！
    // 只会渲染一次，count最终+2
  }

  const handleFlush = () => {
    flushSync(() => {
      setCount(c => c + 1)
    })
    console.log('flushSync后，DOM已经更新，可以拿到新状态相关DOM')
  }

  return <div onClick={handleClick}>{count}</div>
}

```

### 2. React.memo 是什么？浅比较的边界在哪？

**结论：memo 是「props 浅比较拦截重渲染」的高阶包装——props 引用没变就跳过重渲染；边界在引用类型：每次渲染新建的对象/函数字面量浅比较必不等，挡不住。**

- 用法
  - `memo(Comp)` 默认浅比较 props；`memo(Comp, areEqual)` 第二参自定义比较
- 浅比较的边界
  - 引用类型每次新建就挡不住——所以才有 useCallback/useMemo 配套（见第六组）
- 追问：memo 和 useMemo 的区别？
  - memo 包组件拦截渲染；useMemo 缓存值——粒度不同（见第三组第 8 题）

## 三、Hooks（面试最高频）

### 1. Hook 是什么？

**结论：Hook 让你在函数组件里「钩入」React 的状态与副作用能力——逻辑按功能聚合（一个功能的 state + effect 写在一起），复用不侵入（自定义 Hook 平铺组合）。**

- 能力映射速记

| 能力 | Hooks |
| --- | --- |
| 状态 | useState / useReducer |
| 副作用 | useEffect（统一模型） |
| Context 消费 | useContext |
| 缓存优化 | useMemo / useCallback |

### 2. useState 的原理？多次调用怎么保证顺序？

**结论：每个 hook 的状态以链表节点存在所属 Fiber 节点上（memoizedState），按调用顺序串联——React 靠「第 N 次调用对应链表第 N 个节点」对上号。**

- 机制
  - 首次渲染：按调用顺序建链表
  - 更新渲染：按同样顺序遍历链表取值——顺序即索引
  - 更新队列：setState 排进队列，渲染时逐个应用（函数式更新拿到最新队列值）
- 这就是「不能放条件/循环里」的根源（见第 13 题）
- 配套理解：简化版实现（核心考点——排队 + 函数式更新 + Object.is 短路）

```js
function createReact() {
  let state = null
  let listeners = new Set()
  function useState(init) {
    state = state === null ? init : state   // 简化：单值
    function setState(next) {
      const v = typeof next === 'function' ? next(state) : next
      if (!Object.is(v, state)) { state = v; listeners.forEach(fn => fn()) }
    }
    return [state, setState]
  }
  return { useState, subscribe: fn => listeners.add(fn) }
}
```

- 易错点：函数式更新要传 prev；同值比较 Object.is 短路

### 3. useEffect 的作用？依赖数组的规则？

**结论：useEffect 把「渲染后副作用」从生命周期里解放出来——依赖数组声明「这个副作用依赖哪些响应式值」，React 按依赖变化决定重跑。**

- 依赖数组语义
  - 不传：每次渲染后都跑
  - `[]`：只在挂载后跑一次（卸载前清理）——语义是「不依赖任何响应式值」
  - `[a, b]`：a 或 b 变化（Object.is 比较）后跑
- 心智模型：**每次渲染都是新函数，effect 是「声明与本次渲染同步的一小块副作用」**，不是「监听某个变量」（与 Vue watch 的本质差异）
- 配套理解：简化版实现（核心考点——deps 比较 + 清理在重跑**前**）

```js
let prevDeps = null
let cleanup = null
function useEffect(fn, deps) {
  const changed = prevDeps === null || deps === undefined ||
    deps.some((d, i) => !Object.is(d, prevDeps[i]))
  if (changed) {
    cleanup && cleanup()          // 先清上一轮
    cleanup = fn() || null        // fn 返回清理函数
    prevDeps = deps
  }
}
```

- 易错点：deps 为 undefined（每次跑）与 []（只跑一次）语义不同；清理在重跑**前**不是之后

### 4. useEffect 清理函数什么时候执行？

**结论：两时机——下次 effect 执行前（依赖变化重跑前先清上一轮）、组件卸载前；清的是「本轮副作用留下的东西」。**

- 语义：`return () => {...}` 永远对应「上一次 effect」的清理——不是「本次」
- 必清清单（与内存泄漏直接挂钩）：定时器、addEventListener、订阅/连接、第三方实例
- 追问：为什么清理在「重跑前」而不是「卸载时统一清」？
  - 因为依赖变化时上一轮副作用还在生效（如旧订阅）——不先清就双份了

### 5. useLayoutEffect 和 useEffect 的区别？

**结论：useEffect 是「提交并绘制后」异步执行；useLayoutEffect 是「DOM 变更后、浏览器绘制前」同步执行——会阻塞绘制，只在测量布局后立刻改样式防闪烁时用。**

- 时机对比

| 维度 | useEffect | useLayoutEffect |
| --- | --- | --- |
| 执行时机 | paint 之后 | DOM 更新后、paint 前 |
| 是否阻塞绘制 | 不阻塞 | 阻塞（同步） |
| 典型场景 | 请求/订阅/日志 | 测量 DOM 立刻调整（tooltip 定位防跳动） |
- 追问：SSR 下哪个会警告？
  - useLayoutEffect——服务端没有「绘制前」阶段，React 会警告，通用库要按环境分流

### 6. useRef 的作用？ref.current 为什么可以直接修改？

**结论：useRef 返回一个跨渲染稳定的可变容器——存 DOM 引用或存「变化但不该触发重渲染」的值；current 可以直接改，因为 React 对 ref 对象不做响应式跟踪。**

- 两个用途
  - 挂 DOM：`<input ref={inputRef}/>` → `inputRef.current.focus()`
  - 存可变值：定时器 id、最新值快照、渲染间传递的标记——改它不触发渲染（与 state 的本质区别）
- 与 useState 选型判据：**「变了这个值需要界面跟着变吗」**——需要就是 state，不需要就 ref
- 追问：useRef 和 createRef 区别？
  - useRef 每次渲染返回同一对象；createRef 每次调用新建——函数组件一律用 useRef

### 7. useMemo 的作用？有什么使用误区？

**结论：缓存「计算结果」——依赖不变就返回上次值；两大用途是昂贵计算缓存与「保持引用稳定」。误区是到处包：比较本身有成本，缓存还占内存。**

- 两大正当用途
  - 昂贵计算（大列表过滤/排序）
  - 引用稳定：给依赖引用相等的下游用（memo 子组件的 props、其他 hook 的依赖数组）
- 误区
  - 「包了就快」：轻量计算包 memo 反而多一次依赖比较
  - 把 useMemo 当「语义保证」——缓存可能被 React 丢弃，**不能替代副作用语义**（官方明确允许丢弃缓存）

### 8. useCallback 和 useMemo 的区别？

**结论：useMemo 缓存「值」，useCallback 缓存「函数引用」——useCallback(fn, deps) 等价于 useMemo(() => fn, deps)。**

- 选型一句话：缓存计算结果用 useMemo；把函数传给 memo 子组件/做依赖时用 useCallback

### 9. useCallback + React.memo 组合解决什么问题？

**结论：解决「父重渲染 → 传给子的函数引用变了 → memo 子组件浅比较失效 → 白 memo」的联动问题——三件套必须配套才有意义。**

- 链路
  - 父组件每次渲染新建回调 → 子组件 memo 浅比较发现 props 函数变了 → 重渲染
  - useCallback 锁住函数引用 + 子组件 memo 拦截 → 截住重渲染
- 配套理解：白 memo vs 截得住

```jsx
// 反例：父每次渲染新建回调 → 子 memo 浅比较必失败 → 白 memo
function Parent() {
  const [count, setCount] = useState(0)
  return <Heavy onLog={() => console.log(count)} />   // 每次渲染都是新函数
}
const Heavy = memo(function ({ onLog }) { /* 昂贵渲染 */ })

// 正解：useCallback 锁引用 + 子 memo 才截得住
function Parent() {
  const [count, setCount] = useState(0)
  const onLog = useCallback(() => console.log(count), [count])
  return <Heavy onLog={onLog} />
}
```

- 反面（追问加分）
  - 父 useCallback 了、子没 memo：白包
  - 到处包：比较与内存成本 > 收益；只在「确实截住了昂贵子树」的地方用

### 10. useReducer 是什么？和 useState 怎么选？

**结论：useReducer 把「状态 + 所有更新逻辑」收敛到一个纯函数 reducer——更新路径多、逻辑复杂、下一个状态依赖上一个状态时用。**

- 配套理解：多状态联动的典型 reducer

```js
const [step, dispatch] = useReducer((state, action) => {
  switch (action.type) {
    case 'next':  return { ...state, current: state.current + 1, history: [...state.history, state.current] }
    case 'reset': return { current: 0, history: [] }
    default:      return state
  }
}, { current: 0, history: [] })
// dispatch({ type: 'next' }) —— 更新路径收敛、dispatch 引用稳定
```

- 选型判据

| 场景 | 用 |
| --- | --- |
| 独立简单值（开关、输入） | useState |
| 状态间有联动（表单多字段、步骤流） | useReducer |
| 多个子值总是一起变 | useReducer |
- 附带收益：dispatch 引用稳定（不随渲染变），传下去不用包 useCallback；配合 Context 可替代轻量全局状态（Context + useReducer 组合）

### 11. useContext 的作用？有什么性能问题？

**结论：跨层级取 Context 值免 prop drilling；性能缺陷是「值一变，所有消费组件都重渲染」——Context 不是为高频变化的全局状态设计的。**

- 性能缺陷与缓解
  - value 引用一变，全部 useContext(该 Context) 的组件重渲染，无论用没用变化的那部分
  - 缓解：按业务拆多个小 Context（按 slice 拆 Provider）；value 用 useMemo 锁引用；高频数据走状态库 selector
- 定位：低频全局状态（主题/语言/登录态）用 Context；高频业务状态用 Zustand/Redux 的 selector 订阅

### 12. useImperativeHandle 的作用？为什么（曾经）要搭配 forwardRef？

**结论：自定义「父组件通过 ref 能看到什么」——只暴露方法不暴露内部；React 19 起 ref 直接作为 props 传递，不再需要 forwardRef。**

- 配套理解：最小暴露面

```jsx
function Input({ ref }) {              // React 19：ref 直接进 props
  const inputRef = useRef(null)
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = '' }
  }))
  return <input ref={inputRef} />
}
// 父：childRef.current.focus() —— 只暴露 focus/clear，内部 input 不外泄
```

- 价值：**最小暴露面**——默认子组件 ref 是 DOM 或空壳，显式声明防误用内部实现
- React 19 变化（追问加分）：ref 直接进 props（`function Child({ ref, ...props })`），forwardRef 逐步退役；ref 回调还支持返回清理函数（等价 effect 清理语义）

### 13. Hooks 的使用规则？为什么必须遵守？

**结论：两条规则——只在最顶层调用、只在 React 函数（组件/自定义 Hook）里调用；根源是 hook 状态按调用顺序在链表里对号入座，条件/循环调用会让链表错位。**

- 规则二条
  - 只在顶层：不能放进 if/循环/嵌套函数
  - 只在 React 函数里：组件或自定义 Hook（use 开头）
- 为什么（必答原理）
  - 链表按顺序对号：条件调用后，第 N 个 hook 读到第 N-1 个的状态，状态整体错乱
  - 违反规则不是「可能出 bug」，是**必然状态错乱**——eslint-plugin-react-hooks 直接报错

### 14. 自定义 Hook 是什么？怎么写？

**结论：以 use 开头、内部调用其他 Hook 的普通函数——把「一段有状态副作用的逻辑」抽成可复用单元；它是逻辑复用的终极形态（替代 HOC/render props）。**

- 规范
  - 命名 use 开头（lint 靠它识别内部可调 Hook）
  - 返回值：数组（如 useState 风格，调用方可重命名）或对象（多返回值可读性好）
  - 内部没有组件渲染，只有状态与副作用逻辑
- 配套理解：两个最常被要求现场写的自定义 Hook

```js
// useDebounce：值防抖——延迟同步，窗口内变化就重置定时器（必须配 cleanup）
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)   // 重置窗口
  }, [value, delay])
  return debounced
}

// useThrottle：节流——ref 记上次执行时间戳，窗口内只放行第一次
function useThrottle(value, interval = 300) {
  const [throttled, setThrottled] = useState(value)
  const last = useRef(Date.now())
  useEffect(() => {
    const now = Date.now()
    if (now - last.current >= interval) {
      last.current = now
      setThrottled(value)
      return
    }
    const t = setTimeout(() => {
      last.current = Date.now()
      setThrottled(value)
    }, interval - (now - last.current))
    return () => clearTimeout(t)
  }, [value, interval])
  return throttled
}
```

### 15. useEffect 里请求数据的正确姿势？（竞态怎么防）

**结论：effect 里不能直接 async（函数签名要求返回清理函数）；竞态靠 cleanup 里的过期标记防——「慢的旧响应不能覆盖新结果」。**

- 标准模板

```js
useEffect(() => {
  let active = true                 // 过期标记
  fetchList(query).then(res => {
    if (active) setList(res)        // 已过期 → 丢弃
  })
  return () => { active = false }   // 下一轮 effect 前先标记本轮过期
}, [query])
```

- 要点
  - 不能 `useEffect(async () => {...})`——返回值必须是清理函数
  - 竞态场景：快速切换 query，前一个请求后到覆盖新结果——与 Vue watch 的 onCleanup 是同一个思想
  - AbortController 是「真取消」（省流量），过期标记是「丢弃结果」——两者可叠加
- 更进一步的追问：数据要不要放 effect 里？
  - 见下一题——服务端状态有专门解法

### 16. TanStack Query（React Query）和 useEffect fetch 怎么选？

**结论：useEffect fetch 是「裸写」——缓存、去重、重试、竞态、失效全要自己造；服务端状态多、页面间共享数据的场景用 TanStack Query 这类服务端状态库。**

- 对比

| 能力 | useEffect + fetch | TanStack Query |
| --- | --- | --- |
| 缓存 | 无（重新挂载就重新请求） | 内置，带 staleTime |
| 去重 | 手写 | 同 key 自动去重 |
| 重试 | 手写 | 内置可配 |
| 竞态 | 手写过期标记 | 内置按 queryKey 隔离 |
| 失效联动 | 手写 | invalidateQueries 声明式 |
- 定位答法
  - 客户端状态（UI 开关、表单）→ useState/Zustand；**服务端状态（数据的缓存与同步）→ Query 类库**；两者是不同物种——把服务端数据当普通 state 管是 React 项目的经典架构错误
  - 口径：管理后台项目用过轻量自管；体系上理解 Query 的价值

## 四、并发渲染与新特性

### 1. 什么是并发渲染（Concurrent Rendering）？

**结论：渲染工作可中断、可暂停、可丢弃——React 同时准备多个 UI 版本，高优先级更新（输入）可以打断低优先级渲染（大列表过滤），保证交互始终跟手。**

- 不是并行：是**调度**，不是多线程——工作切片插进空闲时间
- 与 Fiber 的关系：Fiber 架构（React 16）是地基，并发特性是这套地基上交付的能力
- 入口：createRoot 绑定并发调度器——旧的 ReactDOM.render 同步通道已废弃（迁移成本仅一行入口代码）
- 追问：并发渲染对组件编写的要求？
  - render 阶段必须纯——函数可能被重复执行，副作用只能在 effect 里

### 2. startTransition / useTransition / useDeferredValue：低优先级更新怎么处理？

**结论：把更新标记为「非紧急」——输入、点击等紧急更新保持跟手，大列表过滤、切换 tab 这类重渲染降级为可中断；useTransition 控制「更新」的优先级（包住 setState），useDeferredValue 控制「值」的优先级（拿到一个滞后版本）。**

```js
startTransition(() => {
  setQuery(inputValue)   // 重渲染慢也不卡输入
})
```

- 紧急/非紧急的判据：**直接交互反馈 vs 由此派生的重计算 UI**
- 两个 API 的对比

| 维度 | useTransition | useDeferredValue |
| --- | --- | --- |
| 包什么 | 包更新动作（setState 调用） | 包值本身 |
| 能拿到 isPending | 能（显示加载态） | 不能 |
| 控制方 | 调用处主动降级 | 消费处被动延迟 |
- 共同点：都不防「计算本身慢」——重计算该拆该缓存还得做（startTransition 里的同步计算照样阻塞）

### 3. Suspense 是什么？服务端流式渲染怎么实现？

**结论：Suspense 是「数据/组件未就绪时展示 fallback」的协调原语——客户端配 React.lazy 做代码分割，服务端配合流式 SSR：HTML 分块送出，边界处先送 fallback、数据好了再补内容（无需等最慢接口）。**

- 三个层次
  - 客户端 lazy 组件：`React.lazy + Suspense`（代码分割）
  - 服务端流式：边界块后到后补，白屏时间大幅缩短
  - 数据获取：配合框架/RSC 用（纯客户端时代主要靠库适配）
- 追问：fallback 闪屏怎么办？
  - 合理分层边界 + 框架层 streaming；避免边界切太碎

### 4. StrictMode 下 useEffect 为什么执行两次？

**结论：StrictMode（开发态）故意「挂载 → 卸载 → 再挂载」双执行——检测不安全的副作用（没写清理函数立刻暴露）与不纯的渲染；生产环境不会双执行，不需要「处理」，需要的是把副作用写对。**

- 机制
  - 仅开发态：mount → unmount → mount；render 函数也会双调用
  - 目的：提前暴露「缺清理」「依赖不纯」的隐患——正确写法的代码双执行无感
- 错误答法（扣分）：「加开关关掉它」——它在帮你找 bug，不是 bug
- 类比记忆：就像 dev 模式的类型检查更严——成本在开发期，收益在上线后

### 5. React Compiler 是什么？还需要手写 memo 吗？

**结论：编译期自动 memo 化的 Babel 插件——自动插入等价 useMemo/useCallback/memo 的优化；v1.0 已于 2025-10 正式稳定，但「编译器 bail-out 的组件」和「极昂贵计算」仍需手动优化。**

- 答法要点
  - 能力：构建期分析组件，依赖不变自动跳过重渲染
  - 手写 memo 还需要吗：编译覆盖到的组件基本不需要；编译器放弃优化（动态性过强）的场景、或单点昂贵计算，仍手动
  - 口径：关注且理解原理，生产项目未启用（管理后台 SPA），新项目可评估 opt-in

## 五、组件通信

### 1. React 组件间有哪些通信方式？

**结论：按关系选——父子走 props/回调，跨层走 Context，任意距离走状态库，命令式走 ref。**

- 全景表

| 关系 | 方案 |
| --- | --- |
| 父 → 子 | props、children 组合 |
| 子 → 父 | 回调函数 |
| 兄弟 | 状态上提到公共父 |
| 跨层级 | Context、状态库（Zustand/RTK） |
| 命令式 | ref + useImperativeHandle |

### 2. 子向父通信怎么实现？

**结论：回调函数——父传 onChange/onSubmit，子在事件里调用并携带数据；本质是「控制反转」：数据权在父，通知权在子。**

- 追问：孙传祖呢？逐层回调就是 prop drilling——跨两级以上换 Context/状态库

### 3. 跨层级通信：Context 的适用场景和弊端？

**结论：适用低频全局值（主题/语言/当前用户）；弊端是值变全消费者重渲染、数据流向变得隐式（看不到谁在用）——高频数据别放 Context。**

- 缓解三板斧：按 slice 拆 Context / value 用 useMemo 锁引用 / 高频数据换 selector 订阅——展开见第三组第 11 题

### 4. 兄弟组件通信方案？

**结论：首选状态上提到公共父组件；兄弟关系远（分属不同子树）就 Context 或状态库；纯 UI 联动还可用「父里组合 + 回调」的组合组件模式。**

- 判断顺序：先问「这个状态该归谁」——多数「兄弟通信」其实是「状态放错了位置」

### 5. ref 通信适合什么场景？

**结论：命令式场景——focus/滚动/播放暂停/第三方实例方法；配合 useImperativeHandle 只暴露方法面。**

- 边界：能用声明式（props 驱动）就不用 ref——ref 通信绕过数据流，难追踪（与 Vue 的 defineExpose 最小暴露面同一个思想）

## 六、性能优化（高频大题）

### 1. React 项目有哪些性能优化手段？

**结论：分三层作答——渲染层（少渲染）、加载层（少下载）、运行时（不卡顿）——先报骨架再挑一层展开。**

- 渲染层（少不必要的重渲染）
  - memo 三件套配套使用；精确的依赖数组
  - 状态下放：把易变状态拆到最小的子组件，别让大子树跟着渲染
  - 虚拟列表
- 加载层
  - React.lazy + Suspense 路由级分包；组件库按需引入
  - 静态资源 CDN + hash 长缓存；图片懒加载
- 运行时
  - Transitions 降级非紧急更新；防抖节流；Web Worker 搬重计算
- 答法建议：先分层报骨架再深挖一层——与 Vue 篇性能题同一套答法结构

### 2. 什么是不必要的重渲染？哪些场景触发？

**结论：UI 输出没变却重新执行了渲染函数——自身 state/props/Context/父渲染连带四大来源。**

- 四来源与对策

| 来源 | 对策 |
| --- | --- |
| 自身 setState（值没变） | setState 同值 React 自跳过（Object.is） |
| props 新引用（对象/函数字面量） | useMemo/useCallback + 子 memo |
| Context value 变 | 拆 Context / 锁引用 / 换 selector 库 |
| 父渲染连带 | memo 子组件 / children 组合（children 引用不变则不重渲） |

### 3. 列表渲染的性能优化方案？

**结论：key 稳定是底线；量级上来后按需上分页/虚拟滚动；行组件 memo + 行内不用内联重对象。**

- 层级：分页（首选，从产品层减量）→ 无限滚动 + 窗口化请求 → 虚拟滚动（必须留在 DOM 的极端量级）
- 行级：Row 用 memo + 稳定 props；避免每行建新回调（行回调传 id 由父统一处理）

### 4. 怎么定位性能瓶颈？Profiler 怎么用？

**结论：React DevTools Profiler 录制一次交互，看「提交耗时火焰图 + 每次提交渲染了哪些组件 + 渲染原因（props/ state/hook 变化）」——用数据找该 memo 谁。**

- 使用路径
  - Profiler 面板录制 → 复现交互 → 按 commit 时间排序 → 点开慢提交看「Why did this render?」
  - 代码级：`<Profiler id="list" onRender={cb}>` 包关键子树收集渲染原因
- 排查顺序：先找「渲染次数异常多」再找「单次渲染慢」——两类问题解法不同

### 5. 虚拟列表的实现思路？

**结论：只渲染可视区条目——三层状态：滚动位置 → 计算 start/end 索引 → 只渲染该窗口，用占位高度撑起总滚动高度。**

- 核心三件
  - 容器监听 scroll：`startIndex = Math.floor(scrollTop / itemHeight)`
  - 可视区 slice 渲染 + `translateY(startIndex * itemHeight)` 偏移定位
  - 总高度占位容器（撑出真实滚动条）
- 配套理解：最小实现（动态高度要加「预估 + 实测修正」缓存表）

```jsx
function VirtualList({ items, itemHeight = 40, height = 400 }) {
  const [scrollTop, setScrollTop] = useState(0)
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3)   // 上下缓冲
  const count = Math.ceil(height / itemHeight) + 6
  const visible = items.slice(start, start + count)
  return (
    <div style={{ overflow: 'auto', height }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${start * itemHeight}px)` }}>
          {visible.map((it, i) => <Row key={it.id} item={it} style={{ height: itemHeight }} />)}
        </div>
      </div>
    </div>
  )
}
```

- 易错点：key 用业务 id；缓冲区防白屏
- 现成方案：react-window / react-virtualized / TanStack Virtual——手写理解原理，生产用库

### 6. React.lazy + Suspense 的作用与限制？

**结论：lazy 把组件变成按需加载的动态 import，Suspense 提供加载中的 fallback——路由级分包是最大收益点。**

- 限制
  - 只支持默认导出（或用 then 解包具名导出）
  - fallback 会闪烁：合理粒度分包 + 骨架屏
  - SSR 下需框架层支持（流式渲染）

## 七、工程与原理

### 1. Fiber 架构是什么？为什么要引入？

**结论：Fiber 把组件树改造成链表结构（child/sibling/return 指针），让渲染拆成一个个可中断的工作单元——解决旧 Stack Reconciler 同步递归不可中断、长任务阻塞主线程掉帧的问题。**

- 旧架构的死穴
  - 递归 diff 一旦开始无法暂停，组件树大时主线程被独占——输入卡顿、动画掉帧
- Fiber 数据结构关键字段：type/key（身份）、return/sibling/child（树关系）、lanes（优先级）、alternate（双缓冲指针）
- 双缓冲
  - current 树（当前展示）与 workInProgress 树（构建中）互相换——构建完成后一次性切换，中断中 UI 始终可用
- 配套理解：「递归改循环」的形态（摘自 frontend/react/code/mini-react，删减）

```js
function workLoop() {
  while (nextUnitOfWork !== null && !shouldYield()) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork) // 推进一个 fiber，游标挪到下一个
  }
  return nextUnitOfWork !== null       // true = 时间片耗尽、树还没跑完
}
function performUnitOfWork(fiber) {
  const child = beginWork(fiber)       // 向下：diff 出孩子 fiber 链
  if (child !== null) return child     // 有孩子 → 深入
  let completed = fiber
  while (completed !== null) {
    completeWork(completed)            // 向上：补 DOM 实例
    if (completed.sibling !== null) return completed.sibling
    completed = completed.return       // 没弟弟 → 回父亲找父亲的弟弟
  }
  return null                          // 整棵树跑完
}
```

- 调和（Reconciliation）就在 beginWork/completeWork 里：输入新元素树，输出对 current 树的操作；Reconciler（可中断）与 Renderer（DOM/原生各一套）分离——RN 同一调和器不同渲染器

### 2. 任务优先级在 Fiber 里怎么调度？

**结论：lane 模型给更新分优先级；调度器按优先级 + 过期时间安排工作单元，用时间切片插入空闲时段执行——高优先级更新可打断低优先级渲染。**

- 配套理解：时间切片的最小实现（摘自 frontend/react/code/mini-react/lib/scheduler.js，删减）

```js
const SLICE_SIZE = 5                              // 每片 5ms（一帧 16.6ms 里给 render 留的预算）
function shouldYield() {                          // workLoop 每推进一个 fiber 前问一次
  return performance.now() >= deadline
}
function performWorkUntilDeadline() {             // 宏任务回调：跑一个时间片
  deadline = performance.now() + SLICE_SIZE       // 打开 5ms 窗口
  const hasMoreWork = callback()                  // workLoop 返回 true = 树没跑完
  if (hasMoreWork) scheduleCallback(callback)     // 续排下一个宏任务——长任务被切片
}
function scheduleCallback(callback) {
  port.postMessage(null)                          // MessageChannel 起宏任务（比 setTimeout 更快）
}
```

- 两阶段纪律（必答）
  - render 阶段：可中断、可重放、可丢弃——**必须纯**，副作用放这里会执行多次
  - commit 阶段：同步不可中断——DOM 操作/生命周期/useEffect 都在这一段
- 这也解释了 StrictMode 双执行（渲染重放检测副作用）与「不能在渲染体里写副作用」

### 3. 什么是纯函数？React 哪里要求纯函数？

**结论：同输入必同输出、无副作用——React 在 render 函数、reducer、组件渲染体三处强要求纯。**

- 为什么：这三处都可能被并发调度**重复执行**（重放/双执行检测）——不纯就出现重复副作用
- 反例自查：渲染体里 Math.random()/Date.now()、改外部变量、发请求——全要挪走

### 4. 受控组件 vs 非受控组件？表单怎么做受控？

**结论：受控=值在 React 状态（value + onChange），非受控=值在 DOM（defaultValue + ref 读）；表单联动校验强就受控，简单表单/大表单性能敏感可非受控。**

- 受控标准写法

```jsx
const [phone, setPhone] = useState('')
<input value={phone} onChange={e => setPhone(e.target.value)} />
```

- 对比

| 维度 | 受控 | 非受控 |
| --- | --- | --- |
| 数据源 | React state | DOM 自身 |
| 联动/校验 | 实时、强 | 提交时取 |
| 性能 | 每键一次渲染 | 无 |
- Ant Design 表单的本质（追问加分）：非受控收集 + 实例 API 联动的混合模式——大规模表单的性能取舍
