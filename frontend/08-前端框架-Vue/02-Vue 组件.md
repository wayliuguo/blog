# Vue 组件

组件是 Vue 中最核心的概念之一。一个组件就是一块拥有独立逻辑、样式和模板的 UI 单元，小到可以是一个按钮，大到可以是一个完整页面。Vue 应用由无数个组件组合、嵌套而成。本文覆盖组件的注册方式、组件间通信的各种方案（props / emit / ref / v-model / provide-inject / 跨级通信）、插槽（默认 / 具名 / 作用域）、选项式与组合式 API（setup）、生命周期钩子、动态组件与异步组件，帮助读者系统掌握 Vue 组件开发的核心知识。

> 级别：初级→中级

按本书四层推进：

- **入门使用**：全局/局部注册、`props` / `emit` 父子通信、默认/具名插槽、`<script setup>` 组合式 API、生命周期钩子；
- **进阶**：`v-model` 双向绑定的语法糖原理、`provide / inject` 跨级注入、作用域插槽、动态组件与 `KeepAlive`、异步组件；
- **实战**：把一个真实页面（如导航栏 + 列表卡片）拆成组件，并为不同通信场景选择合适方案；
- **最小实现掌握原理**：组件的"渲染与更新"离不开虚拟 DOM —— 到 `code/frontend/08-vue` 运行 `vdom-vue-diff.html`，看轻量 VNode 树 diff 如何只产出最小改动 patch。

## 组件注册

在 Vue 中，组件需要在"被使用"之前进行注册，注册分为**全局注册**与**局部注册**两种方式。

### 全局注册

全局注册的组件可以在应用内的任意组件模板中直接使用，无需局部导入。

```js
import { createApp } from 'vue'
import MyComponent from './MyComponent.vue'

const app = createApp({})
// 全局注册
app.component('MyComponent', MyComponent)
app.mount('#app')
```

```html
<!-- 在任意组件中直接使用 -->
<MyComponent />
```

全局注册的优点是方便，适合公共 UI 组件；缺点是会增加首屏加载体积，且难以检测到未被使用而造成的冗余组件。

### 局部注册

局部注册只在当前组件内有效，使用组合式 API 时，需要在 `setup` 中通过 `import` 引入组件。

```vue
<template>
  <div>
    <ChildComponent />
  </div>
</template>

<script setup>
import ChildComponent from './ChildComponent.vue'

// 直接在模板中使用
</script>
```

在选项式 API 中，通过 `components` 选项注册：

```js
import ChildComponent from './ChildComponent.vue'

export default {
  components: {
    ChildComponent
  }
}
```

> 推荐：大多数场景使用**局部注册**，配合构建工具会进行 tree-shaking，产物更精简。

## 组件通信

组件之间需要传递数据。Vue 提供了多种通信方式，根据组件关系选择合适的方案。

### 父传子：props

`props` 是父组件向子组件传递数据的标准方式，数据流是**单向**的——子组件只能读取 props，不能直接修改。

```vue
<!-- 父组件：Parent.vue -->
<template>
  <Child :title="title" :count="count" />
</template>

<script setup>
import { ref } from 'vue'
import Child from './Child.vue'

const title = ref('hello')
const count = ref(10)
</script>
```

```vue
<!-- 子组件：Child.vue -->
<template>
  <h2>{{ title }}</h2>
  <p>数量：{{ count }}</p>
</template>

<script setup>
// 通过 defineProps 声明 props
const props = defineProps({
  title: { type: String, default: '' },
  count: { type: Number, required: true }
})
</script>
```

`defineProps` 支持类型约束、默认值、必填等配置（对象写法）；若不需要校验，也可以直接传入一个字符串数组：

```js
const props = defineProps(['title', 'count'])
```

### 子传父：emit

子组件通过 `emit` 触发父组件监听的事件，从而把数据传给父组件。

```vue
<!-- 子组件：Child.vue -->
<template>
  <button @click="$emit('add', 1)">+1</button>
</template>

<script setup>
// 声明可触发的事件
const emit = defineEmits(['add'])
</script>
```

```vue
<!-- 父组件：Parent.vue -->
<template>
  <Child @add="handleAdd" />
</template>

<script setup>
import Child from './Child.vue'

const handleAdd = (val) => {
  console.log('收到子组件增量：', val)
}
</script>
```

事件名建议使用 kebab-case（如 `add-item`），并在 `defineEmits` 中显式声明，便于调试与类型推断。

### 父访问子：ref

通过模板引用（`ref`）可以在父组件中获取子组件的实例，进而访问子组件的属性或方法。

```vue
<!-- 父组件：Parent.vue -->
<template>
  <Child ref="childRef" />
  <button @click="callChild">调用子组件方法</button>
</template>

<script setup>
import { ref } from 'vue'
import Child from './Child.vue'

const childRef = ref(null)

const callChild = () => {
  // 访问子组件的属性或方法
  childRef.value.someMethod()
}
</script>
```

```vue
<!-- 子组件：Child.vue -->
<script setup>
// 将内部属性和方法暴露给父组件
defineExpose({
  someMethod: () => console.log('子组件方法被调用')
})
</script>
```

> 说明：`<script setup>` 中的内容默认是"私有"的，需要在子组件中用 `defineExpose` 显式暴露后，父组件才能通过 ref 访问。

### v-model 实现父子双向绑定

`v-model` 本质上是 `value` 属性绑定 + `input` 事件监听的语法糖。在自定义组件上使用 `v-model`，即可实现父子之间的双向数据同步。

```vue
<!-- 父子组件结合 -->
<template>
  <Counter v-model="count" />
</template>

<script setup>
import { ref } from 'vue'
import Counter from './Counter.vue'

const count = ref(0)
</script>
```

```vue
<!-- Counter.vue -->
<template>
  <button @click="increment">+1</button>
</template>

<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const increment = () => {
  // 通过 update:modelValue 事件同步新的值
  emit('update:modelValue', props.modelValue + 1)
}
</script>
```

- 子组件通过 `modelValue` prop 接收值，通过 `update:modelValue` 事件更新值。
- 一个组件可以支持多个 `v-model`，通过 `v-model:title`、`v-model:content` 指定不同的 prop。

### 依赖注入：provide / inject

当需要在**深层嵌套**的组件间传递数据时，逐层传 props 会很繁琐。此时可以使用 `provide`（提供）与 `inject`（注入），实现跨层级的数据共享，无需关心中间层组件。

```vue
<!-- 祖先组件：Grandparent.vue -->
<script setup>
import { provide, ref } from 'vue'

const user = ref({ name: '张三' })

// 向后代组件提供数据
provide('user', user)
provide('theme', 'light')
</script>
```

```vue
<!-- 任意后代组件：DeepChild.vue -->
<script setup>
import { inject } from 'vue'

// 注入祖先提供的数据
const user = inject('user')
const theme = inject('theme', 'default') // 可设置默认值
</script>
```

提供的数据是响应式的，后代组件可以获取并展示，但同样遵循**单向数据流**原则，应避免在后代中直接修改。

### 跨级通信：EventBus（Vue2）与 Pinia（Vue3）

对于**兄弟组件**或更复杂的跨级、跨组件通信，常见方案有：

- **Vue2 的 EventBus（事件总线）**：借助一个独立的 Vue 实例作为中转站，通过 `$emit` 发布、`$on` 监听。代码随意、难以追踪，是"反模式"，官方并不推荐。
- **Vue3 的 Pinia**：官方推荐的状态管理库，将共享状态集中管理，组件通过 `useStore()` 访问。

```js
// Pinia store 示例
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    }
  }
})
```

```vue
<script setup>
import { useCounterStore } from '../stores/counter'

const store = useCounterStore()
</script>
```

### 通信方式选择建议

| 通信场景 | 推荐方案 |
| --- | --- |
| 父传子（简单数据） | props |
| 子传父（事件） | emit |
| 父访问/操作子组件 | ref + defineExpose |
| 父子双向数据 | v-model |
| 深层跨级传递 | provide / inject |
| 全局共享状态 | Pinia |

## 插槽 Slots

插槽用于把父组件传来的**内容（模板）**插入到子组件的指定位置，从而实现更强的复用和组合能力。

### 默认插槽

子组件中不写 `name` 的 `slot` 称为默认插槽，父组件在子组件标签内部的普通内容会渲染到该位置。

```vue
<!-- Card.vue -->
<template>
  <div class="card">
    <slot>默认内容</slot>
  </div>
</template>
```

```vue
<!-- 使用 -->
<Card>
  <p>这里是卡片内容</p>
</Card>
```

当父组件没有传内容时，`<slot>` 中的默认内容会显示。

### 具名插槽

通过 `name` 给插槽命名，一个组件可以有多个插槽。父组件使用 `v-slot`（简写为 `#`）配合插槽名传入内容。

```vue
<!-- Layout.vue -->
<template>
  <div>
    <header><slot name="header"></slot></header>
    <main><slot></slot></main>
    <footer><slot name="footer"></slot></footer>
  </div>
</template>
```

```vue
<!-- 使用 -->
<Layout>
  <template #header><h2>页头</h2></template>
  <p>主体内容（默认插槽）</p>
  <template #footer><p>页脚</p></template>
</Layout>
```

### 作用域插槽

作用域插槽允许子组件向插槽内容**传入数据**，父组件在定义插槽内容时可显式接收该数据。

```vue
<!-- UserList.vue -->
<template>
  <ul>
    <li v-for="user in users" :key="user.id">
      <!-- 把 user 数据传递给插槽 -->
      <slot name="item" :user="user" :index="index"></slot>
    </li>
  </ul>
</template>
```

```vue
<!-- 使用 -->
<UserList>
  <template #item="{ user, index }">
    <span>{{ index }}. {{ user.name }}</span>
  </template>
</UserList>
```

当只有一个默认作用域插槽时，可简写：

```vue
<List v-slot="{ item }">
  <span>{{ item }}</span>
</List>
```

## 选项式 vs 组合式 API

Vue3 同时支持**选项式 API**（Options API）和**组合式 API**（Composition API，即 `setup`）。

### 选项式 API

按 `data`、`computed`、`methods`、`watch`、`components` 等选项组织逻辑，代码结构固定。

```vue
<script>
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    double() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

### 组合式 API（setup）

通过 `setup` 函数（或其语法糖 `<script setup>`）组织逻辑，代码按功能组织，同一个功能的逻辑可以写在一起、抽成可复用函数，更适合大型项目。

```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

const increment = () => {
  count.value++
}
</script>
```

两种方式对比：

| 对比项 | 选项式 API | 组合式 API |
| --- | --- | --- |
| 代码组织 | 按选项（data/methods） | 按功能逻辑 |
| 学习曲线 | 较低，易上手 | 略高，更灵活 |
| 逻辑复用 | 依赖 mixins | 通过组合函数（composable） |
| 适合场景 | 中小项目、简单组件 | 大型、复杂、复用多的项目 |
| TS 支持 | 较弱 | 强（类型推断优秀） |

> 推荐：新项目优先使用 `<script setup>` 组合式 API。

## 生命周期钩子

每个 Vue 组件实例从创建到销毁都会经历一系列阶段，Vue 提供生命周期钩子让我们在特定时机执行代码。

### 选项式生命钩子

- `beforeCreate`：实例初始化之前。
- `created`：实例创建后，此时可访问 data、methods，但尚未挂载 DOM。
- `beforeMount`：挂载之前。
- `mounted`：挂载完成，DOM 已渲染，适合发请求、操作 DOM。
- `beforeUpdate`：数据变化导致视图更新之前。
- `updated`：视图更新之后。
- `beforeUnmount`：组件卸载之前，适合清理监听器、定时器。
- `unmounted`：组件卸载之后。

```js
export default {
  data() {
    return { msg: 'hello' }
  },
  created() {
    console.log('created：初始化数据')
  },
  mounted() {
    console.log('mounted：DOM 已挂载')
  },
  beforeUnmount() {
    console.log('卸载前：清理资源')
  }
}
```

### 组合式生命钩子

在 `setup` 中，对应的钩子以函数形式使用，常用的是 `onMounted` 与 `onUnmounted`：

```js
import { ref, onMounted, onUnmounted } from 'vue'

const timer = ref(null)

onMounted(() => {
  timer.value = setInterval(() => console.log('tick'), 1000)
})

onUnmounted(() => {
  // 组件卸载时清理定时器，避免内存泄漏
  clearInterval(timer.value)
})
```

组合式对应的钩子对照：

| 选项式 | 组合式 |
| --- | --- |
| `beforeCreate` / `created` | 直接写在 `setup` 中（无对应钩子） |
| `beforeMount` / `mounted` | `onBeforeMount` / `onMounted` |
| `beforeUpdate` / `updated` | `onBeforeUpdate` / `onUpdated` |
| `beforeUnmount` / `unmounted` | `onBeforeUnmount` / `onUnmounted` |

> 注意：在 `<script setup>` 中不存在 `beforeCreate` 和 `created` 钩子，其逻辑直接写在 setup 顶层即可。

## 动态组件

使用 `<component>` 标签配合 `is` 属性，可以在同一个位置根据条件动态切换渲染不同的组件，常用于 Tab 切换等场景。

```vue
<template>
  <button @click="current = 'Home'">首页</button>
  <button @click="current = 'About'">关于</button>

  <!-- 动态组件：根据 current 切换渲染 -->
  <component :is="current" />
</template>

<script setup>
import { ref } from 'vue'
import Home from './Home.vue'
import About from './About.vue'

const current = ref('Home')
</script>
```

- `is` 可以是已注册的组件名，也可以是组件对象。
- 配合 `<KeepAlive>` 可以缓存被切换的组件实例，避免重复创建与销毁：

```vue
<KeepAlive>
  <component :is="current" />
</KeepAlive>
```

## 异步组件与懒加载

当组件体积较大、或首屏不需要立刻加载时，可以使用**异步组件**实现按需加载（懒加载），从而减小首屏打包体积。

```js
// 使用 defineAsyncComponent 定义异步组件
import { defineAsyncComponent } from 'vue'

const AsyncComp = defineAsyncComponent(() => import('./BigChart.vue'))
```

在路由中也可以配合动态导入实现路由级懒加载：

```js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/about', component: () => import('./views/About.vue') }
  ]
})
```

`defineAsyncComponent` 还支持配置加载中与错误状态：

```js
const AsyncComp = defineAsyncComponent({
  loader: () => import('./BigChart.vue'),
  loadingComponent: LoadingComp, // 加载中显示的组件
  errorComponent: ErrorComp,     // 加载失败显示的组件
  delay: 200,                    // 延迟显示 loading
  timeout: 3000                  // 超时时间
})
```

> 应用场景：图表库、富文本编辑器、超大表单页等不常访问的重组件，适合做成异步组件。

## 小结

"一切皆组件"是 Vue 组件化的核心思想。本文介绍了组件的全局/局部注册，梳理了 props、emit、ref、v-model、provide/inject 等通信方式及其适用场景，讲解了默认/具名/作用域插槽，对比了选项式与组合式 API，覆盖了生命周期钩子以及动态组件与异步组件。掌握这些内容，就能依据功能合理拆分组件、选择恰当的通信方式，构建出结构清晰、可维护性强的 Vue 应用。

## 最小实现：用 Demo 验证组件渲染的更新机制

到 `code/frontend/08-vue` 启动后打开 `vdom-vue-diff.html`：用轻量 VNode 树对比两张虚拟 DOM 树，生成最小 patch。原理一句话：组件重新渲染时不重造整棵 DOM，而是先 diff 新旧 VNode 产出差异清单，再按补丁只更新变化节点 —— 这就是 Vue 组件能高效更新的基石。

## 面试衔接

本节对应 `90-附录-面试体系` 的「框架 - Vue」阶段（中级 71"Vue 组件之间有哪些通信方式"等一系列）：组件通信方案及其取舍、选项式 vs 组合式 API、生命周期钩子执行时机、动态组件与 `KeepAlive`。做真题自测后，进入下一节 `03-Vue 路由与状态`。