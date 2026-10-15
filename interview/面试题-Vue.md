# 面试题 · Vue（全覆盖版）

> 高频常考为主，简历结合点标【项目】。红线：不说「自研 JSBridge」。

## 一、响应式原理

**Q1：Vue2 和 Vue3 响应式的区别？**
- Vue2：Object.defineProperty 劫持已知属性——新增/删除属性要 $set/$delete，数组要重写 7 个原型方法，深层对象初始化时递归全部劫持
- Vue3：Proxy 代理整个对象——支持新增/删除/数组索引/length，惰性深层（访问才递归），支持 Map/Set
- 局限：Proxy 无法 polyfill；Vue3 响应式独立成 @vue/reactivity 可单独使用

**Q2：Vue3 响应式的实现原理？**
- effect 作为依赖收集的载体：读数据时 getter 收集 effect（track），写数据时 setter 触发 effect 重跑（trigger）
- 依赖结构：`WeakMap<target, Map<key, Set<effect>>>`；cleanup 防止分支切换导致的残留依赖
- 编译期配合：patchFlag 标记动态节点，block 收集动态后代，diff 时跳过静态内容

**Q3：ref 和 reactive 怎么选？什么情况下响应式会丢失？**
- ref 包装任意类型、.value 访问、支持整体替换；reactive 仅对象、解构/传参会脱离代理丢失响应式
- 丢失场景与补救：解构 reactive 对象（用 toRefs）、reactive 整体赋值（改用 ref）、props 解构（Vue3.4 前）
- shallowRef / shallowReactive / markRaw：大对象、第三方实例不做深度响应式

## 二、生命周期

**Q4：生命周期全览，Vue2 → Vue3 对应关系？**
- beforeCreate/created → setup（合并）；mounted/updated/beforeUnmount/unmounted → onMounted/onUpdated/onBeforeUnmount/onUnmounted
- 父子顺序：父 created → 子 created → 子 mounted → 父 mounted；卸载时子先 beforeUnmount
- keep-alive：activated / deactivated；errorCaptured 捕获子组件错误

**Q5：created 里能操作 DOM 吗？什么时机能？**
- 不能，此时还没挂载；首次操作 DOM 在 mounted；要等「数据变更引起的更新完成」用 nextTick

## 三、组件与通信

**Q6：组件通信方式汇总？**
- props / emit（父子）；v-model（Vue3 = modelValue + update:modelValue，可多 v-model）
- provide / inject（跨层，注意保持引用型数据响应式）
- 状态库 Pinia（跨页面/全局）；mitt 事件总线（谨慎用，难追踪）
- ref + defineExpose（父直接调子方法，模板引用）

**Q7：slot 有哪几种？作用域插槽原理？**
- 默认 / 具名 / 作用域插槽（子传数据给插槽内容渲染）
- 作用域插槽本质：子组件把插槽当函数调用，参数即数据——列表组件「渲染逻辑交给外部」的标准做法

**Q8：组件封装设计原则？**
- 单一职责；props 校验与默认值；受控/非受控分明；插槽与样式留扩展位；事件语义化
- 【项目】业务组件数据获取与编排放上层、组件只管渲染与交互，保证可复用可单测

## 四、Diff 与渲染

**Q9：virtual DOM 是什么？为什么需要？**
- 用 JS 对象描述真实 DOM 树；状态变更先 diff 新旧 vnode，最小化真实 DOM 操作
- 价值：声明式 + 跨平台；代价：多一层计算——Vue3 靶向更新（patchFlag/block）压缩了这层开销

**Q10：diff 算法的关键点？**
- 只同层比较、类型不同直接替换；key 是身份标识，不用 index（删插错位复用）
- Vue2 双端对比（头头/尾尾/头尾/尾头）；Vue3：预处理相同前后缀 + 最长递增子序列求最少移动
- 【项目】列表渲染绑定稳定业务 id 作 key

**Q11：nextTick 原理？**
- 更新异步批量：同一 tick 多次改状态只渲染一次；nextTick 基于微任务（Promise.then）排队
- 使用场景：改数据后要读更新后的 DOM（如滚动定位、测量高度）

## 五、常用机制

**Q12：computed 与 watch / watchEffect？**
- computed：缓存派生值，依赖不变不重算；get/set 支持可写计算属性
- watch：副作用（请求、跳转），可配 immediate / deep / flush: 'post'（DOM 更新后）
- watchEffect：立即执行自动收集依赖；不明确依赖时用，注意会隐式追踪

**Q13：v-if / v-show / v-for 同用？**
- v-if 惰性销毁重建（切换贵），v-show 一直渲染切 display（初次贵）；高频切换用 v-show
- v-for 与 v-if 同标签：Vue3 中 v-if 优先级更高（不能互相访问变量）——用 computed 过滤代替

**Q14：keep-alive 原理？**
- 缓存 vnode 与组件实例，LRU（include/exclude/max）；activated/deactivated 钩子
- 场景：列表页 ↔ 详情页往返保留筛选与滚动位置

**Q15：mixin 的问题？Vue3 怎么替代？**
- 来源不透明、属性名冲突、隐式依赖、TS 推导差
- 替代：组合式函数 useXxx——显式导入、返回值明确、可组合可测试
- 【项目】重构时把散在 data/methods/mixin 的逻辑按业务功能聚合成模块，级联试算抽纯函数

**Q16：为什么 Vue3 中 setup 里没有 this？**
- 组合式函数可能在任何时机被调用（甚至组件实例外），this 不可靠；函数式闭包替代 this 查找，也利于 tree-shaking 与 TS

## 六、生态与实践

**Q17：hash 路由和 history 路由的区别？**
- hash：# 后变化不发起请求，兼容好，无需服务端配置
- history：pushState 改路径真实好看，刷新会请求该路径 → 服务端要配 fallback 到 index.html（Nginx try_files）
- 导航守卫链：beforeEach → 组件内守卫 → afterEach；权限场景：路由表 + meta 权限 + 动态 addRoute

**Q18：Pinia 和 Vuex 的区别？**
- Pinia：无 mutation、天然 TS 推导、模块自动拆分、支持组合式写法；Vuex 单 store + modules 心智负担重
- 状态设计原则：服务端数据与 UI 状态分开，能从路由/URL 派生的状态不进 store

**Q19：SSR 了解吗？**
- 服务端渲染首屏 HTML → 更快 FCP、利于 SEO；代价：服务端负载、同构约束（window 生命周期区分）、开发复杂度
- 方案：Nuxt；折中：预渲染/SSG 适合内容型页面

**Q20：Vue 项目性能优化手段汇总？**
- 详见《面试题-性能优化》；Vue 侧核心：按需引入、路由懒加载、v-show 选型、key 稳定、computed 缓存、keep-alive、shallowRef 大数据、组件拆分收敛更新范围
