# Vue3 原理

> 本篇所有 `摘自` 代码块来自配套的最小实现 `code/vue3/mini-vue`（零依赖、可运行、26 个单测）——正文每讲一个机制，就落到对应源码上解析一次；运行方式见篇末「配套代码」。

## 一、Vue3 整体架构

Vue3 采用**模块化 + 分层**设计，核心包按职责可以划分为三大类地图：

> 示意片段（无配套脚本）

```
Vue3 包结构
├── 编译模块（把源码/模板编译成 render 函数）
│   ├── @vue/compiler-core  编译核心（平台无关）
│   ├── @vue/compiler-dom   浏览器编译扩展
│   └── @vue/compiler-sfc   单文件组件（.vue）编译
│
├── 运行时模块（真实执行 Vue 应用的地方）
│   ├── @vue/runtime-core  运行时核心（平台无关）
│   └── @vue/runtime-dom   浏览器运行时
│
└── 响应式模块
    └── @vue/reactivity    独立的响应式系统，可脱离 Vue 单独使用
```

### 1.1 模块之间的协作关系

> 示意片段（无配套脚本）

```
源码(.vue / render 函数)  --编译-->  render 函数（返回 VNode）
                                          │
                                  运行时(runtime)
                                   │         │
                         响应式(reactivity)  │
                              │              │
                            数据变化  --触发更新-->  更新真实 DOM
```

- **编译模块**负责将模板"翻译"为 `render` 函数。
- **运行时模块**拿到 `render` 函数，创建虚拟 DOM 并挂载/更新到真实 DOM。
- **响应式模块**为数据提供变更追踪能力——数据一变，运行时便知道要重新渲染哪些组件。

三者的关系一句话总结：**用编译换说法、用响应式驱动、用运行时落地**。

### 1.2 编译模块：compiler-core / compiler-dom / compiler-sfc

三者是"核心 + 平台扩展 + 场景包装"的关系：

| 包 | 作用 | 平台相关性 |
| --- | --- | --- |
| `@vue/compiler-core` | 编译器核心，把字符串模板解析为 AST，再经过 AST 转换（如静态标记），最终生成 `render` 函数代码 | 与平台无关 |
| `@vue/compiler-dom` | 基于 compiler-core，补充浏览器特有语法（`v-html`、`v-text`、SVG 标签处理等），生成适配浏览器运行时的 `render` | 浏览器 |
| `@vue/compiler-sfc` | 解析 `.vue` 单文件组件，提取 template / script / style 三个块，处理 `<script setup>` 语法糖与 scoped 样式 | 打包期 |

`compiler-sfc` 处理 `.vue` 文件的核心能力：

- 拆分 `template`、`script`、`style` 三个代码块。
- 将 `<script setup>` 语法糖编译为普通 `setup` 函数。
- 处理样式的 `scoped` 作用域（为选择器添加 `data-v-xxx` 属性）。
- 集成 less / sass 等样式预处理器。
- 组合 template 与 script，生成组件最终代码。

`compiler-core` 的核心工作流程，贯穿"模板 → AST → 代码生成"：

1. 模板解析：将字符串模板解析为抽象语法树（AST）。
2. AST 转换：做各种优化，例如**静态节点标记**（见下文编译原理）。
3. 代码生成：将 AST 转换成可执行的 `render` 函数代码字符串。
4. 编译选项处理：如支持通过 `delimiters` 自定义插值分隔符。

> 官方提供了可视化编译工具的在线地址，可以直观看到不同模板编译后的 `render` 输出：`https://template-explorer.vuejs.org`

### 1.3 运行时模块：runtime-core / runtime-dom

同样遵循"核心 + 平台补丁"的套路：

| 包 | 作用 | 平台相关性 |
| --- | --- | --- |
| `@vue/runtime-core` | 运行时核心，与平台无关：组件实例化、VNode 创建/挂载/更新/卸载、生命周期、props/插槽、provide/inject、响应式集成 | 与平台无关 |
| `@vue/runtime-dom` | 基于 runtime-core，补充浏览器宿主能力：真实 DOM 增删改、事件绑定、class/style 映射、`function createDomRenderer` 以及默认的 `createApp` | 浏览器 |

关键点：

- `runtime-dom` 通过 `createRenderer({...宿主操作})` 把**自定义渲染器接口函数**注入 `runtime-core`，并 `export * from "runtime-core"` 二次导出核心 API。
- `runtime-dom` 提供默认 `createApp`（内部调用 `createRenderer`），其返回包含 `createApp`、`mount` 的对象。
- **`runtime-core` 是 Vue3 最核心的模块，其他平台相关运行时都基于它扩展**——这也是 Vue 能支持客户端渲染（DOM）、服务端渲染（SSR）、小程序等多端的原因。

### 1.4 响应式模块：reactivity

`@vue/reactivity` 是完全独立的响应式模块，可以脱离 Vue 单独使用（例如用在纯状态管理 / 原生 JS 项目中）。

核心能力：

- 基于 Proxy 创建响应式对象（`reactive`、`ref`、`shallowRef` 等）。
- 依赖收集 `track` 与触发更新 `trigger`。
- 计算属性 `computed` 与侦听器 `watch`。
- 嵌套响应、只读 / 浅响应（`readonly` / `shallowReadonly` / `shallowReactive`）等特性。

## 二、编译原理

### 2.1 SFC 单文件组件解析

`compiler-sfc` 把 `.vue` 文件当作一个"容器"，按块切割：

> 示意片段（无配套脚本）

```vue
<template>
  <!-- 模板块：交给 compiler-core 编译成 render -->
  <div>{{ msg }}</div>
</template>

<script setup>
// 脚本块：`<script setup>` 会被编译成普通 setup 函数
const msg = ref("hello");
</script>

<style scoped>
/* 样式块：scoped 会为选择器追加 data-v-xxx 属性 */
</style>
```

三个块各走各的处理管线，最后打包器（如 vite）会把这几个产物合并成一个组件对象，交给运行时使用。

### 2.2 模板 → AST → render 函数

`render` 函数的本质是"用 JS 描述模板长什么样"的工具函数，它是编译与运行时之间的桥梁：

> 示意片段（无配套脚本）

```js
// 模板：<div>{{ msg }}</div>
// 编译后大致得到这样的 render 函数（Vue 内部返回 VNode）
import { toDisplayString, createElementVNode as _createElementVNode } from "vue";

function render(_ctx, _cache) {
  return _createElementVNode("div", null, toDisplayString(_ctx.msg), 1);
}
```

编译的三个阶段：

1. **解析（parse）**：把模板字符串解析成 AST。
2. **转换（transform）**：对 AST 做优化（递归遍历节点，标记静态节点、缓存动态绑定等）。
3. **代码生成（generate）**：把 AST 转换为可执行的 JS 代码字符串。

### 2.3 静态节点标记优化

Vue 在编译期会给节点打上 `PatchFlags`（补丁标记），运行时据此决定是否需要精细的 diff。标记的关键思想：

- **判断节点是否"动态"**：只有动态节点（含插值、指令、绑定等）才需要更新时对比。
- **标记为静态节点 / 提升静态内容**：此类节点不参与更新、甚至只创建一次。

> 示意片段（无配套脚本）

```
节点类型划分：
<div>            <!-- 静态：无需更新 -->
<p>{{ count }}</p> <!-- 动态：含插值，标记需要 patch -->
```

在 mini-vue / 源码实现里，这一优化体现在 `render` 函数返回的 `VNode` 上：

> 示意片段（无配套脚本）

```js
// 形如 createElementVNode 后的补丁标记参数
// 位 1 表示内部含动态文本，需要按动态内容处理
_createElementVNode("p", null, toDisplayString(count), 1);
```

**静态节点标记带来的收益**：更新时只对比真正可能变化的动态节点，大量静态 DOM 直接跳过，显著提升更新性能。这也是 Vue3 相比 Vue2 在编译层做出的重要性能优化。

> 学习提示：可以用官方 `template-explorer` 在线工具，输入不同模板（插值、`v-if`、`v-for`、静态节点）查看生成的 `render` 代码和 patch flag，直观理解优化点。

## 三、响应式系统

`@vue/reactivity` 是整个框架的灵魂。它的核心是三个 API：`reactive` / `ref`（创建响应式）、`track`（收集依赖）、`trigger`（触发更新）。

依赖收集的整体数据结构（`targetMap`）如下：

> 示意片段（无配套脚本）

```
targetMap (WeakMap)
│
├── 响应式对象1 (target)
│   └── depsMap (Map)
│       ├── key: "count"
│       │   └── dep (Set: [effect1, effect2])
│       └── key: "user"
│           └── depsMap (Map)
│               └── key: "name"
│                   └── dep (Set: [effect3])
│
└── 响应式对象2 (另一个 target)
    └── depsMap (Map)
        └── ...
```

即：**WeakMap(对象) → Map(属性) → Set(effect 集合)**。

### 3.1 reactive：对象代理

`reactive` 把普通对象包装成 Proxy，返回的**不是原对象**。

基本特性：

- **深度响应式**：嵌套对象在访问时自动变为响应式。
- **数组支持完善**：数组操作完全响应式。
- **集合类型支持**：Map、Set 等也支持响应式。
- **属性检测全面**：可检测属性添加 / 删除。

核心实现分两层。

一是代理创建与**缓存**（`reactive.ts`）。缓存那三行是必须的：同一对象每次访问都新建 Proxy，依赖就会收集到不同的 dep 上，触发时自然对不上号。

> 摘自 `./code/vue3/mini-vue/src/reactivity/reactive.js`

```js
    const existing = reactiveMap.get(target)
    if (existing) return existing

    const proxy = new Proxy(target, mutableHandlers)
    reactiveMap.set(target, proxy)
    return proxy
```

**为什么用 WeakMap 存依赖？**

- WeakMap 的键**必须是对象**：正好符合"响应式对象 → 依赖"的映射场景。
- **弱引用**：当原对象不再被外部引用时，WeakMap 中的键值对可以被垃圾回收自动清理，**避免内存泄漏**，不需要手动删除。

> 示意片段（无配套脚本）

```js
const weakMap = new WeakMap();
const obj = {};
weakMap.set(obj, "依赖集合"); // ✅ 键可以是对象

let target = { data: "test" };
weakMap.set(target, { deps: new Set() });
target = null; // 解除引用后，键值对会被 GC 自动清理
```

二是 `baseHandlers.ts`，定义 get / set 拦截逻辑（`mutableHandlers`）。getter 里做了两件事：收集依赖、把"值是对象"的属性继续代理——后一件事是**惰性**的，不是一开始就递归遍历整棵树：

> 摘自 `./code/vue3/mini-vue/src/reactivity/reactive.js`

```js
function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
        if (key === ReactiveFlags.IS_READONLY) return isReadonly

        const result = Reflect.get(target, key, receiver)

        // readonly 的对象永远不会被 set，收集依赖没有意义
        if (!isReadonly) track(target, key)

        if (isShallow) return result
        // 深度响应式：遇到对象才继续代理（惰性）
        if (isObject(result)) return isReadonly ? readonly(result) : reactive(result)
        return result
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]
        const result = Reflect.set(target, key, value, receiver)
        if (!Object.is(oldValue, value)) trigger(target, key)
        return result
    }
}
```

同样可以用拦截器扩展出 `deleteProperty`（删除拦截）、`has`（`in` 操作符）、`ownKeys`（`Object.keys()`）等拦截逻辑，让响应式覆盖**属性的增删、枚举、存在性检测**各种操作：

> 示意片段（无配套脚本）

```js
const handlers = {
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (hadKey && result) {
      trigger(target, key, "delete");
    }
    return result;
  },
  // 拦截 in 操作符
  has(target, key) {
    track(target, key);
    return Reflect.has(target, key);
  },
  // 拦截 Object.keys() 等操作
  ownKeys(target) {
    track(target, "iterable");
    return Reflect.ownKeys(target);
  },
};
```

### 3.2 依赖收集 track

`track` 做的事情就是"建表"——`targetMap`（对象）→ `depsMap`（属性）→ `dep`（effect 集合），三层逐级补空：

> 摘自 `./code/vue3/mini-vue/src/reactivity/effect.js`

```js
function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读属性，不需要收集

    if (!debugRegistry.includes(target)) debugRegistry.push(target)

    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))

    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)
        activeEffect.deps.push(dep) // 反向索引：effect 记下自己进过哪些 dep，stop 时要清理
    }
}
```

两个容易忽略的设计：**`deps` 是反向索引**——每个 effect 记下自己进过哪些 dep，`stop()` 时才知道要退订哪些；**依赖收集只认"读过"**——一个属性被改了两次都没人理，只要那一刻它还没被任何 effect 读到（配合惰性代理，等 `state.nested` 被读一次才建立联系）。

### 3.3 触发更新 trigger

`trigger` 把之前收集到的 effect 全部取出来依次执行。只有几行，但有两个细节值钱：**遍历前先复制一份**，因为 effect 执行过程中可能增删集合；**跳过自己**，避免"在 effect 里改自己依赖的数据"导致死循环：

> 摘自 `./code/vue3/mini-vue/src/reactivity/effect.js`

```js
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return

    // 复制一份再遍历：effect 执行过程中可能修改集合
    for (const _effect of [...dep]) {
        if (_effect === activeEffect) continue // 别把自己叫醒（真实 Vue 是 allowRecurse 控制）
        if (_effect.scheduler) _effect.scheduler()
        else _effect.run()
    }
}
```

注意 `scheduler` 的意义：**它让用户（框架）可以自己决定副作用何时执行**。Vue 内部正是借助 `scheduler` 把多次更新合并到下一个微任务中执行，实现异步批量渲染（见四.5 的 `queueJob`）。

### 3.4 effect：副作用函数

`effect` 是响应式系统的"发动机"，理解它是理解 `computed` / `watch` 的前置条件。

基本特性：

1. **包装副作用函数**：`effect(fn)` 包装一个会读取响应式数据的函数。
2. **自动依赖追踪**：首次执行 `fn` 时，访问到的每个响应式属性都会被"记住"。
3. **响应式触发**：被追踪属性变化时，自动重新执行依赖它的所有 `effect`。
4. **调度控制**：可通过 `options.scheduler` 自定义执行时机。
5. **惰性执行**：`options.lazy` 为 `true` 时禁用初始执行，返回运行器手动触发（`computed` 内部使用）。
6. **返回运行器函数**：可手动强制触发一次。
7. **停止侦听**：运行器上的 `.stop()` 可清除依赖关系，防止内存泄漏（组件卸载时 Vue 会自动停止相关 effect）。

核心实现（`effect.ts`）。`effect` 负责"把函数包成可被追踪的东西"，做三件事：入栈、**先清掉旧依赖再执行**、出栈：

> 摘自 `./code/vue3/mini-vue/src/reactivity/effect.js`

```js
const targetMap = new WeakMap()
const effectStack = []
let activeEffect = null

// 教学用：WeakMap 无法遍历，另存一份强引用只为了把依赖关系打印出来（生产实现不需要）
const debugRegistry = []

class ReactiveEffect {
    constructor(fn, scheduler) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = [] // 反向记录：我依赖了哪些 dep（stop 时要清理）
        this.active = true
    }

    run() {
        if (!this.active) return this.fn() // 已停止的 effect 仅执行，不收集依赖
        try {
            effectStack.push(this)
            activeEffect = this
            cleanupEffect(this) // 先清掉旧依赖：分支切换时才不会漏掉旧分支
            return this.fn()
        } finally {
            effectStack.pop()
            activeEffect = effectStack[effectStack.length - 1] || null
        }
    }

    stop() {
        if (!this.active) return
        cleanupEffect(this)
        this.active = false
    }
}

function cleanupEffect(effect) {
    for (const dep of effect.deps) dep.delete(effect)
    effect.deps.length = 0
}
```

两个容易忽略的设计：**用栈而不是单个变量**——effect 里可能再跑 effect（computed 的 getter、子组件渲染），栈才能恢复外层；**`cleanupEffect` 决定的是正确性而非优化**——effect 里写 `flag ? a : b`，切到 `b` 分支后如果 `a` 的依赖还在，改 `a` 会触发一次结果完全没变的渲染。清理后重新收集，依赖表才始终等于"这次真正读了什么"。

**stop 的实现思路**：`track` 时 `effect.deps.push(dep)` 保存了它关联的所有依赖集合，`stop` 时遍历这些集合把 `effect` 删除，于是属性变化不再触发它。这就是 `onMounted` 中创建的 effect 在组件卸载后被释放的原理。

### 3.5 ref：基本类型响应式

`reactive` 无法直接代理基本类型，`ref` 通过"把值包进一个对象再代理"解决这个问题。

基本特性：

- **任何类型**：可包裹基本类型和引用类型。
- **深层响应式**：值为对象时自动转成 `reactive`。
- **保持引用**：`.value` 始终指向同一个引用。

`RefImpl` 类是其核心：定义了 `get value` / `set value`，通过 `trackRefValue` / `triggerRefValue` 收集与触发依赖。

> 示意片段（无配套脚本）

```js
export class RefImpl {
  private _rawValue; // 原值
  private _value;    // 新值（对象会被 reactive 包裹）
  public dep;        // 依赖集合
  public __v_isRef = true;

  constructor(value) {
    this._rawValue = value;
    // 值如果是对象，用 reactive 包裹（toReactive / convert）
    this._value = value !== null && typeof value === "object" ? reactive(value) : value;
    this.dep = createDep();
  }

  get value() {
    // 读取：收集依赖
    trackRefValue(this);
    return this._value;
  }

  set value(newValue) {
    // 值真的变了才触发依赖
    if (hasChanged(newValue, this._rawValue)) {
      this._value = newValue !== null && typeof newValue === "object" ? reactive(newValue) : newValue;
      this._rawValue = newValue;
      triggerRefValue(this);
    }
  }
}

export function triggerRefValue(ref) {
  triggerEffects(ref.dep);
}
```

`__v_isRef = true` 标记被 `isRef` 使用：

> 示意片段（无配套脚本）

```js
export function isRef(value) {
  return !!value.__v_isRef;
}
```

### 3.6 unref 与 proxyRefs：自动解包

`unref` 是一个语法糖：是 ref 就返回 `.value`，否则返回本身。

> 示意片段（无配套脚本）

```js
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}
```

`proxyRefs` 用 Proxy 包装对象，实现**读取 / 设置时自动解包 ref**——这正是模板里写 `count` 而非 `count.value` 的原因：

> 示意片段（无配套脚本）

```js
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    // 是 ref 就返回 .value
    return unRef(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    // 旧值是 ref、新值不是 ref：更新旧 ref 的 .value
    if (isRef(oldValue) && !isRef(value)) {
      return (target[key].value = value);
    }
    return Reflect.set(target, key, value, receiver);
  },
};
```

`proxyRefs` 只解包**第一层** ref（浅层），对象中嵌套的 ref 不会递归解包。

### 3.7 computed：惰性计算与缓存

`computed` 基于 `lazy` 的 `ReactiveEffect` 实现，核心是"一个布尔值 + 一处调度"——**依赖变化时不重算，只置脏 + 通知；真正算什么时候算，由"有人来读"决定**：

> 摘自 `./code/vue3/mini-vue/src/reactivity/computed.js`

```js
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty) return // 已经是脏的，不用再通知一遍
            this._dirty = true
            trigger(this, 'value') // 叫醒依赖方，它们会在读 value 时触发重算
        })
```

> 摘自 `./code/vue3/mini-vue/src/reactivity/computed.js`

```js
    get value() {
        if (this._dirty) {
            this._value = this.effect.run() // 重算时才真正执行 getter
            this._dirty = false
        }
        track(this, 'value')
        return this._value
    }
```

工作流程：

1. **首次访问**：`_dirty` 为 true，执行 getter 计算并缓存；随后 `_dirty` 置 false。
2. **依赖未变**：`_dirty` 仍为 false，直接返回缓存值，getter 不重复执行。
3. **依赖变化**：getter 内部的响应式数据触发 computed 的 scheduler，`_dirty` 置 true 并叫醒依赖 computed 的 effect。
4. **再次访问**：`_dirty` 为 true 则重新计算，否则继续用缓存。

观察脚本里的 `getterCalls` 计数器把"惰性"看得最清楚：

```
==== 4. computed：惰性求值 + 缓存 ====
  第一次读 total = 20，getter 调用 1 次
  再读一次   total = 20，getter 调用 1 次（命中缓存）
  改了依赖但没读：getter 调用 1 次（不立刻重算，只置脏）
  读的时候才算   total = 30，getter 调用 2 次
```

这就是 computed 的**依赖追踪 + 缓存 + 惰性**三大特性的来源。

### 3.8 watch

`watch`（侦听器）本质上是 `effect` 的封装：它对一个"源"（getter 或 ref）建立副作用，当源发生变化时执行回调。实现思路：

- 对响应式源执行一次读取（触发 `track`），从而把 effect 与源建立关联。
- 源变化触发 `trigger` 时，经 `scheduler` 回调去执行用户传入的 `cb`。
- 支持 `immediate`、`deep`、`flush` 等选项，分别对应立刻执行、深度监听、控制执行时机。

> 在 mini-vue 中 `watch` 是建立在 `ReactiveEffect` 之上的组合能力，与 `computed` 共享同一套收集 / 触发机制。

### 3.9 readonly / shallowReadonly：只读与浅响应

`readonly`：**深度只读**，所有层级的修改都失败（控制台警告）。

> 示意片段（无配套脚本）

```js
const state = reactive({ count: 0, user: { name: "Alice", profile: { age: 25 } } });
const readOnlyState = readonly(state);
readOnlyState.count = 1;            // ❌ 失败（警告）
readOnlyState.user.name = "Bob";     // ❌ 失败
```

`shallowReadonly`：**浅层只读**，只有第一层不可改，嵌套对象可修改。

> 示意片段（无配套脚本）

```js
const shallowReadOnlyState = shallowReadonly(state);
shallowReadOnlyState.count = 1;             // ❌ 失败
shallowReadOnlyState.user.name = "Bob";       // ✅ 成功
```

实现要点：

1. `readonly` / `shallowReadonly` 各自使用独立的 WeakMap 缓存（`readonlyMap` / `shallowReadonlyMap`）。
2. 复用同一个 `createGetter`，通过**闭包参数**区分：`shallow` 时直接返回原值；`isReadonly` 时对对象调用 `readonly` 而非 `reactive`。
3. set 拦截直接 `console.warn` 并返回 `true`，阻止赋值。

> 示意片段（无配套脚本）

```js
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
};
```

### 3.10 类型判断 API 与特征属性

`isReactive` / `isReadonly` / `isProxy` / `toRaw` 都依赖为 Proxy 注入的**特征属性**：

> 示意片段（无配套脚本）

```js
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}
```

这些特征属性在 `createGetter` 里根据闭包信息提前"写死"：

> 示意片段（无配套脚本）

```js
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const isExistInReactiveMap = () =>
      key === ReactiveFlags.RAW && receiver === reactiveMap.get(target);
    // ... readonlyMap / shallowReadonlyMap 同理

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (isExistInReactiveMap() /* || isExistInReadonlyMap() || isExistInShallowReadonlyMap() */) {
      // 命中 RAW，返回原对象（toRaw）
      return target;
    }
    // ... 其余逻辑
  };
}
```

对应公开 API：

> 示意片段（无配套脚本）

```js
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}
export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}
// toRaw：先校验是否代理对象，是则取 RAW 返回原对象
export function toRaw(value) {
  if (!value[ReactiveFlags.RAW]) {
    return value;
  }
  return value[ReactiveFlags.RAW];
}
```

**为何直接用 `value[ReactiveFlags.XXX]` 就能判断类型？** 因为访问这些特殊 key 会触发 Proxy 的 `get`，而 `createGetter` 已经通过闭包把对应标志返回了。对于普通对象，访问这些 key 得到 `undefined`，`!!undefined` 为 `false`，因此能正确区分普通对象与各种代理对象。

## 四、运行时原理

运行时负责把 VNode 真正"落地"到宿主环境（浏览器即真实 DOM）。下面按"入口 → VNode → patch → 组件"的链路展开。

### 4.1 runtime-dom / runtime-core 的分工

运行时核心**不认识 DOM**。所有平台相关的动作都由调用方注入，核心只负责"什么时候该调用哪个"：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/renderer.js`

```js
function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        insert: hostInsert,
        remove: hostRemove,
        nextSibling: hostNextSibling,
        patchProp: hostPatchProp
    } = options
```

浏览器那份实现就是标准的 DOM API，只有 `insert` 的一个细节值得留意——**anchor 为 null 时 `insertBefore` 就是 append**，所以九个操作里不需要单独来一个 `appendChild`：

> 摘自 `./code/vue3/mini-vue/src/runtime-dom/nodeOps.js`

```js
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    remove: child => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
```

`runtime-dom` 这一层的全部职责就是"把两样东西装到一起"：

> 摘自 `./code/vue3/mini-vue/src/runtime-dom/index.js`

```js
const { render, createApp } = createRenderer({ ...nodeOps, patchProp })

// 让 h 在浏览器侧也可以直接用（模板编译产物也是调它）
module.exports = { createApp, render, h, createVNode, nextTick, nodeOps, patchProp }
```

**"平台无关"可以直接实测**：宿主 A 用真实 DOM 的替身（假 DOM），宿主 B 干脆把界面拼成字符串——相当于服务端渲染的雏形。两边跑的是同一个组件定义、同一份 runtime-core，宿主操作次数逐项相同：

```
==== 两个宿主的操作次数 ====
  操作               假 DOM   字符串
  createElement        3        3
  setElementText       2        2
  insert               3        3
  patchProp            1        1

---- 结论 ----
renderer 全程只调用注入进来的那 9 个函数，所以：
  · 换成假 DOM 就是单测环境（不用 jsdom）
  · 换成字符串拼接就是服务端渲染的雏形
  · 官方把 runtime-core 与 runtime-dom 拆成两个包，原因就在这里
```

`createRenderer` 返回的 `createApp` 由 `createAppAPI` 生成，其 `mount` 方法先创建 VNode 再调用 `render`：

> 示意片段（无配套脚本）

```js
export function createAppAPI(render) {
  return function createApp(rootComponent) {
    const app = {
      _component: rootComponent,
      mount(rootContainer) {
        const vnode = createVNode(rootComponent); // 基于根组件创建 vnode
        render(vnode, rootContainer);             // 调用 render 展开(挂载)
      },
    };
    return app;
  };
}
```

常见宿主操作对照：

| 操作 | 浏览器实现 |
| --- | --- |
| `createElement` | `document.createElement(type)` |
| `createText` | `document.createTextNode(text)` |
| `insert` | `parent.insertBefore(child, anchor)`（anchor 为 null 则插到末尾） |
| `remove` | `parent.removeChild(child)` |
| `setElementText` | `el.textContent = text` |
| `patchProp` | 处理 class / style / 事件 / 属性的 DOM 绑定 |

### 4.2 h 函数与 createVNode

`h` 底层就是 `createVNode`：

> 示意片段（无配套脚本）

```js
export const h = (type, props = null, children = []) => {
  return createVNode(type, props, children);
};
```

`createVNode` 负责创建各种类型的 VNode（节点信息载体）：

- `type`：节点类型。
  - **组件**：type 是一个对象 `{ name, setup(props, ctx) {}, render() {} }`。
  - **元素**：type 是字符串，如 `createVNode("div", props, children)`。
- `props`：属性对象。
- `children`：数组（子节点列表）或字符串（文本）。

> 摘自 `./code/vue3/mini-vue/src/runtime-core/vnode.js`

```js
function createBaseVNode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props && props.key != null ? props.key : null,
        children,
        shapeFlag: 0,
        el: null, // 对应的真实节点
        component: null // 组件 VNode 上挂的实例
    }
    // 1. 是元素还是组件
    if (isString(type)) vnode.shapeFlag |= ShapeFlags.ELEMENT
    else if (isObject(type)) vnode.shapeFlag |= ShapeFlags.STATEFUL_COMPONENT

    // 2. 孩子是文本还是数组
    if (isString(children)) vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    else if (isArray(children)) vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    else if (isObject(children)) vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN

    return vnode
}
```

注意 `key` 那一行的写法：`props.key != null ? props.key : null`——**有 props 却没有 key 的节点，`props.key` 是 `undefined` 而不是 `null`**，而 `null !== undefined`，diff 的同类型判断会把它判成"类型变了"，每次更新都整棵重建。归一成 `null` 就是修这个坑。

### 4.3 shapeFlag：VNode 形状标记

`shapeFlag` 是一个位运算枚举，用来表示 VNode 的"长什么样"，渲染器据此选择对应的处理分支：

> 摘自 `./code/vue3/mini-vue/src/shared/index.js`

```js
const ShapeFlags = {
    ELEMENT: 1, // 0001
    STATEFUL_COMPONENT: 1 << 1, // 0010
    TEXT_CHILDREN: 1 << 2, // 0100
    ARRAY_CHILDREN: 1 << 3, // 1000
    SLOTS_CHILDREN: 1 << 4
}
```

**位运算的好处是"一个值同时表达多种组合特征"**：

> 示意片段（无配套脚本）

```js
// 组合：有状态组件 + 数组子节点
const shapeFlag = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.ARRAY_CHILDREN;

// 检查是否包含某标志（按位与）
if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { /* 是 */ }
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { /* 是 */ }
```

渲染器 `patch` 根据 `shapeFlag` 分发到不同处理函数，位运算把两层判断压成了一次：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/renderer.js`

```js
        const { type, shapeFlag } = n2
        switch (type) {
            case Text:
                processText(n1, n2, container, anchor)
                break
            case Comment:
                processComment(n1, n2, container, anchor)
                break
            case Fragment:
                processFragment(n1, n2, container, anchor)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor)
                else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, anchor)
                }
        }
```

`Fragment` 没有自己的节点，所以它用**两个空文本节点夹住自己这一段**当锚点——这也是为什么"顶层直接渲染一个数组"不会多出包裹节点。

### 4.4 组件实例化与 setup

组件的"身份"用一个 `instance`（组件实例）管理，它保存组件的 props、setupState、render、el、提供了依赖注入用的 provides 等。

setup 阶段的流程大致为：

1. 从 `vnode.type` 上取得组件对象（options）。
2. 创建组件实例 `instance`，初始化 props / slots。
3. 调用 `setup(instance.props, { emit, slots, attrs, expose })`，拿到 setup 返回的 `setupState`。
4. 若没有 `render`，则把 `setup` 返回的对象或 `data` 合并，最终调用组件的 `render`（或编译生成的 `render`）得到子树 VNode。

`<script setup>` 编译后等价于普通 `setup` 返回 setupState 的形式，这就是 1. 中提到的 SFC 编译与运行时在此"握手"。

props 那层解决的是"子组件改父组件传下来的值必须被拦住，但 props 还得跟着父组件更新"：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/componentProps.js`

```js
    // 声明过的进 props，没声明的进 attrs——这决定了它会不会出现在 $attrs 里
    for (const key of Object.keys(raw)) {
        if (options && key in options) props[key] = raw[key]
        else attrs[key] = raw[key]
    }

    instance.props = options ? shallowReadonly(props) : attrs
    // 留一份原始对象的引用：更新 props 时直接改它，代理会自动读到新值
    instance.propsRaw = options ? props : attrs
```

`shallowReadonly` 是关键选型：**浅**只读，能拦住"子组件替换整个 prop"，又不妨碍 prop 内部的对象继续响应式。至于 `propsRaw`，是因为只读代理挡不住框架自己更新 props——框架拿着一份原始引用直接改，代理自动读到新值。

### 4.5 虚拟 DOM：挂载 / 更新 / 卸载

| 阶段 | 说明 |
| --- | --- |
| **挂载（mount）** | 首次渲染：创建真实 DOM、绑定 props/事件、挂载子节点、插入容器、触发 `onMounted` |
| **更新（update）** | `patch` 对比新旧 VNode：文本不同则更新文本，元素走 `diff`，组件重新执行 render |
| **卸载（unmount）** | 移除真实 DOM、清理组件 effect 与事件、触发 `onUnmounted`，防止内存泄漏 |

前三层在这一节合上：**组件的 render 被包成一个 effect**，它读到的响应式数据就是它的依赖。`isMounted` 那一个布尔值区分了"挂载"和"更新"两种 patch 签名——`patch(null, subTree)` 与 `patch(prevSubTree, nextSubTree)`，正是新旧对比的入口：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/component.js`

```js
function setupRenderEffect(instance, initialVNode, container, anchor, patch) {
    const componentUpdateFn = () => {
        if (!instance.isMounted) {
            const subTree = (instance.subTree = renderComponentRoot(instance))
            patch(null, subTree, container, anchor)
            initialVNode.el = subTree.el
            instance.isMounted = true
        } else {
            const prevSubTree = instance.subTree
            const nextSubTree = (instance.subTree = renderComponentRoot(instance))
            patch(prevSubTree, nextSubTree, container, anchor)
        }
    }

    // scheduler 是关键：数据变化不会立刻渲染，只把 update 排进微任务队列
    instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
}
```

"改三次只渲染一次"就发生在 scheduler 里。它用的是**微任务**，所以整块同步代码跑完、DOM 还是旧的，`nextTick()` 之后才能读到新值：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/scheduler.js`

```js
function queueJob(job) {
    if (!queue.includes(job)) queue.push(job) // 同一个 job 只排一次
    queueFlush()
}

function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
}

function flushJobs() {
    isFlushPending = false
    const jobs = queue.splice(0, queue.length) // 先取出快照，flush 过程中新加的留到下一轮
    for (const job of jobs) job()
    if (queue.length) flushJobs() // 组件有父子依赖时，执行中可能又推入新 job
}
```

`queue.includes(job)` 这一句就是批处理的全部——**同一个组件的 update 在队列里只会出现一次**。实测：同一个 tick 改三次状态，渲染次数只 +1，DOM 在 `nextTick` 后才变成最终值：

```
==== 3. 同一个 tick 改三次，只渲染一次（批处理）====
  三次赋值后立刻看：渲染次数 +0，DOM 仍是旧文案
  await nextTick() 之后：渲染次数 +1
  DOM 变成「count=3，double=6」
```

由此得出四个能直接下判断的结论：**`this.count` 里没有 `.value`**（setup 返回的 ref 被 `proxyRefs` 包过）；**批处理不是额外实现**（渲染交给调度器的自然结果）；**props 是浅只读**（子组件改被告警，父组件传新值照常生效）；**卸载必须 stop 渲染 effect**（否则组件不在了更新还一直来，就是内存泄漏）。

### 4.6 列表 diff：头尾同步 + 按 key 配对

列表 diff 是**先对齐头尾、再处理中间乱序**（双端比较）。头尾两步便宜且常见——能对上的直接复用，一个属性都不多改：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/renderer.js`

```js
        // 1. 从头同步：能对上的直接复用，一个属性都不多改
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            i++
        }

        // 2. 从尾同步
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            e1--
            e2--
        }
```

头尾都没对上时才走"中间乱序"：按 key 建索引，找出哪些还能复用、哪些是新增，再统一搬移。**没 key 的退化成按下标对应——这正是"用 index 当 key"会出现的行为**：

> 摘自 `./code/vue3/mini-vue/src/runtime-core/renderer.js`

```js
        const s1 = i
        const s2 = i
        const keyToNewIndex = new Map()
        for (let j = s2; j <= e2; j++) {
            if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
        }

        for (let j = s1; j <= e1; j++) {
            const prevChild = c1[j]
            // 没 key 的退化成按下标对应 —— 这正是"用 index 当 key"会出现的行为
            const newIndex =
                prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)
```

断言 diff 最直接的办法是数宿主操作。两个结构完全相同的列表，只差有没有 key：

```
==== 场景一：删掉列表第一项 ====
---- 无 key ----  宿主操作 5 次（改 data-id、改文本 ×2 + remove）
---- 有 key ----  宿主操作 1 次（remove）

==== 场景二：把最后一项移到最前（纯重排）====
---- 无 key ----  宿主操作 6 次，全是"就地改写内容"，一个节点都没搬
---- 有 key ----  宿主操作 3 次，全是搬移（insert），一次内容都没改
```

两种写法的 DOM 结果看起来完全一样，差别只在过程——而"就地改写"意味着节点被复用、内容被换掉，节点上的输入框内容、焦点、组件内部状态都会串位。同时要清楚：**有 key 的重排不是零成本**，真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的节点。

### 4.7 生命周期钩子

生命周期钩子本质是"**在特定时机调用的用户函数集合**"。以 `onMounted` 为例：

- 内部把回调注册到当前组件实例的对应数组（如 `instance.mounted`）。
- 组件挂载完成时，渲染器统一遍历并调用这些回调。

> 示意片段（无配套脚本）

```js
// 示意：注册钩子
const onMounted = (fn) => {
  // 绑定到当前正在创建的组件实例
  currentInstance.mounted.push(fn);
};

// 挂载完成后统一执行
const instance = /* 生成好的组件实例 */;
instance.mounted.forEach((hook) => hook());
```

`watch` / `computed` 的清理（stop）也会在生命周期卸载阶段统一触发，确保数据变化不再影响已销毁的组件（防止内存泄漏）。

### 4.8 props 与插槽

**props**

- 组件 `props` 由 `setup(props)` 接收，由 `vnode.props` 提取、按组件声明的 `props` 配置校验与收集。
- props 是**响应式且只读**的一部分（其实例上的 `props` 是通过 `shallowReadonly` 代理的，避免子组件随意改父组件的值）。
- props 变化会触发子组件更新。

**插槽（slots）**

- 父组件把模板片段编译为"返回 VNode 树的函数"作为插槽内容。
- 子组件通过 `slots` 拿到这些函数并渲染（`useSlots` / `this.$slots`）。
- 对应 `shapeFlag` 的 `SLOTS_CHILDREN`。作用域插槽与普通插槽的区别在于：插槽函数接收 props 参数，从而实现"子传父"的数据渲染。

### 4.9 provide / inject：依赖注入

`provide/inject` 用于跨层级传递数据，跳过中间组件。

- 每个组件实例都有 `provides` 对象，初始指向父实例的 `provides`。
- `provide(key, value)`：在**当前实例自己的 provides 副本**上设置值（浅复制父 provides 后再赋值，形成原型链式查找）。
- `inject(key)`：从当前实例开始**沿 provides 链向上查找**，找到即返回。

> 示意片段（无配套脚本）

```js
// 示意：provide
export function provide(key, value) {
  // 基于父实例的 provides 做浅拷贝，实现"就近覆盖、向上查找"
  if (currentInstance) {
    let provides = currentInstance.provides;
    const parentProvides = currentInstance.parent?.provides;
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

// 示意：inject
export function inject(key) {
  if (currentInstance) {
    const parentProvides = currentInstance.parent?.provides;
    return parentProvides && key in parentProvides
      ? parentProvides[key]
      : undefined;
  }
}
```

借用 JS 原型链（`Object.create`），实现了 `inject` 沿祖先链查找且支持同名覆盖的效果，这也是 Vue 依赖注入"就近覆盖、向上穿透"的原理。

## 配套代码

本篇示例来自 `code/vue3/mini-vue`（零依赖，不需要 `npm install`；单测用 Node 内置的 `node:test`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-vue/src/shared/index.js` | 类型判断与 `ShapeFlags` | 4.3 shapeFlag |
| `./code/vue3/mini-vue/src/reactivity/effect.js` | `ReactiveEffect`（effect 栈 / cleanup）/ `track` / `trigger` / `stop` | 3.2 · 3.3 · 3.4 |
| `./code/vue3/mini-vue/src/reactivity/reactive.js` | `reactive` / `readonly` / `shallowReadonly` 与代理缓存 | 3.1 reactive |
| `./code/vue3/mini-vue/src/reactivity/ref.js` | `RefImpl` / `proxyRefs` / `unref` | 3.5 ref |
| `./code/vue3/mini-vue/src/reactivity/computed.js` | 脏标记 + scheduler 实现的惰性 `computed` | 3.7 computed |
| `./code/vue3/mini-vue/src/runtime-core/vnode.js` | `createVNode` / `h` / `shapeFlag` / `normalizeVNode` | 4.2 h 函数 |
| `./code/vue3/mini-vue/src/runtime-core/scheduler.js` | `queueJob` / `flushJobs` / `nextTick`（微任务批处理） | 4.5 挂载更新卸载 |
| `./code/vue3/mini-vue/src/runtime-core/renderer.js` | `createRenderer`：patch 分发、列表 diff、组件挂载与卸载 | 4.1 · 4.3 · 4.6 |
| `./code/vue3/mini-vue/src/runtime-core/component.js` | 组件实例、`setup` 代理、渲染 effect | 4.4 · 4.5 |
| `./code/vue3/mini-vue/src/runtime-core/componentProps.js` | `props` 浅只读、`attrs` 分流、`slots` 归一 | 4.4 · 4.8 |
| `./code/vue3/mini-vue/src/runtime-dom/nodeOps.js` | 浏览器宿主操作（真实 DOM） | 4.1 分工 |
| `./code/vue3/mini-vue/src/runtime-dom/patchProp.js` | 事件 / property / attribute 三种属性写法 | 4.6 列表 diff |
| `./code/vue3/mini-vue/src/runtime-dom/index.js` | `createRenderer({ ...nodeOps, patchProp })` 与 `createApp` | 4.1 分工 |
| `./code/vue3/mini-vue/steps/01-reactivity.js` | 依赖收集与触发、惰性深度代理、增删属性 | 3.2 · 3.3 |
| `./code/vue3/mini-vue/steps/02-effect-scheduler.js` | scheduler、分支清理、`stop`、`computed` 惰性 | 3.4 · 3.7 |
| `./code/vue3/mini-vue/steps/03-renderer.js` | 两个宿主跑同一份 render，对调用次数 | 4.1 分工 |
| `./code/vue3/mini-vue/steps/04-dom-diff.js` | 有 / 无 key 的宿主操作次数对照 | 4.6 列表 diff |
| `./code/vue3/mini-vue/steps/05-component.js` | 挂载、批处理、只读 props、跳过子渲染、卸载 | 4.4 · 4.5 |

运行：`cd code/vue3/mini-vue`，然后

- `npm run step:reactivity` / `step:effect` / `step:renderer` / `step:diff` / `step:component` —— 五个观察脚本
- `npm test` —— 26 个单测

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[React 高级与原理](../react/React%20高级与原理.md)
- 下一篇：[Vue3 状态管理原理与实现](./Vue3%20状态管理原理与实现.md)
