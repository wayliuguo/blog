# 面试题 · React

> 定位：主栈 Vue，React 有完整项目实践（管理后台 React 19 + Ant Design）。被问「React 熟到什么程度」时口径：**核心机制与工程实践扎实，源码级细节以理解原理为主**，不吹精通。
> React 19 的新特性（RSC / Actions / Compiler）答法定为「原理级清晰 + 生产未上、理解来自体系学习」——既不穿帮也不显过时。类组件答「完整理解演进史，新项目全函数组件」。

## 一、React 基础

### 1. React 是什么？声明式 vs 命令式的区别？

**结论：React 是「UI = f(state)」的声明式 UI 库——你描述「界面在某个状态下应该长什么样」，由 React 负责把 DOM 更新到那个状态。**

- 三大核心思想
  - 声明式：只声明目标 UI，不写操作 DOM 的过程
  - 组件化：UI 按组件拆分组合，状态内聚
  - 单向数据流：状态自上而下流动，更新由下而上回调
- 声明式 vs 命令式对比

| 维度 | 命令式（jQuery） | 声明式（React/Vue） |
| --- | --- | --- |
| 关注点 | 「怎么改」（步骤） | 「改什么样」（目标） |
| DOM 操作 | 手写逐步操作 | 框架按 diff 最小化更新 |
| 状态与视图 | 两套东西要人肉同步 | 状态驱动视图，天然一致 |
- 追问：声明式的代价是什么？
  - 需要虚拟 DOM/diff 带来的额外开销；精细化控制不如直接操作 DOM（所以才有 escape hatch：ref）

### 2. 虚拟 DOM 是什么？为什么不直接操作真实 DOM？

**结论：虚拟 DOM 是真实 DOM 的轻量 JS 描述对象；直接操作 DOM「能做但代价不可控」，虚拟 DOM 把「改哪里」交给 diff 算法算出来，批量、最小化地应用。**

- 为什么不直接操作 DOM
  - DOM 操作是跨引擎边界的昂贵操作，且逐次直接改会引发同步回流
  - 手写操作无法保证「最小变更」——人维护不好，算法维护得很好
- 优点
  - 批量 + 最小化 DOM 更新；跨平台（同一套描述可渲染到 DOM/SSR 字符串/原生组件）
  - 声明式编程模型的基础设施
- 缺点（追问）
  - diff 计算本身有 JS 开销——极简场景（一次 innerHTML 就能搞定）虚拟 DOM 反而更慢；它买的是「可维护性 + 性能下限」
- 对比：Vue3 编译时优化（patchFlag/静态提升）把 diff 范围进一步压小——React 的 JSX 是全运行时，靠 Fiber 调度补

### 3. Diff 算法的策略？React 18 前后有什么差别？

**结论：三大策略——同级比较、type 不同直接重建、key 标识身份；这三个策略 React 18 前后没变，变的是调度层：Fiber 让 diff 变成可中断的工作单元。**

- 三策略（把 O(n³) 树比较降到 O(n) 的前提）
  - 同级比较：跨层移动视为删除 + 重建（不跨层比）
  - type 不同：直接销毁重建子树，不再比内部
  - key：同层节点复用的身份判定
- 与 Vue diff 的差异（追问高频）
  - Vue2 双端对比 / Vue3 最长递增子序列，追求最少 DOM 移动；React 单向从左到右，实现更简单，配合可中断调度
- React 18 前后真正的差别
  - 策略不变；diff 从「同步递归跑完」变成「Fiber 单元可中断、可跳过、可重放」——是调度升级不是算法升级

### 4. JSX 是什么？编译之后变成什么？

**结论：JSX 是 JS 的语法扩展，本质是「UI 描述表达式」；编译后是函数调用——旧运行时是 `React.createElement`，React 17+ 新 JSX transform 是 `react/jsx-runtime` 的 `jsx()`，不再需要在作用域里引入 React。**

- 编译产物对比
  - 旧：`<div id="a">x</div>` → `React.createElement("div", { id: "a" }, "x")`
  - 新（automatic runtime）：→ `jsx("div", { id: "a", children: "x" })`
- 返回值是普通对象（React element）：`{ type, props, key, ref }`
- 追问：JSX 里的条件渲染有哪些写法？
  - `&&`、三目、提前 return、变量暂存元素；注意 `0 && <Comp/>` 会渲染出 0 的经典坑

### 5. 元素和组件的区别？

**结论：元素是描述「 UI 长什么样」的不可变普通对象（element）；组件是「接收 props 返回元素」的函数或类——组件是工厂，元素是产品。**

- 对比

| 维度 | Element | Component |
| --- | --- | --- |
| 本质 | 普通对象 `{ type, props }` | 函数 / class |
| 可变性 | 不可变，要变就新建 | 有状态、可复用 |
| 出现时机 | 每次 render 都新建 | 首次用的时候实例化/执行 |
- 追问：`<App />` 和 `App` 的区别？
  - 前者是元素（调用组件的结果描述）；后者是组件类型本身——`props.children` 传 `<Comp/>` 还是 `Comp` 决定了子树何时实例化（后者可用于延迟渲染）

### 6. key 的作用？用 index 有什么隐患？

**结论：key 是同层节点复用的身份判定；index 作 key 在删除/插入时错位复用，带输入框的列表还会串数据。**

- 机制
  - diff 靠 key 判断「新旧是不是同一个节点」：能复用就 patch，不能才新建/移动
- index 作 key 的两个坑
  - 删除中间项：后面所有项 key 都前移，React 认为是「每项都变了」——全量 patch
  - 非受控输入框内容错位：DOM 复用了但 React 状态与视觉错位（经典面试症状题）
- 什么时候 index 无害：纯静态、不增删、不排序、无内部状态的列表
- 追问：key 要「唯一」还是要「稳定」？
  - 都要，但**稳定优先**——同一次兄弟集合里唯一 + 跨渲染保持身份一致

### 7. React 的单向数据流是什么含义？

**结论：数据（props/状态）只能从父到子单向传递；子组件要改数据，只能通过父组件传下来的回调「上报」，反向赋值不存在。**

- 三个表现
  - props 只读：子组件不能修改 props（React 会警告）
  - 状态上提：多个子组件共享的数据放最近的公共父组件
  - 回调上报：onChange/onEvent 由父传入，子调用通知父
- 为什么这样设计（追问）
  - 数据流向可追溯，谁改的数据一目了然；代价是「prop drilling」，解法是 Context / 组合组件（`<Comp render={...}>` / 传组件当 children）

### 8. React 事件机制？合成事件和原生事件有什么区别？

**结论：React 用「事件委托 + 合成事件对象」统一管理事件——在根容器统一监听，把原生事件包装成 SyntheticEvent，抹平浏览器差异并接入优先级调度。**

- 机制要点
  - 委托：绝大多数事件不在元素自身监听，统一挂到 React 18 的 **root 容器**上（React 16 及以前挂 document）
  - 合成事件对象：包装原生 event，统一接口；`e.stopPropagation` 作用在合成层，阻止的是合成事件传播
  - 通过 `e.nativeEvent` 拿原生事件
- React 17 的两个变化（追问高频，微前端场景必考）
  - 委托目标从 `document` 改为 **root 容器**：多个 React 应用共存时事件不再互相干扰
  - **移除事件池**（event pooling）：React 16 里合成事件对象会被复用回收，异步访问必须 `e.persist()`；17+ 直接可异步持有
- 原生事件与合成事件混用的坑
  - 原生 `stopPropagation` 会让 React 的委托监听收不到事件——合成逻辑失效

## 二、类组件与函数组件

### 1. 类组件和函数组件的区别？为什么推荐函数组件 + Hooks？

**结论：类组件靠实例与生命周期组织逻辑，函数组件靠「纯函数 + Hooks」组织；推荐后者的根本原因是「逻辑按功能聚合 + 复用不侵入」——Hooks 解决了类组件三大痛点。**

- 对比

| 维度 | 类组件 | 函数组件 + Hooks |
| --- | --- | --- |
| 逻辑组织 | 按生命周期切，一个功能的代码散落多处 | 一个功能的 state + effect 聚在一起 |
| 逻辑复用 | HOC / render props（嵌套地狱） | 自定义 Hook（平铺组合） |
| this | 依赖 this 绑定，心智负担 | 无 this，闭包语义 |
| 心智模型 | 面向对象实例 | 每次渲染是一次快照执行 |
- 类组件不是不能用——维护存量代码要能读懂；新代码全函数组件

### 2. 类组件生命周期有哪些？React 16 废弃了什么？

**结论：三阶段——挂载（constructor → render → componentDidMount）、更新（render → componentDidUpdate）、卸载（componentWillUnmount）；React 16.3 起废弃三个 UNSAFE 钩子，补两个新钩子，为 Fiber 异步渲染铺路。**

- 生命周期全景（挂载 → 更新 → 卸载）

| 阶段 | 钩子 | 用途 |
| --- | --- | --- |
| 挂载 | constructor / render / componentDidMount | 初始化 state / 渲染 / 发请求·订阅 |
| 更新 | static getDerivedStateFromProps / shouldComponentUpdate / render / getSnapshotBeforeUpdate / componentDidUpdate | props→state 派生 / 性能拦截 / 渲染 / 拿更新前 DOM 快照 / 更新后操作 |
| 卸载 | componentWillUnmount | 清理定时器、监听、订阅 |
| 错误 | getDerivedStateFromError / componentDidCatch | 错误边界 |
- 废弃史（答「为什么废弃」比背名字加分）
  - 废弃：componentWillMount / componentWillReceiveProps / componentWillUpdate（冠 UNSAFE_ 前缀）
  - 原因：这三个钩子在 Fiber 可中断渲染下可能**被调用多次**（render 阶段可重放），里面写副作用会执行多次——不安全
  - 替代：componentWillMount → constructor 或 componentDidMount；WillReceiveProps → getDerivedStateFromProps；WillUpdate + 快照需求 → getSnapshotBeforeUpdate（commit 阶段一次性调用，安全）

### 3. setState 是同步还是异步？批处理机制是什么？

**结论：调用本身同步入队，更新异步批量应用——「同步/异步」是流传最广的误导问法；React 18 的自动批处理把合并范围从事件回调扩展到所有场景。**

- 机制两层
  - setState 立即执行：把更新放进队列，标记调度
  - 批量应用：同一轮里的多次 setState 合并成一次渲染
- React 18 自动批处理 vs 旧版
  - 旧：只有 React 事件回调内批处理；setTimeout/Promise 原生回调里逐次渲染
  - 18+：**所有场景**默认批处理（promise/setTimeout/原生事件）——同轮多次 setState 一次渲染
- 两个必会细节
  - 连续 `setCount(count + 1)` 两次只 +1（读到同一快照）；要连续加必须函数式更新 `setCount(prev => prev + 1)`
  - 更新比较用 `Object.is`；`flushSync` 可强制同步刷出（极少数测 DOM 的场景）
- 追问：为什么事件里「看起来」是异步的？
  - 批处理让 state 在本次事件处理结束前不更新——是为了性能合并不是真的异步 API

### 4. PureComponent 和 memo 是什么？

**结论：都是「props 浅比较拦截重渲染」——PureComponent 是类组件基类，memo 是函数组件的高阶包装。**

- 对比

| 维度 | PureComponent | React.memo |
| --- | --- | --- |
| 适用 | 类组件 | 函数组件 |
| 比较内容 | props + state 浅比较 | 默认 props 浅比较 |
| 自定义比较 | isShouldComponentUpdate 手写 | memo(Comp, areEqual) 第二参 |
- 浅比较的边界
  - 引用类型每次新建就挡不住——所以才有 useCallback/useMemo 配套（见第七组）
- 类组件时代的 shouldComponentUpdate 与 PureComponent 的关系：PureComponent = 自动浅比较版

### 5. 「函数组件没有实例」是什么意思？

**结论：函数组件每次渲染就是一次普通函数调用，没有 this、没有跨渲染的实例身份——所谓「实例」概念由 Fiber 节点承担，状态存在 Fiber 的 hook 链表里。**

- 三个推论
  - 没有 this：不存在 this.state / this.props / 生命周期方法
  - 状态与副作用由 React 挂在 Fiber 节点上（hook 链表、effect 链表）持久化，函数本身是无状态的
  - 每次渲染捕获独立快照——这就是闭包陷阱的根源（见第三组）
- 追问：那 ref 为什么还能跨渲染稳定？
  - useRef 返回的是同一个对象引用，由 React 存在 Fiber 上——「实例」的轻量替代品

## 三、Hooks（面试最高频）

### 1. Hook 是什么？解决了类组件哪些痛点？

**结论：Hook 让你在函数组件里「钩入」React 的状态与副作用能力；解决类组件三痛点——逻辑难复用（HOC 嵌套地狱）、生命周期把一个功能劈碎、this 心智负担。**

- 对应关系速记

| 类组件 | Hooks |
| --- | --- |
| this.state + setState | useState / useReducer |
| 生命周期三钩子 | useEffect（统一模型） |
| Context consumer | useContext |
| 手动缓存优化 | useMemo / useCallback |

### 2. useState 的原理？多次调用怎么保证顺序？

**结论：每个 hook 的状态以链表节点存在所属 Fiber 节点上（memoizedState），按调用顺序串联——React 靠「第 N 次调用对应链表第 N 个节点」对上号。**

- 机制
  - 首次渲染：按调用顺序建链表
  - 更新渲染：按同样顺序遍历链表取值——顺序即索引
  - 更新队列：setState 排进队列，渲染时逐个应用（函数式更新拿到最新队列值）
- 这就是「不能放条件/循环里」的根源（见第 14 题）

### 3. useEffect 的作用？依赖数组的规则？

**结论：useEffect 把「渲染后副作用」从生命周期里解放出来——依赖数组声明「这个副作用依赖哪些响应式值」，React 按依赖变化决定重跑。**

- 依赖数组语义
  - 不传：每次渲染后都跑
  - `[]`：只在挂载后跑一次（卸载前清理）——语义是「不依赖任何响应式值」
  - `[a, b]`：a 或 b 变化（Object.is 比较）后跑
- 心智模型：**每次渲染都是新函数，effect 是「声明与本次渲染同步的一小块副作用」**，不是「监听某个变量」（与 Vue watch 的本质差异）

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
  - useRef 每次渲染返回同一对象；createRef 每次渲染新建（类组件用）

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
- 反面（追问加分）
  - 父 useCallback 了、子没 memo：白包
  - 到处包：比较与内存成本 > 收益；只在「确实截住了昂贵子树」的地方用

### 10. useReducer 是什么？和 useState 怎么选？

**结论：useReducer 把「状态 + 所有更新逻辑」收敛到一个纯函数 reducer——更新路径多、逻辑复杂、下一个状态依赖上一个状态时用。**

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

- 用法
  - 子：`useImperativeHandle(ref, () => ({ focus, reset }), deps)`——返回的对象才是父拿到的
  - 父：`childRef.current.focus()`
- 价值：**最小暴露面**——默认子组件 ref 是 DOM 或空壳，显式声明防误用内部实现
- React 19 变化（追问加分）：`function Child({ ref, ...props })` 直接接 ref，forwardRef 逐步退役

### 13. useId 的作用？

**结论：生成服务端与客户端一致（SSR 安全）的唯一 id——用于表单 label htmlFor、无障碍属性；不是用来做列表 key 的。**

- 解决的问题：同一组件多实例下 `Math.random()`/自增 id 导致 SSR hydration 不一致
- 列表 key 仍用业务稳定 id——useId 是「实例级标识」不是「数据标识」

### 14. Hooks 的使用规则？为什么必须遵守？

**结论：两条规则——只在最顶层调用、只在 React 函数（组件/自定义 Hook）里调用；根源是 hook 状态按调用顺序在链表里对号入座，条件/循环调用会让链表错位。**

- 规则二条
  - 只在顶层：不能放进 if/循环/嵌套函数
  - 只在 React 函数里：组件或自定义 Hook（use 开头）
- 为什么（必答原理）
  - 链表按顺序对号：条件调用后，第 N 个 hook 读到第 N-1 个的状态，状态整体错乱
  - 违反规则不是「可能出 bug」，是**必然状态错乱**——eslint-plugin-react-hooks 直接报错

### 15. 自定义 Hook 是什么？怎么写？

**结论：以 use 开头、内部调用其他 Hook 的普通函数——把「一段有状态副作用的逻辑」抽成可复用单元；它是逻辑复用的终极形态（替代 HOC/render props）。**

- 规范
  - 命名 use 开头（lint 靠它识别内部可调 Hook）
  - 返回值：数组（如 useState 风格，调用方可重命名）或对象（多返回值可读性好）
  - 内部没有组件渲染，只有状态与副作用逻辑
- 典型例子（追问常让现场写）：useDebounce / useThrottle / usePrevious / useFetch——见第十一组手写题

### 16. useEffect 里请求数据的正确姿势？（竞态怎么防）

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

### 17. TanStack Query（React Query）和 useEffect fetch 怎么选？

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

## 四、React 18 / 19

### 1. React 18 主要更新了哪些特性？

**结论：五件套——并发渲染基础设施（Fiber 架构红利兑现）、自动批处理、Transitions（优先级调度入口）、Suspense 完善（服务端流式）、新 API（useTransition/useDeferredValue/useId/useSyncExternalStore）。**

- 入口变化：createRoot 开启并发能力（见第 7 题）

### 2. 什么是并发渲染（Concurrent Rendering）？

**结论：渲染工作可中断、可暂停、可丢弃——React 同时准备多个 UI 版本，高优先级更新（输入）可以打断低优先级渲染（大列表过滤），保证交互始终跟手。**

- 不是并行：是**调度**，不是多线程——工作切片插进空闲时间
- 与 Fiber 的关系：Fiber 架构（React 16）是地基，18 的并发特性是这套地基上交付的能力
- 追问：并发渲染对组件编写的要求？
  - render 阶段必须纯——函数可能被重复执行，副作用只能在 effect 里

### 3. 自动批处理和旧版批处理的区别？

**结论：旧版只在 React 事件回调内批处理，18 起所有场景（promise/setTimeout/原生事件）默认批处理——同轮多次 setState 一次渲染。**

```js
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
}, 1000)
// 旧版：渲染两次；18+：渲染一次
```

- 退出批处理：`flushSync(() => setX(...))`（读更新后 DOM 的少数场景）

### 4. startTransition 的作用？

**结论：把更新标记为「非紧急」——输入、点击等紧急更新保持跟手，大列表过滤、切换 tab 这类重渲染降级为可中断，卡顿感知消失。**

```js
startTransition(() => {
  setQuery(inputValue)   // 重渲染慢也不卡输入
})
```

- 紧急/非紧急的判据：**直接交互反馈 vs 由此派生的重计算 UI**

### 5. useTransition 和 useDeferredValue 的区别？

**结论：useTransition 控制「更新」的优先级（包住 setState）；useDeferredValue 控制「值」的优先级（拿到一个滞后版本）——一个管动作，一个管数据。**

- 对比

| 维度 | useTransition | useDeferredValue |
| --- | --- | --- |
| 包什么 | 包更新动作（setState 调用） | 包值本身 |
| 能拿到 isPending | 能（显示加载态） | 不能 |
| 控制方 | 调用处主动降级 | 消费处被动延迟 |
- 共同点：都不防「计算本身慢」——重计算该拆该缓存还得做（startTransition 里的同步计算照样阻塞）

### 6. Suspense 在 React 18 有什么变化？服务端 Suspense 是什么？

**结论：18 起 Suspense 从「懒加载 fallback」升级为并发渲染的数据/UI 协调原语；服务端配合流式 SSR——HTML 分块送出，Suspense 边界处先送 fallback、数据好了再补内容（无需等最慢接口）。**

- 三个层次
  - 客户端 lazy 组件：`React.lazy + Suspense`（代码分割）
  - 服务端流式：边界块后到后补，白屏时间大幅缩短
  - 数据获取：配合框架/RSC 用（纯客户端 18 时代主要靠库适配）
- 追问：fallback 闪屏怎么办？
  - 合理分层边界 + 框架层 streaming；避免边界切太碎

### 7. createRoot 和 legacy 渲染方式的区别？

**结论：createRoot 开启并发能力（可中断调度、自动批处理、严格模式双执行）；legacy 的 ReactDOM.render 走旧同步通道——18 的新特性基本依赖 createRoot。**

- 为什么废弃 ReactDOM.render
  - 旧入口绑定同步渲染模型；并发特性（可中断）要求新的根调度器
  - 迁移成本低：入口换 createRoot，其余代码基本不动

### 8. React 18 严格模式下 useEffect 为什么执行两次？

**结论：StrictMode（开发态）故意「挂载 → 卸载 → 再挂载」双执行——检测不安全的副作用（没写清理函数立刻暴露）与不纯的渲染；生产环境不会双执行，不需要「处理」，需要的是把副作用写对。**

- 机制
  - 仅开发态：mount → unmount → mount；render 函数也会双调用
  - 目的：提前暴露「缺清理」「依赖不纯」的隐患——正确写法的代码双执行无感
- 错误答法（扣分）：「加开关关掉它」——它在帮你找 bug，不是 bug
- 类比记忆：就像 dev 模式的类型检查更严——成本在开发期，收益在上线后

### 9. Server Components 和 Client Components 的边界？

**结论：RSC 在服务端运行、代码不进浏览器包（可直连数据库/秘钥），Client Components 在浏览器跑、拥有交互与状态——用 "use client" 指令划分边界，跨边界传参必须可序列化。**

- 对比

| 维度 | Server Component | Client Component |
| --- | --- | --- |
| 运行环境 | 服务端/构建期 | 浏览器 |
| 代码进 bundle | 不进 | 进 |
| useState/useEffect | 不可用 | 可用 |
| 事件处理 | 无 | 有 |
| 数据访问 | 可直连（DB/内部服务） | 走接口 |
- 边界规则
  - `"use client"` 标记客户端入口；未标记默认服务端（框架支持时）
  - props 跨边界必须可序列化（函数、类实例不行）
  - 口径：生产实践以 SPA 管理后台为主，RSC 理解来自体系学习——答原理不吹实践

### 10. React 19 的 Actions 是什么？三个配套 Hook 分工？

**结论：Actions 把「提交 → pending → 乐观更新 → 结果/错误」的异步流程纳入 React 调度生命周期；三 Hook 分工——useActionState 管结果与 pending、useOptimistic 管乐观展示、useFormStatus 读父表单状态。**

- 三件套分工表

| Hook | 管 | 关键点 |
| --- | --- | --- |
| useActionState(action, init) | 提交结果 + isPending | 表单校验错误可当 state 返回 |
| useOptimistic(state, fn) | 服务端确认前的乐观 UI | 失败自动回落真实 state |
| useFormStatus | 读最近父 form 的 pending | 子组件免 prop drilling；**从 react-dom 导入** |

### 11. use() API 是什么？

**结论：读取「资源」的 API——传 Promise 则挂起直到 resolve（配合 Suspense），传 Context 等价 useContext；它不是 Hook，可以在条件/循环里调用。**

- 与 hooks 规则的区别（高频追问）
  - 官方明确 use 不受「只在顶层调用」约束——因为它是按需读取资源，不占 hook 链表位
  - 配合 RSC 数据流：服务端组件发起 fetch 把未完成的 Promise 传下来，客户端组件 use() 挂起渲染

### 12. React Compiler 是什么？还需要手写 memo 吗？

**结论：编译期自动 memo 化的 Babel 插件——自动插入等价 useMemo/useCallback/memo 的优化；v1.0 已于 2025-10 正式稳定，但「编译器 bail-out 的组件」和「极昂贵计算」仍需手动优化。**

- 答法要点
  - 能力：构建期分析组件，依赖不变自动跳过重渲染
  - 手写 memo 还需要吗：编译覆盖到的组件基本不需要；编译器放弃优化（动态性过强）的场景、或单点昂贵计算，仍手动
  - 口径：关注且理解原理，生产项目未启用（管理后台 SPA），新项目可评估 opt-in

### 13. React 19 的 ref 变化有哪些？

**结论：ref 可以直接当 props 传（函数组件不用再包 forwardRef）；ref 回调支持返回清理函数（等价 useEffect 清理语义）。**

- 影响：新代码不写 forwardRef；类库兼容期两者并存

## 五、状态管理

### 1. Redux 三大原则？

**结论：单一数据源（单一 store 树）、state 只读（只能 dispatch action 触发）、纯函数修改（reducer 拿旧 state + action 返回新 state）。**

- 现代视角补充：三原则支撑了时间旅行调试与可预测性——这是 Redux 的核心卖点

### 2. action / reducer / store 的作用？reducer 为什么必须纯函数？

**结论：action 描述「发生了什么」的纯对象；reducer 是「(state, action) => newState」的纯函数；store 是持有状态树、分发 action 的容器。**

- reducer 必须纯的原因
  - 时间旅行：同 state + 同 action 必须得到同结果，否则 devtools 回放错乱
  - React 渲染模型：render/reducer 可能被重复执行（并发渲染下重放），有副作用就执行多次
  - 禁止：改参数（要不可变更新）、调接口、Date.now()/Math.random()
- 不可变更新的工程解：Immer（RTK 内置）——写可变语法，产出不可变结果

### 3. Redux 中间件是什么？thunk 和 saga 的区别？

**结论：中间件是 dispatch 到 reducer 之间的拦截层——把「只能 dispatch 纯对象」扩展为可处理异步/日志/埋点；thunk 简单直给，saga 用 Generator 组织复杂流程。**

- 对比

| 维度 | redux-thunk | redux-saga |
| --- | --- | --- |
| 形态 | action 可以是函数 | 独立 saga 监听 action |
| 学习成本 | 低 | 高（Generator/effects） |
| 适合 | 简单异步 | 复杂流程编排（竞态、取消、并行） |
| 现状 | 曾是默认解 | 新项目少用，被 RTK Query/Query 库替代 |

### 4. RTK 解决了原生 Redux 什么痛点？

**结论：原生 Redux 的三宗罪——样板代码多、不可变更新易错、store 配置繁琐——RTK 用 createSlice（action+reducer 同文件自动生成）、内置 Immer、configureStore 一行配置 + 默认中间件解决。**

- 结论句：现在写 Redux 就该是 RTK，裸写 Redux 在面试里反而是过时信号

### 5. Redux 和 Context + useReducer 怎么选？

**结论：Context + useReducer 适合小规模、低频、无复杂中间件需求的场景；跨页面共享 + 调试工具链 + 中间件需求上 Redux（RTK）仍占优。**

- 对比

| 维度 | Context + useReducer | Redux (RTK) |
| --- | --- | --- |
| 性能 | 值变全消费者重渲染 | subscribe 按 selector 订阅 |
| DevTools | 无时间旅行 | 完整时间旅行 |
| 中间件/异步 | 自己拼 | 生态成熟 |
| 适用 | 主题/登录态等低频 | 大型应用核心业务状态 |

### 6. Context 的性能缺陷具体是什么？

**结论：value 引用一变，所有消费组件全部重渲染——不管它用没用到变的那部分；且没有 selector 粒度。**

- 缓解三板斧（与第三组呼应）
  - 按 slice 拆多个 Context
  - value 用 useMemo 锁引用（对象字面量每次渲染都是新引用）
  - 高频状态换 Zustand（selector 级订阅）

### 7. Zustand / Jotai 相比 Redux 的优势？

**结论：极简 API（无 Provider、无 action 类型）、selector 细粒度订阅天然规避过度渲染、样板代码趋近于零。**

- 两者的差异一句话：Zustand 是「store 外置」的全局状态；Jotai 是「原子化」的自底向上状态图
- 选型口径：中型项目 Zustand 足够；重度时间旅行/中间件诉求才上 RTK

### 8. 什么时候全局状态，什么时候组件内部状态？

**结论：判据是「共享范围 + 生命周期」——跨页面/跨远距离组件共享才全局；否则状态放最低的公共祖先（状态上提）或组件内部。**

- 反模式警示：什么都进全局 store——状态生命周期失控、缓存不失效、测试困难
- 服务端数据的再强调：能进 Query 缓存的别进全局 store（见第三组 17 题）

## 六、组件通信

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

### 2. props 为什么不能修改？

**结论：props 是只读契约——它是父组件对「这一刻子组件应该是什么」的声明；子改 props 会破坏单向数据流，父重渲染时直接被覆盖。**

- 需要改：说明这个状态归你——用 state 初始化后自持（受控转非受控的过渡场景），或回调让父改

### 3. 子向父通信怎么实现？

**结论：回调函数——父传 onChange/onSubmit，子在事件里调用并携带数据；本质是「控制反转」：数据权在父，通知权在子。**

- 追问：孙传祖呢？逐层回调就是 prop drilling——跨两级以上换 Context/状态库

### 4. 跨层级通信：Context 的适用场景和弊端？

**结论：适用低频全局值（主题/语言/当前用户）；弊端是值变全消费者重渲染、数据流向变得隐式（看不到谁在用）——高频数据别放 Context。**

- 弊端展开见第五组第 6 题

### 5. 兄弟组件通信方案？

**结论：首选状态上提到公共父组件；兄弟关系远（分属不同子树）就 Context 或状态库；纯 UI 联动还可用「父里组合 + 回调」的组合组件模式。**

- 判断顺序：先问「这个状态该归谁」——多数「兄弟通信」其实是「状态放错了位置」

### 6. ref 通信适合什么场景？

**结论：命令式场景——focus/滚动/播放暂停/第三方实例方法；配合 useImperativeHandle 只暴露方法面。**

- 边界：能用声明式（props 驱动）就不用 ref——ref 通信绕过数据流，难追踪（与 Vue 的 defineExpose 最小暴露面同一个思想）

## 七、性能优化（高频大题）

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

### 2. React.memo、useMemo、useCallback 分别优化什么？

**结论：memo 拦「组件重渲染」，useMemo 缓存「计算结果/引用」，useCallback 缓存「函数引用」——三者是配套链不是三选一。**

- 配套链：父 useCallback 锁引用 → 子 memo 拦截 → 截住重渲染；useMemo 顺带让依赖数组和 props 不因新对象失效
- 反面：到处包 = 比较成本 + 内存成本；只在截住昂贵子树处用（React Compiler 的目标就是消灭这类手动劳动）

### 3. 什么是不必要的重渲染？哪些场景触发？

**结论：UI 输出没变却重新执行了渲染函数——自身 state/props/Context/父渲染连带四大来源。**

- 四来源与对策

| 来源 | 对策 |
| --- | --- |
| 自身 setState（值没变） | setState 同值 React 自跳过（Object.is） |
| props 新引用（对象/函数字面量） | useMemo/useCallback + 子 memo |
| Context value 变 | 拆 Context / 锁引用 / 换 selector 库 |
| 父渲染连带 | memo 子组件 / children 组合（children 引用不变则不重渲） |

### 4. 列表渲染的性能优化方案？

**结论：key 稳定是底线；量级上来后按需上分页/虚拟滚动；行组件 memo + 行内不用内联重对象。**

- 层级：分页（首选，从产品层减量）→ 无限滚动 + 窗口化请求 → 虚拟滚动（必须留在 DOM 的极端量级）
- 行级：Row 用 memo + 稳定 props；避免每行建新回调（行回调传 id 由父统一处理）

### 5. 怎么定位性能瓶颈？Profiler 怎么用？

**结论：React DevTools Profiler 录制一次交互，看「提交耗时火焰图 + 每次提交渲染了哪些组件 + 渲染原因（props/ state/hook 变化）」——用数据找该 memo 谁。**

- 使用路径
  - Profiler 面板录制 → 复现交互 → 按 commit 时间排序 → 点开慢提交看「Why did this render?」
  - 代码级：`<Profiler id="list" onRender={cb}>` 包关键子树收集渲染原因
- 排查顺序：先找「渲染次数异常多」再找「单次渲染慢」——两类问题解法不同

### 6. 虚拟列表的实现思路？

**结论：只渲染可视区条目——三层状态：滚动位置 → 计算 start/end 索引 → 只渲染该窗口，用占位高度撑起总滚动高度。**

- 核心三件
  - 容器监听 scroll：`startIndex = Math.floor(scrollTop / itemHeight)`
  - 可视区 slice 渲染 + `translateY(startIndex * itemHeight)` 偏移定位
  - 总高度占位容器（撑出真实滚动条）
- 动态高度进阶
  - 维护「预估高度 + 实测修正」缓存表；滚动时查表算 start，测量后修正
- 现成方案：react-window / react-virtualized / TanStack Virtual——手写理解原理，生产用库

### 7. React.lazy + Suspense 的作用与限制？

**结论：lazy 把组件变成按需加载的动态 import，Suspense 提供加载中的 fallback——路由级分包是最大收益点。**

- 限制
  - 只支持默认导出（或用 then 解包具名导出）
  - fallback 会闪烁：合理粒度分包 + 骨架屏
  - SSR 下需框架层支持（流式渲染）

## 八、React Router

### 1. React Router v6 相比 v5 的重大改动？

**结论：Routes 替代 Switch、嵌套路由声明式化（Outlet）、useNavigate 替代 useHistory、useMatches/useLoader 体系为数据路由打底、包体积更小。**

- 逐条

| v5 | v6 |
| --- | --- |
| `<Switch>` 精确匹配 | `<Routes>` 自动选最优 |
| useHistory().push | useNavigate('/path') |
| 组件式嵌套路由 + 手动匹配 | `<Route>` 嵌套 + `<Outlet>` |
| 正则 path 部分支持 | 内置 :param 与通配 |

### 2. BrowserRouter 和 HashRouter 的原理与区别？

**结论：BrowserRouter 用 History API（pushState）操作路径、无 # 号，需服务端把所有路径回退到 index.html；HashRouter 用 # 后的变化（hashchange），天生免服务端配置。**

- 对比

| 维度 | BrowserRouter | HashRouter |
| --- | --- | --- |
| URL 形态 | /list/1 | /#/list/1 |
| 服务端配合 | 必须 fallback 配置 | 不需要 |
| SEO | 友好 | 弱 |
| 刷新 404 | 未配置会 404 | 不会 |
- 选型：正式产品 BrowserRouter + 服务端 fallback；纯静态托管/嵌入场景 HashRouter 省事

### 3. 路由守卫怎么实现？

**结论：React Router 没有内置守卫——用「守卫组件」模式：包一层检查权限，不满足就 `<Navigate>` 重定向或渲染 403。**

```jsx
function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />
}
```

- 与 Vue 的差异（双栈加分）：Vue 有完整守卫钩子链（beforeEach 等），React 靠组件组合实现同一语义

### 4. useNavigate、useParams、useLocation 的作用？

**结论：三个导航相关 Hook——useNavigate 编程式跳转（可带 state/replace）；useParams 读路径动态段；useLocation 读当前位置（pathname/search/state，监听变化靠 useEffect 包它）。**

- 细节
  - `navigate(-1)` 后退；`navigate(to, { replace })` 替换历史记录
  - search 参数用 useSearchParams（v6 专拆），不要手拆 location.search

### 5. 嵌套路由怎么实现？Outlet 是什么？

**结论：`<Route>` 里嵌 `<Route>` 形成嵌套关系；`<Outlet>` 是父路由组件里的「子路由出口」占位——子路由内容渲染在那里。**

- 附带：useOutletContext 给嵌套子组件传上下文；布局路由（共享侧边栏）就是这个模式的标准应用

### 6. 动态路由与路由懒加载怎么实现？

**结论：动态段 `:id` 用 useParams 取；懒加载 `lazy(() => import('./Page'))` 包在 Route 的 element 上配 Suspense；权限动态路由用 useRoutes/RouterProvider 按 permission 生成路由配置。**

- 权限路由套路（与 Vue addRoute 同构）：登录后拉权限 → 过滤路由表 → setState/重新渲染 Routes → 兜底 `*` 路由放最后

## 九、TS + React

### 1. 函数组件的 props 怎么用 TS 定义？

**结论：推荐 `type Props = {...}` + 解构入参；React.FC 已不推荐（见第 5 题）。**

```tsx
type Props = { title: string; count?: number; onChange: (v: string) => void }
function Card({ title, count = 0, onChange }: Props) { ... }
```

### 2. props 可选属性和默认值怎么写？

**结论：类型上 `?` 标可选，值上解构默认值；不要用 defaultProps（函数组件已废弃）。**

```tsx
type Props = { size?: 'sm' | 'lg' }
function Btn({ size = 'sm' }: Props) { ... }
```

### 3. onClick、onChange 的 TS 类型是什么？

**结论：用 React 内置事件类型——`React.MouseEvent<HTMLButtonElement>`、`React.ChangeEvent<HTMLInputElement>`；自己手写 any 是反模式。**

- 常用速查

| 场景 | 类型 |
| --- | --- |
| 按钮/元素点击 | `React.MouseEvent<HTMLButtonElement>` |
| input/checkbox 变化 | `React.ChangeEvent<HTMLInputElement>` |
| select 变化 | `React.ChangeEvent<HTMLSelectElement>` |
| 表单提交 | `React.FormEvent<HTMLFormElement>` |

### 4. forwardRef + useImperativeHandle 的 TS 类型怎么写？

**结论：泛型标注暴露面——`React.ForwardRefRenderStyle` 风格：`forwardRef<Handle, Props>`；React 19 直接在 props 里标 `ref: Ref<Handle>`。**

```tsx
type Handle = { focus(): void }
const Input = forwardRef<Handle, { name: string }>((props, ref) => {
  useImperativeHandle(ref, () => ({ focus: () => {...} }))
  ...
})
```

### 5. React.FC 的优缺点？还推荐吗？

**结论：不推荐——隐式带 children（旧版本）造成类型松弛、泛型组件写法别扭；直接用普通函数 + 显式 props 类型是社区共识。**

- 历史包袱说明：React.FC 曾默认包含 children（18 类型里已移除）+ 隐式返回类型限制泛型表达

### 6. useState 的复杂对象类型怎么定义？

**结论：useState 泛型传类型，更新保持不可变；联合「加载态」用判别联合比可空字段更安全。**

```tsx
type User = { id: string; name: string }
const [user, setUser] = useState<User | null>(null)
// 判别联合：加载/成功/失败三态
type State =
  | { status: 'loading' }
  | { status: 'ok'; data: User }
  | { status: 'error'; msg: string }
```

## 十、工程与原理

### 1. Fiber 架构是什么？为什么要引入？

**结论：Fiber 把组件树改造成链表结构（child/sibling/return 指针），让渲染拆成一个个可中断的工作单元——解决旧 Stack Reconciler 同步递归不可中断、长任务阻塞主线程掉帧的问题。**

- 旧架构的死穴
  - 递归 diff 一旦开始无法暂停，组件树大时主线程被独占——输入卡顿、动画掉帧
- Fiber 数据结构关键字段：type/key（身份）、return/sibling/child（树关系）、lanes（优先级）、alternate（双缓冲指针）
- 双缓冲
  - current 树（当前展示）与 workInProgress 树（构建中）互相换——构建完成后一次性切换，中断中 UI 始终可用

### 2. 任务优先级在 Fiber 里怎么调度？

**结论：lane 模型给更新分优先级；调度器按优先级 + 过期时间安排工作单元，用时间切片插入空闲时段执行——高优先级更新可打断低优先级渲染。**

- 两阶段纪律（必答）
  - render 阶段：可中断、可重放、可丢弃——**必须纯**，副作用放这里会执行多次
  - commit 阶段：同步不可中断——DOM 操作/生命周期/useEffect 都在这一段
- 这也解释了 StrictMode 双执行（渲染重放检测副作用）与「不能在渲染体里写副作用」

### 3. 调和（Reconciliation）是什么？

**结论：diff + 决定「哪些 DOM 要怎么变」的整个过程——输入新元素树，输出对 current 树的操作；React 把这个过程 Fiber 化以支持中断。**

- 与渲染的关系：Reconciler（调和，可中断）+ Renderer（渲染器，DOM/原生各一套）分离——RN 同一调和器不同渲染器

### 4. 什么是纯函数？React 哪里要求纯函数？

**结论：同输入必同输出、无副作用——React 在 render 函数、reducer、组件渲染体三处强要求纯。**

- 为什么：这三处都可能被并发调度**重复执行**（重放/双执行检测）——不纯就出现重复副作用
- 反例自查：渲染体里 Math.random()/Date.now()、改外部变量、发请求——全要挪走

### 5. 受控组件 vs 非受控组件？表单怎么做受控？

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

### 6. SSR / SSG / ISR 的概念与优缺点？

**结论：SSR 每请求服务端渲染（内容实时、服务器有压力）；SSG 构建期出静态页（最快、内容构建时固定）；ISR 增量静态再生成（静态页 + 按时间/按需后台刷新——两者折中）。**

- 对比

| 维度 | SSR | SSG | ISR |
| --- | --- | --- | --- |
| 生成时机 | 每次请求 | 构建期 | 构建期 + 周期/按需再生 |
| 实时性 | 高 | 构建时定 | 可配 revalidate |
| 服务成本 | 高 | 极低 | 低 |
- 共同收益：首屏 HTML 直出利于 SEO 与 FCP；代价：服务端复杂度、hydration 成本

### 7. Next.js App Router 和 Pages Router 的区别？

**结论：Pages Router 以文件即页面 + getServerSideProps 系列数据函数；App Router 以 React Server Components 为核心——默认服务端组件、布局嵌套共享、Suspense 流式、Server Actions 表单。**

- 迁移动机：App Router 把「数据获取/缓存/流式」纳入路由契约，是 RSC 的官方落地形态
- 口径：理解两级路由模型的差异即可，项目实践以 SPA 为主

### 8. Error Boundary 是什么？哪些错误接不住？

**结论：类组件实现 getDerivedStateFromError / componentDidCatch，捕获「子树渲染期错误」并展示兜底 UI 防白屏；但**事件处理器、异步回调、服务端错误、它自身的错误都接不住**。**

- 能接 / 不能接

| 能接住 | 接不住 |
| --- | --- |
| 子树 render 抛错 | 事件处理器里的错误 |
| 生命周期方法抛错 | setTimeout/Promise 异步错误 |
| constructor 抛错 | SSR 服务端错误、Error Boundary 自身错误 |
- 异步/事件错误的兜底：window.onerror / unhandledrejection（监控体系），不是 Error Boundary
- 实践：路由级 + 关键组件级两级边界，配上报；「每个 onClick 包 try/catch」是反模式
- React 19 补充：错误可在 Error Boundary 内以状态形式处理（配合 Actions 的校验错误走 state 而非抛错）

### 9. 逻辑复用方案的演进：mixin → HOC → render props → 自定义 Hook？

**结论：四个时代各有致命伤，自定义 Hook 胜出的原因是「无嵌套、无命名冲突、来源清晰」——复用状态逻辑而不复用 UI 结构。**

- 演进与问题

| 方案 | 机制 | 致命伤 |
| --- | --- | --- |
| mixin | 混入实例 | 隐式依赖、命名冲突、来源不明（React 已弃） |
| HOC | 组件包组件返回增强组件 | 嵌套地狱、props 命名冲突、ref 转发麻烦 |
| render props | 传函数 prop 共享状态 | 嵌套地狱、只能复用「渲染」 |
| 自定义 Hook | 函数内组合 hooks | 几乎没有——代价是调用方要遵守 hooks 规则 |

## 十一、手写代码（现场编码）

### 1. 手写简易 useState

**结论：思路——状态存外部变量/链表，setState 改状态并触发重渲染；核心考点是「多次 setState 排队 + 函数式更新」。**

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

### 2. 手写简易 useEffect

**结论：思路——比较依赖数组决定是否执行；清理函数在「重跑前/卸载前」调用。**

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

### 3. 手写 useDebounce

**结论：值防抖——延迟同步到 state，窗口内变化就重置定时器；必须配 cleanup 清定时器。**

```js
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)   // 重置窗口
  }, [value, delay])
  return debounced
}
```

### 4. 手写 useThrottle

**结论：节流——用 ref 记上次执行时间戳，窗口内只放行第一次；清理不必复杂（无定时器版本），定时器版本要保证尾帧。**

```js
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

### 5. 手写 usePrevious

**结论：用 effect 的时序差——渲染后把当前值存进 ref，返回的是「上一渲染」的值。**

```js
function usePrevious(value) {
  const ref = useRef()
  useEffect(() => { ref.current = value }, [value])
  return ref.current   // 首次是 undefined，之后是上一渲染值
}
```

- 易错点：为什么不在渲染体里直接赋值？——渲染体要求纯，且「渲染中改 ref」时序不可控

### 6. 手写虚拟长列表（核心思路）

**结论：三件——滚动偏移算起止索引、slice 渲染、占位总高撑滚动条（见第七组第 6 题原理）。**

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

- 易错点：key 用业务 id；缓冲区防白屏；动态高度要加测量修正缓存

### 7. 手写 useEvent（useEffectEvent 思路）

**结论：解决「回调要读最新值、又不能进依赖数组」——用 ref 装最新函数，返回一个引用稳定的包装函数。**

```js
function useEvent(fn) {
  const ref = useRef(fn)
  useLayoutEffect(() => { ref.current = fn })   // 每次渲染后同步最新
  return useCallback((...args) => ref.current(...args), [])   // 引用永远稳定
}
```

- 要点：包装函数引用稳定（不会让 memo 失效），内部调用永远最新版——官方 useEffectEvent 的思想原型

## 十二、项目场景（口述大题）

### 1. 项目中 React 遇到的最大技术难点是什么？

- 答题框架：定位难点 → 方案对比 → 落地 → 量化 → 沉淀（与 Vue 篇十二.1 同结构）
- 可用素材方向（按真实经历选）
  - 大表单性能：AntD 受控表单每键全表单渲染 → 字段级拆分 / 非受控收集 / shouldUpdate 精细订阅
  - 列表竞态：快速切换 tab 慢响应覆盖新结果 → 过期标记 + AbortController（React 版竞态治理，与 Vue 篇同思想不同 API）
  - 菜单/权限动态路由：刷新丢失 → 登录后重建路由表 + 兜底路由
  - 微前端/多入口：React 17 事件委托到 root 的兼容意义
- 口径提醒：React 侧素材要经得起追问「具体哪个项目哪一页」——面试前填真实案例

### 2. 项目里做过哪些 React 性能优化？有什么收益？

- 答题框架：先报「渲染/加载/运行时」三层骨架，再挑一层展开
- 常用素材（按真实做过选）
  - memo 三件套配套（举一个「截住昂贵子树」的具体例子）
  - 路由级 React.lazy 分包（首屏体积前后对比）
  - 虚拟列表（列表量级 + 帧率变化）
  - Profiler 定位 → 渲染原因驱动优化的过程（体现方法论而非堆技巧）
- 收益描述要有口径：体积/首屏/交互帧率的对比怎么测的

### 3. 状态管理为什么选 RTK / Zustand 而不是原生 Redux？

- 要点
  - 原生 Redux 三宗罪：样板多、不可变更新易错、配置繁琐
  - RTK：createSlice + Immer + configureStore 一站解决；Zustand：无 Provider、selector 订阅、体积小
  - 判据：规模（中型 Zustand / 大型 RTK）、团队约定、DevTools 诉求
  - 加分：指出「服务端状态不该进全局 store」——Query 类库的分工（见第三组 17 题）

### 4. 遇到过 Hooks 闭包陷阱吗？什么场景，如何解决？

- 答题框架：场景 → 原理 → 解法 → 预防
  - 场景举例：setInterval 里读 state 永远是旧值；事件监听器捕获旧 props
  - 原理：每次渲染独立闭包快照——setInterval 的回调只捕获**首次**那次渲染的 state
  - 解法分层
    - 函数式更新 setState(prev => ...)（计数/累加类）
    - useRef 存最新值（回调里读 ref.current）
    - 依赖数组补全（让 effect 按需重建——定时器场景配 cleanup 清旧定时器）
    - useEvent/useEffectEvent（读最新值且不污染依赖）
  - 预防：eslint exhaustive-deps 开满；「effect 里读外部值」先问「是快照语义还是最新语义」
- 追问预判：「为什么 setInterval 里 ref 能读到最新值？」——ref 是同一对象，effect 每轮把最新值写进 current

### 5. Vue 转过来，React 和 Vue 的最大差异是什么？（双栈必问）

**结论：核心差异是「更新粒度」——Vue 依赖收集精准更新（改了什么更新什么），React 不可变 + 全量重渲染再靠 memo/依赖数组手动收缩；两边的心智迁移点是「快照语义 vs 响应式语义」。**

- 五维对比

| 维度 | Vue | React |
| --- | --- | --- |
| 更新粒度 | 依赖收集，精准 | setState 全量重渲染 + memo 手动收缩 |
| 响应式 | 可变数据 + 代理拦截 | 不可变替换 + Object.is 比较 |
| 编译优化 | 模板编译期（patchFlag/静态提升）空间大 | JSX 全运行时，靠 Fiber 调度补 |
| 复用 | Composable | 自定义 Hook（同构思想） |
| 心智 | watch 精确监听某数据 | effect 是「与本次渲染同步的副作用」 |
- 答法核心：证明理解「为什么不同」——模板可静态分析所以编译期优化空间大；JSX 太灵活只能运行时
- 互译表（展示双栈深度）：computed ≈ useMemo、watch ≈ useEffect（但 effect 无精确监听语义）、defineExpose ≈ useImperativeHandle、Composable ≈ 自定义 Hook、onCleanup ≈ effect cleanup（竞态治理同思想）
