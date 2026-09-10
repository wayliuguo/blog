# Vue 核心基础

Vue 是一套用于构建用户界面的渐进式 JavaScript 框架。它采用**声明式**的模板语法来描述界面，通过**响应式**系统自动追踪状态变化并更新 DOM。对于初学者而言，Vue 相比 React 自定义了很多指令和写法，理解门槛更低、更好上手。本文覆盖 MVVM 思想、创建应用（createApp）、模板语法、计算属性、侦听器、class 与 style 绑定、条件渲染、列表渲染、事件处理、表单绑定（v-model）以及过滤器等核心知识点，帮助读者快速建立 Vue 的前端知识框架。

> 级别：初级

按本书四层推进：

- **入门使用**：Vue 的 MVVM 思想、`createApp` 创建应用、模板语法（插值与指令）、`computed` / `watch`、class 与 style 绑定、条件与列表渲染、事件处理、`v-model` 表单项；
- **进阶**：双向绑定的本质（`value` + `input` 语法糖）、`computed` 缓存 vs `watch` 副作用、`key` 对 diff 复用的意义、`v-if` 与 `v-show` 取舍；
- **实战**：用这些基础拼出一个给自己用的「待办」或「计数器」小应用，把声明式渲染的体感建立起来；
- **最小实现掌握原理**：到 `code/frontend/08-vue` 运行 `mini-reactive.html`，看「数据驱动视图」的核心 —— 手写响应式如何自动更新页面。

## MVVM 思想

MVVM 是 `Model-View-ViewModel` 的缩写，是一种基于 MVC 思想演化而来的前端架构模式，广泛应用于 Vue、Angular、WPF 等框架中。

- **Model（数据层）**：应用的数据状态，如用户信息、列表数据等。
- **View（视图层）**：界面 DOM，展示给用户的内容。
- **ViewModel（视图模型层）**：连接 Model 与 View 的桥梁，负责数据与视图的同步。

MVVM 的核心是**双向数据绑定**：当 Model 中的 data 发生变化时，ViewModel 自动更新 View；当用户在 View 上交互（如输入）时，ViewModel 也能自动把更新写回 Model。

```
用户输入  -->  View  -->  ViewModel（更新数据） -->  Model
Model 变化  -->  ViewModel（响应式） -->  View（自动更新 UI）
```

在 Vue 中，ViewModel 的角色由 Vue 实例（应用）承担。开发者只需维护数据（Model）和声明视图（View），中间的数据同步完全由 Vue 的响应式系统自动完成，从而减少繁琐的 DOM 操作。

## 创建应用（createApp）

Vue3 中，通过 `createApp` 创建一个应用，并将其挂载到某个 DOM 节点上。

```js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

- `createApp` 接收根组件，返回一个应用实例。
- 应用实例通过 `.mount()` 挂载到指定的 DOM 容器（如 `#app`）上。
- 一个页面可以创建多个应用实例，但它们各自独立、互不影响。

一个最小的 Vue 应用，其模板大致如下：

```html
<div id="app">
  <h2>{{ message }}</h2>
</div>
```

```js
import { createApp } from 'vue'
import { ref } from 'vue'

createApp({
  setup() {
    const message = ref('Hello Vue')
    return { message }
  }
}).mount('#app')
```

## 模板语法

Vue 使用基于 HTML 的模板语法，可以在模板中绑定数据、指令。模板最终会被编译成虚拟 DOM，再渲染成真实 DOM。

### 插值（文本）

使用双大括号 `&#123;&#123; 表达式 }}` 将数据插入到文本内容中，大括号内可以是变量、表达式或三元运算。

```html
<h2>{{ message }}</h2>
<p>{{ 1 + 2 }}</p>
<p>{{ isShow ? '显示' : '隐藏' }}</p>
<p>{{ user.name }}</p>
```

`&#123;&#123; }}` 中的内容只能是**单个表达式**，不能是语句（如 `if`、`for`）。双大括号会把内容当作普通文本渲染，若插入的内容为 HTML，需要使用 `v-html` 指令：

```html
<div v-html="htmlContent"></div>
```

> 注意：`v-html` 会解析 HTML，极易引发 XSS 攻击，只能用于可信任的内容，且不推荐拼接用户输入。

### 指令（Directive）

指令是带有 `v-` 前缀的特殊属性，用于给元素附加某种行为。常见的指令包括：

- `v-bind`：动态绑定属性，可简写为 `:`。
- `v-on`：绑定事件，可简写为 `@`。
- `v-if` / `v-else-if` / `v-else`：条件渲染。
- `v-for`：列表渲染。
- `v-model`：表单双向绑定。
- `v-show` / `v-html` / `v-text` 等。

```html
<img v-bind:src="imgUrl" alt="" />
<!-- 简写 -->
<img :src="imgUrl" alt="" />

<button v-on:click="handleClick">点击</button>
<!-- 简写 -->
<button @click="handleClick">点击</button>
```

指令的完整语法由子元素 `argument`、`modifier` 等构成，例如 `v-on:click.stop` 中的 `click` 是参数，`stop` 是修饰符。

### 插值简写：`v-text`

双大括号 `&#123;&#123; }}` 是 `v-text` 指令的简写形式，二者语义等价，都用于渲染文本内容。

```html
<!-- 等价 -->
<h2 v-text="message"></h2>
<h2>{{ message }}</h2>
```

## 计算属性 computed

当模板中的表达式逻辑比较复杂、需要依赖多个数据时，不宜直接在模板中堆表达式，而应使用**计算属性**。计算属性会根据其依赖的响应式数据自动缓存，只有依赖变化时才会重新计算。

```js
import { ref, computed } from 'vue'
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const firstName = ref('张')
    const lastName = ref('三')

    // 计算属性：依赖 firstName / lastName
    const fullName = computed(() => firstName.value + ' ' + lastName.value)

    return { firstName, lastName, fullName }
  }
})
```

```html
<p>全名：{{ fullName }}</p>
```

计算属性的核心特点：

- **缓存**：只有在依赖的响应式数据发生改变时才重新求值，其余情况直接返回缓存结果。
- **依赖追踪**：自动追踪在计算过程中读取到的响应式数据的属性。
- **可写计算属性**：默认只读，若需支持赋值（setter），可传入一个对象：

```js
const fullName = computed({
  get: () => firstName.value + ' ' + lastName.value,
  set: (val) => {
    const [first, last] = val.split(' ')
    firstName.value = first
    lastName.value = last ?? ''
  }
})
```

## 侦听器 watch

当需要在数据变化时**执行副作用**（如发起请求、写入本地存储、打印日志等）时，使用侦听器 `watch`。它监听响应式数据的变化，并在变化时触发回调。

```js
import { ref, watch } from 'vue'

const count = ref(0)

watch(count, (newVal, oldVal) => {
  console.log('count 变化：', oldVal, '->', newVal)
})
```

监听多个数据源：

```js
watch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
  console.log('多个数据源变化')
})
```

### 立即执行与深度监听

- `{ immediate: true }`：初始化时立即执行一次回调，常用于需要在页面加载时就获取数据的场景。
- `{ deep: true }`：深度监听对象内部属性的变化（对 `reactive` 对象默认启用深度监听）。

```js
watch(
  user,
  (newVal, oldVal) => {
    console.log('user 变化：', newVal)
  },
  { deep: true, immediate: true }
)
```

### watchEffect

`watchEffect` 会自动追踪回调中依赖的所有响应式数据，任一依赖变化都会重新执行回调。

```js
import { watchEffect } from 'vue'

watchEffect(() => {
  // 依赖 count 与 message，二者任一变化都会执行
  console.log(count.value, message.value)
})
```

### 计算属性 vs 侦听器

- **computed**：用于根据已有数据**派生**出新数据，会缓存，尽量不要在其中执行副作用。
- **watch**：用于**响应**数据变化并执行副作用，适合异步或复杂操作。
- 能用 computed 表达的尽量用 computed，逻辑更清晰、性能更好；watch 更适合"当数据变化时还要做别的事"。

## class 与 style 绑定

### 绑定 class

`class` 可以通过普通字符串绑定，也可以使用对象或数组语法实现更灵活的控制。

```html
<!-- 对象语法：isActive 为 true 时添加 active -->
<div :class="{ active: isActive }">内容</div>

<!-- 数组语法：可混入字符串与对象 -->
<div :class="[activeClass, { error: hasError }]">内容</div>

<!-- 普通字符串 -->
<div :class="className">内容</div>
```

### 绑定 style

`style` 绑定的是一个对象，属性名使用驼峰命名（或加引号的 kebab-case）。

```html
<!-- 对象语法 -->
<div :style="{ color: activeColor, fontSize: fontSize + 'px' }">内容</div>

<!-- 绑定样式变量对象 -->
<div :style="styleObject">内容</div>
```

```js
const styleObject = {
  color: 'red',
  fontSize: '32px',
  fontWeight: 'bold'
}
```

## 条件渲染 v-if / v-show

- **v-if**：真正的条件渲染——条件为假时，元素会从 DOM 中被移除。可配合 `v-else-if`、`v-else` 使用。
- **v-show**：仅切换元素的 CSS `display` 属性，元素始终保留在 DOM 中。

```html
<!-- v-if 及其分支 -->
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>其他</div>

<!-- v-show -->
<div v-show="isVisible">始终在 DOM 中，只是隐藏</div>
```

两者区别：

| 对比项 | v-if | v-show |
| --- | --- | --- |
| DOM 是否存在 | 条件为假时不存在 | 始终存在 |
| 初始渲染 | 条件为真时才渲染 | 无论真假都会渲染 |
| 切换开销 | 涉及销毁/重建，开销大 | 仅改 CSS，开销小 |
| 适用场景 | 不常切换、初始恒为假 | 频繁切换 |

> 建议：若元素需要频繁切换显示，用 `v-show`；若条件变化不频繁或初始即为假，用 `v-if`，同时 `v-if` 还有懒渲染、节省首屏资源的好处。

## 列表渲染 v-for

`v-for` 用于遍历数组或对象，生成列表。

```html
<!-- 遍历数组，支持 value + index -->
<li v-for="(item, index) in items" :key="item.id">{{ index }} - {{ item.name }}</li>

<!-- 遍历对象，支持 value / key / index -->
<div v-for="(value, key, index) in obj" :key="key">{{ key }}: {{ value }}</div>

<!-- 遍历数字 -->
<span v-for="n in 10" :key="n">{{ n }}</span>
```

```js
const items = ref([
  { id: 1, name: '张三' },
  { id: 2, name: '李四' }
])
```

### 为什么要用 key

`v-for` 中的每一项都应该提供唯一的 `key`，它帮助 Vue 识别每个节点，在更新列表时进行高效的 diff 复用：

- **key 必须是唯一的**，且尽量使用稳定不变的业务 ID，而不是数组 `index`。
- 使用 `index` 作为 key 时，若在列表中间插入或删除元素，会导致复用错误的项、引发状态错乱（如输入框内容错位）。
- `key` 是优化虚拟 DOM diff 算法的关键，能减少不必要的 DOM 重排与重建。

```html
<!-- 推荐：用稳定的业务 id 作为 key -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

## 事件处理

使用 `v-on`（简写 `@`）绑定事件，事件处理函数通常写在 setup 中返回。

```html
<button @click="handleClick">点击</button>
<button @click="handleClick('参数', $event)">带参数</button>
```

```js
const handleClick = (msg, event) => {
  console.log('点击了：', msg, event)
}
```

若需要在事件处理函数中使用当前元素对象，可通过 `$event` 传入事件对象。

### 事件修饰符

使用 `.` 后缀为事件绑定添加修饰符，简化常见操作：

- `.stop`：阻止事件冒泡。
- `.prevent`：阻止默认行为。
- `.once`：只触发一次。
- `.capture`：使用事件捕获模式。
- `.self`：仅当事件由自身触发时才处理（不来自子元素）。

```html
<!-- 阻止冒泡 + 阻止默认行为 -->
<a href="#" @click.stop.prevent="submit">提交</a>

<!-- 键盘修饰符 -->
<input @keyup.enter="onEnter" />
<input @keyup.esc="onEsc" />
```

## 表单绑定 v-model

`v-model` 在表单元素上实现**双向数据绑定**，本质上是 `value` 属性绑定与 `input` 事件监听的语法糖。它作用于 `input`、`textarea`、`select` 等表单控件。

```html
<!-- 文本 -->
<input v-model="message" type="text" />

<!-- 多行文本 -->
<textarea v-model="message"></textarea>

<!-- 复选框 -->
<input v-model="checked" type="checkbox" />
<div v-for="opt in options" :key="opt">
  <input v-model="selected" type="checkbox" :value="opt" />{{ opt }}
</div>

<!-- 单选 -->
<input v-model="gender" type="radio" value="男" />男
<input v-model="gender" type="radio" value="女" />女

<!-- 下拉选择 -->
<select v-model="city">
  <option value="beijing">北京</option>
  <option value="shanghai">上海</option>
</select>
```

```js
const message = ref('')
const checked = ref(false)
const selected = ref([])
const gender = ref('男')
const city = ref('beijing')
```

`v-model` 针对不同元素使用了不同的属性和事件：

- 文本类：`value` + `input` 事件。
- 复选框/单选/下拉：`checked` / `checked` + `change` 事件。

### v-model 修饰符

- `.trim`：自动去除首尾空格。
- `.number`：将输入转为数字类型。
- `.lazy`：将 `input` 事件改为 `change` 事件（失焦或回车时才同步）。

```html
<input v-model.trim="name" />
<input v-model.number="age" type="number" />
<input v-model.lazy="message" />
```

## 过滤器（Vue2）与插值简写

### Vue2 的过滤器

过滤器用于在模板中对文本进行格式化，仅在 Vue2 中支持，Vue3 已将其移除，推荐使用计算属性或方法替代。

```html
<!-- Vue2 语法（已废弃） -->
<p>{{ price | currency }}</p>
```

```js
// Vue2
filters: {
  currency(value) {
    return '¥ ' + value.toFixed(2)
  }
}
```

在 Vue3 中，替代方案是计算属性或直接调用方法：

```html
<!-- Vue3 推荐 -->
<p>{{ formatPrice(price) }}</p>
```

```js
const formatPrice = (val) => '¥ ' + Number(val).toFixed(2)
```

### 插值简写总结

- `&#123;&#123; }}` 是 `v-text` 的简写。
- `:` 是 `v-bind` 的简写。
- `@` 是 `v-on` 的简写。
- `v-model` 是表单双向绑定的专用指令，无简写形式。

## 小结

本文讲解了 Vue 的核心基础：通过 MVVM 思想理解"数据驱动视图"，用 `createApp` 创建应用，用模板语法（插值 + 指令）声明界面，用 `computed` 派生数据、用 `watch` 响应变化、用 `v-model` 实现表单绑定。掌握这些基础后，下一步就可以进入**组件化开发**，把页面拆分为可复用的组件。

## 最小实现：用 Demo 验证"数据驱动视图"

到 `code/frontend/08-vue` 启动后打开 `mini-reactive.html`：用原生 JS + Proxy 手写 `track / trigger` 实现极简响应式，点击按钮改变 `count` 时页面视图自动更新。原理一句话：读属性时把当前副作用收集进依赖，改属性时取出依赖重新执行 —— 这就是 Vue 响应式让"数据变、视图跟着变"的最小内核。

## 面试衔接

本节对应 `90-附录-面试体系` 的「框架 - Vue」阶段（中级 68-73、高级 99-102 一带）：MVVM 思想、双向绑定原理、`computed` 与 `watch` 区别、`v-if` 与 `v-show` 取舍、`key` 的作用。做真题自测后，进入下一节 `02-Vue 组件`。