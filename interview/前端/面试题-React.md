# 面试题 · React（全覆盖版）

> 定位：主栈 Vue，React 有完整项目实践（赴演记管理后台 React 19 + Ant Design）。被问「React 熟到什么程度」时口径：**核心机制与工程实践扎实，源码级细节以理解原理为主**，不吹精通。
> 题目与知识体系 frontend/react/（核心概念、Hooks、状态管理、高级与原理、mini-react）对齐；高频考题方向按 2025-2026 行情校准（Fiber、Hooks 原理与闭包陷阱、并发特性为追问重灾区）。

## 一、核心概念与 diff

**Q1：虚拟 DOM 与 diff 策略？和 Vue 的 diff 比呢？**
- diff 三策略：同级比较、type 不同直接重建、key 标识身份——跨层移动按删除+重建处理
- Vue2 双端对比 / Vue3 最长递增子序列做最少移动；React 单向从左到右比较，实现更简单、配合可中断调度
- 共同点：key 不用 index（删插错位复用）

**Q2：Fiber 架构解决什么问题？**
- 旧栈递归渲染同步不可中断，组件树大时长任务阻塞主线程掉帧
- Fiber 把组件树拆成链表节点（child/sibling/return），渲染拆成可中断的工作单元
- 双缓冲：current 树（当前 UI）与 workInProgress 树（构建中），alternate 指针互换
- 调度分两阶段：render 阶段可中断（diff 计算），commit 阶段同步不可中断（真实 DOM 提交）

> F1：时间切片怎么切的？优先级怎么排？
> - 渲染任务切片插入空闲时间执行，高优先级更新（输入、动画）可打断低优先级重渲染；lane 模型定优先级
> - 这就是为什么 render 阶段的函数组件可能被重复执行——副作用必须放 useEffect 不能放渲染体里

## 二、Hooks（追问重灾区）

**Q3：Hooks 原理？为什么不能写在条件/循环里？**
- 函数组件的 Fiber 节点上以链表存 hook 状态（memoizedState），调用顺序对应链表遍历顺序
- 条件调用会让链表错位——第 N 个 hook 读到第 N-1 个的状态，直接错乱
- 这就是规则「只在顶层调用」的根本原因，不是代码风格问题

**Q4：useState 的闭包陷阱？**
- 每次渲染是一次独立函数执行，捕获当次渲染的 state 快照——setTimeout 里读到旧值是「当时闭包」的正常行为
- 解法：函数式更新 setState(prev => prev + 1)（绕开闭包读最新队列值）或 useRef 存最新值
- 能讲出「每次渲染独立闭包 + 更新队列」两层，这道题就是满分答法

**Q5：useEffect 和 useLayoutEffect 区别？**
- useEffect：渲染提交后异步执行，不阻塞绘制（绝大多数副作用）
- useLayoutEffect：DOM 变更后、绘制前同步执行——需要「测量后立刻改样式防闪烁」才用
- 清理函数：下次 effect 执行前 / 卸载时调用（防泄漏）

**Q6：useMemo / useCallback / memo 各管什么？**
- memo：组件级浅比较 props 拦截重渲染；useCallback 缓存函数引用、useMemo 缓存计算结果
- 三件套要配套才有意义：父组件 useCallback 了，子组件不 memo 就白包
- 反面：到处包 useCallback 本身有比较与内存成本——只用在「确实截住了昂贵子树」的地方

**Q7：useRef 和 createRef？ref 的使用场景？**
- useRef 返回同一对象跨渲染稳定（可存 DOM、可存可变值不触发渲染）；createRef 每次渲染新建（类组件用）
- 转发：forwardRef；useImperativeHandle 自定义暴露给父组件的实例方法

## 三、状态与数据流

**Q8：setState 是同步还是异步？批处理机制？**
- 调用本身同步入队，更新异步批量应用（React 18 自动批处理扩展到 promise/setTimeout 等所有场景，此前只有事件回调内批处理）
- 同一轮多次 setState 合并一次渲染；要基于上次值就函数式更新
- flushSync 可强制同步刷出（极少用）

**Q9：状态管理怎么选？（redux / zustand / context）**
- Context：低频全局状态（主题、登录态）——值变全树消费者重渲染，不当全局 store 用
- Redux Toolkit：大型团队、中间件与调试工具链要求高；zustand：轻量、selector 细粒度订阅
- 【项目】赴演记管理后台规模用 Ant Design 表单态 + 局部状态够用，没为小项目引状态库——选型讲「按复杂度」，不为简历堆词

**Q10：受控与非受控组件？**
- 受控：value + onChange，状态在 React（表单联动校验强）；非受控：defaultValue + ref 取值（简单场景性能好）
- Ant Design 表单本质是非受控收集 + 实例 API 联动的混合模式

## 四、React 18/19 与工程

**Q11：React 18 并发特性用过什么？**
- startTransition：把非紧急更新标为可中断（大列表过滤不卡输入框）；useDeferredValue 延迟派生值
- Suspense 配合流式 SSR；自动批处理
- 【项目】React 19 管理后台：19 的 Actions/表单异步与 useOptimistic 属了解层级，实答「项目主要用到 18 特性 + 19 运行时」，不硬编没用过的 API

**Q12：React 19 的关键变化？**
- Actions（表单异步过渡）、useOptimistic 乐观更新、ref 不再需要 forwardRef、use API 解包 promise/context
- 编译器方向（React Compiler 自动 memo）——了解趋势即可，答「关注但生产未上」

**Q13：合成事件机制？**
- 事件委托到根容器统一监听，生成合成事件对象（抹平浏览器差异）
- 好处：省监听器、统一调度优先级；e.stopPropagation 操作的是合成事件层

**Q14：key 的作用？为什么用 index 有坑？**
- key 是同层节点复用的身份判定；index 作 key 时插入/删除导致后续项错位复用——输入框内容串位是经典症状
- 稳定业务 id；确实纯静态列表 index 才无害

**Q15：Vue 转过来，两者最大差异是什么？（双栈必问）**
- 响应式：Vue 依赖收集精准更新（改了什么更新什么）；React 不可变 + setState 全量重渲染，靠 memo/依赖数组手动控制
- 心智迁移：Vue 的 computed 缓存 ≈ useMemo；watch ≈ useEffect（但 effect 是渲染后统一跑，没有「监听某个数据」的精确性）
- 模板 vs JSX：模板编译期优化（patchFlag）空间大；JSX 表达力强靠运行时
- 答法核心：证明你理解「为什么不同」而不只是「语法不同」
