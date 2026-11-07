# 面试题 · Vue

> 定位：Vue3 主栈视角——Vue2 机制只以「对比」身份出现；原理题（响应式/diff/编译优化）与性能题是高级岗深挖区。全篇 10 组统一按「一句结论 + ①②③ 分层论证 + ⭐ 加分点」组织，纯枚举对比保留小表格。

## 前置：Vue2 与 Vue3 对比总览

### 1. Vue2 和 Vue3 主要区别有哪些？

**结论：从响应式、API 风格、编译优化、工程化四个维度讲，最后补新能力——性能提升的主因是编译期优化，不是 Proxy。**

**① 响应式：defineProperty → Proxy**

- Vue2 逐个属性劫持，新增/删除属性、数组下标与 length 监听不到，初始化还要全量递归
- Vue3 代理整个对象，get/set/has/deleteProperty 全可拦截，且是**惰性代理**：访问到深层才代理，初始化成本低

**② API 风格：Options → Composition**

- Vue2 按选项（data / methods / computed）组织，逻辑复用靠 mixin，来源不清、易命名冲突
- Vue3 按功能组织，组合式函数（useXxx）显式 import 即来源；同时兼容 Options API

**③ 编译优化：全量 diff → 定向更新**

- Vue2 运行时只能拿 vnode 全量递归比较，静态内容也参与
- Vue3 编译期就标出「哪些是动态的」：静态提升、patchFlag、Block Tree、事件缓存——diff 从遍历整棵树变成只跟动态节点

**④ 工程化：打包与类型**

- Vue3 源码 TS 重写，类型贯穿 API；ESM 产物对 Tree-Shaking 友好，用不到的 API 不进包
- 新能力：Fragment 多根、Teleport、Suspense、多 v-model；移除 `$on/$off` 与 filters

**⭐ 加分点**

- 「Vue3 为什么快」的标准答法是**编译期优化贡献最大**：静态占比越高，diff 量降得越明显；Proxy 主要改善的是**初始化**和**边界能力**，不是运行时 diff
- Vue3 仍保留 Options API 是兼容策略，不是推荐风格；新项目用 Composition

### 2. Vue3 为什么可以支持多根节点（Fragment）？

**结论：多根不是「模板语法放开」这么简单——Vue2 的实例与 patch 都以「唯一根 vnode」为前提，Vue3 增加了 Fragment 类型的 vnode 并在 patch 里补了多子节点分支，多根才成立。**

**① Vue2 的单根约束从哪来**

- 实例的 `$el` 要指向一个确定的真实 DOM 根，挂载、卸载都靠它定位
- diff 以单根 vnode 为入口递归，多根就没有唯一入口
- 父组件透传的 class/style（`$attrs`）要自动落到唯一根上

**② Vue3 的支持方式**

- 编译器允许多个根节点，产出一个 `shapeFlag` 为 Fragment 的 vnode，children 是数组
- patch 遇到 Fragment 走「多子节点」分支（数组 diff），不再要求单一入口；起止位置用两个空文本锚点定位

**③ 代价与边界**

- 多根时 `$attrs` 不会自动继承——必须显式挑一个根写 `v-bind="$attrs"`，否则透传丢失（开发期有警告）
- 依赖 `$el` 的递归组件、部分第三方库要自己保证语义

**⭐ 加分点**

- Fragment 的挂载靠 `hostCreateText('')` 生成的首尾空文本锚点，插入/卸载都以这对锚点为定位依据——这是多根能精确 patch 的底层原因
- 单根与多根在 diff 入口上是统一的：`renderComponentRoot` 返回的 subTree 无论是不是 Fragment，都走 `patch(n1, n2, container, anchor)`

## 一、基础指令与模板

### 1. v-if 和 v-show 的区别？各自适用场景？

**结论：v-if 是「真删真建」，v-show 是「常驻 + display 切换」；切换频繁选 v-show，条件长期不变选 v-if。**

**① 原理差异**

- v-if 编译成三元表达式，条件为假时渲染一个**注释占位节点**，元素/组件根本不存在
- v-show 编译成指令，节点始终创建，只切换 `el.style.display`

**② 开销结构决定选型**

- v-if：初始开销低（假值不创建），切换开销高（销毁 + 重建，子组件生命周期全套走一遍）
- v-show：初始开销高（无论真假都渲染），切换只改一个样式属性，几乎零成本

**③ 边界**

- 同一节点不要混用：v-if 为假时节点不存在，v-show 没有生效对象
- v-show 支持不了 `<template>` 与多根 Fragment——它需要一个真实元素承载 display

**⭐ 加分点**

- v-if 为假留下的是注释占位节点而非「什么都不留」，这是它能参与 diff、后续精确插入的前提
- 权限控制类场景用 v-if 更安全：v-show 只是视觉隐藏，DOM 与数据仍在，敏感信息别靠 display 挡

### 2. v-for 为什么必须加 key？用索引作 key 会带来什么问题？

**结论：key 是 vnode 的「身份」，diff 靠它决定复用还是移动；用 index 当 key 等于把「位置」当身份，列表一重排就错位复用。**

**① key 在 diff 里干什么**

- 有 key 时 patchKeyedChildren 先建「key → 旧节点下标」映射，同 key 命中就原地 patch 内容，没命中才新建
- 最终按「最长递增子序列」决定哪些节点原地不动、哪些移动，把 DOM 移动次数压到最少

**② index 作 key 的错位机制**

- `[A,B,C]` → 头部插入 D：旧 key 0/1/2 与新 key 0/1/2 全部「命中」，diff 认为位置没变、内容变了
- 于是 A 被 patch 成 D、B 被 patch 成 A……整列表内容重写，带状态的子组件（输入框、勾选、动画）状态跟着错位

**③ 什么情况可以不用唯一 key**

- 纯展示、不重排、只在尾部追加——此时位置与身份一致，index 不产生错位（但要能说出这个前提）

**⭐ 加分点**

- key 必须是**稳定且唯一**的业务标识（id）；用 `Math.random()` 等于每次全部销毁重建
- key 只在同一父节点下需要唯一，且只影响同层 diff，不跨层级
- 无 key 的列表走「就地复用」（按位置 patch），并不是完全不 diff

### 3. v-for 和 v-if 能不能写在同一个标签上？Vue2 和 Vue3 的优先级差异？

**结论：不要写在同一标签；两代优先级正好相反——Vue2 先循环后判断（浪费），Vue3 先判断后循环（拿不到循环变量，直接编译报错）。**

**① Vue2：v-for 优先**

- 同一节点的 v-for 先执行，每个元素都生成一遍再跑 v-if 过滤
- 不满足条件的项也走了完整渲染计算，纯属浪费

**② Vue3：v-if 优先**

- v-if 在 v-for 作用域外层求值，访问不到循环变量——所以 `v-if="item.visible"` 直接编译报错
- 本质是把「隐式浪费」变成「显式拦截」，强制写对

**③ 正确写法**

- 列表过滤：computed 先算出过滤后的数组，再 v-for
- 整块条件渲染：v-if 提到外层 `<template>` 或父容器上

**⭐ 加分点**

- 报错信息是「v-if 里访问不到 v-for 的变量」——答「优先级变了，作用域方向也变了」比只背结论更稳
- 过滤放 computed 额外好处：过滤结果有缓存，依赖不变不重算

### 4. computed 和 watch 的区别？computed 有缓存吗？

**结论：computed 是「带缓存的派生值」（声明式），watch 是「变化后执行副作用」（命令式）；computed 有缓存，靠依赖变化打脏标记、下次读取才重算。**

**① 定位不同**

- computed：由其他响应式数据「算出来」的值，必须同步返回，用在模板里
- watch：监听某个源，变化后做异步/开销大的事（请求、写缓存、操作 DOM），不需要返回值

**② computed 的缓存机制**

- 首次读取执行 getter，过程中 track 收集依赖
- 依赖变化时不立即重算，只把 computed 标记为 dirty；下次读取发现 dirty 才执行，否则直接返回缓存
- 这就是「惰性求值」：多次读取只算一次，没人读就一次都不算

**③ watch 的执行细节**

- 默认惰性（首次不执行），`immediate: true` 立即跑一次
- 默认在组件更新前（`pre`）触发；`flush: 'post'` 可改为 DOM 更新后
- 监听 reactive 对象的属性要写函数形式 `() => obj.key`——直接传对象必须配 `deep`，开销大

**⭐ 加分点**

- computed 实为 `ComputedRefImpl`，本身也是一个 effect，所以能参与依赖链：别的 effect 读它，它就成了对方的依赖
- `watchEffect` 是「先执行、自动收集依赖」，适合依赖说不清的场景；watch 是「显式声明源」
- computed 里不要写副作用（发请求、改状态）——它可能因缓存而不执行，逻辑会漏

### 5. 双向绑定 v-model 的原理？组件上多 v-model 怎么实现？

**结论：v-model 是编译期语法糖——原生元素展开成「值绑定 + 事件监听」，组件展开成「modelValue prop + update:modelValue 事件」；Vue3 用参数化 `v-model:xxx` 支持多路绑定。**

**① 原生元素上的展开**

- 文本框：`:value` + `@input`，赋值时读 `$event.target.value`
- checkbox / radio 走 `checked` 与 `change`，select 走 `value` 与 `change`——不同控件展开不同
- 修饰符在编译期改写：`.lazy` 换 change 事件、`.number` 包一层数字转换、`.trim` 去首尾空格

**② 组件上的展开**

- `v-model="val"` → `:modelValue="val"` + `@update:modelValue="val = $event"`
- 子组件 `defineProps(['modelValue'])` + `defineEmits(['update:modelValue'])`，内部改动时 emit 新值
- 本质仍是**单向数据流**：子组件不直接改 prop，而是通知父组件改

**③ 多 v-model**

- `v-model:title`、`v-model:content` 分别映射到 `title`/`content` prop 与 `update:title`/`update:content` 事件
- Vue3.4+ 可用 `defineModel()` 一行声明，props + emit 样板由编译器生成

**⭐ 加分点**

- Vue2 的多属性双向靠 `.sync`，Vue3 把 `.sync` 合并进参数化 v-model——一个语法统一两种需求
- 自定义 v-model 的常见坑：emit 后父组件没更新，多半是 `update:xxx` 事件名拼错或没声明 `emits`
- `v-model` 绑 computed 必须提供 setter，否则运行时报「没有 setter」

### 6. nextTick 的作用与原理？什么时候必须用？

**结论：Vue 的 DOM 更新是异步批量的，nextTick 把回调排进微任务队列，保证在「本轮更新 flush 完成后」执行；典型场景是改完数据立刻读 DOM。**

**① 为什么要异步批量**

- 同一 tick 里连续改多个响应式数据，若每次都同步渲染，会重复计算 vnode、重复操作 DOM
- 做法是把渲染 effect 丢进队列去重，一个微任务里统一 flush

**② 执行时序**

- 改数据 → trigger → scheduler 把 job 入队（同 id 去重）→ 微任务里 flushJobs
- flush 内部按 job id 升序执行，保证父组件先于子组件更新
- nextTick 回调挂在 flush 之后，所以「DOM 已更新、浏览器还没绘制」时执行

**③ 必须用的场景**

- 改数据后测量尺寸/位置（滚动到底、弹层定位、图表 resize）
- 改数据后立刻拿新渲染出的子组件实例或 DOM 节点

**⭐ 加分点**

- nextTick 是**微任务**（Vue3 用 Promise.then），比 `setTimeout(fn, 0)` 早一轮，且正好落在「DOM 更新后、绘制前」窗口
- 更新时机分三档：`pre`（默认，组件更新前）、render、`post`（DOM 更新后，`flush: 'post'` 的 watcher / `onUpdated`）——nextTick 晚于 post
- 连续多次 `nextTick` 回调按入队顺序执行，返回值是可 await 的 Promise

### 7. 模板编译流程：模板如何变成真实 DOM？

**结论：编译期三步 parse → transform → generate 产出 render 函数；运行期执行 render 得到 vnode 树，再 patch 成真实 DOM。**

**① parse：字符串 → AST**

- 词法 + 语法分析，产出元素、属性、文本、插值表达式节点
- 指令（v-if / v-for / v-model）先被摘成节点上的元信息，不立即展开

**② transform：AST → 优化后的 AST**

- 递归遍历，把指令与表达式改写成运行时可执行的形态（如 v-for 转成渲染函数调用）
- 编译优化主战场：静态节点打标、静态提升（hoistStatic）、事件缓存（cacheHandlers）、生成 patchFlag、划分 Block

**③ generate：AST → render 代码**

- 拼出 `createVNode(...)` 调用串，动态部分带 patchFlag，形成 Block Tree 的层级结构
- 运行期首次挂载：执行 render → vnode → mount；更新时新旧 vnode diff → 最小化 DOM 操作

**⭐ 加分点**

- 工程里靠 `@vitejs/plugin-vue` / `vue-loader` 在构建期完成编译，产物只含 runtime——模板不是运行时字符串解析
- 这是「template 里只能是单个 JS 表达式」的原因：它要被真实编译成代码，不是 eval 字符串
- patchFlag 是「带类型的 diff 提示」：`TEXT` 表示只有文本会变，`CLASS` 表示只有 class 动态——diff 按 flag 只做对应比较，跳过结构判断

## 二、组件、插槽、通信

### 1. Vue 组件之间有哪些通信方式？各自适用场景？

**结论：按「关系」选——父子 props/emit、组件 v-model、跨层 provide/inject、父取子 ref + defineExpose、透传 $attrs、任意关系用 Pinia / mitt。**

| 关系 | 方案 | 说明 |
| --- | --- | --- |
| 父 → 子 | props | 单向数据流，子组件不能直接改 |
| 子 → 父 | emit 自定义事件 | `defineEmits(['change'])` |
| 父子双向 | 组件 v-model | `:modelValue` + `@update:modelValue` 的语法糖；可 `v-model:title` 多个 |
| 跨层级 | provide / inject | 祖先提供、后代注入；配合只读包装防后代乱改 |
| 父取子 | ref + defineExpose | script setup 默认**不暴露**任何东西，子组件要显式 defineExpose |
| 透传 | $attrs | 未声明为 props 的属性集合；多层组件透传用 `v-bind="$attrs"` |
| 任意关系 | Pinia（推荐）/ mitt | 跨页面共享状态用 Pinia；Vue3 移除 $on/$off 后 mitt 是事件总线替代 |

**⭐ 加分点**

- 能用 props/emit 解决的不要上升为 provide/inject 或 store——通信方案越「轻」，数据流向越可追踪
- `$attrs` 包含 class/style 之外的未声明属性；`inheritAttrs: false` 可关闭自动继承，便于把透传落到指定元素
- 事件总线只适合「通知」不适合「传状态」：没有状态快照，订阅方错过就丢了

### 2. provide / inject 的作用、优缺点、适用场景？

**结论：祖先 provide、后代任意层级 inject，绕过逐层 props；适合「子树上下文」（表单容器、主题、组件库内部），不适合业务数据随意透传。**

**① 为什么需要它**

- 深层组件拿祖先数据，逐层 props 传（prop drilling）会让中间层被迫承接无关参数
- provide/inject 让「提供方」与「消费方」直接建立关系，中间层完全无感

**② 用法与响应性**

- 祖先 `provide('theme', themeRef)`，后代 `const theme = inject('theme', 默认值)`
- 传 ref / 组合式函数返回值保持响应性；传普通对象是**快照**，后续改动不会同步
- key 建议用 Symbol 或统一常量，避免字符串重名

**③ 缺点与边界**

- 数据来源隐式——读代码看不出值从哪来，重构风险高
- 组件层级位置一变可能断供；被多个实例复用时容易串数据
- 防乱改：`provide(key, readonly(state))`，写操作走提供方暴露的方法

**⭐ 加分点**

- Vue3 支持在应用级注入：`app.provide(key, val)`，全局插件/主题常用
- inject 的第二个参数是默认值，但要传工厂函数 `() => obj` 才能避免多实例共享同一对象
- 和 Pinia 的分界：Pinia 是「应用级共享状态」，provide/inject 是「子树作用域上下文」

### 3. keep-alive 的作用、参数与生命周期变化？

**结论：keep-alive 缓存组件实例不销毁，切回来状态还在；被缓存组件的生命周期从「销毁重建」变成「激活/失活」。**

**① 缓存机制**

- 内部用缓存对象存 vnode，命中缓存直接复用实例，不重新创建
- 卸载时不是真销毁，而是从 DOM 移出并保留实例；再显示时只做插入

**② 生命周期变化**

- 不再走 unmounted / 重新 mounted，改为 activated（激活）/ deactivated（失活）
- 首次进入仍是 mounted → activated 的顺序

**③ 参数与实战**

- include / exclude 按组件 `name` 匹配；max 控制上限并做 LRU 淘汰
- 路由缓存经典题：列表页缓存、详情页不缓存——用路由 meta 标记 + 动态 include
- 回到缓存页要刷新数据：在 activated 里比对路由参数/时间戳，决定是否重新请求

**⭐ 加分点**

- include 匹配的是**组件 name**（script setup 要用 `defineOptions({ name })` 显式声明），不是文件名
- 同一路由不同参数会被同一实例复用——需要缓存隔离时给组件加 `:key="route.fullPath"`
- 缓存的实例仍占内存，列表页多时用 max 限流；被缓存组件的 watch 在 deactivated 后仍存活

### 4. Teleport 组件的作用，解决什么问题？

**结论：把子树「传送」到 DOM 树的任意位置渲染（如 body），但逻辑归属仍在原组件树——解决弹层被父级 overflow / z-index / transform 影响的经典问题。**

**① 要解决的痛点**

- 弹窗写在组件树深处，父级有 `overflow: hidden` 会裁掉它
- 父级有 `transform` / `filter` / `will-change` 会创建新的包含块，`position: fixed` 直接失效

**② 用法与关键点**

- `<Teleport to="body">…</Teleport>`，to 接收选择器或元素
- 逻辑还在原组件：props、事件、provide/inject、上下文都照常工作
- `disabled` 可响应式开关传送（移动端/桌面端切换容器时常用）

**③ 什么场景不该用**

- 组件本身就是布局的一部分（如嵌在容器内的抽屉）——传送出去反而破坏文档流语义
- 弹层需要跟随父容器滚动/裁剪时，传送会脱离原定位上下文

**⭐ 加分点**

- 多 Teleport 到同一目标时按挂载顺序排列；目标元素必须先存在（否则要先动态创建）
- Teleport 只改「渲染位置」不改「组件树位置」——Vue Devtools 里仍挂在原父组件下

### 5. mixin 的优缺点？Vue3 推荐用什么替代（Composable 怎么封装）？

**结论：mixin 的问题是结构性的——来源不清、命名冲突、隐式耦合、类型推导差；Vue3 用组合式函数（useXxx）替代，import 即来源、返回值即接口。**

**① mixin 的四个结构性问题**

- 来源不清晰：模板里出现一个属性，不知道来自哪个 mixin，要翻遍所有混入
- 命名冲突：多个 mixin 的 data / methods 同名时按合并策略静默覆盖
- 隐式耦合：mixin 可能依赖组件的某个属性，双方互不知道对方存在
- 类型推导差：合并后的 this 类型几乎不可推导

**② Composable 的封装规范**

- 命名 useXxx；输入接受 ref 或普通值（用 `toValue` 统一处理）
- **返回 ref 而不是 reactive**——消费方解构不丢响应
- 副作用清理用 `onScopeDispose(fn)`：组件销毁时自动执行，且在任意 effect 作用域里都可用
- 内部 watch / 事件监听挂在组件作用域下，自动随销毁清理

```js
export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  const update = e => { x.value = e.pageX; y.value = e.pageY }
  window.addEventListener('mousemove', update)
  onScopeDispose(() => window.removeEventListener('mousemove', update))
  return { x, y }   // 返回 ref，解构安全
}
```

**③ 对比与边界**

| 维度 | mixin | 组合式函数 |
| --- | --- | --- |
| 来源 | 隐式合并，看不到 | import 显式引入 |
| 命名冲突 | 静默覆盖 | 函数作用域隔离，不冲突 |
| 复用粒度 | 整个选项块合并 | 精确到一段逻辑（状态 + 方法） |
| TS | 推导弱 | 完整推导 |
| 独立状态 | 共用组件同一份状态 | 调用几次就有几份独立状态 |

**⭐ 加分点**

- 本质差异：mixin 是「往组件里合并选项」，composable 是「函数调用返回值」——后者天然支持多实例独立状态
- composable 里用 `onUnmounted` 就只能用在组件内；用 `onScopeDispose` 才能在 effectScope 或普通作用域复用
- 在异步回调里创建的副作用不受组件作用域管控，必须自己判断组件是否已卸载

## 三、生命周期

### 1. 生命周期钩子有哪些？Vue2 与 Vue3 怎么对应？

**结论：创建 → 挂载 → 更新 → 销毁四阶段，各有前后一对钩子；Vue3 是「改名 + 迁移」——destroyed 系改 unmounted 系，beforeCreate/created 被 setup 取代，其余以 onXxx 写进 setup。**

**① 四阶段对照**

| 阶段 | Vue2 | Vue3（组合式） | 时机与用途 |
| --- | --- | --- | --- |
| 创建前/后 | beforeCreate / created | setup 本身（等价覆盖） | data/methods 初始化；**发不依赖 DOM 的请求最早在 created** |
| 挂载前/后 | beforeMount / mounted | onBeforeMount / onMounted | mounted 后可访问真实 DOM——图表/测宽高等初始化在这里 |
| 更新前/后 | beforeUpdate / updated | onBeforeUpdate / onUpdated | 数据变 UI 未变 / UI 已同步；避免在里面改状态（死循环） |
| 销毁前/后 | beforeDestroy / destroyed | onBeforeUnmount / onUnmounted | 清理定时器/事件监听/订阅 |
| 缓存激活/失活 | activated / deactivated | onActivated / onDeactivated | keep-alive 缓存组件专用 |

**② setup 的执行位置（必考追问）**

- 在 **beforeCreate 之前**执行：实例刚建立，data/methods 还没初始化，所以 setup 里**没有 this**
- 模板里用到的顶层绑定由编译器自动暴露，不需要 return

**③ created 与 mounted 怎么选**

- 不依赖 DOM 的请求：created / setup 里直接发，最早触发、省时间
- 依赖 DOM 的初始化（图表、第三方库挂载）：mounted

**⭐ 加分点**

- SSR 时只有 created（setup）在服务端执行，mounted 仅客户端——依赖环境的代码要放对侧
- keep-alive 缓存后，反复进出只走 activated / deactivated，mounted 只执行一次
- `errorCaptured` / `onErrorCaptured` 从子向父冒泡，返回 false 可阻止继续向上传递

### 2. 父子组件生命周期执行顺序（创建、更新、销毁）？

**结论：挂载是「父先创建、子先完成挂载」；更新和销毁都是「父 before → 子过程 → 父 after」——本质是父要等子树处理完才收尾。**

**① 挂载：创建由外向内，挂载由内向外**

- 父 beforeCreate → 父 created → 父 beforeMount → 子 beforeCreate → 子 created → 子 beforeMount → **子 mounted → 父 mounted**
- 父的 mounted 在最后，此时整棵子树 DOM 都已就绪

**② 更新：父先开始、最后结束**

- 父 beforeUpdate → 子 beforeUpdate → 子 updated → 父 updated
- 父的 beforeUpdate 触发时，子组件 DOM 还是旧值

**③ 销毁：同样父先开始、最后结束**

- 父 beforeUnmount → 子 beforeUnmount → 子 unmounted → 父 unmounted

**⭐ 加分点**

- 在子组件 mounted 里能安全访问自身 DOM，但父组件的 DOM 尚未 mounted（只有父的 beforeMount 之后、mounted 之前）
- `onUpdated` 不代表「某个特定数据已渲染」，只代表该组件本轮更新完成——精确时机用 `nextTick` 或 `watch` 的 `flush: 'post'`
- 递归组件的顺序同理向外层收敛：最深层 mounted 最先执行

### 3. onUnmounted 里需要手动清理哪些东西？哪些资源不清理会内存泄漏？

**结论：所有「在组件里创建、但生命周期长于组件」的资源都要清——定时器、全局监听、第三方实例、订阅连接、Observer；本质是外部闭包还持有组件内部引用，实例被吊着无法 GC。**

**① 必须手动清理**

| 类别 | 清理 API |
| --- | --- |
| 定时器 | clearInterval / clearTimeout |
| 全局事件监听 | removeEventListener（window/document 上的） |
| 第三方实例 | ECharts `dispose`、地图 `destroy`、编辑器销毁 |
| 订阅与连接 | mitt 的 `off`、WebSocket `close`、EventSource `close` |
| Observer | IntersectionObserver / ResizeObserver `disconnect` |

**② 不需要手动清理**

- setup 里创建的 watch / watchEffect / computed 与组件作用域绑定，卸载自动停止
- 异步上下文里手工创建的（如 `const stop = watchEffect(...)`），要自己调 stop

**③ 泄漏的本质**

- 外部对象持有回调 → 回调闭包持有组件数据 → 组件卸载但引用链还在，GC 判定仍可达

**⭐ 加分点**

- 排查用 Memory 堆快照：进出组件前后各拍一张，看 `Detached` 节点与组件实例是否持续增长
- removeEventListener 的 `capture`/`once` 参数要与 add 时一致，否则同一函数也移除不掉
- 定时器里引用了 `this` 或组件状态时最隐蔽——页面看着正常，内存只升不降

## 四、组合式 API 与 script setup

### 1. Options API 和 Composition API 的区别，各自优缺点？

**结论：Options 按「选项类型」组织（一个功能的代码被劈到 data / computed / methods 三处），Composition 按「逻辑功能」组织（状态与方法聚在一起）；大组件维护与逻辑复用是 Composition 的主场。**

**① 组织方式**

- Options：改一个功能要在 data、computed、methods、watch 之间来回跳，功能边界被选项类型切碎
- Composition：一个功能的状态、派生、副作用写在一起，抽成 useXxx 就是天然的复用单元

**② 逻辑复用**

- Options 靠 mixin：来源不清、命名冲突、隐式耦合（见第二章第 5 题）
- Composition 靠组合式函数：显式 import、明确入参出参、可多实例独立状态

**③ 选型与代价**

- 简单组件：Options 结构固定、上手快，仍然可用
- 复杂组件/需要复用：Composition 更清晰，但自由度高——团队需要约定 useXxx 的组织与命名规范，否则会散乱

**⭐ 加分点**

- Vue3 同时支持两种写法，同一组件内也能混用：Options 的 `this` 与 setup 里的响应式状态能互通
- Composition 的核心不是「写在 setup 里」，而是「逻辑可以脱离组件被抽走与测试」
- TS 支持差异的根因：Options 依赖 `this` 推断，Composition 是普通函数与变量类型，推导链完整

### 2. ref 和 reactive 的区别？如何选择？各有哪些响应式陷阱？

**结论：reactive 用 Proxy 代理对象；ref 用「对象包装 + 访问器属性」解决基本类型无法被代理的问题——所以取值要 `.value`；选型拿不准就全用 ref。**

**① 为什么基本类型必须用 ref**

- Proxy 只能代理对象，`let x = 1` 的读写没有任何拦截点
- ref 造一个 `{ value: x }` 包装对象，`value` 是访问器属性：getter 里 track、setter 里 trigger
- 这就是「必须 .value」的原因——`.value` 才是被拦截的读写入口

**② reactive 的两个硬陷阱**

- 整体替换：`state = {...}` 把代理引用换掉，新对象没被代理 → 响应丢失
- 解构：`const { a } = state` 拿到的是当前值快照 → 用 `toRefs(state)`
- 只能代理对象/数组/Map/Set，根级基本类型无能为力

**③ 选型与解包规则**

- 单值、需要整体替换、要作为返回值/参数传递 → ref
- 聚合状态对象且属性固定 → reactive
- 模板里顶层 ref 自动解包；JS 里、函数参数里、数组/对象深层**不**自动解包

**⭐ 加分点**

- ref 包对象时内部会走 `toReactive`，所以 ref 也是深层的：`ref({ a: { b: 1 } })` 改 `b` 同样触发
- reactive 对同一原始对象有缓存（WeakMap），重复 reactive 返回同一个代理
- 组合式 API 优先 ref 的另一层原因：ref 作为函数参数/返回值传递时响应性不丢，reactive 一旦解构或整体替换就断链

### 3. watch 和 watchEffect 的区别？依赖收集逻辑？

**结论：watch 显式声明源、默认惰性、能拿新旧值；watchEffect 立即执行一次、回调里用到谁就自动收集谁——「依赖怎么声明」是本质差异。**

**① 依赖来源**

- watch：源由你指定，即使回调里没用它也会被 track
- watchEffect：执行轨迹决定依赖，读到什么就收集什么；分支变了依赖集合也跟着变

**② 执行时机与信息量**

- watch 默认不执行，`immediate: true` 首次跑；回调拿 `(newVal, oldVal)`
- watchEffect 立即执行一次，没有新旧值
- 默认都在组件更新前（`pre`）；`flush: 'post'` 改为 DOM 更新后

**③ 竞态与清理**

- 回调第三参数 `onCleanup(fn)`：下次触发前或停止时执行，用来取消上一次请求
- 典型场景：搜索联想、切页请求——旧响应晚到会覆盖新数据

**⭐ 加分点**

- 两者底层都是 effect：回调执行时被 track 进所访问属性的依赖集合，变化时 trigger 重新调度
- 监听 reactive 对象的属性要写 `() => obj.key`；直接传对象会隐式 deep，大对象开销大
- watchEffect 里有 `await` 时，await 之后读到的值不会被收集——依赖必须在同步阶段读到

### 4. shallowRef / shallowReactive 是什么？适用场景？

**结论：浅层响应式——shallowReactive 只代理第一层，shallowRef 只跟踪 `.value` 的整体替换；用于大数据量与第三方实例。**

**① 浅在哪**

- shallowReactive：第一层属性响应，嵌套对象是普通对象，改深层不触发
- shallowRef：`.value` 整体替换才触发；改 `.value` 内部属性不触发

**② 典型场景**

- 大列表：整体替换引用只触发一次，几十万条不做深层代理，初始化与内存都省
- 第三方实例（图表、编辑器、地图）：不该被 Proxy 包一层，包了既慢又可能出错

**③ 配套 API**

- `triggerRef(ref)`：改完内部属性后手动触发一次更新
- `markRaw(obj)`：打标记，即使塞进 reactive 也不被代理
- `Object.freeze(obj)`：冻结后 reactive 检测到直接返回原对象，完全跳过代理

**⭐ 加分点**

- shallowRef 包对象时，`.value` 拿到的是原始对象而不是代理——深层改动完全静默，必须整体替换或 triggerRef
- markRaw 打的是 `__v_skip` 标记且不可逆，之后再 reactive 也不会生效
- 判断口诀：数据要「整体换」用 shallowRef，要「改属性」用 reactive / ref

### 5. toRef 和 toRefs 的作用，解决什么问题？

**结论：把 reactive 对象的属性转成「保持链接的 ref」，让解构/传参不丢响应式。**

**① 解决什么问题**

- reactive 解构会断链：`const { a } = state` 只是取值快照
- toRef 建一个指向 `state.a` 的 ref，读写都转回源对象：改 ref 源也变，改源 ref 也变

**② 用法**

- 单个：`const nameRef = toRef(state, 'name')`
- 批量：`const { a, b } = toRefs(state)`
- 属性不存在也能建，后续赋值会写回源对象

**③ 典型场景**

- 组合式函数返回一组状态时用 toRefs，消费方解构才安全
- props 透传给组合式函数：`toRefs(props)` 后解构仍能保持响应

**⭐ 加分点**

- `ref(state.name)` 是拷贝值、断开链接；`toRef` 是建立引用、保持同步——这是唯一分界
- toRefs 对每个属性做一次 toRef，返回的是普通对象（不是响应式对象），解构后每个属性才是 ref
- Vue 3.5 起 `const { count } = defineProps()` 由编译器转成逐属性访问，解构 props 不再断响应；`toRefs(props)` 是旧版本兼容写法

## 五、响应式原理

### 1. 响应式原理全链路：从 Vue2 的 defineProperty 到 Vue3 的 Proxy？

**结论：Vue2 用 defineProperty 逐个劫持「已存在的属性」+ 发布订阅，先天漏掉新增/删除属性、数组下标与 length——只能靠 `Vue.set` 与重写 7 个数组方法补救；Vue3 改用 Proxy 代理整个对象，读写全可拦截，从根上消除盲区，并靠懒代理省掉初始化递归。**

**① Vue2 的机制与三个缺陷**

- 初始化递归遍历 data，每个属性加 getter/setter 并挂一个 dep
- 渲染时读属性 → getter 收集 watcher；改值 → setter 里 `dep.notify` 通知更新
- 三个缺陷：新增/删除属性拦不到（要 `Vue.set`/`Vue.delete`）、数组下标与 length 拦不到、初始化必须全量递归

**② 数组的补救：重写 7 个变更方法**

- 被拦截数组实例的原型指向「继承 Array.prototype + 重写 7 方法」的中间对象
- push/pop/shift/unshift/splice/sort/reverse：先执行原生逻辑，再对新插入元素做响应式观测，最后手动 `dep.notify`
- 覆盖不到的两类：`arr[i] = value` 与 `arr.length = 0`——只能换写法（splice / `Vue.set`）

**③ Vue3 的根治：Proxy + Reflect**

- 初始化：`reactive()` 包成 Proxy，渲染函数本身包装成 effect
- get → track：把当前 effect 存进该属性的依赖集合
- set → trigger：取出集合里的 effect，进调度队列批量执行
- 依赖结构 `WeakMap<target, Map<key, Set<effect>>>`：WeakMap 弱引用防泄漏，Set 支持一个属性多个订阅
- Reflect 的作用：`Reflect.get(target, key, receiver)` 保证 getter 里的 this 指回代理，嵌套代理链不断

**⭐ 加分点**

- 新增/删除、数组下标、length 全可拦截，因为 Proxy 拦的是「对对象的操作」而不是「逐个属性」——下标就是属性，`length` 也是
- 初始化不递归：深层属性**首次访问时才代理**（懒代理），大对象初始化明显快于 Vue2
- 代价：不兼容 IE11（Polyfill 补不齐）；极深链路首次访问有一次代理开销
- 依赖桶用 WeakMap 的根因：key 是原始对象，对象销毁时整条依赖自动被 GC 回收

### 2. 依赖收集、派发更新的流程？Dep、Watcher、Effect 之间什么关系？

**结论：三个概念是同一套「发布订阅」在两代 Vue 里的名字——Vue2 用 Dep（属性的依赖盒子）+ Watcher（订阅者），Vue3 统一为 effect + 依赖桶；流程都是「读时收集、写时通知」。**

**① Vue2：Dep 与 Watcher（多对多）**

- 每个响应式属性一个 Dep；渲染组件时生成渲染 Watcher
- getter → `dep.depend()` 把当前 watcher 收集进来；setter → `dep.notify()` 通知所有 watcher
- 一个属性可被多个 watcher 依赖，一个 watcher 也依赖多个属性（watcher 自己持有 dep 列表去重）

**② Vue3：effect 与依赖桶**

- 没有 Dep/Watcher 类——effect 是「重新执行就会产生对应更新」的副作用（渲染、watch 回调、computed 都是）
- track 写入 `WeakMap<target, Map<key, Set<effect>>>`；trigger 取出集合并入调度队列
- 内层 effect 执行时会暂存外层活跃 effect，结束后恢复——依赖收集不会串层

**③ 对应关系与队列的意义**

| Vue2 | Vue3 | 角色 |
| --- | --- | --- |
| Dep（每属性一个） | Map 中该 key 的 Set | 属性的依赖集合 |
| Watcher | effect | 订阅者/副作用 |
| dep.notify + update 队列 | trigger + 调度器队列 | 批量异步更新 |

- 走队列而不是立即执行：同一 tick 多次改值只渲染一次（去重 + 批量），并按 id 排序保证「父先子后」

**⭐ 加分点**

- computed 自身也是 effect，所以能作为依赖被其他 effect 收集——派生值可以进入依赖链
- `Object.keys` 这类遍历依赖会 track 到 `ITERATE_KEY`；新增/删除键时 Vue3 会额外 trigger 它，否则遍历结果不更新
- Vue2 的那个「异步」是靠 `nextTick` 的 watcher 队列，Vue3 是 scheduler 的 job 队列——名字不同，机制同源

### 3. 什么是响应式丢失？列举常见场景与解法？

**结论：响应式丢失 = 「拿到了值，但丢掉了与源的链接」——改源不更新视图、或改副本不影响源；根因都是解构、展开、整体替换、传值拷贝这类「脱离代理对象」的操作。**

**① 场景与解法**

| 场景 | 丢失原因 | 解法 |
| --- | --- | --- |
| 解构 reactive：`const { a } = state` | 拿到的是当次读取的普通值 | `toRefs(state)` 再解构 |
| reactive 整体替换：`state = {...}` | 变量指向新对象，旧 Proxy 失联 | 用 ref 存对象，整体替换 `ref.value` |
| 传参拷贝：`fn(state.a)` | 函数里拿到普通值 | 传 ref / 函数 getter |
| props 解构 | props 是 reactive 但解构断链 | `toRefs(props)`；Vue 3.5+ 编译器支持响应式解构，可直解 |
| 组合式函数返回 reactive | 消费方解构断链 | 返回前 toRefs |
| 模板里展开对象传递 | 展开即拷贝 | 传整个对象或逐个绑定 |

**② 本质一句话**

- 响应性挂在「通过 Proxy 访问属性」上——任何一步绕开代理访问，链接就断

**③ Vue 3.5 的响应式 props 解构**

- 编译器把解构语法改写成每次访问都走 `props.xxx`——语法像解构，运行时没断链

**⭐ 加分点**

- 解构不丢响应的例外：`const { a } = toRefs(state)` 拿到的是 ref，所以模板里能继续追踪
- 深拷贝（JSON.parse(JSON.stringify) / structuredClone）一定断链——它产出的就是普通对象
- 把 reactive 对象塞进 `ref` 再取 `.value` 会命中同一层代理（reactive 有缓存），不会重复代理；但 `shallowRef` 包对象则直接拿原始对象

## 六、虚拟 DOM 与 Diff 算法

### 1. 什么是虚拟 DOM？虚拟 DOM 的优缺点？

**结论：虚拟 DOM 是用 JS 对象描述 DOM 结构的树（vnode）；改动时先在 JS 层 diff 新旧两棵树、算出最小变更再操作真实 DOM——用「可预测的 JS 计算」换取「可控的 DOM 操作量」。**

**① vnode 是什么**

- 一个普通对象：`type`、`props`、`children`、`key`、`shapeFlag`、`el` 等字段描述一个节点及其子树
- 它是「渲染意图的快照」，与真实 DOM 一一对应但不持有 DOM 能力

**② 优点**

- DOM 操作代价高且难批量——先算最小变更集，再一次 patch，避免逐个属性读写触发布局抖动
- 跨平台：同一棵 vnode 可渲染成 DOM、SSR 字符串、原生组件（小程序/Canvas）
- 声明式：开发者描述「UI 应该是什么样」，框架负责「怎么变」

**③ 缺点与边界**

- 多一层 vnode 创建 + diff 计算——比手写精准的最小 DOM 操作慢
- 极端性能场景（高频动画、大数据可视化）仍要直操作 DOM 或上合成层
- 它的价值是「保证不太差 + 把优化沉淀到框架」，不是「一定最快」

**⭐ 加分点**

- Vue3 的编译优化把 vnode 的**创建**也省了：静态提升后静态节点只创建一次，Block Tree 让 diff 只遍历动态节点——虚拟 DOM 的劣势被编译期补偿
- 无 key 的 diff 是「就地复用」，vnode 的优势在顺序稳定时最明显；频繁重排才需要 key 与 LIS
- vnode 不等于 DOM：`vnode.el` 只是挂载后回填的真实节点引用，卸载/复用时要注意它的生命周期

### 2. Vue2 和 Vue3 的 diff 算法流程？key 在其中起什么作用？

**结论：diff 只做同层比较、tag 不同直接替换；Vue2 双端对比，Vue3 先同步前后缀、中间乱序用最长递增子序列把 DOM 移动次数降到最少；key 是判断「复用谁」的身份凭证。**

**① diff 的两大前提**

- **只同层比较**：跨层移动视为删除 + 重建，不做跨层复用
- **tag 不同直接替换**：类型变了就不再比较子树

**② Vue2：双端对比**

- 新旧列表各拿头尾两个指针，比较四种组合：头头、尾尾、旧头新尾、旧尾新头
- 四种都没命中 → 乱序处理：旧列表建 key → index 映射，用新头节点的 key 查表，命中就移动、否则新建

**③ Vue3：前后缀同步 + 最长递增子序列**

- 先同步头尾（前缀/后缀），只对中间乱序区做精细处理
- 建 `newIndexToOldIndexMap`（新位置 → 旧下标 + 1，0 表示新增），求出**最长递增子序列**——序列内节点不动，其余按需移动
- key 在这里是映射的键：有 key 才能把「节点身份」跨位置对上

**⭐ 加分点**

- 无 key 的列表退化为「就地复用」：按位置 patch，顺序变化时内容错位——带输入框的列表还会串数据
- LIS 只解决「移动最少」，删除/新增仍靠映射表判断；`moved` 标记决定是否真的执行移动
- Vue3 的 diff 还靠 patchFlag 跳过属性级全量比较，作用于单个节点的 patch，不是列表算法本身

### 3. Vue3 的编译期优化做了什么？静态节点如何处理？为什么性能提升明显？

**结论：核心是「编译时能确定的信息别拖到运行时」——静态提升、patchFlag、Block Tree、事件缓存四机制，让 diff 从全量比变成只盯可能变化的部分。**

**① 静态节点与静态提升**

- 静态节点 = 整棵子树不含任何动态绑定（插值/指令/动态属性）
- hoistStatic：把静态节点提到 render 函数外只创建一次，重渲染直接引用
- 连续静态节点超过阈值会合并成一个静态 vnode，用 innerHTML 直插，整段跳过 diff

**② patchFlag：带类型的 diff 提示**

- 编译期给动态节点打标记：`TEXT` 只有文本会变、`CLASS` 只有 class 动态、`PROPS` 只有部分属性动态
- diff 时按 flag 只比较对应字段，跳过结构判断与全量属性对比；flag 可组合（按位或）

**③ Block Tree 与事件缓存**

- Block：以「结构可能变的块」为单位，把所有动态后代节点平铺收集进一个数组
- 更新时直接遍历这个数组，跳过整棵静态树；`v-if` 等结构变化会开新 Block
- cacheHandlers：模板内联事件函数缓存，避免每次渲染生成新函数引起子组件无效更新

**⭐ 加分点**

- 传统 diff 的比对量与**节点总数**相关；优化后与**动态节点数**相关——静态占比越高提速越明显
- Block 的收集由编译器保证，运行时只看 `dynamicChildren`，不再递归 children
- 静态提升只对「纯静态」生效：只要子树里有一处动态绑定，整棵就不能提升

## 七、Vue Router 路由

### 1. hash 模式和 history 模式的原理与区别？history 需要后端怎么配合？

**结论：hash 靠 hashchange 监听 # 后的变化（不请求服务器、兼容好）；history 靠 pushState/replaceState 改路径（好看、SEO 友好），但刷新会真请求该路径——后端必须把所有路径兜底到 index.html。**

**① 原理差异**

| 维度 | hash | history |
| --- | --- | --- |
| 原理 | # 后内容变化，监听 hashchange | pushState/replaceState + popstate |
| 请求 | 改 hash 不发请求 | 改路径不发请求，但**刷新会真请求该路径** |
| 服务端 | 无要求 | 所有路径兜底 index.html，否则刷新 404 |
| 其他 | url 带 # 不美观 | SSR/SEO 更友好 |

**② history 404 的根因**

- 深链刷新时浏览器把 `/user/123` 当真实资源请求服务器，服务器没这文件就 404
- Nginx 用 `try_files $uri $uri/ /index.html` 兜底；history 模式下这条是必须项

**③ 怎么选**

- 能配服务端就 history（配兜底）；静态托管改不了服务端（部分 CDN 托管）就用 hash

**⭐ 加分点**

- 两种模式都必须处理「路由变化不整页刷新」——hash 用 hashchange，history 用 popstate 监听浏览器前进后退
- history 模式还要处理「首屏基路径」：部署在子路径下要配 `base`，否则资源 404
- pushState 改 URL 不会触发页面重载，但会写入历史栈——`replaceState` 才不新增记录

### 2. 路由守卫有哪些？执行顺序？

**结论：守卫分三层——全局、路由独享、组件内；解析流程体现「先离开旧组件、再校验、解析异步组件、最后确认并触发更新」。**

**① 三层守卫**

- 全局：`beforeEach`（鉴权主战场）、`beforeResolve`（导航确认前最后时机，适合拉依赖数据）、`afterEach`（改标题、埋点，无 next）
- 路由独享：`beforeEnter`，配置在某条路由上
- 组件内：`beforeRouteEnter`（**拿不到 this**，实例还没建，要 `next(vm => ...)`）、`beforeRouteUpdate`（同组件复用如 `/user/:id` 变化）、`beforeRouteLeave`（离开确认：未保存提示）

**② 完整导航解析流程（背主干）**

- 导航触发 → 失活组件 beforeRouteLeave → 全局 beforeEach → 复用组件 beforeRouteUpdate → 路由独享 beforeEnter → **解析异步路由组件** → 激活组件 beforeRouteEnter → 全局 beforeResolve → 导航确认 → 全局 afterEach → DOM 更新 → beforeRouteEnter 的 next 回调

**③ Vue Router 4 的变化**

- `new VueRouter` → `createRouter` + `createWebHistory`
- `next` 变可选：返回 `false` 取消导航、返回路由路径即重定向

**⭐ 加分点**

- `beforeRouteEnter` 拿不到 this 的根因：导航发生在旧组件卸载、新组件创建之前，守卫执行时实例还不存在
- 守卫里做异步鉴权要用 `await` 或返回 Promise，别只写回调——不返回则导航不会等待
- 重定向在 `beforeEach` 里做要防死循环：目标路由等于当前路由时要提前放行

### 3. 路由懒加载怎么实现？原理？

**结论：`component: () => import('./views/User.vue')`——把组件变成「到达才加载」的动态导入，构建时该路由被打成独立 chunk，首屏只下载当前路由的代码。**

**① 实现**

- 路由配置里 component 写成返回 Promise 的函数，路由匹配时才调用
- 需要分组时用 webpack 魔法注释 `/* webpackChunkName: "user" */`，Vite 按文件名自动分包

**② 原理链路**

- 动态 import 是「构建工具可静态分析的代码分割点」→ Rollup/Vite/webpack 按它拆 chunk
- 首次导航到该路由时发起 chunk 请求，加载完成后注册组件并渲染

**③ 配套与边界**

- 首页之外的路由全懒加载 + 首页组件再按「首屏外模块」二次懒加载
- 拆分过细会产生大量小请求，HTTP/1.1 下反而拖慢——按「页面/功能域」分组而不是按组件

**⭐ 加分点**

- 懒加载只解决「下载时机」，不解决「渲染时机」：首屏路由本身仍要同步下载，可用预加载（`<link rel="prefetch">` / 路由 prefetch）折中
- chunk 加载失败（发版后旧文件被删）要配错误兜底，否则用户停在白屏
- 异步组件（`defineAsyncComponent`）是「组件级」懒加载，路由懒加载是「路由级」懒加载，粒度和入口不同

### 4. 动态路由与 addRoute 的使用场景？权限路由怎么实现？

**结论：登录后按角色动态 addRoute 生成可访问路由表；全局 beforeEach 里校验「有 token 但路由表没注册完」时先补注册再放行，404 路由必须最后注册。**

**① 核心 API**

- `router.addRoute(route)` / `router.removeRoute(name)`：登录后拉权限表，过滤出可访问路由逐条注册
- `router.hasRoute()` 判断是否已注册（热更新、重复登录场景）

**② 权限路由标准流程**

- 登录 → 拿角色/权限码 → 过滤静态路由表或请求后端菜单 → addRoute 注册 → beforeEach 校验并补注册 → 放行
- 404 路由放最后：先注册会把「尚未注册的合法路由」全部吞成 404
- 刷新恢复：路由表只在内存，刷新即失——beforeEach 里判断「有 token 但未初始化路由」时重走注册

**③ 两种数据来源的取舍**

- 后端返回菜单：权限粒度由后端掌控、前端零硬编码，但要防组件名映射不上
- 前端静态表过滤：实现简单，适合角色少的系统，但改权限要发版

**⭐ 加分点**

- addRoute 后如果当前正停留在被移除的路由，要手动 `replace` 到一个安全路径，否则页面停在已失效的组件
- 动态注册的路由在 `matched` 里的顺序由注册顺序决定，嵌套路由要用父路由的 `name` 作为 parent
- removeRoute 后同一 name 可再次 addRoute，热更新调试时常用

## 八、状态管理 Pinia / Vuex

### 1. Pinia 和 Vuex 的区别？Pinia 的优势？

**结论：Pinia 去掉 mutation、天然 TS 推导、store 之间直接引用、按模块天然扁平——把 Vuex 的样板代码与类型困境一次解决。**

**① 结构对照**

| Vuex | Pinia | 说明 |
| --- | --- | --- |
| state | state / setup 里 ref | 单一状态树 |
| getters | getters / computed | 派生值，带缓存 |
| mutation + action | 只有 action | **异步同步都写 action**，mutation 概念移除 |
| modules + namespace | defineStore 每个域一个 store | 无嵌套、无命名空间，store 之间直接 import 复用 |

**② 四个优势（答全就是高级水平）**

- 去 mutation：直接改 state 或在 action 里改，少一层 commit 样板
- 完整 TS 推导：defineStore 的类型自动流转，Vuex 的 dispatch 字符串类型是黑洞
- 模块化天然扁平：每个 store 独立，跨 store 直接调用，不用 registerModule
- 代码分割友好：只 import 用到的 store，Tree-Shaking 生效

**③ 什么规模才需要状态库**

- 跨页面/跨组件树共享的登录态、权限、字典数据才进 store；组件内状态别往上放

**配套代码对照**

```js
// Vuex：state 只能经 mutation 改，action 包异步，组件 commit/dispatch
const store = createStore({
  state: { count: 0 },
  getters: { double: s => s.count * 2 },
  mutations: { add(s, n) { s.count += n } },
  actions: { asyncAdd({ commit }, n) { commit('add', n) } }
})
store.commit('add', 1)          // 同步改状态：必须走 mutation
store.dispatch('asyncAdd', 1)   // 异步：action 里再 commit

// Pinia：去掉 mutation，action 里同步异步统一写，直接改 this
export const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: { double: s => s.count * 2 },
  actions: {
    async asyncAdd(n) { this.count += n }   // 同步逻辑也是一行 this.xxx
  }
})
const counter = useCounter()
counter.count++                 // 直接改 state 即可
await counter.asyncAdd(1)       // action 内同步/异步都行
```

**⭐ 加分点**

- 两种 store 写法：Options 式（state/getters/actions）与 Setup 式（setup 里写 ref/computed/function）——Setup 式更贴近组合式 API，但 `$reset` 不自动提供
- store 本身是 reactive 对象，**解构会断响应**——要用 `storeToRefs` 取 state/getters
- SSR 下 Pinia 实例必须按请求创建，否则多个请求共享同一份 state（污染）

### 2. Pinia 的核心概念？actions 支持异步吗？

**结论：三件套 state / getters / actions——actions 同步异步都支持（就是普通 async 函数）；另有 $patch 批量更新与 $reset 重置两个实例方法。**

**① 三件套**

- state：数据源（Options 式返回对象，Setup 式用 ref）
- getters：派生值带缓存（接收 state，可 this 串联其他 getter）
- actions：同步异步统一写，异步直接 async/await，内部改 `this.xxx`

**② 实用实例方法**

- `$patch(obj 或函数)`：批量修改只触发一次订阅回调
- `$reset()`：恢复初始 state——**只有 Options 式 store 自带**，Setup 式要自己实现（高频追问）

**③ 订阅与调试**

- `store.$subscribe` 监听 state 变化（可配 `detached` 脱离组件作用域做持久化）
- `store.$onAction` 监听 action 调用，可做统一日志/错误上报

**⭐ 加分点**

- `$patch` 传对象是浅合并、传函数才会逐条应用并只触发一次更新——嵌套对象传对象会丢失深层响应细节
- action 里改 state 与外部直接改 state 在 Vue3 下效果一致，区别只在「入口集中、可被 `$onAction` 观测」
- Setup 式 store 的 `$reset` 需要自己封装：保存初始快照，重置时逐项赋值

## 九、性能优化

### 1. Vue 项目有哪些性能优化手段？（编码 / 运行时 / 打包三层）

**结论：按三层作答——编码层减少「计算与更新量」，运行时层减少「代理与渲染开销」，打包层减少「下载与等待」；先报骨架再深挖一层，比平铺十几条更有条理。**

**① 编码层：少算、少更新**

- 计算量靠 computed 缓存来降：模板里直接调方法每次渲染都要重算，computed 依赖不变就返回缓存
- 更新量靠「缩小动态范围」来降：v-if/v-show 按切换频率选型、组件按动静拆分让静态部分不进 diff、key 稳定避免错位重 patch
- 这一层收益是**乘法式**的：省掉的计算与无效更新会在每次交互里重复兑现，且几乎零维护成本

**② 运行时层：少代理、少渲染**

- 代理成本：大数据只读场景用 shallowRef / markRaw / Object.freeze，避免深层递归建 Proxy
- 渲染成本：keep-alive 缓存页面实例、v-memo 命中时整棵子树跳过 diff、长列表用虚拟滚动只渲染可视区
- 这一层解决的是「数据量 / 节点数过大」的**规模问题**，编码层的写法优化解决不了

**③ 打包层：少下载、快到达**

- 体积：路由懒加载 + 异步组件分包、组件库按需引入、Tree-Shaking 删除未引用导出
- 到达速度：静态资源 CDN + 文件名 hash 的强缓存（内容变才换名）、图片懒加载与压缩
- 先测量再动手：visualizer 找「意料之外的大依赖」，否则容易优化了本来就不大的部分

**⭐ 加分点**

- 三层的边际收益不同：打包层决定**首屏**，编码/运行时层决定**交互流畅度**——问「首屏慢」优先谈打包与资源，问「卡顿」优先谈运行时
- v-memo 不是免费的：依赖数组要逐项比较，且命中要求「依赖引用不变」，数据整体替换时收益归零
- 编码层最容易被忽略的「computed 替代模板方法调用」这种小事，收益随渲染次数线性放大
- 回答时主动说「我会先测量」：performance / Lighthouse 先定位是包大、首屏阻塞还是长任务，再选对应层

### 2. 异步组件的使用场景与实现？

**结论：`defineAsyncComponent(() => import('./X.vue'))` 让组件「用到才加载」——本质是动态 import 的代码分割下沉到组件粒度，首屏外重组件按需分包，并配 loading/error/超时。**

**① 是什么：一个「返回 Promise 的组件工厂」**

| 选项 | 作用 |
| --- | --- |
| loader | 返回 Promise 的加载函数 |
| loadingComponent / errorComponent | 加载中/失败的占位组件 |
| delay / timeout | loading 延迟出现时间 / 超时报错时间 |

- 首次渲染时才执行 loader：加载期间渲染 loading 占位，resolve 后替换为真实组件
- 失败可配 errorComponent，再用 `onError` 回调做重试与上报

**② 底层：动态 import + 代码分割**

- `import()` 返回 Promise，打包器（Vite / Rollup / Webpack）看到它就拆成独立 chunk，运行时才发请求
- 与路由懒加载是同一机制的两个粒度：路由懒加载是「页面级分包」，异步组件是「组件级分包」——后者更细，适合页面内的低频重组件

**③ 选型、坑与加载态统一（Suspense）**

- 该用：首屏外的重组件（富文本、图表库、低频弹窗）、权限组件（无权限时连代码都不下载）
- 不该用：首屏必需组件——多一次网络往返反而拖慢首屏；碎组件拆包会放大请求数
- 坑：异步组件只解决「加载」，不解决「多个加载态怎么统一呈现」，每个都手写 v-if 很散
- Suspense 接法：`<Suspense>` 默认插槽放异步组件、`#fallback` 插槽放加载态——被包住的异步依赖全部就绪后才切换默认内容
- 也接得住 async setup（setup 顶层 await）组件的「未完成」状态，骨架屏场景常用
- 限制：多个异步子组件必须全部就绪才切换——做「整体 loading」方便，「部分就绪先显示」做不到；长期处于实验性定位，错误处理要配 onErrorCaptured

**⭐ 加分点**

- `delay` 的存在是为了**防闪烁**：请求很快时不闪 loading，慢过阈值才显示——能讲出动机比背选项更像用过
- Suspense 的等待是**递归收集**的：异步组件内部再嵌套异步组件，也要等最深层就绪
- 同一个异步组件被多处引用时模块只会下载一次（模块缓存），不必担心重复请求，但要担心「谁都等它导致多处 loading 闪烁」
- 异步组件 + keep-alive 组合：缓存的是已加载实例，切回不再触发加载——省流量但可能错过代码更新

### 3. 打包层面如何优化 Vue 项目体积？Tree-Shaking 的前提？

**结论：先分析（visualizer）再动手——组件库按需引入、路由/组件级分包、Tree-Shaking、手动拆包与压缩；Tree-Shaking 的前提是 ESM 静态结构 + sideEffects 标记 + 生产压缩，三者缺一不可。**

**① 先定位体积从哪来**

- rollup-plugin-visualizer 生成体积分布图，找「意料之外的大依赖」：整包引入的组件库、全量图标、未拆分的工具库
- 没有测量就优化，常见结果是优化了占比很小的部分，还引入了新复杂度

**② 手段分两类：减总量、拆总量**

| 手段 | 做法 |
| --- | --- |
| 按需引入组件库 | unplugin-vue-components 自动按需导入（全量 import 组件库是体积灾难） |
| 路由/组件懒加载 | 动态 import 分包，首屏只带必需 chunk |
| Tree-Shaking | 删除未引用导出（前提见 ③） |
| 构建分析 | rollup-plugin-visualizer 找大依赖 |
| 手动拆包 | manualChunks 把稳定的第三方库拆出，利于长缓存 |
| 关闭生产 sourcemap、启用压缩 | 默认项确认不遗漏 |

- 「减总量」：按需引入 + Tree-Shaking 直接减少字节
- 「拆总量」：分包不减少总字节，但让首屏只下载必需部分，且稳定库能长缓存

**③ Tree-Shaking 的三个前提（必考）**

- **ESM**：import/export 是静态结构，构建期可分析依赖图；CommonJS 动态 require 无法摇
- **sideEffects 标记**：package.json 里 `"sideEffects": false`（或列出有副作用的文件）——告诉打包器「没被引用的模块删掉不影响行为」；未标记时打包器不敢删，怕副作用丢失
- **生产模式**：摇树只标记未引用代码，真正的删除由压缩器（Terser/esbuild）完成

**⭐ 加分点**

- 「按需引入」的本质不是语法问题：库的入口文件把所有组件 import 了一遍，即使每个组件都有 ESM 导出，从入口全量 import 仍会全打包——unplugin 让每个组件有独立入口、按真实使用导入
- 分包配合长缓存：文件名带 content hash，第三方库单独成 chunk 后，业务代码改动不会让它失效
- 体积 ≠ 加载性能：chunk 过多会抬高请求数，HTTP/2 下影响变小但仍要平衡——不要为分包而分包
- 典型「摇不掉」的坑：模块顶层执行了副作用（注册全局组件、打补丁），sideEffects 标成 false 反而会让它整块消失

## 十、开放类（工程思考）

### 1. 过往项目中 Vue 技术栈遇到的最大技术难点是什么，怎么解决的？

**结论：以「异步竞态治理」作答——难点不是某个 API，而是「异步时序 + 框架副作用机制 + 状态归属」三者叠加的设计判断：问题偶现、难复现、代码表面看着没问题。**

**① 定位问题：现象、根因判断与目标**

- 场景：移动端 H5 大量「输入触发请求」——搜索联想、筛选列表、多 tab 切换
- 现象：快速输入时列表先显示新数据、又「跳回」旧数据——**慢的旧响应后到，覆盖了新结果**
- 根因判断：不是接口错，而是「谁最后写状态」没有约束；这类 bug 代码看着没问题、偶现且难复现
- 目标：看到的永远是**最新一次请求**的结果；不引入过重的取消逻辑；弱网下控并发

**② 方案分层：治错序、控并发**

**治错序：序号标记位 → onCleanup（主线）**

```js
// 朴素版：自增序号标记
let seq = 0
async function onSearch(kw) {
  const cur = ++seq
  const res = await fetchList(kw)
  if (cur !== seq) return   // 已有更新的请求 → 丢弃
  list.value = res
}
```

```js
// Vue 内建姿势：watch + onCleanup（推荐讲这个）
watch(keyword, async (kw) => {
  let expired = false
  const res = await fetchList(kw)
  if (expired) return       // 过期响应 → 丢弃
  list.value = res
}, { onCleanup() {
  expired = true            // 每次依赖变化、重新执行前，Vue 先跑上一轮清理
} })
```

- 要点：**「上轮失效」由框架保证时机**，不靠人的自觉，也不怕清理漏掉

**控并发：防抖 + 请求池**

```js
// 防抖降频 ≠ 解决竞态，两者必须组合
const debouncedKw = useDebounce(keyword, 300)
watch(debouncedKw, run, { onCleanup })

// 请求池：限制同时在飞的请求数（弱网批量请求互相挤占）
class Pool {
  constructor(limit) { this.limit = limit; this.queue = []; this.active = 0 }
  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push([task, resolve, reject])
      this.#next()
    })
  }
  #next() {
    if (this.active >= this.limit || !this.queue.length) return
    const [task, resolve, reject] = this.queue.shift()
    this.active++
    task().then(resolve, reject).finally(() => { this.active--; this.#next() })
  }
}
```

**③ 落地与取舍**

- 结果：错序类反馈归零；「onCleanup + 防抖 + 请求池」沉淀为组合式函数 `useSearch` / `useList`，新列表页**默认正确**，不再靠踩坑
- 取舍：选「丢弃过期结果」而非 AbortController——目标是「过期不展示」，标记位更轻；真要省流量/打断上传才用 Abort，两者不冲突
- 收尾：难在把散点的坑收敛成**默认正确的复用单元**——第二个人写列表页时不需要懂竞态，也不会写错

**⭐ 加分点**

- 讲这段要带「发现路径」：先在网络面板看到旧响应晚到，才反推「状态被覆盖」——面试官要的是排查过程，不只是方案
- 两层方案是正交的：错序治理解决「顺序」，请求池解决「并发挤占带宽」，缺一个都会在弱网暴露
- 序号标记位的边界：组件卸载或换页后过期响应仍可能写回已废弃的状态，onCleanup 顺着作用域销毁跑清理更可靠
- 能延伸一句「读请求可丢弃、写请求要幂等补偿」——竞态治理不止前端丢结果，写操作要靠幂等键兜底

**追问预判（逐层递进）**

| 追问 | 答法 |
| --- | --- |
| 为什么不用 AbortController？ | 目标是「过期不展示」，标记位/onCleanup 更轻；真取消（省流量、打断上传）才用 Abort，两者不冲突 |
| onCleanup 原理？ | watch 每轮回调执行前先跑上轮注册的清理函数，「上轮失效」由框架保证 |
| 防抖能解决竞态吗？ | 不能，只降频；间隔超过防抖窗口照样乱序，必须组合 |
| 怎么复现/测试？ | mock 接口加随机延迟（前慢后快）；单测 fake timers 控时序 |
| 具体哪里的列表？ | 面试前填自己的真实场景（联想/筛选具体页面） |
