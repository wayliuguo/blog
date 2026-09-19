# 模块总结-核心（前端框架-Vue）

> 精简核心版：按篇分组、抽出高频/重要的知识点——成员丰富的主题展开明细，要点型知识点列清单、点到为止。选点按「面试命中度 / 日常复用度」等维度（见[文档组织规范](../../../文档组织规范.md)）。详细知识树见[《模块总结 · 前端框架-Vue》](./总结.md)。

## 知识主线（一句话）

Vue 的主轴是**组件化**：01 的核心基础用"响应式 + 模板 + 指令"回答"数据怎么驱动视图"（MVVM、computed/watch、v-if/v-for/v-model 表单绑定）；02 的组件用 props/emit/ref/v-model/provide-inject/插槽回答"一块界面怎么拆成可复用单元"（组件通信 + 组合式 API + 生命周期）；03 的路由与状态用 vue-router 的三种模式与守卫 + Pinia 的 state/getters/actions 回答"多页面怎么串、共享状态怎么管"。三篇合起来就是"用 Vue 从零搭一个可维护的 SPA"。

## 高频核心点

### 01 Vue 核心基础

**MVVM 与创建应用**

- **MVVM 三层**：Model 数据层 / View 视图层 / ViewModel 桥梁（Vue 实例承担）；双向数据绑定="数据驱动视图"——Model 变自动同步 View、View 交互自动写回 Model
- **data 必须是函数**：组件可复用、多个实例要独立数据——`data()` 每次实例化返回新对象；根组件（单实例）可以是对象

**computed vs watch**

- **computed**：派生值、自动缓存（惰性求值 + dirty 标记）、依赖不变不重算、自动追踪读取的响应式属性；尽量不执行副作用
- **watch**：数据变化执行副作用（请求/埋点/异步）；`{immediate}` 初始化立即执行、`{deep}` 深度监听（reactive 对象默认深）
- **watchEffect**：自动追踪回调内全部依赖，任一变化即重跑；**选型**：能用 computed 表达的就用 computed（声明式优于命令式）

**条件 / 列表渲染**

- **v-if vs v-show**：v-if 增删 DOM 开销大、v-show 只切 display 元素常驻；频繁切换用 v-show、低频/首屏不为真用 v-if（懒渲染省首屏）
- **v-for 的 key**：diff 识别节点身份的凭据、用稳定业务 id；用 index 中间插入会错位复用、输入框状态错乱

**v-model 表单**

- **本质**：`value` + `input` 事件的语法糖；文本类 value+input、复选/单选/下拉 checked+change；修饰符 `.trim`/`.number`/`.lazy`（input→change）

### 02 Vue 组件

**组件通信（展开明细）** 按关系就近选方案——

- 父传子：`props`（单向只读，`defineProps` 声明类型/默认值/必填）
- 子传父：`emit`（`defineEmits` 声明、事件名用 kebab-case）
- 父访问子：`ref` + `defineExpose`（`<script setup>` 默认私有、须显式暴露）
- 父子双向：`v-model`（`modelValue` + `update:modelValue`，支持多参数 `v-model:xxx`）
- 跨级：`provide`/`inject`（免逐层传 props；传 ref/reactive 才保持响应式、遵循单向数据流）
- 全局共享：Pinia（取代 Vue2 EventBus——难追踪的反模式）

**插槽**

- **默认插槽**：无 name 的 `<slot>`、可写兜底内容
- **具名插槽**：`name` 命名、父用 `v-slot`/`#` 传内容，多块组合布局
- **作用域插槽**：子向插槽传数据、父 `#item="{ user, index }"` 显式接收——列表项可定制的常见手段

**选项式 vs 组合式 API**

- 选项式按类型组织（data/methods）、组合式按功能逻辑组织（`<script setup>`）、可抽组合函数复用、TS 支持强
- **逻辑复用**：选项式靠 mixin（命名冲突、来源不明）；组合式靠 composable（显式传参、无冲突）；新项目用组合式、简单组件可选项式

**生命周期（组合式）**

- `onMounted`：DOM 就绪、发请求/读 DOM；`onUnmounted`：清理定时器/监听器/订阅——不清理即内存泄漏
- `<script setup>` 无 beforeCreate/created、逻辑直接写 setup 顶层；`onErrorCaptured` 捕获后代组件错误

**注册 / 动态 / 异步组件**

- **局部注册**（import 即用）优于全局注册（增首屏体积、难查冗余）、可 tree-shaking
- **动态组件**：`<component :is>` 切换、配 `<KeepAlive>` 缓存实例避免重复创建销毁
- **异步组件**：`defineAsyncComponent(() => import(...))` 按需加载重组件、减小首屏；路由级也用 `() => import(...)` 拆 chunk

### 03 Vue 路由与状态

**路由模式**

- **createWebHistory（History）**：URL 整洁、利于 SEO；但刷新/直达子路径需服务端回退（Nginx `try_files ... /index.html`），否则 404
- **createWebHashHistory（Hash）**：`#` 后内容路由、不发请求、免服务端配置、兼容最好；不美观、不利 SEO
- **createMemoryHistory**：路由存内存、不反映到 URL，用于 SSR/测试

**动态 / 嵌套路由**

- **动态参数**：`:id` 占位、`useRoute().params` 读取；可选 `?`、通配 `/:pathMatch(.*)*` 作 404 兜底
- **嵌套路由**：`children` 子 path 不带 `/` 自动拼父前缀（带 `/` 即绝对路径脱离嵌套）、空串 `''` 渲染父路径；每级各需一个 `<router-view>` 出口（"布局壳+子页面"管后台）
- **组件复用注意**：`/article/1`→`/2` 组件不重建、需 watch `route` 或 `onBeforeRouteUpdate` 重拉数据

**路由守卫**

- **全局**：`beforeEach`（登录鉴权主落点：`next()` 放行、`next({path:'/login', query:{redirect}})` 重定向并记录来源）、`beforeResolve`、`afterEach`（设标题/埋点）
- **路由级**：`beforeEnter` 只对该路由生效；**组件内**：`onBeforeRouteUpdate`/`onBeforeRouteLeave`
- **时序**：beforeEach → 组件内 beforeRouteUpdate → beforeEnter → beforeRouteEnter → beforeResolve → afterEach

**Pinia（状态管理）**

- **Pinia vs Vuex**：Pinia 官方推荐（取代 Vuex）——去 mutation、天然 TS、可变更新、无嵌套 module 命名空间（store id 即命名空间）、DevTools 完善
- **store 三要素**：state（源数据、类比 data）/ getters（派生、类比 computed）/ actions（改状态、可含异步）
- **storeToRefs**：直接解构 `store.count` 丢响应性、state/getters 必须 `storeToRefs(store)` 解构；actions 是普通函数可直接解构
- **模块化**：按业务域拆多个 store、一个文件一个 store、store 之间可互相引用

> 答题框架见面试题页；此页只做知识锚点清单。
> 参考：完整版 [总结.md](./总结.md) · 面试题 [面试题.md](./面试题.md)