# 面试题 · Vue

> 定位：Vue3 主栈视角——Vue2 机制只以「对比」身份出现；原理题（响应式/diff/编译优化）与性能题是高级岗深挖区。全篇 12 组按「结论先行 + 表格 + 子层级」组织，答案自包含。

## 一、基础指令与模板

### 1. v-if 和 v-show 的区别？各自适用场景？

**结论：v-if 是真实创建/销毁（惰性），v-show 是 display 切换（常驻）；切换频繁用 v-show，条件很少变用 v-if。**

- v-if vs v-show

| 维度 | v-if | v-show |
| --- | --- | --- |
| 原理 | 假时不生成节点/卸载节点 | 编译常驻，切换 display |
| 初始渲染 | 条件为假不渲染（惰性） | 无论真假都渲染 |
| 消耗 | 切换开销高 | 初始渲染开销高 |
| 场景 | 条件很少变（权限块） | 频繁切换（Tab 面板） |

- 追问：v-if 和 v-show 能混用吗？
  - 能，但同一节点同时用没有意义（v-if 为假时 v-show 根本没机会生效）——优先想清楚「不渲染」还是「不显示」

### 2. v-for 为什么必须加 key？用索引作 key 会带来什么问题？

**结论：key 是 vnode 的身份标识，diff 靠它判断「能不能复用」；用 index 当 key 等于告诉 diff「位置就是身份」，列表顺序变化时会错位复用。**

- key 的作用
  - diff 乱序比较时建立 key 到 index 的映射，命中同 key 的节点尽量**原地复用**（只 patch 内容），没命中的才新建/移动
- 不用 index 的坑（带例子最稳）
  - 列表 A、B、C，key 用 index（0,1,2）；头部插入 D 后变成 D、A、B、C，key 错位成 D=0、A=1……
  - 后果一：本来 A 没变却因为 key=1 对上了旧 B，全列表内容重 patch，浪费
  - 后果二：带输入框/勾选状态的组件**状态错位**（在第一个输入框打字，插入后字跑到第二个）——因为复用错节点
- 什么情况 index 可以接受
  - 列表纯展示、不重排、不增删中间项（尾部追加不算错位）——但要能说出这个前提

### 3. v-for 和 v-if 能不能写在同一个标签上？Vue2 和 Vue3 的优先级差异？

**结论：不建议同标签使用；优先级 Vue2 与 Vue3 相反——Vue2 v-for 高，Vue3 v-if 高，且 Vue3 编译期直接报错拦截。**

- 优先级（必考准确性红线）
  - **Vue2：v-for > v-if**——每个元素都先跑循环再判断，浪费；不满足条件的项靠 v-if 过滤
  - **Vue3：v-if 优先级更高**——v-if 里访问不到 v-for 的变量，直接报错（编译期就拦住）
- 正确写法
  - 列表过滤：用 computed 先算出过滤后的列表，再 v-for
  - 「整列表条件渲染」：把 v-if 放外层 template 上

### 4. computed 和 watch 的区别？computed 有缓存吗？

**结论：computed 是「有缓存的派生值」，watch 是「对指定源做副作用」；computed 有缓存——依赖不变不重算。**

- computed vs watch

| 维度 | computed | watch |
| --- | --- | --- |
| 缓存 | 依赖不变不重算 | 无缓存，变化就执行 |
| 异步 | 不支持（返回值必须同步算出） | 支持（回调里发请求） |
| 返回值 | 必须有（用在模板） | 不需要 |
| 场景 | 派生展示数据（全名/过滤列表/合计） | 数据变化执行异步/开销大的操作 |

- computed 细节（追问）
  - 有 getter/setter 两个方向（v-model 绑定 computed 可写）
  - 依赖变化时**不会立即重算**——标记「脏」，下次读取才重算（惰性求值）
- watch 细节
  - 默认惰性（变化才执行，可 `immediate: true`）；能拿新旧值；`deep: true` 深度监听（对象内部属性变化）
  - 追问：watch 监听 reactive 对象的属性要怎么写？
    - 写函数形式 `() => obj.key`——直接传对象要配 deep，函数形式更精准、开销更小

### 5. 双向绑定 v-model 的原理？组件上多 v-model 怎么实现？

**结论：v-model 是语法糖——原生表单上是「:value 绑定 + @input 监听」的组合，组件上是「:modelValue 传值 + @update:modelValue 监听」的组合；Vue3 用 `v-model:xxx` 参数化实现多 v-model。**

- 原生元素上
  - `v-model="text"` 展开为 `:value="text"` + `@input="text = $event.target.value"`
  - 修饰符：`.lazy`（改监听 change 事件，失焦才同步）、`.number`（转数字）、`.trim`（去首尾空格）
- 组件上（Vue3）

| 形式 | 展开结果 |
| --- | --- |
| `v-model="val"` | `:modelValue="val"` + `@update:modelValue="val = $event"` |
| `v-model:title="t"` | `:title="t"` + `@update:title="t = $event"` |

- 子组件内配合：`defineProps(['modelValue'])` + `defineEmits(['update:modelValue'])`，修改时 emit 更新事件
- 多 v-model：`v-model:title` 与 `v-model:content` 各自独立——一个组件可同时双向绑定多个字段
- Vue2 对比（追问）
  - Vue2 只有 `value + @input` 一个绑定，靠 `model` 选项改 prop/event 名，且用 `.sync` 修饰符实现多属性双向——Vue3 把 `.sync` 合并进了参数化 v-model

### 6. nextTick 的作用与原理？什么时候必须用？

**结论：Vue 的更新是异步批量的——nextTick 把回调放进微任务队列，保证在「本轮 DOM 更新完成后」执行；场景是「改完数据立刻要读最新 DOM」。**

- 为什么需要异步更新
  - 同一 tick 内多次改数据，只触发一次渲染（去重）——减少 DOM 操作和 vnode 计算
- 必须用的场景
  - 改数据后立刻测量高度/位置（如滚动定位、ECharts resize）
  - 改数据后操作新渲染出来的子组件/元素
- 原理要点（不背源码，说机制）
  - 维护一个回调队列 + waiting 标记，同一轮只入队一次 flush
  - flush 优先用微任务（Promise.then）——微任务在本轮宏任务结束后立即执行，早于渲染，保证「DOM 更新后、浏览器绘制前」拿到新 DOM
  - Vue3 基于 Promise，纯微任务（不再需要旧版 MutationObserver/setTimeout 降级链）
- 追问：nextTick 和 setTimeout(fn, 0) 的区别？
  - 微任务 vs 宏任务：nextTick 在本轮就执行且保证排在 DOM 更新之后、渲染之前；setTimeout 要等下一轮，中间可能已经绘制了旧画面

### 7. 模板编译流程：模板如何变成真实 DOM？

**结论：三步——parse 把模板字符串解析成 AST，transform 遍历 AST 做转换与静态优化标记，generate 把 AST 拼成 render 函数；运行时执行 render 生成 vnode，再 patch 成真实 DOM。**

- 三个阶段

| 阶段 | 输入 → 输出 | 做什么 |
| --- | --- | --- |
| parse | 模板字符串 → AST | 词法/语法分析，生成抽象语法树（元素/属性/文本/表达式节点） |
| transform | AST → 优化后的 AST | 转换指令与表达式；**静态节点打标、静态子树提升**（编译优化的主战场） |
| generate | AST → render 函数代码 | 产出 render 函数字符串，内含 createVNode 调用与 patchFlag 标记 |

- 之后是运行时链路
  - render 函数执行 → 生成 vnode 树 → 新旧 vnode diff（patch）→ 最小化操作真实 DOM
- 编译时 vs 运行时（追问）
  - 完整版 Vue 自带 compiler；工程里 `vue-loader` / `@vitejs/plugin-vue` 在构建期完成编译——打包产物只含运行时（runtime-only），体积更小
  - 追问：这也是为什么「template 里的表达式必须是纯 JS 单表达式」——它要被真实编译成代码，不是运行时求值的字符串

## 二、组件、插槽、通信

### 1. Vue 组件之间有哪些通信方式？各自适用场景？

**结论：按「关系」选——父子 props/emit、组件 v-model、跨层 provide/inject、模板引用 defineExpose、透传 $attrs、任意关系状态库/mitt。**

| 关系 | 方案 | 说明 |
| --- | --- | --- |
| 父 → 子 | props | 单向数据流，子组件不能直接改 |
| 子 → 父 | emit 自定义事件 | `defineEmits(['change'])` |
| 父子双向 | 组件 v-model | `:modelValue` + `@update:modelValue` 的语法糖；可 `v-model:title` 多个 |
| 跨层级 | provide / inject | 祖先提供、后代注入；配合只读包装防后代乱改 |
| 父取子 | ref + defineExpose | script setup 默认**不暴露**任何东西，子组件要显式 defineExpose |
| 透传 | $attrs | 未声明为 props 的属性集合；多层组件透传用 `v-bind="$attrs"` |
| 任意关系 | Pinia（推荐）/ mitt 事件总线 | 跨页面共享状态用 Pinia；Vue3 移除 $on/$off 后 mitt 是事件总线替代 |

### 2. props 单向数据流是什么意思？需要修改怎么办？

**结论：数据只能从父流向子，子组件不能直接改 props——否则数据流向不可预测、调试成本爆炸；要「改」就走 emit 或组件 v-model 让父改。**

- 为什么不能直接改
  - 父子各自持有一份引用，若子组件也能改，同一份数据有两条写入路径，状态互相同步会搅成网
  - Vue 对直接改 props 有开发期警告
- 需要修改的三种正路
  - 子组件 emit 事件，父组件改（最标准）
  - 组件 v-model（本质是 emit 的封装，适合「输入类」组件）
  - 子组件只想「以 props 为初值自己维护」：`const inner = ref(props.value)`——注意这只拷贝初值，props 后续变化要 watch 同步
- 追问：子组件直接改对象/数组类型 props 的属性，Vue 为什么不报错？
  - 引用类型传的是引用，改属性绕过了 props 本身的赋值检查——能跑但破坏单向数据流，属于坏味道

### 3. 默认插槽、具名插槽、作用域插槽的区别？

**结论：默认插槽填默认内容、具名插槽按名字填多处、作用域插槽是「数据在子组件、展示结构由父组件定」的唯一通道。**

- 三种形式
  - 默认插槽：子组件 `<slot>`，父组件直接写内容填充
  - 具名插槽：子组件 `<slot name="header">`，父组件 `<template #header>`
  - 作用域插槽：子组件 `<slot :item="item" :index="i">` 把数据传出来，父组件 `<template #default="{ item }">` 接着用
- 作用域插槽的本质（追问）
  - 内容的**渲染作用域在父组件**、**数据来源在子组件**——组件库的列表/表格组件全靠它（父定义单元格模板，子提供行数据）
- 编译作用域（易错点）
  - 插槽内容里能访问父组件的数据、访问不到子组件的数据——所以子组件要传数据才有了作用域插槽

### 4. provide / inject 的作用、优缺点、适用场景？

**结论：祖先 provide、所有后代 inject，跨任意层级传值不用逐层 props；优点是层级深时干净，缺点是数据来源隐式、追踪难——适合「组件库/布局容器」类自上而下的注入，不适合业务数据随意透传。**

- 基本用法
  - 祖先：`provide('theme', themeRef)`；后代：`const theme = inject('theme', 默认值)`
  - 传 ref/组合式函数返回值可以保持响应性（传普通对象则是快照）
- 优点
  - 深层组件免逐层 props（prop drilling）
  - 与组件结构绑定：「这个子树内部」共享上下文（表单容器/主题/国际化）
- 缺点
  - 数据来源隐式——读代码时看不出值从哪来，重构风险高
  - 层级链上任何一环换位置都可能断供
- 防乱改（追问）
  - provide 只读包装：`provide(key, readonly(state))`——后代只能读不能写，写操作走提供方暴露的方法

### 5. ref 获取子组件实例有哪些注意事项？script setup 下怎么暴露？

**结论：Vue3 的 script setup 组件默认「封闭」——父组件通过 ref 拿到的是空壳，子组件必须用 defineExpose 显式声明暴露什么；这就是「最小暴露面」设计。**

- 要点
  - `defineExpose({ fn, state })` 之外的内容父组件拿不到——防止误用内部实现
  - 拿到实例后调用其方法/读其状态，类型上可配 `InstanceType<typeof Child>`
- 注意事项
  - 生命周期：ref 在 mounted 后才有值（onBeforeMount 里是 null）
  - v-for 里的 ref 是数组收集——同名 ref 收集为数组，且更新顺序与卸载置空都有边界坑
  - ref 变量名要与模板上的 `ref="xxx"` 一致，且用 `ref(null)` 创建
- Options API 对比（追问）
  - Vue2 的 ref 直接拿到完整组件实例（$refs.xxx）——什么都能调，也是「耦合过深」的常见来源；Vue3 的显式暴露是刻意收紧

### 6. keep-alive 的作用、参数与生命周期变化？

**结论：keep-alive 缓存组件实例不销毁，切回来状态还在；配合 include/exclude/max 做精细控制，被缓存组件的生命周期从「销毁重建」变成「激活/失活」。**

- 核心机制
  - 内部用缓存对象存 vnode，命中缓存直接取，不重新创建
  - 生命周期变化：不再走 unmounted/重新 mounted，改为 activated（激活）/ deactivated（失活）
- 常用参数

| 参数 | 作用 |
| --- | --- |
| include / exclude | 按组件 name 匹配缓存白/黑名单 |
| max | LRU 上限，防止缓存无界增长 |

- 路由场景（列表页与详情页经典题）
  - 需求：列表页缓存、详情页不缓存，且详情里改了数据回列表要刷新
  - 方案：路由 meta 标记哪些页缓存 + 动态 include + activated 里做数据刷新判断（如对比路由参数/时间戳）
  - 替代：离开前把筛选条件存 sessionStorage/Pinia，回来恢复后重新请求——状态可序列化时更简单可控

### 7. 动态组件 component :is 的使用场景？

**结论：`<component :is="组件名或组件对象">` 让「渲染哪个组件」由数据决定——Tab 切换、动态表单渲染器是两大典型场景。**

- 两种 is 取值
  - 注册过的组件名字符串（Options API 里）或直接传组件对象/定义（推荐，组合式 API 下更自然）
- 典型场景
  - Tab 页切换：不同 Tab 对应不同组件，配合 keep-alive 保留各 Tab 状态
  - 动态表单/低代码渲染器：根据字段配置的 type 映射到对应输入组件
- 与 v-if 分支的区别
  - v-if 是「写死的几个分支」；component :is 是「组件集合可扩展」——新增类型不用改模板，改映射表即可

### 8. Teleport 组件的作用，解决什么问题？

**结论：把子树「传送」到 DOM 树的任意位置渲染（如 body），但逻辑归属仍在原组件树——解决弹层被父级 overflow/z-index/transform 影响的经典问题。**

- 痛点
  - 弹窗写在组件树深处，父级有 `overflow: hidden` 或 transform 时，`position: fixed` 也会失效（transform 会改变 fixed 的包含块）
- 用法与关键点
  - `<Teleport to="body">…</Teleport>`——to 接收选择器
  - 逻辑还在原组件：props/事件/上下文注入照常工作
  - 可配 `disabled` 属性按条件关闭传送（响应式切换）
- 追问：什么场景不该用？
  - 组件本身就是布局的一部分（如抽屉嵌在容器内）——传送出去反而破坏文档流语义

### 9. Suspense 的作用与适用场景？

**结论：Suspense 为「异步依赖」（async setup 组件/异步组件）提供统一的加载态出口——包住它们，用 fallback 显示 loading，就绪后切换默认内容。**

- 用法
  - `<Suspense>` 包住默认插槽（异步组件）与 `#fallback` 插槽（加载态）
- 适用场景
  - 骨架屏：页面级异步数据未就绪时先出骨架
  - 配合 async setup：setup 顶层 await 的组件，由 Suspense 接住「未完成」状态
- 注意（追问）
  - 长期处于实验性定位，API 稳定但错误处理要配 onErrorCaptured
  - 多个异步子组件要全部就绪才切换——做「整体 loading」方便，「部分就绪先显示」做不到

### 10. mixin 的优缺点？Vue3 推荐用什么替代？

**结论：mixin 能复用但「来源不清晰、命名冲突、类型推导差」；Vue3 用组合式函数（useXxx）替代——import 即来源、返回值即接口，冲突与类型问题天然消失。**

- mixin 的缺点（答全就是高级水平）
  - 来源不清晰：模板里用了一个属性，不知道来自哪个 mixin（要翻全部混入）
  - 命名冲突：多个 mixin 的 data/methods 同名时按合并策略覆盖，静默出错
  - 隐式耦合：mixin 里可能依赖组件的某个属性，双方互相不知道对方存在
  - TS 推导差：合并后的 this 类型推导很弱
- 组合式函数的替代逻辑

| 维度 | mixin | 组合式函数 |
| --- | --- | --- |
| 来源 | 隐式合并，看不到 | import 显式引入 |
| 命名冲突 | 静默覆盖 | 函数作用域隔离，不冲突 |
| 复用粒度 | 整个选项块合并 | 精确到一段逻辑（状态+方法） |
| TS | 推导弱 | 完整推导 |

## 三、生命周期

### 1. Vue2 的生命周期钩子有哪些？执行顺序？

**结论：创建 → 挂载 → 更新 → 销毁四阶段，每阶段前后一对钩子；常用主线是 created（数据就绪）→ mounted（DOM 就绪）→ beforeUpdate/updated → beforeDestroy/destroyed。**

- 四阶段

| 阶段 | 钩子 | 时机与用途 |
| --- | --- | --- |
| 创建前/后 | beforeCreate / created | data/methods 初始化；**发不依赖 DOM 的请求最早在 created** |
| 挂载前/后 | beforeMount / mounted | mounted 后可访问真实 DOM——依赖 DOM 的初始化（图表/测宽高）在这里 |
| 更新前/后 | beforeUpdate / updated | 数据变 UI 未变 / UI 已同步；避免在里面改状态（死循环） |
| 销毁前/后 | beforeDestroy / destroyed | 清理定时器/事件监听/订阅 |

- 另有 keep-alive 专用：activated / deactivated；错误捕获：errorCaptured

### 2. Vue3 组合式 API 的生命周期钩子，与 Vue2 怎么对应？

**结论：改名 + 迁移——destroyed 系改 unmounted 系，全部以 onXxx 形式写进 setup；beforeCreate/created 被 setup 本身取代。**

| 阶段 | Vue2 | Vue3（组合式） |
| --- | --- | --- |
| 创建前/后 | beforeCreate / created | setup 本身（等价覆盖） |
| 挂载前/后 | beforeMount / mounted | onBeforeMount / onMounted |
| 更新前/后 | beforeUpdate / updated | onBeforeUpdate / onUpdated |
| 销毁前/后 | beforeDestroy / destroyed | onBeforeUnmount / onUnmounted |

- setup 执行时机（必考追问）
  - 在 **beforeCreate 之前**执行：组件实例刚建立，data/methods 还没初始化，所以 setup 里**没有 this**
- 追问：created 和 mounted 分别适合做什么请求？
  - 不依赖 DOM 的请求：created / setup 里直接发（最早触发，省时间）
  - 依赖 DOM 的初始化（图表、第三方库挂载）：mounted
  - 加分点：SSR 时只有 created（setup）在服务端执行，mounted 仅客户端——依赖环境的代码要放对侧

### 3. 父子组件生命周期执行顺序（创建、更新、销毁）？

**结论：挂载「父先走创建、子先完成挂载」；更新和销毁都是「父 before、子过程、父 after」。**

- 挂载
  - 父 beforeCreate → 父 created → 父 beforeMount → 子 beforeCreate → 子 created → 子 beforeMount → **子 mounted → 父 mounted**
  - 记法：创建从外到内，挂载从内到外（父要等子渲染完才算挂载完成）
- 更新
  - 父 beforeUpdate → 子 beforeUpdate → 子 updated → 父 updated
- 销毁
  - 父 beforeUnmount → 子 beforeUnmount → 子 unmounted → 父 unmounted

### 4. onUnmounted 里需要手动清理哪些东西？哪些资源不清理会内存泄漏？

**结论：一切「在组件里创建、但生命周期长于组件」的资源——定时器、事件监听、第三方实例、订阅与连接；不清就内存泄漏（组件实例被外部引用吊着，GC 不了）。**

- 清理清单

| 类别 | 清理 API |
| --- | --- |
| 定时器 | clearInterval / clearTimeout |
| 全局事件监听 | removeEventListener（window/document 上的） |
| 第三方实例 | ECharts 实例 dispose、地图 destroy、编辑器销毁 |
| 订阅与连接 | mitt 的 off、WebSocket close、EventSource close |
| Observer | IntersectionObserver / ResizeObserver disconnect |

- 不需要手动清的（追问加分点）
  - 组合式 API 在 setup 里创建的 watch / watchEffect / computed 与组件作用域绑定，组件销毁自动停止
  - 但「手动停止实例」（如 `const stop = watchEffect(...)`）在异步上下文里创建的要自己调 stop
- 泄漏机制（本质）
  - 外部持有对组件内部数据的引用（回调闭包），组件销毁了引用还在——实例无法被回收

## 四、组合式 API 与 script setup

### 1. Options API 和 Composition API 的区别，各自优缺点？

**结论：Options 按选项类型组织（一个功能的代码被劈到 data/computed/methods 三处），Composition 按逻辑功能组织（一个功能的状态+方法聚在一起）；大组件维护与逻辑复用是 Composition 的主场。**

- 对比

| 维度 | Options API | Composition API |
| --- | --- | --- |
| 组织方式 | 按选项类型分块 | 按逻辑功能聚合 |
| 逻辑复用 | mixin（缺陷多） | 组合式函数 |
| 大组件可维护性 | 功能代码散落，来回跳 | 一个功能一段，可抽 useXxx |
| TS 支持 | this 推导受限 | 完整类型推导 |
| 学习成本 | 低，结构固定 | 需要理解响应式与作用域 |

- Vue3 为什么保留 Options API
  - 低成本场景（简单组件）依旧友好；两者可混用——生态迁移需要
- 组合式的代价（追问）
  - 自由度带来规范要求：不约定写法会散乱，团队要有 useXxx 组织规范

### 2. ref 和 reactive 的区别？如何选择？各有哪些响应式陷阱？

**结论：ref 用「对象包装」解决基本类型的响应性（访问要 .value），reactive 用 Proxy 直接代理对象类型；选型拿不准就全用 ref（社区主流），reactive 的整体替换与解构是两大陷阱。**

- 对比表

| 维度 | ref | reactive |
| --- | --- | --- |
| 适用类型 | 基本类型 + 引用类型（内部转 reactive） | 仅对象/数组/Map/Set |
| 访问方式 | `.value`（模板中自动解包） | 直接访问属性 |
| 底层 | RefImpl 包装类 + getter/setter | Proxy |
| 重新赋值 | ✅ 整体替换仍响应 | ❌ 整体替换丢响应 |
| 解构 | 天然不丢（.value 是访问器） | 解构即断响应，需 toRefs |

- 为什么基本类型需要 ref（追问本质）
  - Proxy 只能代理对象，无法拦截 `let x = 1` 的赋值——包装成对象才有「读/写」可拦截
- 陷阱清单
  - reactive 整体替换：`state = {...}` 让 Proxy 引用丢失 → 用 ref 或只改属性
  - reactive 解构：`const { a } = state` 拿到的是快照 → `toRefs(state)` 解构
  - ref 在模板/嵌套在 reactive 里自动解包，在 JS 里和数组元素里不自动解包
  - watch 监听 reactive 对象隐式 deep，监听 ref 要 `.value` 或传函数
- 选型（背这句即可）
  - 单值/需要整体替换 → ref；聚合状态对象且属性固定 → reactive；拿不准就全用 ref

### 3. watch 和 watchEffect 的区别？依赖收集逻辑？

**结论：watch 显式指定监听源、默认惰性、能拿新旧值；watchEffect 立即执行一次、回调里用到谁就自动收集谁——「声明依赖的方式」是两者的本质差异。**

- 对比

| 维度 | watch | watchEffect |
| --- | --- | --- |
| 依赖来源 | 显式声明（源） | 自动收集（回调里访问到的响应式数据） |
| 首次执行 | 默认不执行（immediate 可开） | 立即执行一次 |
| 新旧值 | 有 | 没有 |
| 适合 | 看某个值变了做某事 | 多个依赖联动一个副作用 |

- 依赖收集逻辑（原理统一）
  - 两者底层都是 effect：执行回调时被 track 收集进所访问属性的依赖集合，数据变化时 trigger 重新调度
  - watch 的源会被强制 track（即使回调没用到）；watchEffect 的依赖完全由执行轨迹决定
- 竞态清理（追问高频）
  - 回调第三参数 `onCleanup(fn)`——下次触发前/停止时执行，用来取消上一次未完成请求（旧响应覆盖新响应问题）

### 4. script setup 相比普通 setup 有什么优势？

**结论：更少样板 + 更好的运行时性能——顶层绑定自动暴露给模板（不用 return）、组件默认封闭（defineExpose 控制暴露面）、编译器还能做静态优化。**

- 优势逐条

| 维度 | 普通 setup() | script setup |
| --- | --- | --- |
| 模板可见性 | 要 return 一大串 | 顶层绑定自动可用 |
| 默认封闭性 | 实例整个暴露 | 默认封闭，defineExpose 显式暴露 |
| 组件导入 | 导入后还要注册 | 导入即用 |
| 性能 | — | 编译成更高效的代码（无代理 setup 返回对象的开销） |

- 三个编译期宏
  - `defineProps` / `defineEmits` / `defineExpose`——编译器特判的宏，写代码时无需 import（原理见下一题）
- 追问：setup 为什么不能是 async？
  - async 函数返回 Promise——组件需要**同步**拿到渲染上下文；顶层 await 要配 Suspense（async setup 组件）

### 5. defineProps、defineEmits、defineExpose 为什么不需要导入？

**结论：它们是「编译器宏」（compiler macro）——在编译 script setup 时被编译器直接识别并展开成对应代码，运行时根本不存在这些函数，所以不需要（也无法）从 vue 导入。**

- 机制
  - `@vitejs/plugin-vue` / vue-loader 编译 SFC 时，遇到这三个调用就地替换（defineProps 的参数还顺手生成 props 校验与类型信息）
  - 运行时产物里没有 defineProps 标识符——import 反而会报「不是导出成员」或产生未使用告警
- 同族宏
  - `defineOptions`（自定义组件 name 等）、`defineModel`（简化组件 v-model 双向绑定样板）、`withDefaults`（props 默认值的类型写法）
- 追问：defineModel 是什么？
  - 一行声明组件 v-model：`const model = defineModel()`，读写 model.value 自动同步父组件——把 props+emit 样板收进编译器

### 6. shallowRef / shallowReactive 是什么？适用场景？

**结论：浅层响应式——只代理第一层（shallowReactive）或只跟踪 .value 本身的替换（shallowRef），深层属性变化不触发更新；用于「大数据量」和「不该被代理的第三方对象」。**

- 行为对比

| API | 深层行为 |
| --- | --- |
| shallowRef | 只有 `.value` 整体替换才触发；改内部属性不更新 |
| shallowReactive | 只有第一层属性响应；嵌套对象是普通对象 |

- 适用场景
  - 大列表整体替换：`listRef.value = newArray` 一次触发，内部几十万条数据不做深层代理
  - 第三方实例：ECharts 实例、编辑器对象——不需要也不应该被 Proxy 包一层
- 配套 API（追问）
  - `triggerRef(ref)`：手动触发 shallowRef 的更新（改了内部属性后强制刷新）
  - `markRaw(obj)`：给对象打标记，即使塞进 reactive 里也不被代理（常见于往状态里存图表实例后页面卡死的事故）
  - `Object.freeze(obj)`：冻结对象不可扩展，Vue3 的 reactive 检测到后直接返回原对象、完全跳过代理

### 7. toRef 和 toRefs 的作用，解决什么问题？

**结论：把 reactive 对象的属性「转成保持链接的 ref」——解决「解构/传参导致响应式丢失」的问题。**

- toRef
  - `const nameRef = toRef(state, 'name')`——生成的 ref 与 `state.name` 双向同步：改 ref 源也变，改源 ref 也变
  - 源属性不存在也能建（值为 undefined），后续赋值会写回源对象
- toRefs
  - 批量版：`toRefs(state)` 把每个属性都转成 ref，常用于「解构 reactive 不丢响应」：`const { a, b } = toRefs(state)`
- 典型场景
  - 组合式函数返回 reactive 对象时先 toRefs，消费方解构才安全
  - props 透传：`toRefs(props)` 后把某个 prop 用 watch 监听或传给组合式函数
- 追问：toRef 和直接 `ref(state.name)` 的区别？
  - ref 是拷贝值、断开链接；toRef 是建立引用、保持同步

### 8. 什么是 Composable？怎么封装可复用逻辑，相比 mixin 好在哪？

**结论：Composable（组合式函数）是「用 Composition API 封装有状态可复用逻辑」的 useXxx 函数——输入参数、返回 ref 集合、内部可注册生命周期与清理；相比 mixin，来源显式、无命名冲突、类型完整。**

- 封装规范
  - 命名 useXxx；输入接受 ref 或普通值（用 toValue 统一处理）
  - **返回 ref 而不是 reactive**——消费方解构不丢响应
  - 副作用清理：`onScopeDispose(fn)` 注册——组件销毁时自动执行（等价 onUnmounted，但在任意 effect 作用域里都能用）
  - 内部创建的 watch/事件监听挂在组件作用域下，自动随销毁清理
- 一个骨架示例

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

- 与 mixin 的本质差异
  - mixin 是「往组件里合并选项」；composable 是「函数调用返回值」——调用几次就有几份独立状态，mixin 做不到

## 五、响应式原理

### 1. Vue2 响应式原理，Object.defineProperty 的缺陷？

**结论：Vue2 用 defineProperty 劫持属性 + 发布订阅实现——所以有「新增/删除属性侦测不到、数组下标赋值不响应」的先天缺陷，Vue3 改用 Proxy 根治。**

- Vue2 机制（一句话版）
  - 初始化时递归遍历 data，每个属性加 getter/setter 并挂一个 dep 实例
  - 渲染时读属性触发 getter 收集依赖（watcher 存进 dep）；改值触发 setter，dep.notify 通知 watcher 更新
  - 数据变化先进 watcher 队列，nextTick 里批量执行重新渲染（异步批量更新）
- defineProperty 的缺陷（必考清单）
  - 对象**新增/删除**属性无法劫持 → 需要 `Vue.set`/`Vue.delete` 补救
  - 数组**下标赋值**（`arr[0] = x`）和**修改 length** 侦测不到
  - Vue2 的补救：重写数组的 7 个方法（push/pop/shift/unshift/splice/sort/reverse），调用后手动 dep.notify
  - 初始化就要**递归全量**遍历，深层对象初始化开销大
- 追问：哪些数组操作无法被侦测？
  - 上面的下标/length 两类——只能靠 `Vue.set`、splice 等替代写法

### 2. Vue3 Proxy + Reflect 实现响应式的原理，相比 Vue2 提升在哪？

**结论：Proxy 代理整个对象，get 拦截做依赖收集（track），set 拦截做派发更新（trigger）；依赖关系存在 `WeakMap<target, Map<key, Set<effect>>>` 里；相比 Vue2：新增/删除/数组下标全可拦截、初始化免递归（懒代理）。**

- 三个阶段
  - 初始化：reactive() 把原始对象包成 Proxy；组件渲染函数本身包装成一个 effect
  - get / track：渲染函数执行时读到某属性 → track 把当前 effect 存进该属性的依赖集合
  - set / trigger：属性被修改 → trigger 取出依赖集合里的 effect，批量重新执行（走异步队列）
- 依赖结构（追问重点）
  - 外层 WeakMap 的 key 是原始对象——对象销毁时依赖跟着被 GC，防内存泄漏
  - 中层 Map 按属性分组；内层 Set 存 effect，支持一个属性多个使用者
- Proxy 相比 defineProperty 解决了什么
  - 新增/删除属性、数组下标和 length——全部可拦截，不需要 $set
  - 拦截的是「对对象的操作」而不是「逐个属性」，初始化不用递归——**深层属性在访问时才代理**（懒代理）
  - 能拦截 has/deleteProperty 等 13 种操作，语义更完整
- Reflect 的作用（高频追问）
  - Proxy 的 handler 里需要「执行默认行为」——直接读 `target[key]` 会丢掉 receiver（getter 里的 this 指向可能错），`Reflect.get(target, key, receiver)` 把 this 正确指回代理对象，保证嵌套代理链路正常
  - 另外 Reflect 方法返回布尔/值（如 set 返回是否成功），比 try/catch 手写更干净——Vue 用它判断 set 成败
- 追问：Proxy 的代价？
  - 不兼容 IE11（Polyfill 也补不齐）；嵌套对象访问时才递归包装，极端深层链路首次访问有一次性开销

### 3. 依赖收集、派发更新的流程？Dep、Watcher、Effect 之间什么关系？

**结论：三个概念是同一套「发布订阅」在两代 Vue 里的名字——Vue2 里 Dep（属性的依赖盒子）+ Watcher（订阅者），Vue3 里统一为 effect + 依赖桶（WeakMap 结构）；流程都是「读时收集、写时通知」。**

- Vue2：Dep 与 Watcher（多对多）
  - 每个响应式属性有一个 Dep；渲染组件时生成渲染 Watcher
  - getter 触发 → dep.depend() 把当前 watcher 收集进来；setter 触发 → dep.notify() 通知所有 watcher
  - 一个属性可被多个 watcher 依赖，一个 watcher 也可依赖多个属性（多对多靠 watcher 自己持有 dep 列表去重）
- Vue3：effect 与依赖桶
  - 没有 Dep/Watcher 类——effect 是「重新执行就会产生对应更新」的副作用函数（渲染 effect、watch 回调、computed 都是）
  - track：effect 运行时读属性 → 记录到 `WeakMap<target, Map<key, Set<effect>>>`
  - trigger：属性变化 → 从桶里取出 effect 集合 → 入调度队列（Promise 微任务批量执行、去重）
- 对应关系表

| Vue2 | Vue3 | 角色 |
| --- | --- | --- |
| Dep（每属性一个） | Map 中该 key 的 Set | 属性的依赖集合 |
| Watcher | effect | 订阅者/副作用 |
| dep.notify + update 队列 | trigger + 调度器队列 | 批量异步更新 |

- 追问：为什么更新要走队列而不是立即执行？
  - 同一 tick 多次改值只渲染一次（去重 + 批量），且保证「父先子后」的更新排序

### 4. Vue2 为什么数组方法需要重写？哪些数组操作无法被侦测？

**结论：defineProperty 只能劫持「已存在的属性」——数组的下标和 length 无法被 getter/setter 拦截，所以 Vue2 通过原型链替换，重写 7 个变更方法来手动派发更新。**

- 原理
  - 拦截到的数组实例的原型指向一个「继承 Array.prototype + 重写 7 方法」的中间对象
  - 调用 push/splice 等时：先执行原生逻辑，再对新插入的元素做响应式观测，最后手动 dep.notify
- 无法侦测的操作（重写也覆盖不了）
  - `arr[index] = value` 下标赋值、`arr.length = 0`——只能靠 `Vue.set` / splice 替代写法
- Vue3 为什么不需要
  - Proxy 的 set 拦截「对代理对象的任何属性写入」，下标就是属性；`length` 同理——push 内部读写 length 都能被捕获

### 5. 什么是响应式丢失？列举常见场景与解法？

**结论：响应式丢失 = 「拿到了值，但丢掉了与源的链接」——后续改源不更新视图、或改副本不影响源；根因都是解构、展开、整体替换、传值拷贝这类「脱离代理对象」的操作。**

- 场景与解法

| 场景 | 丢失原因 | 解法 |
| --- | --- | --- |
| 解构 reactive：`const { a } = state` | 拿到的是当次读取的普通值 | `toRefs(state)` 再解构 |
| reactive 整体替换：`state = {...}` | 变量指向新对象，旧 Proxy 失联 | 用 ref 存对象，整体替换 `ref.value` |
| 传参拷贝：`fn(state.a)` | 函数里拿到普通值 | 传 ref / 函数 getter |
| props 解构 | props 是 reactive 但解构断链 | `toRefs(props)`；（Vue 3.5+ 编译器支持响应式 props 解构，可直解） |
| 组合式函数返回 reactive | 消费方解构断链 | 返回前 toRefs |
| 模板里展开对象传递 | 展开即拷贝 | 传整个对象或逐个绑定 |

- 本质一句话
  - 响应性挂在「Proxy 对象的属性访问」上——任何一步脱离了「通过代理访问属性」，链接就断了
- 追问：Vue 3.5 的响应式 props 解构是什么原理？
  - 编译器把解构语法转换成每次访问都走 props.xxx 的代码——语法上像解构，运行时没断链

### 6. 大数据列表场景，如何降低响应式带来的性能开销？

**结论：核心思路是「少代理、少追踪、少 diff」——浅层响应式（shallowRef）、跳过代理（markRaw / Object.freeze）、整体替换代替深层修改，渲染层配合虚拟滚动与 v-memo。**

- 四类手段

| 手段 | 原理 |
| --- | --- |
| shallowRef + 整体替换 | 只有 .value 赋值触发更新，几十万条数据内部不做深层代理 |
| markRaw | 给对象打永不代理标记（图表实例、大静态数据块） |
| Object.freeze | 冻结对象不可扩展，reactive 检测后直接返回原对象 |
| v-memo | 模板级缓存，依赖数组不变就跳过该子树 diff |

- 配套组合（实战答法）
  - 大列表数据 shallowRef + 更新时「生成新数组替换引用」或改完内部后 `triggerRef` 手动触发
  - 列表项里的图表/第三方实例用 markRaw 包了再存进状态
  - 渲染层上虚拟滚动（只渲染可视区条目，用占位高度撑起总滚动高度）
- 追问：Object.freeze 后还能改数据吗？
  - 数据本身改不了（冻结语义）；要改就换成「冻结的是快照、修改走新对象替换」的不可变数据流

## 六、虚拟 DOM 与 Diff 算法

### 1. 什么是虚拟 DOM？虚拟 DOM 的优缺点？

**结论：虚拟 DOM 是用 JS 对象描述 DOM 结构的树（vnode）；改动时先在 JS 层 diff 新旧两棵树、算出最小变更再操作真实 DOM——用「可预测的 JS 计算」换取「可控的 DOM 操作量」。**

- 优点
  - 直接操作 DOM 代价高且无法批量优化——先算最小变更集，再一次性 patch
  - 附带收益：跨平台（同一套 vnode 描述可渲染到 DOM/SSR 字符串/原生组件）
  - 声明式开发：开发者描述「UI 应该是什么样」，框架负责「怎么变」
- 缺点
  - 额外一层 vnode 构建 + diff 计算——比「手写的精准最小 DOM 操作」慢
  - 极端高性能场景（高频动画）仍要直操作 DOM 或上合成层
- 追问：既然可能更慢，为什么还用它？
  - 它的价值是「保证不太差 + 把优化交给框架」，声明式开发的性价比；加编译优化（Vue3）后差距进一步缩小

### 2. Vue2 和 Vue3 的 diff 算法流程？key 在其中起什么作用？

**结论：diff 只做同层比较、tag 不同直接替换；Vue2 用双端对比（四指针），Vue3 先同步前后缀、中间乱序部分用最长递增子序列把 DOM 移动次数降到最少；key 是 diff 判断「复用谁」的身份凭证。**

- diff 的两大前提
  - **只同层比较**（跨层移动视为删除+重建，不做跨层复用）
  - **tag 不同直接替换**，不再比较子树
- Vue2：双端对比
  - 新旧列表各拿头尾两个指针，四种比较：头头、尾尾、旧头新尾、旧尾新头
  - 四种都没命中 → 乱序处理：旧列表建 key 到 index 的映射，新头节点的 key 查映射，找到就移动、找不到就新建
- Vue3：最长递增子序列（追问加分点）
  - 先同步前后缀（头头尾尾），中间乱序部分对「有 key 且类型相同」的节点求**最长递增子序列**——序列里的节点不用动，只移动其余节点，把 DOM 移动次数降到最少
- key 的作用
  - 身份标识：diff 靠 key 判断「新旧节点是不是同一个」，能复用就 patch、不能才新建/移动
  - 无 key 时按位置就地复用——顺序变化时内容跟着错位（index 作 key 在删除/插入时错位复用，带输入框的列表还会串数据）

### 3. Vue3 的编译期优化做了什么？静态节点如何处理？为什么性能提升明显？

**结论：核心思想是「编译时能确定的信息别拖到运行时」——静态提升、patchFlag、Block Tree、事件缓存四机制，让 diff 从「全量比」变成「只盯住可能变化的部分」。**

- 静态节点是什么、怎么处理
  - 静态节点 = 整棵子树不含任何动态绑定（插值/指令/动态属性）
  - 处理：**静态提升（hoistStatic）**——把静态节点提到 render 函数外只创建一次，重渲染时直接引用；连续静态节点超过阈值还会合并成一个静态 vnode（innerHTML 直插，跳过 diff）
- 四个机制

| 机制 | 做什么 |
| --- | --- |
| 静态提升 | 纯静态节点提到 render 外，只创建一次 |
| patchFlag | 编译期给动态节点打标记（TEXT/CLASS/PROPS…），更新时**只比对标记指明的字段** |
| Block Tree | 以「结构可能变的块」为单位收集所有动态后代节点（平铺数组），更新时直接遍历动态节点、跳过静态内容 |
| 事件缓存（cacheHandler） | 内联事件函数缓存，避免每次渲染生成新函数导致子组件无效更新 |

- 为什么提升明显（原理层）
  - 传统 diff 的比对量与节点总数相关；优化后与「动态节点数」相关——静态内容占比越高，提速越明显
  - patchFlag 把「属性级全量对比」缩成「标记字段对比」；Block Tree 把「树形递归」压成「数组遍历」
- 追问：patchFlag 和 key 优化有什么关系？
  - 都是「给 diff 提示」——key 提示身份、patchFlag 提示变化范围；前者解决复用错位，后者解决比对范围

## 七、Vue Router 路由

### 1. hash 模式和 history 模式的原理与区别？history 需要后端怎么配合？

**结论：hash 靠 hashchange 监听 # 后的变化（不请求服务器、兼容好）；history 靠 pushState/replaceState 改路径（好看、SEO 友好，但刷新会真请求该路径——后端必须把所有路径兜底到 index.html）。**

| 维度 | hash | history |
| --- | --- | --- |
| 原理 | url 的 # 部分变化，监听 hashchange | pushState/replaceState + popstate |
| 请求 | 改 hash 不发请求 | 改路径不发请求，但**刷新时会真请求该路径** |
| 服务端 | 无要求 | 所有路径兜底 index.html，否则刷新 404 |
| 其他 | url 带 # 不美观 | SSR/SEO 更友好 |

- history 404 的根因（追问）
  - 深链刷新时浏览器把 `/user/123` 当真实资源请求服务器——服务器没这个文件就 404；Nginx 配 `try_files $uri $uri/ /index.html` 兜底
- 追问：两种模式怎么选？
  - 能配服务端就 history（配合兜底）；静态托管改不了服务端（如某些 CDN 托管）用 hash

### 2. 路由守卫有哪些？执行顺序？

**结论：守卫分三层——全局、路由独享、组件内；解析流程体现「先离开旧组件、再校验、解析异步组件、最后确认并触发更新」。**

- 三层守卫
  - 全局：`beforeEach`（鉴权主战场）、`beforeResolve`（导航确认前最后时机，适合拉依赖数据）、`afterEach`（改标题、埋点，无 next）
  - 路由独享：`beforeEnter`，配置在某条路由上
  - 组件内：`beforeRouteEnter`（**拿不到 this**，实例还没建，要传 next(vm => ...)）、`beforeRouteUpdate`（同组件复用如 /user/:id 变化）、`beforeRouteLeave`（离开确认：未保存提示）
- 完整导航解析流程（背主干即可）
  - 导航触发 → 失活组件 beforeRouteLeave → 全局 beforeEach → 复用组件 beforeRouteUpdate → 路由独享 beforeEnter → **解析异步路由组件** → 激活组件 beforeRouteEnter → 全局 beforeResolve → 导航确认 → 全局 afterEach → DOM 更新 → beforeRouteEnter 的 next 回调
- Vue Router 4 变化（顺带答）
  - `new VueRouter` → `createRouter` + `createWebHistory`；`next` 变可选（返回 false 或路由路径即可取消/重定向）

### 3. 路由懒加载怎么实现？原理？

**结论：`component: () => import('./views/User.vue')`——把组件变成「到达才加载」的动态导入，构建时该路由被打成独立 chunk，首屏只下载当前路由的代码。**

- 原理链路
  - 动态 import 语法是「构建工具可静态分析的代码分割点」→ Vite/Rollup/webpack 按它分包
  - 路由匹配到时才发起对应 chunk 的请求，加载完成后注册并渲染
- 配套优化
  - 首页之外的路由全懒加载 + 首页组件再按「首屏外模块」二次懒加载
  - 分包命名（webpack 的 chunkName 注释；Vite 自动按文件名）

### 4. $route 和 $router 的区别？

**结论：$route 是「当前路由的信息对象」（只读），$router 是「路由器实例」（操作方法）；组合式 API 里对应 useRoute() 与 useRouter()。**

| 对象 | 是什么 | 常用成员 |
| --- | --- | --- |
| $route / useRoute() | 当前路由信息（只读） | params、query、path、fullPath、meta、matched |
| $router / useRouter() | 路由器实例 | push、replace、go、back、addRoute、beforeEach |

- 易错点
  - 修改 `this.$route.query` 不生效——route 是只读快照，要改用 `router.push({ query: {...} })`

### 5. 动态路由与 addRoute 的使用场景？权限路由怎么实现？

**结论：登录后按用户角色动态 addRoute 生成可访问路由表；全局 beforeEach 里校验「有 token 但路由表没注册完」时先补注册再放行，404 路由必须最后注册。**

- 动态路由核心 API
  - `router.addRoute(route)` / `router.removeRoute(name)`——登录后拉权限表，过滤出可访问路由逐条注册
  - `router.hasRoute()` 判断重复注册（热更新/重复登录场景）
- 权限路由标准流程（中后台必考）
  - 登录 → 拿角色/权限码 → 过滤静态路由表或请求后端菜单 → addRoute 注册 → 全局 beforeEach 校验并补注册 → 放行
  - 404 路由放最后：先注册会把「尚未注册的合法路由」全部吞成 404
  - 刷新恢复：路由表存内存，刷新即失——beforeEach 里判断「有 token 但未初始化路由」重新走一遍注册流程
- 追问：后端返回菜单 vs 前端静态路由表过滤，怎么选？
  - 后端返回菜单：权限粒度由后端掌控、前端零硬编码，但要防后端给的组件名映射不上；前端过滤：实现简单，适合角色少的系统

### 6. 路由传参的几种方式？params 和 query 的区别与坑点？

**结论：传参三种——params（路径段）、query（查询串）、state/meta（不进 URL）；params 刷新会丢是最大坑点。**

| 维度 | params | query |
| --- | --- | --- |
| 配置 | `/user/:id` 动态段 | 任意路径附加 |
| url 形态 | `/user/123`（不显示 key） | `/user?id=123` |
| 刷新 | 会丢（未在路径里保存的写法下） | 不丢 |
| 语义 | 资源标识（RESTful） | 筛选、分页等可选参数 |

- 坑点清单
  - params 刷新丢失：路由表里没配动态段时 push({ name, params }) 刷新后参数蒸发——要传必传参数就进路径配置
  - query 里的值全是字符串：分页 page 要自己 Number 转换
  - params 变化组件复用：`/user/1` → `/user/2` 组件不重建，用 beforeRouteUpdate 或 watch route 处理
- 不进 URL 的传参（追问）
  - push 的 state（history.state，刷新还在）与 meta（路由元信息，静态配置用）

## 八、状态管理 Pinia / Vuex

### 1. Pinia 和 Vuex 的区别？Pinia 的优势？

**结论：Pinia 去掉了 mutation、天然 TS 支持、store 之间自由引用、按模块自动拆分——把 Vuex 的样板代码和类型困境一次解决。**

- 结构对照

| Vuex | Pinia | 说明 |
| --- | --- | --- |
| state | state / setup 里 ref | 单一状态树 |
| getters | getters / computed | 派生值，带缓存 |
| mutation + action | 只有 action | **异步同步都写 action**，mutation 概念移除 |
| modules + namespace | defineStore 每个域一个 store | 无嵌套、无命名空间，store 之间直接 import 复用 |

- Pinia 的四个优势（答全就是高级水平）
  - 去 mutation：直接改 state 或 action 里改，少一层 commit 样板
  - 完整 TS 推导：defineStore 的类型自动流转，Vuex 的 dispatch 字符串类型是黑洞
  - 模块化天然扁平：每个 store 独立，跨 store 直接调用，不用 registerModule
  - 代码分割友好：只 import 用到的 store，tree-shaking 生效
- 追问：什么规模需要状态库？
  - 跨页面/跨组件树共享的登录态、权限、字典数据才进 store；组件内状态别往上放

### 2. Pinia 的核心概念？actions 支持异步吗？

**结论：三件套 state / getters / actions——actions 同步异步都支持（就是普通 async 函数）；另有 $patch 批量更新与 $reset 重置两个实例方法。**

- 三件套
  - state：数据源（Options 式返回对象，setup 式用 ref）
  - getters：派生值带缓存（接收 state，可 this 串联其他 getter）
  - actions：同步异步统一写，异步直接 async/await，内部改 this.xxx 或 state
- 实用实例方法
  - `$patch(obj 或函数)`：批量修改只触发一次订阅回调
  - `$reset()`：恢复初始 state——**只有 Options 式 store 自带**，setup 式要自己实现（高频追问点）
- 订阅
  - `store.$subscribe` 监听 state 变化（可配 detached 脱离组件作用域做持久化）

### 3. Vuex 的核心概念？mutation 为什么必须同步？

**结论：Vuex 是 state（状态）→ mutation（唯一同步修改入口）→ action（异步包装后 commit mutation）→ getter（派生）单向环流；mutation 必须同步是为了让 devtools 能在每个 mutation 点打快照、实现时间旅行调试。**

- 单向数据流
  - 组件 dispatch action → action 里做异步后 commit mutation → mutation 同步改 state → getter 派生 → 组件渲染
- mutation 同步的原因（本质）
  - devtools 插件在「每个 mutation 触发」时记录前后快照——若 mutation 里是异步回调改 state，快照记录时机与真实变更时机错位，时间旅行回放时状态对不上
  - 同步约束让「每一次状态变更」都有一个可回放的确定性入口
- 追问：直接改 state（绕过 commit）会怎样？
  - 严格模式下警告；功能上能跑，但破坏「变更可追溯」——所有修改都该留痕

### 4. 多个组件共享状态，什么时候用全局状态，什么时候用 provide/inject？

**结论：判断「数据属于谁」——应用级共享（登录态/权限/字典/主题）进全局状态库；「某个组件子树内部的上下文」（表单容器、布局上下文、组件库主题注入）用 provide/inject。**

- 选型判据

| 维度 | Pinia | provide/inject |
| --- | --- | --- |
| 作用域 | 全应用 | 以提供组件为根的子树 |
| 典型数据 | 登录态、权限码、字典 | 表单容器上下文、主题、组件库内部通信 |
| 调试 | devtools 可见 | 隐式，追踪难 |
| 改动入口 | action 集中 | 提供方暴露方法 |

- 反模式
  - 把「深层 props 太麻烦」的数据一股脑塞进 store——它其实是子树上下文，provide/inject 更合适且作用域可控
  - 用 provide/inject 传全局业务数据——应用一多处实例化就出错

## 九、性能优化

### 1. Vue 项目有哪些性能优化手段？（编码 / 运行时 / 打包三层）

**结论：按三层组织作答——编码层「少算少渲染」，运行时层「少渲染少代理」，打包层「少下载快可达」；每层给两三个代表手段即可，被追问哪层就深挖哪层。**

- 编码层（少算少渲染）
  - computed 缓存代替模板里的方法调用；列表过滤用 computed 先算再 v-for
  - v-if/v-show 按切换频率选型；合理的 key 避免错位重 patch
  - 组件合理拆分：静态部分独立成组件，减少无效更新范围
- 运行时层（少渲染少代理）
  - keep-alive 缓存页面/组件实例
  - 大数据 shallowRef / markRaw / Object.freeze 降低代理开销
  - v-memo 跳过子树 diff；长列表虚拟滚动
- 打包层（少下载快可达）
  - 路由懒加载 + 异步组件分包；组件库按需引入
  - Tree-Shaking（前提：ESM 静态分析 + sideEffects 标记 + 生产模式构建）；构建产物分析（rollup-plugin-visualizer）
  - 静态资源 CDN + 强缓存（文件名 hash）、图片懒加载/压缩
- 答法建议
  - 先分层报骨架，再挑一层展开细节——比平铺十几条更有条理

### 2. 长列表渲染卡顿如何优化？虚拟滚动的原理？

**结论：卡顿根因是「DOM 节点太多 + 每项都参与 diff」——虚拟滚动只渲染可视区 + 上下缓冲区的几十条，用总高度撑开滚动条、scrollTop 反算渲染区间。**

- 虚拟滚动核心机制
  - 容器固定高度可滚动；内部一个「总高度占位元素」（数据 1000 条就撑 1000 条的高度）产生真实滚动条
  - 监听滚动，用 `scrollTop / itemHeight` 算出起始索引 start，可视条数 + 缓冲区算出 end
  - 只渲染 start 到 end 的条目，用 transform 或绝对定位把这段内容顶到正确位置
- 动态高度（追问重点）
  - 每条高度不定时：维护「预估高度 + 已测量真实高度」的缓存表，滚动时用缓存累计高度查找 start；测量后修正缓存与占位总高
- 现成方案
  - vueuse 的 useVirtualList、vue-virtual-scroller；表格类看组件库自带虚拟表格
- 其他配合手段
  - 数据层 shallowRef（只对第一层建响应式，深层变化靠整体替换引用或 triggerRef 手动触发）、行组件纯展示不加深层响应式、分页/滚动加载替代无限全量

### 3. 如何减少不必要的组件重渲染？

**结论：重渲染的来源是「父更新连带子更新」与「依赖误判」——用 v-memo、缓存事件引用、拆静态子组件、精确的响应式声明四类手段把更新范围缩小。**

- 手段清单

| 手段 | 针对的问题 |
| --- | --- |
| v-memo="[依赖]" | 列表项依赖不变直接跳过 diff |
| 事件处理函数缓存 | 模板内联箭头函数每次渲染新引用，子组件误判变化更新 |
| 静态内容抽子组件 | 配合编译优化，静态子组件不随父更新 |
| v-once | 纯静态块永不重渲染 |
| computed 代替模板表达式 | 避免模板里每次渲染都执行的函数 |
| 数据精确声明 | 大对象不必响应式的不包 reactive（shallow/markRaw） |

- 排查方法（加分点）
  - Vue Devtools 的组件高亮更新（Component highlights）看「谁在无谓更新」；再沿着「谁传给它的引用变了」找根因——多数是事件/对象字面量在 render 里重建

### 4. 异步组件的使用场景与实现？

**结论：`defineAsyncComponent(() => import('./X.vue'))` 让组件「用到才加载」——首屏外重组件（图表/编辑器/弹窗）按需分包；可配 loading/error 组件与超时。**

- 基本用法与选项

| 选项 | 作用 |
| --- | --- |
| loader | 返回 Promise 的加载函数 |
| loadingComponent / errorComponent | 加载中/失败的占位组件 |
| delay / timeout | loading 延迟出现时间 / 超时报错时间 |

- 使用场景
  - 首屏外的重组件：富文本编辑器、图表库、低频弹窗
  - 权限组件：无权限时不下载对应代码
- 与路由懒加载的关系（追问）
  - 路由懒加载是「路由级分包」，异步组件是「组件级分包」——粒度更细，两者都基于动态 import 的代码分割

### 5. 打包层面如何优化 Vue 项目体积？Tree-Shaking 的前提？

**结论：先分析（visualizer）再动手——组件库按需引入、路由/组件级分包、Tree-Shaking、压缩与拆包；Tree-Shaking 的前提是 ESM 静态结构 + sideEffects 标记 + 生产压缩。**

- 手段清单

| 手段 | 做法 |
| --- | --- |
| 按需引入组件库 | unplugin-vue-components 自动按需导入（全量 import 组件库是体积灾难） |
| 路由/组件懒加载 | 动态 import 分包，首屏只带必需 chunk |
| Tree-Shaking | 删除未引用导出（前提见下） |
| 构建分析 | rollup-plugin-visualizer 找大依赖 |
| 手动拆包 | manualChunks 把稳定的第三方库拆出，利于长缓存 |
| 关闭生产 sourcemap、启用压缩 | 默认项确认不遗漏 |

- Tree-Shaking 前提（必考）
  - **ESM**：import/export 是静态结构，构建期可分析依赖图；CommonJS 动态 require 无法摇
  - **sideEffects 标记**：package.json 里 `"sideEffects: false"`（或列出有副作用的文件）——告诉打包器「没被引用的模块删掉不影响行为」；未标记时打包器不敢删（怕副作用丢失）
  - **生产模式**：摇树只标记未引用代码，真正的删除由压缩器（Terser/esbuild）完成
- 追问：为什么组件库要「按需引入」？
  - 库的入口文件把所有组件 import 了一遍，即使每个组件都有 ESM 导出，从入口全量 import 仍会全打包——unplugin 方案让每个组件独立入口、按真实使用导入

### 6. 首屏加载慢怎么排查和优化？

**结论：先定位「慢在哪一段」（网络/包体/接口/渲染）再对症下药——Network 瀑布图与 Lighthouse 分段计时，优化按「少下载、早到达、快渲染、好体感」四路展开。**

- 排查路径
  - Network 瀑布图：看大 chunk、串行请求、阻塞资源
  - Lighthouse / Performance：FCP、LCP 卡在哪，是脚本执行还是接口等待
  - 常见病因：首屏 bundle 过大（没懒加载/全量组件库）、接口串行且慢、同步加载第三方脚本
- 优化手段

| 路线 | 手段 |
| --- | --- |
| 少下载 | 路由懒加载、按需引入、Tree-Shaking、图片压缩/WebP |
| 早到达 | CDN 部署、关键资源 preload、HTTP/2、接口合并并行 |
| 快渲染 | 骨架屏、关键 CSS 内联、大任务拆分、虚拟滚动 |
| 好体感 | 骨架屏/loading 占位、预渲染或 SSR 白屏消除 |

- SSR/预渲染的定位（追问）
  - 首屏内容服务端直出（SSR）或构建期静态化（预渲染）——白屏时间从「下载 JS 后」提前到「HTML 到达时」；代价是服务端成本与工程复杂度

## 十、工程实践与踩坑

### 1. script setup 中，v-for 循环里使用 ref 有什么坑？

**结论：v-for 里的 ref 要收集成数组才有意义——Vue 3.5 之前必须用「函数 ref」手动收集（还要处理卸载置 null 与数组重置），3.5 起 ref 在 v-for 里自动收集且保证顺序。**

- Vue 3.5 之前（手写函数 ref）

```js
const itemRefs = ref([])
// 模板：<div v-for="(item, i) in list" :ref="el => setRef(el, i)">
function setRef(el, i) {
  if (el) itemRefs.value[i] = el   // el 为 null 时是卸载回调，直接忽略
}
```

- 坑点
  - 列表重排/删除项时索引错位——需要在 onBeforeUpdate 里重置数组
  - 卸载时函数 ref 收到 null，直接赋值会产生空洞
- Vue 3.5+（推荐）
  - `const itemRefs = ref([])` + 模板 `ref="itemRefs"`，框架自动按源数据顺序填充数组
- 追问：为什么函数 ref 收到的有时是 null？
  - 卸载时机也调用函数 ref——它同时承担「挂载赋值/卸载置空」两个职责

### 2. 组件销毁时，哪些资源不清理会造成内存泄漏？怎么排查？

**结论：一切「在组件里创建、但生命周期长于组件」的资源——定时器、全局监听、第三方实例、订阅连接；泄漏本质是外部闭包还持有组件内部数据的引用，实例被吊着 GC 不了。**

- 典型泄漏场景

| 场景 | 泄漏原因 |
| --- | --- |
| setInterval / setTimeout 忘清 | 回调闭包持有组件数据，定时器一直活着 |
| window/document 上的事件监听忘 remove | 全局对象持有回调 → 闭包链吊住组件 |
| ECharts / 地图 / 编辑器实例忘销毁 | 实例内部持有容器 DOM 和数据 |
| WebSocket / mitt / EventSource 忘断开 | 连接与订阅回调长期存活 |
| 全局缓存（store/map）只进不出 | 数据堆积，配合 markRaw/弱引用治理 |

- 排查手段（面试加分点）
  - DevTools → Memory → **堆快照对比**：操作「进入 → 离开组件」前后各拍一张，看 detached 的组件对象是否增长
  - Performance 面板录一段观察内存锯齿——只升不降即疑似泄漏
  - Vue DevTools 确认组件确实已卸载，排除「以为销毁了其实没销毁」
- 预防思路
  - 清理动作与创建动作写在一起（onUnmounted 紧挨着创建代码，别散落）
  - 用自动随组件销毁清理的组合式函数封装（useEventListener / useIntervalFn 类）
  - 第三方实例统一在 onUnmounted 里 dispose

### 3. 大表单场景，如何设计组件拆分和状态管理？

**结论：配置驱动 + 按业务域拆子组件 + 字段级响应式——表单结构用 schema 描述、每个域一个子组件各自管理字段、整表单状态避免一层大 reactive 深代理。**

- 组件拆分

| 层 | 职责 |
| --- | --- |
| 表单容器 | schema 解析、统一 validate、提交 |
| 域子组件 | 按业务块拆（基本信息/收货地址），各管各的字段组 |
| 字段组件 | 单字段：label + 控件 + 校验信息，v-model 协议对外 |

- 状态管理
  - 表单数据量中等：一个 composable（useForm）集中管理 values/errors/touched，子组件 emit 修改
  - 字段多且交互复杂：字段值各自 ref、提交时聚合——避免整个表单一层大 reactive 的深层代理开销
- 实战要点
  - 校验防抖（输入即校验会频繁触发）；提交前统一 validate 全字段
  - 脏检查（dirty）：对比初始快照，离开页提示未保存
- 追问：为什么不建议整个表单塞一个巨型 reactive？
  - 任意字段输入都触发深层代理的 set 逻辑与依赖收集链；字段级拆分让更新范围局部化

### 4. Vue 项目如何做单元测试？一般测哪些内容？

**结论：vitest + @vue/test-utils 是主流组合——工具函数、composable、组件行为三个层次；测「对外行为」而不是「内部实现」。**

- 测试什么

| 层次 | 测点 |
| --- | --- |
| 工具函数 | 纯函数输入输出、边界值 |
| composable | 返回的 ref 状态流转、副作用清理（onScopeDispose 是否触发） |
| 组件 | 渲染快照、props 传入后的展示、trigger 交互后 emit 的事件与 DOM 变化 |
| store | actions 的状态变更与异步流程 |

- 组件测试要点
  - `mount`（真挂载）vs `shallowMount`（子组件打桩）——测当前组件行为用 shallow，测集成用 mount
  - mock 网络层（vi.mock 接口模块），不 mock 被测组件本身
- 原则（追问）
  - 测行为不测实现：断言「用户可见的输出」（DOM/事件），改内部实现不该挂测试

### 5. 如何封装通用业务组件？封装一套组件库怎么规划？

**结论：单组件看「API 设计协议」——props 单一职责、v-model 双向、插槽留扩展口、expose 最小面；组件库是单组件原则的规模化——目录规范、按需构建、类型与文档、版本化发布。**

- 单组件 API 设计原则

| 原则 | 说明 |
| --- | --- |
| props 单一职责 | 一个 props 只表达一件事；互斥状态拆开而不是用字符串魔法值 |
| v-model 协议 | 表单类组件必须支持组件 v-model，接入表单体系零成本 |
| 插槽留扩展口 | 结构可预期地被定制（头部/尾部/项渲染用作用域插槽） |
| expose 最小面 | defineExpose 只暴露「必须被外部调用的」方法 |
| 受控/非受控双模 | 内部维护默认值，同时响应外部传入值（表单组件标配） |
| 事件语义化 | change/confirm/cancel 按业务语义命名，载荷带上下文 |
| 样式可定制 | 关键样式用 CSS 变量暴露，根类名留覆盖入口 |

- 组件库规划（规模化视角）
  - 目录：components（一个组件一个目录 + 入口）/ hooks / utils / 样式变量
  - 构建：ESM 产物 + sideEffects 标记，保证按需引入与 tree-shaking
  - 质量：TS 类型全覆盖、每个组件带 demo 与单测、changelog
  - 发布：changesets 管版本与发包流程，语义化版本
- 追问：业务组件和基础组件（通用）的边界？
  - 业务组件耦合领域模型（订单卡片），通用组件零业务语义（日期选择）——混在通用库里会让库永远发布不出去

## 十一、Vue2 与 Vue3 对比总结

### 1. Vue2 和 Vue3 主要区别有哪些？

**结论：从响应式、API 风格、编译、打包、TS 支持五个维度对比，最后补一句新特性——这是总览题，先报维度框架再各给一句核心差异。**

| 维度 | Vue2 | Vue3 |
| --- | --- | --- |
| 响应式 | defineProperty，新增/删除/数组下标有缺陷，初始化递归 | Proxy，全操作可拦截，懒代理 |
| API 风格 | Options API + mixin 复用 | Composition API + 组合式函数；兼容 Options |
| 编译 | 运行时全量 diff | 静态提升 / patchFlag / Block Tree，diff 只盯动态节点 |
| 打包 | 全量引入为主 | Tree-Shaking 友好，API 可摇 |
| TS | this 推导受限 | 源码 TS 重写，全链路类型 |
| 新能力 | — | Fragment 多根 / Teleport / Suspense / 多 v-model / 移除 $on、filters |

- 答法建议
  - 先报「五个维度」再逐条说——维度框架本身就是加分项
- 追问：性能提升主要来自哪？
  - 编译期优化是主因（静态占比高时 diff 量骤降）+ Proxy 懒代理（初始化不再全量递归）

### 2. Vue3 为什么可以支持多根节点（Fragment）？

**结论：Vue2 的虚拟 DOM 与实例机制以「单根 vnode」为前提（实例属性挂载、diff 入口、属性继承都依赖唯一根）；Vue3 在编译器和 patch 里都支持了 Fragment 类型节点，多根成为合法形态。**

- Vue2 为什么必须单根
  - 组件实例的 $el 要指向一个确定的真实 DOM 根；diff/patch 以单根 vnode 为入口递归
  - 透传属性（class/style）要挂到唯一根上
- Vue3 怎么支持
  - 编译器允许多根 template，生成 shapeFlag 标记为 Fragment 的 vnode
  - patch 对 Fragment 类型走多子节点分支（数组 diff），不再要求单一入口
- 代价（追问）
  - 多根时 $attrs 不会自动继承——需要显式挑一个根 `v-bind="$attrs"`，否则透传丢失（开发期有警告）
  - 递归组件/依赖 $el 的库需要自己保证语义

## 十二、开放类（工程思考）

### 1. 过往项目中 Vue 技术栈遇到的最大技术难点是什么，怎么解决的？

**结论：以「异步竞态治理」作答——难点不是某个 API，而是「异步时序 + 框架副作用机制 + 状态归属」三者叠加的设计判断：问题偶现、难复现、代码表面看着没问题。**

- 一句话定位
  - 竞态类 bug 的特点是「代码看着没问题、偶现且难复现」，考察对异步时序的系统性理解
- 背景 → 目标（S/T）
  - 移动端 H5 大量「输入触发请求」场景：搜索联想、筛选列表、多 tab 切换
  - 偶现怪象：快速输入时列表先显示新数据、又「跳回」旧数据——**慢的旧响应后到，覆盖了新结果**
  - 目标：看到的永远是**最新一次请求**的结果；不引入过重取消逻辑；弱网下控并发
- 行动（A）两层

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

- 结果（R）
  - 错序类反馈归零
  - 「onCleanup + 防抖 + 请求池」沉淀为组合式函数 `useSearch` / `useList`，新列表页**默认正确**，不再靠踩坑
- 收尾一句
  - 难在把散点的坑收敛成**默认正确的复用单元**——第二个人写列表页时不需要懂竞态，也不会写错
- 追问预判（逐层递进）

| 追问 | 答法 |
| --- | --- |
| 为什么不用 AbortController？ | 目标是「过期不展示」，标记位/onCleanup 更轻；真取消（省流量、打断上传）才用 Abort，两者不冲突 |
| onCleanup 原理？ | watch 每轮回调执行前先跑上轮注册的清理函数，「上轮失效」由框架保证 |
| 防抖能解决竞态吗？ | 不能，只降频；间隔超过防抖窗口照样乱序，必须组合 |
| 怎么复现/测试？ | mock 接口加随机延迟（前慢后快）；单测 fake timers 控时序 |
| 具体哪里的列表？ | 面试前填自己的真实场景（联想/筛选具体页面） |
