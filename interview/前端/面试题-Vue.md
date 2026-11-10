# 面试题 · Vue

## 一、Vue2 与 Vue3 对比总览

### 1. Vue2 和 Vue3 主要区别有哪些？

- **响应式原理：defineProperty → Proxy**
  - Vue2 使用的是Object.defineProperty劫持对象已有属性，无法监听新增、删除属性，数组靠重写7个方法，初始化要全量递归，成本高
  - Vue3 使用的是 Proxy + Reflect, 代理整个对象，其是**惰性代理**：访问到深层才代理，初始化成本低

- **API 风格：Options → Composition**
  - Vue2 按选项（data / methods / computed）组织，同一块逻辑散落在各处，逻辑复用靠 mixin，来源不清、易命名冲突
  - Vue3 推荐使用组合式 API，可以按功能组织代码，逻辑复用靠组合式函数（composable），来源显式、命名隔离

- **模板（单根节点 → 多根节点）**
  - Vue2 必须是单个根节点。
  - Vue3 支持多根，底层依靠 Fragment, 不会多出 DOM
  - 新增：Teleport、Suspense、多 v-model等

- **编译优化：全量 diff → 定向更新**
  - Vue2 没有做编译优化，diff 全量递归遍历
  - Vue3 编译器会做：静态标记、静态提升、patchFlag、Block Tree、事件缓存——尽可能缩小 diff 的工作量

### 2. Vue2 和 Vue3 的最大区别是什么？

- **底层最大区别**：响应式机制重写——Vue2 用 `Object.defineProperty` 劫持已存在属性，新增/删除属性、数组下标、length 都拦截不到；Vue3 用 `Proxy` 代理整个对象，这些全部可拦截，且嵌套对象只在被访问时才代理（惰性）
- **上层最大区别**：API 范式——Options 按选项组织变为 Composition 按功能组织，逻辑复用从 mixin 变为组合式函数，TS 推导脱胎换骨

- **为什么「响应式」是最大区别**
  - 它是其它一切改进的地基：编译优化、性能提升、ref/reactive 全家桶都建立在 Proxy 之上
  - Vue2 为绕开 defineProperty 的缺陷打了大量补丁（`$set`/`$delete`、数组方法重写、`Vue.set`），Vue3 这些补丁全部消失

## 二、基础指令与模板

### 3. v-if 和 v-show 的区别？各自适用场景？

- **原理**
  - `v-if`：是真正的条件渲染。条件为 false 时，对应的 VNode 不会生成，DOM 直接被销毁；条件为 true 才创建、挂载，会走完整的创建 / 销毁生命周期。它是惰性的。
  - `v-show`：只是控制 CSS 的 `display: none`。无论真假，DOM 一开始就渲染出来，只是切换显示隐藏，不会销毁 DOM，不会触发生命周期。

- **性能开销**
  - `v-if`：切换开销大；初始渲染如果是 false，初始开销很小。
  - `v-show`：初始渲染开销略大；反复切换开销很小。

- **适用场景**
  - **v-if**：运行时很少切换、一次性判断（权限渲染、模块按需加载）。
  - **v-show**：需要频繁切换显示隐藏（弹窗、tab、下拉）。

### 4. v-for 和 v-if 能不能写在同一个标签上？Vue2 和 Vue3 的优先级差异？

- **结论**：不要写在同一标签上
- **优先级**：Vue2 先循环后判断（不满足的项也白算一遍）；Vue3 先判断后循环（作用域里拿不到循环变量）

- **Vue2：v-for 优先**
  - 同一节点的 v-for 先执行，每个元素都生成一遍再跑 v-if 过滤
  - 不满足条件的项也走了完整渲染计算，纯属浪费

- **Vue3：v-if 优先**
  - v-if 在 v-for 作用域外层求值，访问不到循环变量——`v-if="item.visible"` **编译能过、运行时报错**（item 解析为 undefined → `TypeError: Cannot read properties of undefined`）
  - 本质是把「隐式浪费」变成「显式拦截」；开发期靠 eslint 规则 `vue/no-use-v-if-with-v-for` 拦截，编译器本身不报错


### 5. 双向绑定 v-model 的原理？组件上多 v-model 怎么实现？

- 原生元素：编译期语法糖——原生元素展开「值绑定 + 事件监听」
  - 文本框：`:value` + `@input`，赋值时读 `$event.target.value`
  - checkbox / radio 走 `checked` 与 `change`，select 走 `value` 与 `change`——不同控件展开不同
  - 修饰符在编译期改写：`.lazy` 换 change 事件、`.number` 包一层数字转换、`.trim` 去首尾空格
- 组件：「modelValue prop + update:modelValue 事件」

- **组件上的展开**
  - Vue2 的多属性双向靠 `.sync`
  - Vue3 的多属性双向靠 `update:modelValue` 事件
  ```
  <MyComp v-model="msg" />
  <!-- 等价 -->
  <MyComp :modelValue="msg" @update:modelValue="msg = $event" />

  <UserForm
    v-model:name="name"
    v-model:age="age"
  />
    <UserForm
    :name="name"
    @update:name="name = $event"
    :age="age"
    @update:age="age = $event"
  />
  ```

### 6. nextTick 的作用与原理？

- **作用**：等待下一次 DOM 更新刷新的时机，在回调里拿到更新后的真实 DOM 节点。
- **原理**：
  - 修改响应式数据不会立刻更新 DOM，渲染任务会被放到微任务里批量执行。nextTick 将回调挂靠在调度器的 Promise 上，保证回调在同步代码跑完、DOM 更新完成之后执行
  - Vue2 按照 Promise.then=>MutationObserver=>setImmediate=>setTimeout 降级， Vue3 不再提供异步方案降级。
  ```js
  const resolvedPromise = Promise.resolve()
  let currentFlushPromise = null
  function nextTick(fn) {
    const p = currentFlushPromise || resolvedPromise
    return fn ? p.then(fn) : p   // 不传 fn 就返回 Promise，可直接 await nextTick()
  }
  ```

## 三、组件与通信

### 7. Vue 组件之间有哪些通信方式？各自适用场景？
- props/emit, 标准父子同信
- attrs，封装高阶组件，不想逐个声明props
- provide/inject，跨层级通信，例如主题色
- ref，通过实例获取，少用
- pina/vuex，大量共享的状态
- 事件总线，vue3 移除 $on/$off, 自行用mitt

### 8. provide / inject 的作用、优缺点、适用场景？

- **作用**：跨层级通信，不需要层层透传
- **优/缺点**：
  - 跨层级、轻量
  - 依赖不直观

### 9. keep-alive 的作用、参数与生命周期变化、原理？

- **作用**：
  - KeepAlive 是内置抽象组件，用于缓存组件实例，保留组件状态，避免反复挂载销毁
  - 支持 include、exclude、max，max 超出后按 LRU 淘汰
- **生命周期**：从销毁/重建，变成激活/失活 activated / deactivated
-  **原理**：框架内部维护缓存表，当子组件要被替换时，不执行卸载，而是把它的 VNode、组件实例放进缓存；下次再渲染这个组件，直接取出缓存实例复用，不走新建组件流程

### 10. Teleport 组件的作用，解决什么问题？原理是什么？

- **作用**：把子树传送到 DOM 任意位置（如 body）渲染，逻辑归属仍在原组件树
- **解决**：弹层被父级 overflow 裁剪、transform/filter 让 fixed 失效的经典问题
- **原理**
  - 编译阶段生成特殊 teleport vnode，渲染时把子DOM 挂载到to指定容器；
  - 在虚拟 DOM 层面仍然保留原本的组件逻辑关系，事件冒泡、组件上下文不受物理 DOM 位置影响，支持 disabled 关闭传送

### 11. 插槽有哪些类型？插槽的原理是什么？

- **作用**：把模板片段从父传给子、由子决定渲染位置
- **三类插槽**
  - 默认插槽 `<slot>`；
  - 具名插槽 `<slot name="header">` + `v-slot:header`（缩写 `#header`）
  - 作用域插槽：子组件 `<slot name="item" :row="item">` 传出数据，父组件 `#item="{ row }"` 接收
   ```
   <template #item="{ row }"></template>
     <div>{{ row }}</div>
   </template>

   
   ```
- **编译产物（原理核心）**
  - 在编译时，父组件把插槽内容编译为插槽函数，挂在子组件实例的 `slots` 对象上
  - 运行时，子组件通过renderSlot函数调用取出插槽函数，执行上下文是父组件，通过子的数据作为参数调用支持作用域插槽
  - 解析：https://play.vuejs.org/ 
  ```
  父 render：打包插槽函数 → 放进 Comp vnode 的 slots
          ↓
  子 render：执行 _renderSlot
          ↓
  renderSlot：取出插槽函数，把子的数据 { info } 作为参数调用它
          ↓
  插槽渲染函数运行（上下文仍然是父），生成插槽内部 vnode
          ↓
  渲染出来，插到子组件 DOM

  ```
  ```
  <!-- App.vue（父组件） -->
  <template>
    <div class="app">
      <p>我是 App，appMsg：{{ appMsg }}</p>
      <Comp>
        <template #content="{ info }">
          <div>content：{{ info }}，外部变量 appMsg：{{ appMsg }}</div>
        </template>
      </Comp>
    </div>
  </template>
  <script setup>
  import Comp from './Comp.vue'
  const appMsg = '来自 App 的消息'
  </script>
  <!-- 对应的render 函数 -->
  function render(_ctx, _cache, $props, $setup, $data, $options) {
    return (_openBlock(), _createElementBlock("div", _hoisted_1, [
      _createElementVNode("p", null, "我是 App，appMsg：" + _toDisplayString($setup.appMsg)),
      _createVNode($setup["Comp"], null, {
        content: _withCtx(({ info }) => [
          _createElementVNode("div", null, "content：" + _toDisplayString(info) + "，外部变量 appMsg：" + _toDisplayString($setup.appMsg), 1 /* TEXT */)
        ]),
        _: 1 /* STABLE */
      })
    ]))
  }

  <!-- Comp.vue -->
  <template>
    <div class="comp">
      <p>我是子组件 Comp</p>
      <slot name="content" :info="slotInfo"></slot>
    </div>
  </template>
  <script setup>
  const slotInfo = '子组件传给插槽的数据'
  </script>
  <!-- 对应的render 函数 -->
  function render(_ctx, _cache, $props, $setup, $data, $options) {
    return (_openBlock(), _createElementBlock("div", _hoisted_1, [
      _cache[0] || (_cache[0] = _createElementVNode("p", null, "我是子组件 Comp", -1 /* CACHED */)),
      _renderSlot(_ctx.$slots, "content", { info: $setup.slotInfo })
    ]))
  }
  ```
## 四、生命周期

### 12. 生命周期钩子有哪些？Vue2 与 Vue3 怎么对应？

- **四阶段**：创建 → 挂载 → 更新 → 销毁，各有前后一对钩子
- **Vue3 变化**：destroyed 系改 unmounted 系；beforeCreate/created 被 setup 取代；其余以 onXxx 写进 setup

- **四阶段对照**

| 阶段          | Vue2                      | Vue3（组合式）                | 时机与用途                                                 |
| ------------- | ------------------------- | ----------------------------- | ---------------------------------------------------------- |
| 创建前/后     | beforeCreate / created    | setup 本身（等价覆盖）        | data/methods 初始化；**发不依赖 DOM 的请求最早在 created** |
| 挂载前/后     | beforeMount / mounted     | onBeforeMount / onMounted     | mounted 后可访问真实 DOM——图表/测宽高等初始化在这里        |
| 更新前/后     | beforeUpdate / updated    | onBeforeUpdate / onUpdated    | 数据变 UI 未变 / UI 已同步；避免在里面改状态（死循环）     |
| 销毁前/后     | beforeDestroy / destroyed | onBeforeUnmount / onUnmounted | 清理定时器/事件监听/订阅                                   |
| 缓存激活/失活 | activated / deactivated   | onActivated / onDeactivated   | keep-alive 缓存组件专用                                    |

### 13. 父子组件生命周期执行顺序（创建、更新、销毁）？

- **挂载**：父 beforeMount → 子 beforeMount → 子 mounted → 父 mounted
- **更新**：父 beforeUpdate → 子 beforeUpdate → 子 updated → 父 updated
- **销毁**：父 beforeUnmount → 子 beforeUnmount → 子 unmounted → 父 unmounted

## 五、组合式 API 与 script setup

### 14. Options API 和 Composition API 的区别，各自优缺点？
- **Options API**：按选项组织代码（data / methods / computed / watch），逻辑散落在各个选项里，优点是结构直观，入门简单，缺点是复用靠 mixin 不优雅，来源不清、易命名冲突，隐式耦合（共同依赖属性不知道）、this 推导差
- **Composition API**：按功能组织代码（useXxx 函数），逻辑集中，优点是复用简单，来源清晰，命名冲突少，缺点是上手门槛高一些

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

### 15. computed、watch、watchEffect 三者的区别与机制？

- **区别**
  - **computed**：用来派生计算值，自带缓存；惰性求值；依赖追踪，返回一个 `ref`。适合：根据已有数据算出新数据
  - **watch**：显式指定要监听的数据源；默认惰性（初次不执行）；可以拿到新旧值；粒度可控。适合：明确监听某个值变化，做副作用
  - **watchEffect**：立即执行、自动收集依赖；没有返回值，侧重副作用；拿到依赖变化就跑回调。适合：自动同步、根据依赖执行动作
- **机制**
  - **computed**：
    - 初始化：创建 副作用，不立刻跑 getter，脏标记为 true
    - 读 value：脏标记为 true → 执行 `effect.run()`，运行 getter，获得计算值缓存，脏标记为false; 如果此时有别的副作用（如渲染 effect），会把这个副作用记录为依赖计算属性的副作用
    - getter 依赖的响应式数据变化时，进入调度逻辑，把脏标记为 true，并且触发所有依赖这个计算属性的副作用重新运行
    - 这些触发的副作用执行过程中，再次读取该计算属性的value，重新执行getter 做计算
    ```
    class ComputedRefImpl {
      constructor(getter) {
        this._dirty = true
        this._value = undefined
        this.__v_isRef = true
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty) return 
            this._dirty = true
            trigger(this, 'value') // 叫醒依赖方，它们会在读 value 时触发重算
        })
      }

      get value() {
        if (this._dirty) {
            this._value = this.effect.run() // 重算时才真正执行 getter
            this._dirty = false
        }
        track(this, 'value')
        return this._value
      }
    }
    ```
  - **watch**：
    - 初始化：创建读取数据源的函数，创建副作用，默认不会立刻执行取值逻辑
    - 如果配置了 immediate: true, 初始化会读取数据源并立刻执行一次回调
    - 读取数据源：对响应式数据进行收集，和当前副作用建立关联，deep 会递归收集
    - 任意一条被收集的响应式数据发生变化，都会触发这个副作用重新运行，执行读取数据源，获取新值，新旧值一并传给回调执行，随后更新旧值
    - 返回值：一个函数，用于停止监听
  ```
  function watch(source, cb, options = {}) {
    let getter
    if (isFunction(source)) {
        getter = source // getter 函数：返回什么就侦听什么
    } else if (isRef(source)) {
        getter = () => source.value
    } else if (isReactive(source)) {
        // reactive 源默认深度监听（与 Vue 行为一致）：全量读一遍建依赖
        getter = () => traverse(source)
    } else {
        return () => {}
    }

    let oldValue
    const runner = effect(getter, {
        // 源变化时 trigger 不直接重跑 run，而是走 scheduler：取新值后交给用户回调
        scheduler: () => {
            const newValue = runner()
            if (hasChanged(newValue, oldValue)) {
                cb(newValue, oldValue)
                oldValue = newValue
            }
        }
    })
    oldValue = runner() // 首次执行：建立依赖，记下旧值
    if (options.immediate) cb(oldValue, undefined) // 立刻执行：首次就以"新值"身份回调
    return () => stop(runner) // 返回停止侦听函数
  }
  ```
  - **watchEffect**：
    - 初始化：创建副作用，立刻执行传入的回调，执行回调的时候，里面的响应式数据会收集依赖和这个副作用关联
    - 任意一条被收集的响应式数据发生变化，都会触发这个副作用重新运行，再次执行回调，重新收集依赖
    - 没有缓存，拿不到变化前的值；返回一个停止函数，可以手动终止监听
  ```
  function watchEffect(fn, options = {}) {
    // 把传入回调作为副作用
    const runner = effect(fn, {
      ...options
    })
    // 立即执行一次，自动收集回调内部用到的响应式依赖
    runner()

    // 返回停止函数
    return () => stop(runner)
  }
  ```

### 16. ref 和 reactive 的区别？各有哪些响应式陷阱？如何选择？
- **区别**
  - ref：是一个包装对象，内部维护value属性；需要通过.value 访问来实现响应式；对象会调用 reactive 函数，实现响应式
  - reactive：使用 proxy 直接代理原始对象，只支持引用类型，不支持基本类型
- **陷阱**
  - reactive： 直接整体重赋值会丢失响应式
  - ref： 容易漏写 .value
  - 二者如果取出普通原始值，都会脱离响应式追踪
  ```
  let state = reactive({ num: 1 })
  state = { num: 100 } // 重新赋值响应式丢失
  const { num } = state // 解构出来的是当前值快照，不会响应式追踪

  let state1 = ref(1)
  let state2 = state1.value
  state1 = 100
  state2 = 200
  console.log(state1.value, state2) // state1 和 state2 不会同步
  ```
- **选择**
  - 按照特点来，如基础类型，需要整体替换就用 ref，对象类型，不需要替换就用 reactive
  - 大量状态时，推荐统一用 ref，心智负担小;
  - 组合式 API 优先 ref, 因为响应式不容易断链

### 17. shallowRef / shallowReactive 是什么？适用场景？

- **`shallowRef`**：浅层 ref。只对 `.value` 这一层做响应式；如果 `.value` 是对象，不会自动变成 `reactive`，内部属性不追踪。只有替换 `.value` 本身才触发更新。
- **`shallowReactive`**：浅层 reactive。仅代理对象第一层属性；嵌套对象不会被 Proxy 代理，内层改动不会触发响应。
- 适合存放第三方实例、超大对象，用来规避深层响应带来的性能开销，整体换用 shallowRef，对象结构固定只改顶层字段用 shallowReactive。

## 六、响应式原理

### 18. 响应式原理全链路：从 Vue2 的 defineProperty 到 Vue3 的 Proxy？
- **Vue2-Object.defineProperty**：
  - 核心：在初始化的时候，递归遍历 `data` 的所有属性，给每个属性添加 `getter / setter`，每个属性持有一个独立的 `Dep`。
  - 收集依赖（get）：读取属性，触发 `getter`，调用 `dep.depend()`，把当前正在运行的 `Watcher`（渲染 watcher / 侦听器 watcher）加入这个属性的 `Dep`
  - 触发更新（set）：修改属性，触发 `setter`，调用 `dep.notify()`，通知里面所有的 `Watcher`，放入微任务队列，之后批量执行。
  - Dep 和 Watcher 之间是多对多的关系，一个属性可以有多个订阅者，一个订阅者也可以订阅多个属性。
  - 短板
    - 无法监听新增、删除属性，需要 Vue.set/delete
    - 数组下标与 length 无法拦截, 需要重写7个变异方法
    - 必须提前递归遍历，一开始
  - 多对多关系：一个属性可被多个 Watcher 依赖，一个 Watcher 也依赖多个属性（Watcher 自己持有 dep 列表去重）
- **Vue3-Proxy+Reflect**：
  - 核心：使用的是 Proxy + Reflect, 代理整个对象，其是**惰性代理**：访问到深层才代理，初始化成本低
  - 收集依赖（track）：读取属性，触发 `track`，会构建`WeakMap<target, Map<key, Set<effect>>>`，把当前 effect 存进该属性的依赖集合
  - 触发更新（trigger）：修改属性，触发 `trigger`，会从依赖集合里取出所有 effect，放入微任务队列，之后批量执行
  - 优势：代理整个对象，不存在无法劫持，不需要递归代理
  - 代价：不兼容 IE11（Polyfill 补不齐）
  - 依赖桶用 WeakMap 的根因：key 是原始对象，对象销毁时整条依赖自动被 GC 回收
  - 没有 Dep/Watcher 类——effect 是「重新执行就会产生对应更新」的副作用（渲染、watch 回调、computed 都是 effect）
  - 内层 effect 执行时会暂存外层活跃 effect，结束后恢复——依赖收集不会串层

## 七、编译与虚拟 DOM

### 19. 模板编译流程：模板如何变成真实 DOM？
- **主线流程**：模板字符串 → parse（生成 AST）→ transform（AST 遍历、编译优化）→ generate（生成 render 函数）→ 运行时执行 render 得到 vnode → patch，完成真实 DOM 更新
- **parse 解析**：将模板字符串递归解析，生成抽象语法树 AST。
- **transform 优化**：遍历 AST，执行全部编译优化。
  - 静态标记：识别完全没有动态绑定的节点，标记为静态；（patchFlag 标记为 -1）
  - 静态提升：常量字面量（固定的 props 对象、数组）、静态 vnode提升到模块顶层，只创建一次，避免每次渲染重复创建
  - patchFlag：给动态节点打上数字标记，记录节点内部哪一部分会变动（文本 /class/props）；patch 时，该节点只对比标记对应的部分，不全量对比。
  - Block Tree（openBlock/createElementBlock）：开启 Block 上下文，自动收集上下文内所有带 patchFlag 的动态 vnode，存进 `dynamicChildren`；patch 直接遍历这份动态节点列表，静态节点连遍历都跳过
  - cacheHandlers 事件缓存：将事件处理函数存入 `_cache`，只创建一次；避免每次渲染生成全新箭头函数，防止 diff 误判属性变更，重复绑定解绑事件
- **generate 生成**：根据优化完成后的 AST，拼接生成可执行的 render 函数 JS 代码
- **运行时执行 render**：执行 render，产出虚拟节点 vnode；再通过 patch 做 diff，对比新旧 vnode，增删改真实 DOM
- 代码演示
```
<!-- 编译前 -->
<template>
  <div class="static-box">我是静态文本</div>
  <div>{{ msg }}</div>
  <button @click="handleClick">点我</button>
  <div>
    <span v-if="flag">动态分支 {{ count }}</span>
  </div>
</template>


<!-- 编译后 -->
export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("template", null, [
    _cache[1] || (_cache[1] = _createElementVNode("div", { class: "static-box" }, "我是静态文本", -1 /* CACHED */)),
    _createElementVNode("div", null, _toDisplayString(_ctx.msg), 1 /* TEXT */),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.handleClick && _ctx.handleClick(...args)))
    }, "点我"),
    _createElementVNode("div", null, [
      (_ctx.flag)
        ? (_openBlock(), _createElementBlock("span", _hoisted_1, "动态分支 " + _toDisplayString(_ctx.count), 1 /* TEXT */))
        : _createCommentVNode("v-if", true)
    ])
  ]))
}
```
```
export const enum PatchFlags {
  TEXT = 1,                    // 动态文本
  CLASS = 1 << 1,              // 2，动态 class
  STYLE = 1 << 2,              // 4，动态 style
  PROPS = 1 << 3,              // 8，动态属性（排除 class/style）
  FULL_PROPS = 1 << 4,         // 16，属性 key 本身是动态，要全量对比 props
  HYDRATE_EVENTS = 1 << 5,     // 32，携带事件（SSR 注水）
  STABLE_FRAGMENT = 1 << 6,    // 64，子顺序固定的 fragment
  KEYED_FRAGMENT = 1 << 7,     // 128，子节点带 key 的 fragment
  UNKEYED_FRAGMENT = 1 << 8,   // 256，子节点无 key 的 fragment
  NEED_PATCH = 1 << 9,         // 512，仅 ref 这类非 props 需要更新
  DYNAMIC_SLOTS = 1 << 10,     // 1024，动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, // 开发环境根 fragment

  HOISTED = -1,                // ✅ 已提升 / 缓存静态节点，跳过 diff
  BAIL = -2                    // ✅ 退出优化，需要完整全量 diff
}

```

### 20. 什么是虚拟 DOM？虚拟 DOM 的优缺点？

- 是什么：虚拟 DOM（VNode），就是用普通 JS 对象来描述真实 DOM 的结构、属性、子节点。
- 过程：模板编译生成 render 函数，执行 render 产出 Vnode；之后通过 patch（diff）对比新旧两份 Vnode，算出最小改动，再操作真实 DOM。
- 优点：
  - 减少频繁DOM操作：js 算出最小变动部分，批量真实更新DOM
  - 支持跨平台: 可以渲染到DOM、Canvas、SSR 等
  - 抽象层：方便做编译优化、异步更新调度、批量更新
- 缺点：
  - 额外开销：生成 VNode、diff 对比本身有 JS 计算开销；极端简单场景，手动操作 DOM 会更快
```
{
  type: 'div',
  props: { class: 'box' },
  children: 'hello'
}
```

### 21. Fragment 是什么？解决什么问题？Vue3 为什么能支持多根节点？

- **是什么**：无包裹的多节点片段——组件能返回多个根节点而不引入多余 DOM
- **作用**：免包裹层保布局语义；template v-for / template v-if 多节点
- **机制**：Fragment 类型的 vnode，patch 走「多子节点」分支，首尾空文本锚点定位

- **Vue2 为什么做不到 → Vue3 怎么支持**
  - Vue2 的实例与 patch 都以「唯一根 vnode」为前提：`$el` 要指向一个确定的真实 DOM 根；diff 以单根为入口递归；父透传的 class/style 要自动落到唯一根上
  - Vue3 编译器允许多根，产出一个 `shapeFlag` 为 Fragment 的 vnode，children 是数组
  - patch 遇到 Fragment 走「多子节点」分支（数组 diff），不再要求单一入口；起止位置用 `hostCreateText('')` 生成的首尾空文本锚点定位

### 22. Vue2 和 Vue3 的 diff 算法流程？key 在其中起什么作用？
- **Vue2 口述**：Vue2 使用双端 diff，维护四指针，循环依次做头头、尾尾、旧头新尾、旧尾新头四轮比对，匹配成功就 patch 并且移动指针，命中交叉分支就移动 DOM；四轮都失败就拿着新头的 key 在旧区间查找，找到就挪到旧头前面；循环结束后批量新增或者删除剩余节点；它是找到就立刻移动，无法保证最少移动
- **Vue3 口述**：Vue3 diff 先双端预处理，把两头有序节点先 patch 掉；一边扫完就直接新增或者删除；两边都剩下乱序节点时，建立 key 到新下标的映射，遍历旧节点生成「新局部下标 → 旧下标 + 1」的数组；如果顺序发生变动，求最长递增子序列，得到不需要移动的局部下标；倒序遍历，不在序列里的节点移动，最后完成新增；可以做到理论最少 DOM 移动。
- **Vue2：双端对比**
  - 初始化设置四个指针：旧头、旧尾、新头、新尾；
  - 主循环双端比对四轮
    - 头头匹配，新旧头部相同 → patch，头指针同时后移
    - 尾尾匹配，新旧尾相同 → patch，尾指针同时前移
    - 旧头、新尾匹配，把旧头 DOM 移动到当前旧尾后面，patch，旧头指针后移、新尾指针前移
    - 新头、旧尾匹配，把旧尾 DOM 移动到当前新头前面，patch，新头指针后移、旧头指针前移
  - 如果四轮都没命中，则进行乱序匹配
    - 确定当前新头节点，通过key值在旧剩余区间查找匹配
    - 找到：把对应的DOM 节点移动到旧头前面，把旧数组该位置标记为 undefined，标记为已经复用
    - 找不到：判定为新增节点，直接插入到旧头前面
  - 指针交叉，循环结束
    - 如果还有剩余新节点：新增
    - 如果还有剩余旧节点：删除
  - 局限：移动操作比较粗暴，适合简单列表；长列表、乱序重排性能一般

- **Vue3：预处理 + 最长递增子序列**
  - 预处理：先从头向后，再从尾向前，匹配则指针推进，不匹配则停住
  - 预处理结束，判断边界
    - 旧节点没了，新节点还有：剩余节点全部新增
    - 新节点没了，旧节点还有：剩余节点全部删除
    - 旧节点和新节点都有：进入乱序处理流程
      - 遍历新剩余片段，建立 key → 新全局索引映射表
      - 以新剩余片段长度建立映射数组，填充 0
      - 遍历旧剩余片段，通过key在映射表查找是否匹配
        - 找不到：直接删除旧节点
        - 找到：映射数组[新乱序片段的局部下标]=旧片段的全局下标+1（找不到的为0代表新增）
      - 求最长递增子序列 LIS：返回不需要移动节点的局部下标序列
      - 倒序遍历新节点：从后往前，判断是否属于 LIS
        - 在序列里，不移动
        - 不在：如果为0，新增节点移动到对应位置，否则移动到对应位置
- **例子**
```
      0, 1, 2, 3, 4
旧：[ a, b, c, d, e ]
新：[ a, d, e, b, c ]
```
- Vue2 双端 diff 全过程
  - 双端对比
    - 头头对比匹配（a）, patch(a)
    - 指针变动：
      - newS=1, newStart=d, oldE=4, oldEnd=c
      - oldS=1, oldStart=b, oldE=4, oldEnd=e
  - 乱序第一轮
    - 在旧剩余区间：b, c, d, e 遍历查找
    - 找到，下标为3
    - 旧数组该位置标记为 undefined, 即 [ a, b, c, undefined, e ]
    - 把 d 的 DOM 移动到当前 oldStart（b）前面，patch(d)
    - 指针变动：
      - newS=2, newStart=e newE=4 newEnd=c
      - oldS=1, oldStart=b oldE=4, oldEnd=e
  - 双端对比，头尾对比匹配(e)
    - 把 e 的 DOM 移动到当前 oldStart（b）前面，patch(e)
    - 指针变动：
      - newS=3, newStart=b newE=4 newEnd=c
      - oldS=1, oldStart=b oldE=3, oldEnd=undefined -> oldE=2, oldEnd=c
  - 后续就是patch(b)、patch(c)
  
- Vue3 预处理 + 最长递增子序列 diff 全过程
  - 双端预处理，patch(a)
    - 剩下片段：
      - 旧 [ b, c, d, e ]
      - 新 [ d, e, b, c ] 
    - 头同步指针现在为 1
  - 遍历新剩余片段，建立key → 新全局索引映射表：
  ```
  keyToNewIndexMap = {
    d: 1,
    e: 2,
    b: 3,
    c: 4
  }
  ```
  - 遍历旧剩余片段，建立下标为新乱序片段的局部下标，值为旧片段的全局下标+1的数组（+1是为了避免和全局片段的下标0冲突）
    - 头同步指针为 1
      - key 为 b， 通过 keyToNewIndexMap 找到新全局索引为 3，所以新局部索引为 3-1=2
      - 旧片段的全局索引记录规则为：旧片段的全局索引 +1 = 1 + 1 = 2 
      - 则 newIndexToOldIndexMap[2] = 2
    - 头同步指针为 2
      - key 为 c， 通过 keyToNewIndexMap 找到新全局索引为 4，所以新局部索引为 4-1=3
      - 旧片段的全局索引记录规则为：旧片段的全局索引 +1 = 2 + 1 = 3
      - 则 newIndexToOldIndexMap[3] = 3
    - 头同步指针为 3
      - key 为 d， 通过 keyToNewIndexMap 找到新全局索引为 1，所以新局部索引为 1-1=0
      - 旧片段的全局索引记录规则为：旧片段的全局索引 +1 = 3 + 1 = 4
      - 则 newIndexToOldIndexMap[0] = 4
    - 头同步指针为 4
      - key 为 e， 通过 keyToNewIndexMap 找到新全局索引为 2，所以新局部索引为 2-1=1
      - 旧片段的全局索引记录规则为：旧片段的全局索引 +1 = 4 + 1 = 5
      - 则 newIndexToOldIndexMap[1] = 5
  ```
  newIndexToOldIndexMap = [
    4,   // 局部下标 0 → d，来自旧下标 3 (+1)
    5,   // 局部下标 1 → e，来自旧下标 4 (+1)
    2,   // 局部下标 2 → b，来自旧下标 1 (+1)
    3    // 局部下标 3 → c，来自旧下标 2 (+1)
  ]
  ```
  - 求最长递增子序列 LIS的值为 [4, 5], 对应的局部下标为 [0, 1]
  - 倒叙遍历新中间片段：局部下标：3 → 2 → 1 → 0 c b e d
    - 局部下标3，newIndexToOldIndexMap[3]=c,锚点为：局部下标+1=4，newIndexToOldIndexMap[4]=undefined, 插入末尾
    - 局部下标2，newIndexToOldIndexMap[2]=b, 锚点为：局部下标+1=3，newIndexToOldIndexMap[3]=c, 插入 c 前面
    - 局部下标1，是 LIS 的一个元素，不移动
    - 局部下标0，是 LIS 的一个元素，不移动
- **vue2 diff 伪代码**
```
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  const oldStartVnode = oldCh[oldStartIdx]
  const oldEndVnode = oldCh[oldEndIdx]
  const newStartVnode = newCh[newStartIdx]
  const newEndVnode = newCh[newEndIdx]

  // 四轮匹配，省略……
  if (sameVnode(oldStartVnode, newStartVnode)) {
    // ...
  } else if (sameVnode(oldEndVnode, newEndVnode)) {
    // ...
  } else if (sameVnode(oldStartVnode, newEndVnode)) {
    // ...
  } else if (sameVnode(oldEndVnode, newStartVnode)) {
    // ...
  } else {
    // ========== 四轮全部没命中，进入这里 ==========
    // 拿新头的 key，去旧剩余区间找
    const idxInOld = findIdxByKey(oldCh, oldStartIdx, oldEndIdx, newStartVnode.key)

    if (idxInOld === undefined) {
      // ✦ 在旧里面找不到：全新节点，插到 oldStart 前面
      createElm(newStartVnode, parentElm, oldStartVnode.elm)
    } else {
      // ✦ 在旧里面找到了这个节点
      const vnodeToMove = oldCh[idxInOld]
      // 标记这个位置：已经被挪走，后续不再处理
      oldCh[idxInOld] = undefined
      // 把找到的这个真实 DOM，移动到旧头的前面
      parentElm.insertBefore(vnodeToMove.elm, oldStartVnode.elm)
      // patch 更新节点本身
      patch(vnodeToMove, newStartVnode)
    }
    // 新头指针往后走
    newStartIdx++
  }
}
function findIdxByKey(list, l, r, key) {
  for (let i = l; i <= r; i++) {
    if (list[i] && list[i].key === key) {
      return i
    }
  }
}

function sameVnode(a, b) {
  return a.key === b.key && a.tag === b.tag
}
```

## 八、Vue Router 路由

### 23. hash 模式和 history 模式的原理与区别？history 需要后端怎么配合？

- **hash**：监听 hashchange，# 后变化不发请求，兼容好
- **history**：pushState/replaceState 改路径，美观、SEO 友好；但刷新会真请求路径——后端必须 try_files 兜底 index.html，否则 404（https://xxx/user/xxx）

- **history 404 的根因**
  - 深链刷新时浏览器把 `/user/123` 当真实资源请求服务器，服务器没这文件就 404
  - Nginx 用 `try_files $uri $uri/ /index.html` 兜底；history 模式下这条是必须项


### 24. 动态路由与 addRoute 的使用场景？

- 区分：
  - 静态路由：写死在代码，初始化直接传入 createRouter，所有人都能访问
  - 动态路由：不是写死，等拿到用户权限之后，调用 `addRoute` 注册可访问路由，beforeEach 校验「有 token 但路由未注册」先补注册再放行
- 核心场景：
  - 权限路由：登录之后，根据后端返回的权限菜单、权限标识，动态生成路由
  - 按需加载业务模块：某些独立业务模块，进入特定条件才加载对应的路由配置
  - 页面配置化（低代码）：后端配置页面，返回路由信息，前端运行时注册
  - 避免路由过大：路由不一次性全部注册
- 核心 API：
  - `router.addRoute(route)` / `router.removeRoute(name)`：登录后拉权限表，过滤出可访问路由逐条注册
  - `router.hasRoute()` 判断是否已注册（热更新、重复登录场景）

## 九、状态管理 Pinia / Vuex

### 25. Pinia 和 Vuex 的区别？核心概念与常用实例方法？

- **四个优势**：去 mutation（直接改/action 统一）、完整 TS 推导、模块扁平无命名空间、代码分割友好
- **三件套**：state / getters / actions——同步异步都写 action
- **实例方法**：$patch 批量改、$reset 重置、$subscribe / $onAction 订阅

- **结构对照**

| Vuex                | Pinia                        | 说明                                           |
| ------------------- | ---------------------------- | ---------------------------------------------- |
| state               | state / setup 里 ref         | 单一状态树                                     |
| getters             | getters / computed           | 派生值，带缓存                                 |
| mutation + action   | 只有 action                  | **异步同步都写 action**，mutation 概念移除     |
| modules + namespace | defineStore 每个域一个 store | 无嵌套、无命名空间，store 之间直接 import 复用 |

- **四个优势（答全就是高级水平）**
  - 去 mutation：直接改 state 或在 action 里改，少一层 commit 样板
  - 完整 TS 推导：defineStore 的类型自动流转，Vuex 的 dispatch 字符串类型是黑洞
  - 模块化天然扁平：每个 store 独立，跨 store 直接调用，不用 registerModule
  - 代码分割友好：只 import 用到的 store，Tree-Shaking 生效

- **什么规模才需要状态库**
  - 跨页面/跨组件树共享的登录态、权限、字典数据才进 store；组件内状态别往上放

- **实用实例方法（高频追问）**
  - `$patch(obj 或函数)`：批量修改；传对象、传函数**都只触发一次**订阅回调——传对象是浅合并（嵌套对象会被整个替换），传函数能逐属性精确修改深层状态
  - `$reset()`：恢复初始 state——**只有 Options 式 store 自带**；Setup 式要自己封装（保存初始快照，重置时逐项赋值）
  - `$subscribe` 监听 state 变化（配 `detached` 脱离组件作用域，持久化场景常用）
  - `$onAction` 监听 action 调用，做统一日志/错误上报；action 里改 state 与外部直接改效果一致，区别只在「入口集中、可被观测」

- **配套代码对照**

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

- 两种 store 写法：Options 式（state/getters/actions）与 Setup 式（setup 里写 ref/computed/function）——Setup 式更贴近组合式 API，但失去内置 `$reset`（见上文「实用实例方法」）
- store 本身是 reactive 对象，**解构会断响应**——要用 `storeToRefs` 取 state/getters
- SSR 下 Pinia 实例必须按请求创建，否则多个请求共享同一份 state（污染）

## 十、性能优化

### 26. Vue 项目有哪些性能优化手段？（编码 / 运行时 / 打包三层）

- **编码层**：少算少更新——computed 缓存、稳定 key、动静拆分
- **运行时层**：少代理少渲染——shallowRef/markRaw、keep-alive、v-memo、虚拟滚动
- **打包层**：少下载快到达——懒加载分包、按需引入、Tree-Shaking、CDN 强缓存
- **分界**：打包层决定首屏，前两层决定交互流畅度

- **编码层：少算、少更新**
  - 计算量靠 computed 缓存来降：模板里直接调方法每次渲染都要重算，computed 依赖不变就返回缓存
  - 更新量靠「缩小动态范围」来降：v-if/v-show 按切换频率选型、组件按动静拆分让静态部分不进 diff、key 稳定避免错位重 patch
  - 这一层收益是**乘法式**的：省掉的计算与无效更新会在每次交互里重复兑现，且几乎零维护成本

- **运行时层：少代理、少渲染**
  - 代理成本：大数据只读场景用 shallowRef / markRaw / Object.freeze，避免深层递归建 Proxy
  - 渲染成本：keep-alive 缓存页面实例、v-memo 命中时整棵子树跳过 diff、长列表用虚拟滚动只渲染可视区
  - 这一层解决的是「数据量 / 节点数过大」的**规模问题**，编码层的写法优化解决不了

- **打包层：少下载、快到达**
  - 体积：路由懒加载 + 异步组件分包、组件库按需引入、Tree-Shaking 删除未引用导出
  - 到达速度：静态资源 CDN + 文件名 hash 的强缓存（内容变才换名）、图片懒加载与压缩
  - 先测量再动手：visualizer 找「意料之外的大依赖」，否则容易优化了本来就不大的部分
  - 三层的边际收益不同：打包层决定**首屏**，编码/运行时层决定**交互流畅度**——问「首屏慢」优先谈打包与资源，问「卡顿」优先谈运行时
  - v-memo 不是免费的：依赖数组要逐项比较，且命中要求「依赖引用不变」，数据整体替换时收益归零
  - 编码层最容易被忽略的「computed 替代模板方法调用」这种小事，收益随渲染次数线性放大
  - 回答时主动说「我会先测量」：performance / Lighthouse 先定位是包大、首屏阻塞还是长任务，再选对应层

### 27. 路由懒加载与异步组件怎么实现？代码分割的两个粒度？

- **同源机制**：动态 import 是「构建工具可静态分析的分割点」→ 拆独立 chunk，运行时才请求
- **两个粒度**：路由懒加载 = 页面级（`component: () => import(...)`）；异步组件 = 组件级（defineAsyncComponent，配 loading/error/超时）

- **实现**
  - 路由级：`component: () => import('./views/User.vue')`；webpack 分组用魔法注释 `/* webpackChunkName: "user" */`，Vite 按文件名自动分包
  - 组件级：`defineAsyncComponent(() => import('./X.vue'))`，配 loading/error/超时：

| 选项                              | 作用                                |
| --------------------------------- | ----------------------------------- |
| loader                            | 返回 Promise 的加载函数             |
| loadingComponent / errorComponent | 加载中/失败的占位组件               |
| delay / timeout                   | loading 延迟出现时间 / 超时报错时间 |

- 首次到达路由/首次渲染组件时才执行 loader，加载期间渲染占位，resolve 后替换为真实组件

- **共同原理**
  - 动态 import 返回 Promise，打包器（Vite / Rollup / Webpack）看到它就拆成独立 chunk，运行时才发请求
  - 同一模块被多处引用有模块缓存，只下载一次；粒度选择：页面级靠路由、页面内低频重组件靠 defineAsyncComponent

- **选型、坑与加载态统一（Suspense）**
  - 该用：首屏外重组件（富文本、图表库、低频弹窗）、权限组件（无权限时连代码都不下载）
  - 不该用：首屏必需组件——多一次网络往返反而拖慢首屏；碎组件拆包会放大请求数，按「页面/功能域」分组而不是按组件
  - chunk 加载失败（发版后旧文件被删）要配错误兜底，否则用户停在白屏
  - 只解决「下载时机」，不解决「渲染时机」：首屏路由本身仍要同步下载，可用预加载（`<link rel="prefetch">`）折中
  - Suspense 统一加载态：默认插槽放异步组件、`#fallback` 放加载态——被包住的异步依赖**递归收集、全部就绪**才切换；也接得住 async setup（顶层 await）组件；仍属实验性，错误处理配 onErrorCaptured
  - `delay` 的存在是为了**防闪烁**：请求很快时不闪 loading，慢过阈值才显示——能讲出动机比背选项更像用过
  - Suspense 的限制：多个异步子组件必须全部就绪才切换——做「整体 loading」方便，「部分就绪先显示」做不到
  - 异步组件 + keep-alive 组合：缓存的是已加载实例，切回不再触发加载——省流量但可能错过代码更新
  - 加载失败可配 errorComponent + `onError` 回调做重试与上报

### 28. 打包层面如何优化 Vue 项目体积？Tree-Shaking 的前提？

- **手段**：visualizer 先定位 → 按需引入、分包、Tree-Shaking、手动拆包
- **三个前提**：ESM 静态结构 + sideEffects 标记 + 生产压缩器删除——缺一不可

- **先定位体积从哪来**
  - rollup-plugin-visualizer 生成体积分布图，找「意料之外的大依赖」：整包引入的组件库、全量图标、未拆分的工具库
  - 没有测量就优化，常见结果是优化了占比很小的部分，还引入了新复杂度

- **手段分两类：减总量、拆总量**

| 手段                         | 做法                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| 按需引入组件库               | unplugin-vue-components 自动按需导入（全量 import 组件库是体积灾难） |
| 路由/组件懒加载              | 动态 import 分包，首屏只带必需 chunk                                 |
| Tree-Shaking                 | 删除未引用导出（前提见 ③）                                           |
| 构建分析                     | rollup-plugin-visualizer 找大依赖                                    |
| 手动拆包                     | manualChunks 把稳定的第三方库拆出，利于长缓存                        |
| 关闭生产 sourcemap、启用压缩 | 默认项确认不遗漏                                                     |

- 「减总量」：按需引入 + Tree-Shaking 直接减少字节
- 「拆总量」：分包不减少总字节，但让首屏只下载必需部分，且稳定库能长缓存

- **Tree-Shaking 的三个前提（必考）**
  - **ESM**：import/export 是静态结构，构建期可分析依赖图；CommonJS 动态 require 无法摇
  - **sideEffects 标记**：package.json 里 `"sideEffects": false`（或列出有副作用的文件）——告诉打包器「没被引用的模块删掉不影响行为」；未标记时打包器不敢删，怕副作用丢失
  - **生产模式**：摇树只标记未引用代码，真正的删除由压缩器（Terser/esbuild）完成
  - 「按需引入」的本质不是语法问题：库的入口文件把所有组件 import 了一遍，即使每个组件都有 ESM 导出，从入口全量 import 仍会全打包——unplugin 让每个组件有独立入口、按真实使用导入
  - 分包配合长缓存：文件名带 content hash，第三方库单独成 chunk 后，业务代码改动不会让它失效
  - 体积 ≠ 加载性能：chunk 过多会抬高请求数，HTTP/2 下影响变小但仍要平衡——不要为分包而分包
  - 典型「摇不掉」的坑：模块顶层执行了副作用（注册全局组件、打补丁），sideEffects 标成 false 反而会让它整块消失

## 十一、开放类（工程思考）

### 29. 过往项目中 Vue 技术栈遇到的最大技术难点是什么，怎么解决的？

- **难点定位**：异步竞态治理——「异步时序 + 框架副作用机制 + 状态归属」三者叠加，偶现难复现
- **方案两层**：治错序（序号标记位 → watch onCleanup）+ 控并发（防抖 + 请求池）
- **收尾**：沉淀成组合式函数 useSearch/useList，新列表页默认正确

- **定位问题：现象、根因判断与目标**
  - 场景：移动端 H5 大量「输入触发请求」——搜索联想、筛选列表、多 tab 切换
  - 现象：快速输入时列表先显示新数据、又「跳回」旧数据——**慢的旧响应后到，覆盖了新结果**
  - 根因判断：不是接口错，而是「谁最后写状态」没有约束；这类 bug 代码看着没问题、偶现且难复现
  - 目标：看到的永远是**最新一次请求**的结果；不引入过重的取消逻辑；弱网下控并发

- **方案分层：治错序、控并发**
- **治错序：序号标记位 → onCleanup（主线）**

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
// ⚠️ onCleanup 不是 watch 的 options，是回调的第三个参数
watch(keyword, async (kw, prev, onCleanup) => {
  let expired = false
  onCleanup(() => { expired = true })  // 每次依赖变化、重新执行前，Vue 先跑上一轮注册的清理
  const res = await fetchList(kw)
  if (expired) return       // 过期响应 → 丢弃
  list.value = res
})
```

- 要点：**「上轮失效」由框架保证时机**，不靠人的自觉，也不怕清理漏掉

- **控并发：防抖 + 请求池**

```js
// 防抖降频 ≠ 解决竞态，两者必须组合（onCleanup 仍是回调第三参，不是 options）
const debouncedKw = useDebounce(keyword, 300)
watch(debouncedKw, (kw, prev, onCleanup) => {
  let expired = false
  onCleanup(() => { expired = true })
  run(kw, () => expired)   // run 内部写状态前先检查 expired
})

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

- **落地与取舍**
  - 结果：错序类反馈归零；「onCleanup + 防抖 + 请求池」沉淀为组合式函数 `useSearch` / `useList`，新列表页**默认正确**，不再靠踩坑
  - 取舍：选「丢弃过期结果」而非 AbortController——目标是「过期不展示」，标记位更轻；真要省流量/打断上传才用 Abort，两者不冲突
  - 收尾：难在把散点的坑收敛成**默认正确的复用单元**——第二个人写列表页时不需要懂竞态，也不会写错
  - 讲这段要带「发现路径」：先在网络面板看到旧响应晚到，才反推「状态被覆盖」——面试官要的是排查过程，不只是方案
  - 两层方案是正交的：错序治理解决「顺序」，请求池解决「并发挤占带宽」，缺一个都会在弱网暴露
  - 序号标记位的边界：组件卸载或换页后过期响应仍可能写回已废弃的状态，onCleanup 顺着作用域销毁跑清理更可靠
  - 能延伸一句「读请求可丢弃、写请求要幂等补偿」——竞态治理不止前端丢结果，写操作要靠幂等键兜底

- **追问预判（逐层递进）**

| 追问                         | 答法                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| 为什么不用 AbortController？ | 目标是「过期不展示」，标记位/onCleanup 更轻；真取消（省流量、打断上传）才用 Abort，两者不冲突 |
| onCleanup 原理？             | watch 每轮回调执行前先跑上轮注册的清理函数，「上轮失效」由框架保证                            |
| 防抖能解决竞态吗？           | 不能，只降频；间隔超过防抖窗口照样乱序，必须组合                                              |
| 怎么复现/测试？              | mock 接口加随机延迟（前慢后快）；单测 fake timers 控时序                                      |
| 具体哪里的列表？             | 面试前填自己的真实场景（联想/筛选具体页面）                                                   |
