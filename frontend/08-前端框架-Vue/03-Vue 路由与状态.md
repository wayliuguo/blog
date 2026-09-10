# Vue 路由与状态

Vue 是单页应用（SPA），页面的切换并不依赖浏览器刷新，而是借助路由在内存中维护"当前 URL"并映射到对应组件。`vue-router`（Vue Router 4，配合 Vue 3）是官方路由方案；而跨组件共享状态、管理全局数据，则由轻量级的 `Pinia` 承担。本文覆盖 Vue Router 4 的路由表与 createRouter、history 模式、路由匹配与嵌套、动态路由、路由守卫、懒加载与编程式导航，以及 Pinia 的核心概念与组合式 API 实践，帮助你建立 Vue 路由 + 状态管理的完整知识框架。

> 级别：中级

按本书四层推进：

- **入门使用**：`createRouter` + 路由表、`<router-view>` / `<router-link>`、history 三种模式、嵌套路由、Pinia 的 `defineStore` 与在组件中读取 state；
- **进阶**：动态路由与 Query 参数、编程式导航、三类路由守卫的执行时机、懒加载与代码分割、`storeToRefs` 保响应性、多 store 模块化；
- **实战**：给一个小后台加"用户态登录 → 路由守卫拦截 → 页面读取"的完整链路，数据收敛到 store 的 action 里；
- **最小实现掌握原理**：Pinia 状态的响应式本质与 Vue 响应式同源 —— 到 `code/frontend/08-vue` 运行 `mini-reactive.html`，看共享状态一改、所有依赖它的视图如何自动更新。

## 路由基础与 createRouter

前端路由的核心是**在不刷新页面**的前提下，实现 URL 与页面内容的一一对应。Vue Router 4 采用了全新的 `createRouter` + `createWebHistory` 组合式 API 来创建路由实例。

### 安装

```bash
npm i vue-router@4
```

### 路由表与 createRouter

`createRouter` 接收两个核心选项：

- `history`：选择路由模式（基础形式见下方 history 一节）。
- `routes`：**路由表**，是一个由"路径 → 组件"映射关系组成的数组。

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import About from '../pages/About.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/about', name: 'about', component: About },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### 挂载到应用

创建好路由实例后，需要在入口处 `app.use(router)` 注册，并在根组件中通过 `<router-view>` 渲染当前匹配到的页面：

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link to="/about">关于</router-link>
  </nav>
  <!-- 当前路由的组件渲染到这里 -->
  <router-view />
</template>
```

`<router-link>` 相当于 `<a>` 标签（会被渲染成 `<a>`），用于声明式跳转。`<router-view>` 是路由出口，当前命中的组件就渲染在这个位置。

## history 模式

`createRouter` 的 `history` 选项决定了路由采用哪种 URL 策略，主要有三种：

- **createWebHistory（History 模式）**：URL 形如 `http://xxx/about`，基于 HTML5 的 `History API`（`pushState` / `replaceState` / `popstate`），URL 最整洁。缺点：刷新 / 直接访问子路径时需服务端把请求回落到入口页面，否则 404。

```js
import { createWebHistory } from 'vue-router'
history: createWebHistory(import.meta.env.BASE_URL)
```

- **createWebHashHistory（Hash 模式）**：URL 形如 `http://xxx/#/about`，通过 `#` 后的内容路由。改变 `hash` 不触发浏览器发请求，因此无需服务端配置，兼容性最好，适合纯静态部署。缺点：URL 不够美观，不利于 SEO。

```js
import { createWebHashHistory } from 'vue-router'
history: createWebHashHistory()
```

- **createMemoryHistory（内存模式）**：路由保存在内存中，不反映在 URL 上，主要用于服务端渲染（SSR）和测试环境。

```js
import { createMemoryHistory } from 'vue-router'
history: createMemoryHistory()
```

> 提示：开发或线上使用哪种模式需与部署方式配合。使用 History 模式时，Nginx 通常需要配置 `try_files $uri $uri/ /index.html;` 让所有路径回落到入口文件。

## 路由匹配与动态路由

### 动态路由参数

当路径中某个片段随内容变化（如文章 id）时，使用 `:参数名` 占位符定义**动态路由**：

```js
const routes = [
  { path: '/article/:id', name: 'detail', component: ArticleDetail },
]
```

在组件内部通过 `useRoute` 拿到当前路由信息，读取 `params` 拿到动态参数：

```vue
<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
// 路径 /article/88 → 88
console.log(route.params.id)
</script>
```

同样支持多个参数、可选参数与通配：

```js
// 多个参数：/user/:name/:age
// 可选参数：/user/:name?   （? 表示可选）
// 通配匹配：/:pathMatch(.*)* 是 404 兜底路由的常见写法
const routes = [
  { path: '/user/:name?', component: User },
  { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFound },
]
```

### Query 查询参数

`?title=xxx` 这种查询串通过 `route.query` 读取：

```vue
<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
console.log(route.query) // { title: 'xxx' }
</script>
```

### 注意点

- 同一个组件复用时（如 `/article/1` 跳到 `/article/2`），组件不会重新创建，需通过 **watch `route`** 或 `onBeforeRouteUpdate` 守卫来响应参数变化、重新拉取数据。
- 动态路由非常适合详情页、个人中心等"路径由数据驱动"的场景。

## 嵌套路由

嵌套路由用于实现页面的**二级乃至多级导航结构**（如"后台布局 + 子页面"）。在子路由的写法上，用 `children` 数组声明子路由：

```js
const routes = [
  {
    path: '/manage',
    component: ManageLayout, // 外层布局壳子，内部有 <router-view>
    children: [
      { path: '', component: ManageHome },        // /manage
      { path: 'list', component: ManageList },    // /manage/list
      { path: 'star', component: ManageStar },    // /manage/star
      { path: 'trash', component: ManageTrash },  // /manage/trash
    ],
  },
]
```

要点：

- 子路由的 `path` **不要以 `/` 开头**，会自动拼接父路径前缀；以 `/` 开头则视为绝对路径、脱离嵌套。
- `children` 中的 `path: ''`（空串）表示访问父路径 `/manage` 时渲染该子组件。
- 每一级路由都需要对应的 `<router-view>` 出口：外层 `Component`（ManageLayout）里必须再放一个 `<router-view>` 来渲染它的子路由。

```vue
<!-- ManageLayout.vue 必须包含子路由出口 -->
<template>
  <div class="manage-shell">
    <AppSidebar />
    <!-- 子路由页面渲染到此 -->
    <router-view />
  </div>
</template>
```

这种"布局壳 + 子路由"的模式常用于后台管理系统，把公共导航、侧边栏抽到父组件，子页面只渲染自己的内容。

## 编程式导航

声明式 `<router-link>` 适合"点击即跳转"；当需要在事件回调中"先处理再跳转"时，用编程式导航。Vue Router 4 提供 `useRouter` 拿到路由实例：

```vue
<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function goHome() {
  router.push('/')          // push：压入历史栈，可返回
}
function replaceToLogin() {
  router.replace('/login')  // replace：替换当前记录，不产生新历史
}
function back() {
  router.back()             // 回退一步
  router.go(-2)             // 前进/回退 n 步
}
</script>
```

- `router.push` 与 `router.replace` 都支持字符串路径或路由对象（`{ name, params, query, hash }`）：

```js
router.push({ name: 'detail', params: { id: 88 }, query: { tab: 'all' } })
```

- 使用 `name` 跳转比写死路径更健壮：即便日后改了 `path`，只要 `name` 不变即可。


## 路由守卫

路由守卫用于在导航发生前后做**拦截与校验**（最常见的是登录鉴权），不满足条件就重定向到登录页或 404。Vue Router 提供了三类内建守卫：

### 全局守卫

- `beforeEach` 全局前置守卫：登录鉴权的主要落点。

```js
router.beforeEach((to, from, next) => {
  // 需要登录的页面集合
  const whiteList = ['/login']
  const isLogin = !!localStorage.getItem('token')
  if (!whiteList.includes(to.path) && !isLogin) {
    // 未登录，强制跳转登录页，并记录来源以便登录后回跳
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  next() // 放行
})
```

- `beforeResolve`：全局解析守卫，在组件被解析之后、导航被确认之前调用。
- `afterEach`：全局后置守卫，没有 `next`，常用于设置页面标题、埋点上报。

```js
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 我的博客` : '我的博客'
})
```

### 路由级守卫

在路由表的组件字段旁配置 `beforeEnter`，只对该路由生效：

```js
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      if (!hasPermission('admin')) return { path: '/403' }
    },
  },
]
```

### 组件内守卫

在组件内部使用组合式 API 形式的守卫：

- `onBeforeRouteUpdate`：当前组件复用且参数变化时触发。
- `onBeforeRouteLeave`：离开当前路由时触发（可做离开确认）。

```vue
<script setup>
import { onBeforeRouteLeave } from 'vue-router'
onBeforeRouteLeave(() => {
  if (hasUnsavedChanges()) {
    // 返回 false 阻止离开
    return false
  }
})
</script>
```

### 守卫执行时机

一次完整导航的调用顺序大致为：

```
beforeEach(全局) → 组件内 beforeRouteUpdate(若有) → beforeEnter(路由级)
→ 组件内 beforeRouteEnter → beforeResolve(全局) → 导航确认 → afterEach(全局)
```

## 懒加载与代码分割

SPA 把所有页面打包进一个 bundle 会导致首屏体积过大。Vue Router 支持把 `component` 写成**动态 `import()`**，从而按路由拆包、按需加载：

```js
const routes = [
  {
    path: '/home',
    component: () => import('../pages/Home.vue'), // 单独的 chunk，访问时才加载
  },
  {
    path: '/about',
    component: () => import('../pages/About.vue'),
  },
]
```

- `() => import(...)` 让构建工具（Vite / Webpack）把每个路由拆成独立 chunk。
- 首次访问对应路由时才请求并加载该包，极大减小首屏体积。
- 可结合注释为 chunk 命名，便于排查：`() => import(/* webpackChunkName: "about" */ './About.vue')`。
- 若担心切页时有白屏，可配合 `Suspense` 或在组件内做 loading 态。

## Pinia 核心概念

现代 Vue 官方推荐的状态管理方案是 **Pinia**（取代 Vuex）。它基于 Vue 3 的组合式 API 构建，设计简洁、天然支持 TS、无多余概念。

### 安装与注册

```bash
npm i pinia
```

```js
// main.js
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.mount('#app')
```

### store 是什么

Pinia 中，一个 store 就是一个"装状态（state）+ 派生（getters）+ 行为（actions）"的容器，对应 Vuex 的 module，也对应 Redux 的 slice / reducer + actions。它由三部分组成：

- **state**：响应式数据，类比 Vue 组件里的 `data`。
- **getters**：由 state 派生的计算值，类比 Vue 的 `computed` / Redux 的 selector。
- **actions**：修改状态的方法，可含异步逻辑，类比 Vuex 的 mutation+action、Redux 的 action+reducer。

### 定义 store（setup 写法）

Pinia 的 `defineStore` 支持**选项式（Option）**和 **setup 写法**两种形式。setup 写法更贴近组合式 API，是现代推荐：

```js
// stores/counter.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {  // 第一个参数是 store 唯一 id
  // state：用 ref 声明
  const count = ref(0)

  // getters：用 computed 声明
  const doubleCount = computed(() => count.value * 2)

  // actions：普通函数即可，支持异步
  function increment() {
    count.value++
  }
  async function fetchAndSet(n) {
    const res = await fetch(`/api/data/${n}`)
    count.value = (await res.json()).value
  }

  return { count, doubleCount, increment, fetchAndSet }
})
```

### 在组件中使用

在组件里调用 `useCounterStore()` 拿到 store。注意解构时需用 `storeToRefs` 保留响应性：

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { useCounterStore } from '../stores/counter'

const store = useCounterStore()
// state / getters 解构会丢失响应性，需用 storeToRefs
const { count, doubleCount } = storeToRefs(store)
// actions 直接调用即可
const { increment } = store
</script>

<template>
  <p>{{ count }} / {{ doubleCount }}</p>
  <button @click="increment">+1</button>
</template>
```

重要规则：

- 直接解构 `store.count` 得到的是**失去响应性**的普通值；必须用 `storeToRefs` 解构 state/getter。
- `actions` 本身就是普通函数，解构后 `this` 不受影响，放心取用。
- 可在 store 内 `this.$patch({ ... })` 做批量更新，或直接给 state 赋值触发响应式。

## 组合式 API 在路由状态中的实践

结合 Vue Router 与 Pinia，一个典型的"登录态 → 路由守卫 → 页面读取"链路如下：

### 1. 用 Pinia 管理用户状态

```js
// stores/user.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }
  return { token, userInfo, setToken, logout }
})
```

### 2. 路由守卫读取 store

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  // 在守卫内通过 useUserStore() 拿到响应式 store
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
```

> 注意：在守卫中使用 `useUserStore()` 必须在 `app.use(pinia)` 之后，且 router 的注册顺序要保证 pinia 已可用（通常在 main.js 中先 `app.use(pinia)` 再 `app.use(router)`）。

### 3. Option API 中的对应写法

如果项目中仍使用 Option API，state/getters/actions 分别对应 `data` / `computed` / `methods`，用 `useStore().xxx` 访问：

```vue
<script>
import { mapStores, mapState, mapActions } from 'pinia'
import { useCounterStore } from '../stores/counter'

export default {
  computed: {
    ...mapStores(useCounterStore),          // this.counterStore
    ...mapState(useCounterStore, ['count']), // this.count
  },
  methods: {
    ...mapActions(useCounterStore, ['increment']), // this.increment
  },
}
</script>
```

## 模块化

当项目复杂、状态众多时，需要**按业务域拆分多个 store**（一个文件一个 store），而不是堆成一个巨型 store。这是 Pinia 与 Vuex 的核心差异之一：Pinia 无需模块嵌套命名空间，每个 store 天然独立。

```
src/stores/
├── index.js        # 可选：统一导出
├── user.js         # 用户域：token、userInfo
├── cart.js         # 购物车域：items、totalCount
└── settings.js     # 配置域：theme、locale
```

```js
// 使用方组织到一起，按需引入
import { useUserStore } from './user'
import { useCartStore } from './cart'

const userStore = useUserStore()
const cartStore = useCartStore()
```

多个 store 之间也可以相互引用（直接在 action/getter 中调用另一个 `useXxxStore()`），实现跨域协作。

## 与 React Router / Redux 的对应关系

掌握 Vue 与 React 在路由/状态管理上的"同构项"，能帮你快速迁移记忆：

| 概念 | Vue | React |
|------|-----|-------|
| 路由模式 | `createWebHistory` / `createWebHashHistory` | BrowserRouter / HashRouter |
| 路由表 / 嵌套 | `routes` + `children` | `<Route>` `children` 或 `useRoutes` |
| 动态参数 | `route.params`（`useRoute`） | `useParams` |
| 查询参数 | `route.query` | `useSearchParams` |
| 编程式导航 | `useRouter().push/replace` | `useNavigate()` |
| 导航守卫 | `beforeEach` / `beforeEnter` 等内建守卫 | 无内建守卫，用 HOC / 自定义 Hook 实现 |
| 懒加载 | `() => import(...)` | `React.lazy` + `Suspense` |
| 状态容器 | Pinia store（id 即命名空间） | Redux `createSlice` / slice reducer |
| state | store 内 `ref` / `state` 字段 | reducer 管理的 state |
| getters | store 内 `computed` / `getters` | reselect / redux-toolkit `createSelector` |
| actions | store 内普通函数（含异步） | action + reducer（异步走 thunk/saga） |
| 在组件读取 | `storeToRefs` 解构 / 直接 `store.xxx` | `useSelector` / `useStore` |

关键差异提醒：

- **副作用来源不同**：React 的异步数据获取通常在组件内用 `useEffect`；Vue 则更多把异步逻辑收敛到 store 的 action 里，组件负责调用。
- **响应式与不可变**：Pinia 更新是**可变 + 响应式**（直接改 store 属性即可）；Redux 更新是**不可变**（必须返回新对象）。
- **getter 的等价物**：Pinia getter ≈ Redux selector，都用于"派生、记忆化、避免重复计算"。

掌握这张对照表后，在 Vue 与 React 两个框架之间切换时，路由与状态管理的思路是高度相通的。

## 最小实现：用 Demo 验证状态管理的响应式内核

到 `code/frontend/08-vue` 启动后打开 `mini-reactive.html`：它用原生 JS 实现极简响应式（`track` 依赖收集 + `trigger` 触发更新），Pinia 的 store 状态正是建立在这种响应式之上。原理一句话：store 里的 `ref` / `reactive` 变化会触发 `trigger`，让所有读到该状态的组件重跑 —— 路由守卫与页面读到的"全局状态"就是这样动态且自动同步的。

## 面试衔接

本节对应 `90-附录-面试体系` 的「框架 - Vue」阶段（中级 72"Vue Router 的路由原理是什么？有哪些模式"、73"Vuex 和 Pinia 有什么区别"）：路由模式与原理、路由守卫时序、懒加载与代码分割、Pinia 与 Vuex 差异、`storeToRefs`。做真题自测后，进入下一节 `04-Vue3 原理`。