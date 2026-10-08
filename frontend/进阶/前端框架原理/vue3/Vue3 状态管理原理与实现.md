# Vue3 状态管理原理与实现

## 一、状态管理在解决什么（signal 归位）

把状态从组件里搬出来之后，真正要回答的其实只有三个问题：

1. **状态放在哪**：一份数据被三个模块读到，它应该属于谁
2. **谁能改它**：是任何地方都能 `set`，还是必须经过一个统一入口
3. **改完通知谁**：这次更新到底影响哪些视图，谁该重渲染、谁不该

三个问题里，前两个是"约定"，第三个是"机制"。而各家状态库的分野几乎全在第三个问题上——**"这次更新跟我有没有关系"这个判断，被放在了不同的层**：

```
reducer + dispatch      判断放在订阅者手里（store 一律通知，选择器自己拦）   → React 侧：Redux
setState + 选择器        判断放在订阅者手里，但 store 会先做一次"同值就没变"  → React 侧：Zustand
signal（依赖追踪）        判断放在 store 内部（依赖表记着"谁读过这个字段"）    → Vue3 侧：Pinia
```

前两条是 React 侧的主流路线，见 [React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)。这一篇只写第三条——signal 归位的路线：**Vue3 侧对"改完通知谁"的回答是响应式**。Pinia 没有另起炉灶发明一套通知机制，它直接复用 Vue 的响应式底座：依赖表精确到字段，改一个字段只唤醒"读过它"的订阅者。

这也让 React 篇里那句"被唤醒 ≠ 重渲染"在这里变了味道：依赖表已经把判断下沉到了字段级，**被唤醒的基本就是真的要重渲染的**——多出来的空跑在选择器那一路，这里没有。

全部代码在 `../code/vue3/mini-pinia/`，零依赖、约 200 行，三个观察脚本 + 11 条断言。

## 二、响应式底座：判断放在 store 内部

### 三层依赖表精确到字段

前两条路线的订阅单位是"一个组件对一个切片"。响应式把订阅单位下沉到**字段**：谁读了这个字段，字段变化时就唤醒谁。

> 摘自 `../code/vue3/mini-pinia/src/reactivity.js`

```js
function track(target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}
```

三层依赖表：`target（对象）→ key（字段）→ dep（effect 集合）`。触发时只取这个字段的集合：

> 摘自 `../code/vue3/mini-pinia/src/reactivity.js`

```js
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    const dep = depsMap && depsMap.get(key)
    if (!dep) return 0
    let woken = 0
    // 复制一份再遍历：effect 执行过程中可能重新收集依赖，改动原集合
    for (const eff of [...dep]) {
        if (eff.scheduler) eff.scheduler(eff)
        else eff.run()
        woken++
    }
    return woken
}
```

状态的读写由一层惰性深度代理接管——**判断（track / trigger）发生在 store 内部，订阅者完全不知情**：

> 摘自 `../code/vue3/mini-pinia/src/reactivity.js`

```js
        get(obj, key, receiver) {
            track(obj, key)
            const value = Reflect.get(obj, key, receiver)
            // 惰性深度代理：读到对象才继续代理，不预先遍历整棵树
            return typeof value === 'object' && value !== null ? reactive(value) : value
        },
        set(obj, key, value, receiver) {
            const old = obj[key]
            const ok = Reflect.set(obj, key, value, receiver)
            if (!Object.is(old, value)) trigger(obj, key)
            return ok
        }
```

于是"改一个字段唤醒几个订阅者"变成了可以数出来的量：

> 摘自 `../code/vue3/mini-pinia/steps/01-reactivity.js`（运行：`npm run step:reactivity`）

```js
const state = reactive({ user: { name: 'Ada' }, cart: { items: 0 }, theme: 'light' })
const runs = { header: 0, badge: 0, toggle: 0 }
effect(() => {
    runs.header++
    return state.user.name
})
effect(() => {
    runs.badge++
    return state.cart.items
})
effect(() => {
    runs.toggle++
    return state.theme
})
```

实测输出：

```
---- 三个组件各订阅一个字段，挂载 ----
挂载后 effect 执行次数（user.name / cart.items / theme）= 1 / 1 / 1

---- state.cart.items = 1 ----
三个 effect 的执行次数 = 1 / 2 / 1  <- 只有"读过 cart.items"的那个被唤醒
被唤醒的 effect 数 = 1 / 3
```

对比 React 篇场景一的 **3 个订阅回调全跑一遍、1 个重渲染**，这里直接是 **1 个 effect 被唤醒**——判断提前到了 store 内部。

### computed 的惰性与缓存

派生值不该跟着源数据一起算——它应该等到"有人来读"才算，而且依赖没变就复用缓存：

> 摘自 `../code/vue3/mini-pinia/src/reactivity.js`

```js
function computed(getter) {
    const box = {}
    let value
    let dirty = true
    let evaluations = 0
    const runner = effect(getter, {
        lazy: true,
        // 依赖变化时只置脏 + 通知消费者，真正重算推迟到"有人来读"
        scheduler() {
            dirty = true
            trigger(box, 'value')
        }
    })
```

`scheduler` 就是"依赖变了但不立刻算"的挂点。实测：

> 摘自 `../code/vue3/mini-pinia/steps/01-reactivity.js`

```js
const nums = reactive({ price: 10, qty: 2, noise: 0 })
const total = computed(() => nums.price * nums.qty)
```

```
---- computed：惰性 + 缓存 + 无关字段不重算 ----
第一次读 total = 20 | 计算次数 = 1
第二次读 total = 20 | 计算次数 = 1  <- 依赖没变，用缓存
改 price 但还没读，计算次数 = 1  <- 只置脏，不算
读 total = 40 | 计算次数 = 2
改无关字段 noise 后读 total = 40 | 计算次数 = 2  <- 不在依赖里，不重算
```

"读两次只算一次""改了但没读不算""无关字段不算"——三句话对应三个可数的量。这一整套机制的完整推导（`cleanup` 清旧依赖、`activeEffect` 的保存-恢复等）在 [手写 mini-vue](./手写%20mini-vue.md) 篇，本篇不重复，只把它当作 Pinia 的底座来用。

## 三、store 是什么

Pinia 的 store 是"state + getters + actions"三件事，而 setup store 把三件事统一成**一个 setup 函数**：state 是 `ref`，getter 是 `computed`，action 是普通函数，全部从 setup 的返回值来：

> 摘自 `../code/vue3/mini-pinia/steps/02-pinia.js`（运行：`npm run step:pinia`）

```js
const useCartStore = defineStore('cart', () => {
    const items = ref(0)
    const user = ref({ name: 'Ada' })
    const double = computed(() => items.value * 2)

    function add(step = 1) {
        items.value += step
    }

    return { items, user, double, add }
})
```

### id 即命名空间

`defineStore` 的第一个参数是 id。同一个 id 的 `useStore` 只实例化一次——这就是"跨组件共享同一份 state"的机制来源：

> 摘自 `../code/vue3/mini-pinia/src/pinia.js`

```js
function defineStore(id, setup) {
    // id 即命名空间：同一个 id 的 useStore 只实例化一次，跨组件共享同一份 state
    return function useStore(pinia = activePinia) {
        if (!pinia) throw new Error('useStore 需要在 pinia 激活后调用（先 createPinia + setActivePinia）')
        if (!pinia.stores.has(id)) {
            pinia.stores.set(id, createSetupStore(id, setup))
        }
        return pinia.stores.get(id)
    }
}
```

### 解包第一层：store.count 而不是 store.count.value

setup 返回的是 ref，但模板和组件里不应该写 `.value`。store 外面包的这层 Proxy 负责**自动解包第一层**，同时把 action 绑定到 store 上：

> 摘自 `../code/vue3/mini-pinia/src/pinia.js`

```js
    const store = new Proxy(target, {
        get(obj, key, receiver) {
            if (key in obj) return Reflect.get(obj, key, receiver)
            const value = state[key]
            if (isRef(value)) return value.value
            if (typeof value === 'function') return value.bind(store)
            return value
        },
        set(obj, key, value, receiver) {
            if (isRef(state[key])) {
                state[key].value = value // 通过 ref 的 setter 触发依赖
                return true
            }
            state[key] = value
            return true
        },
```

- **读**：ref 解包成值（`store.count`）、函数 bind 到 store（`this` 指向 store，action 里能读别的字段、调别的 action）、其余原样返回。
- **写**：ref 字段走它的 setter——`Object.is` 跳过同值、依赖触发；普通字段直接赋值。

实测（同一段脚本继续）：

```
---- 首次 useStore：实例化，id 即命名空间 ----
两次 useStore 是同一个实例 = true
store.$id = cart

---- setup store：ref 字段自动解包第一层 ----
cart.items = 0 | cart.double = 0 | cart.user = {"name":"Ada"}

---- action 直接改字段，谁在依赖里谁被唤醒 ----
add(3) 后 cart.items = 3 | cart.double = 6
订阅 cart.double 的 effect 执行次数 = 2
```

### storeToRefs：只解包第一层

解构 store 时有个经典坑：`const { count } = store` 拿到的是解包后的**值**，解构之后就不再响应式。`storeToRefs` 专门处理这件事——它从 `$state`（setup 的原始返回值）遍历，**ref 字段保持 ref 形态**（解构出来还有 `.value`，仍然是响应式的），action 原样保留：

> 摘自 `../code/vue3/mini-pinia/src/pinia.js`

```js
function storeToRefs(store) {
    const refs = {}
    // 从 $state（setup 原始返回值）遍历：ref 字段保持 ref 形态，action 原样保留
    for (const key of Object.keys(store.$state)) {
        const value = store.$state[key]
        if (isRef(value)) refs[key] = value
        else if (typeof value === 'function') refs[key] = value
    }
    return refs
}
```

> 摘自 `../code/vue3/mini-pinia/steps/02-pinia.js`

```js
const { items, user, add } = storeToRefs(cart)
console.log('items 是 ref =', items.__v_isRef === true, '| user 是 ref =', user.__v_isRef === true, '| add 被保留为函数 =', typeof add === 'function')
console.log('items.value =', items.value)
```

实测输出：

```
---- storeToRefs：只解包第一层，action 不解包 ----
items 是 ref = true | user 是 ref = true | add 被保留为函数 = true
items.value = 3
```

这就是"模板里自动解包、脚本里手动 `storeToRefs`"这条规则的机制来源——Proxy 解包发生在 `store.xxx` 的读取路径上，解构跳过了这条路径，`storeToRefs` 把 ref 形态原样还给你。

## 四、谁能改：action、$patch 与直接赋值

### $patch：批量更新 + 逐键 Object.is

多个字段要一起改时，`$patch` 把"怎么改"收成一个入口，并且逐键 `Object.is`——赋同值的键直接跳过，不触发依赖：

> 摘自 `../code/vue3/mini-pinia/src/pinia.js`

```js
    store.$patch = partial => {
        for (const key of Object.keys(partial)) {
            if (isRef(state[key]) && !Object.is(state[key].value, partial[key])) {
                state[key].value = partial[key]
            }
        }
    }
```

> 摘自 `../code/vue3/mini-pinia/steps/02-pinia.js`

```js
cart.$patch({ items: 6 })
```

实测输出：

```
---- $patch：批量更新 + 逐键 Object.is ----
$patch({ items: 6 }) 后 items = 6 | 订阅 effect 执行次数 = 2
$patch({ items: 6 }) 赋同值后 items = 6 | 订阅 effect 执行次数 = 2  <- 逐键 Object.is 跳过，不触发依赖
```

注意两次 `$patch({ items: 6 })`：第一次 items 真的从 3 变成 6，订阅者被唤醒；第二次赋的是同值 6，`Object.is` 直接短路，**连通知都没有**——和 React 篇 setState 的"逐键 Object.is"是同一个判断，只是这里下沉到了字段。

### 谁能改，决定了约定而不是机制

`$patch`、action、直接赋值（`store.items = 6`）在响应式层面走的是**同一条触发路径**（ref setter → `trigger`）。差别只在"谁有资格改"的约定上——这正是下一节的对照。

### 跨 store 引用

setup store 的 action / getter 里直接调另一个 `useStore`，读它的 ref 就建立了依赖——和组件读 store 没有任何区别，因为 store 的 state 本来就是响应式对象：

> 示意片段（无配套脚本）

```js
const useCartStore = defineStore('cart', () => {
    const items = ref(0)
    return { items }
})
const useOrderStore = defineStore('order', () => {
    const cart = useCartStore()
    const total = computed(() => cart.items * 10) // 读另一个 store 的 ref，依赖自动建立
    return { total }
})
```

## 五、三条路线对照：Pinia vs Vuex vs Redux

同一份"计数 +1"，三条路线各用自己的入口跑三轮，数每个 effect 被唤醒的次数：

> 摘自 `../code/vue3/mini-pinia/steps/03-compare.js`（运行：`npm run step:compare`）

```js
const run = label => {
    console.log('')
    console.log('----', label, '----')
    piniaStore.increment()
    raw.count += 1
    committed++
    vuexState.count = committed
    console.log('Pinia count =', piniaStore.count, '| effect 执行 =', piniaRuns)
    console.log('reactive count =', raw.count, '| effect 执行 =', rawRuns)
    console.log('Vuex count =', vuexState.count, '| effect 执行 =', vuexRuns)
}
```

实测输出：

```
---- 计数 +1 × 3（每条路线自己的入口） ----
Pinia count = 1 | effect 执行 = 2
reactive count = 1 | effect 执行 = 2
Vuex count = 1 | effect 执行 = 2

---- 计数 +1 × 3 ----
Pinia count = 2 | effect 执行 = 3
reactive count = 2 | effect 执行 = 3
Vuex count = 2 | effect 执行 = 3

---- 计数 +1 × 3 ----
Pinia count = 3 | effect 执行 = 4
reactive count = 3 | effect 执行 = 4
Vuex count = 3 | effect 执行 = 4

---- 三条路线对"改完通知谁"的回答 ----
Pinia：字段级依赖追踪，只有读过 count 的 effect 被唤醒（同 reactive 机制）
Vuex：mutation 只是规定"谁能改"，通知机制与 reactive 完全一致
差别不在机制，而在约定：谁有资格改、怎么改（action / 直接赋值 / mutation）
```

三行数字一模一样：**Pinia 与 Vuex 的通知机制是同一套（响应式），差别只在"谁能改、怎么改"的约定**——Vuex 规定只能走 mutation，Pinia 放开了 action 与直接赋值。再往左看，Redux 那一路的差别才是机制层面的：判断放在订阅者手里（[React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)），而这一路判断在 store 内部。**三条路线没有优劣，只有"判断放在哪一层"的取舍。**

## 六、选型与边界

**依赖追踪的代价要先讲清楚。** 精确唤醒不是免费的：依赖是**运行时读出来的**，`activeEffect` 这类全局状态让时序问题变多——跨 `await` / 异步边界时依赖容易丢，所以 Vue 的渲染 effect 要跟组件生命周期绑在一起（卸载即 stop）；追踪本身也有开销（Proxy 代理 + 依赖表维护），高频读写的热路径要注意。这些在 [手写 mini-vue](./手写%20mini-vue.md) 篇有完整推导。

**先分清服务端状态与客户端状态。** 请求返回的数据（列表、详情、分页游标）有缓存、有失效、有重试、有竞态，属于**服务端缓存**问题，该交给 TanStack Query / SWR 这类库；真正需要 store 的是"跨模块共享、且客户端自己拥有"的状态（登录用户、主题、草稿、多步表单）。

**什么时候不需要 Pinia。** 状态只被一个子树用到，就放在最近的公共父组件里；一次性的表单状态就放在组件内部，`provide` / `inject` 甚至都不用。加状态库的门槛应该是"状态要被多个**互不相邻**的模块读写"，而不是"状态有点多"。

**为什么 Vue3 侧默认选响应式路线。** 因为判断已经存在于渲染机制里：组件的 render 就是一个 effect，依赖表是现成的，Pinia 只是把 store 接上去。反过来，如果组件渲染机制本身不是响应式的（React），才需要外部的"订阅 + 选择器"补齐判断——两条生态路线各自的取舍，见 [React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)。

## 配套代码

本篇示例来自 `../code/vue3/mini-pinia/`（零依赖，不需要 `npm install`；单测用 Node 内置的 `node:test`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `../code/vue3/mini-pinia/src/reactivity.js` | 三层依赖表（target → key → dep）/ `effect` / `reactive` / `computed` | 二、响应式底座 |
| `../code/vue3/mini-pinia/src/pinia.js` | `createPinia` / `defineStore`（id 即命名空间）/ `storeToRefs` / `$patch` / `ref` | 三 · 四 |
| `../code/vue3/mini-pinia/steps/01-reactivity.js` | 字段级唤醒计数、`computed` 惰性与缓存 | 二、响应式底座 |
| `../code/vue3/mini-pinia/steps/02-pinia.js` | `defineStore` / ref 解包 / `storeToRefs` / `$patch` 实测 | 三 · 四 |
| `../code/vue3/mini-pinia/steps/03-compare.js` | Pinia vs 直接 reactive vs Vuex 式 mutation 对照 | 五、三条路线对照 |
| `../code/vue3/mini-pinia/test/reactivity.test.js` | 依赖收集 / 触发 / computed 缓存的 5 条断言 | 二、响应式底座 |
| `../code/vue3/mini-pinia/test/pinia.test.js` | `defineStore` / `storeToRefs` / `$patch` 的 6 条断言 | 三 · 四 |

运行：`cd code/vue3/mini-pinia`，然后

- `npm run step:reactivity` / `step:pinia` / `step:compare` —— 三个观察脚本
- `npm test` —— 11 个单测

## 参考

- 本模块总结：[总结](../总结.md)
- 本模块面试题：[面试题](../面试题.md)
- 上一篇：[手写 mini-vue](./手写%20mini-vue.md)
- 下一篇：[性能优化体系与指标](../../性能优化/性能优化体系与指标.md)
- 本模块另三篇：[React 高级与原理](../react/React%20高级与原理.md) · [Vue3 原理](./Vue3%20原理.md) · [手写 mini-react](../react/手写%20mini-react.md)
- 响应式完整机制：[手写 mini-vue](./手写%20mini-vue.md)
- React 侧两条路线（reducer / setState）：[React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)
