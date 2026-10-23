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

配套代码在 `./code/vue3/mini-pinia/`：`lib/` 是按职责拆分的纯 JS 实现（`reactivity.js` → `pinia.js` → `index.js`，零依赖、`<script>` 按序加载后经 `window.MiniPinia` 统一使用），`demo/demo-pinia.html` 是交互式 demo（面板操作 + 断点提示，数字与正文实测一一对应）。

## 二、响应式底座：判断放在 store 内部

### 三层依赖表精确到字段

前两条路线的订阅单位是"一个组件对一个切片"。响应式把订阅单位下沉到**字段**：谁读了这个字段，字段变化时就唤醒谁。

> 摘自 `./code/vue3/mini-pinia/lib/reactivity.js`

```js
/**
 * 依赖收集：把"当前正在运行的 effect"记进 target[key] 的依赖集合。
 * 过程：effect 里读到响应式字段 → Proxy 的 get 调 track → 沿三层表逐层建容器
 * （WeakMap → Map → Set，都惰性创建），最后把 activeEffect 塞进最内层 Set，
 * 同时让 effect 反向记住这个 Set（cleanup 退订时要用）。
 * @param {object} target 被读的原始对象（依赖表第一层的键）
 * @param {string|symbol} key 被读的字段名（依赖表第二层的键）
 * @returns {void} 无返回值；效果是依赖表里多一条 target → key → effect 记录
 * @example
 *   const s = reactive({ n: 1 })
 *   effect(() => s.n)      // 读 s.n 的瞬间内部调用 track(s, 'n')
 *   // 此后 targetMap：s → 'n' → Set{ 那个 effect }，改 s.n 会唤醒它
 */
function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读（事件回调里随手一读），没什么可收集
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map())) // 第一层：对象 → Map
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set())) // 第二层：字段 → effect 集合（同样惰性建）
    dep.add(activeEffect)
    activeEffect.deps.push(dep) // 反向索引：effect 也记住自己进了哪些 Set，重跑前好退订
}
```

三层依赖表：`target（对象）→ key（字段）→ dep（effect 集合）`。触发时只取这个字段的集合：

> 摘自 `./code/vue3/mini-pinia/lib/reactivity.js`

```js
/**
 * 精确唤醒：target 的 key 字段变了，只唤醒"读过它"的那批 effect。
 * 过程：沿依赖表取到该字段的 Set，逐个执行（有 scheduler 就走 scheduler、
 * 否则直接 run），返回唤醒个数——"改一个字段唤醒几个订阅者"由此变成可数出的量。
 * @param {object} target 被改的原始对象
 * @param {string|symbol} key 被改的字段名
 * @returns {number} 本次唤醒的 effect 个数；该字段从没被读过则为 0
 * @example
 *   const s = reactive({ a: 1, b: 2 })
 *   effect(() => s.a)      // 只读过 a
 *   trigger(s, 'a')        // → 1（唤醒上面那个 effect）
 *   trigger(s, 'b')        // → 0（没人读过 b，依赖表里根本没有它）
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    const dep = depsMap && depsMap.get(key)
    if (!dep) return 0 // 该字段从没被任何 effect 读过：不用通知任何人
    let woken = 0
    // 复制一份再遍历：effect 执行过程中可能重新收集依赖，改动原集合
    for (const eff of [...dep]) {
        if (eff.scheduler) eff.scheduler(eff) // 有 scheduler 就不立刻重跑（computed 靠它只置脏）
        else eff.run()
        woken++
    }
    return woken
}
```

状态的读写由一层惰性深度代理接管——**判断（track / trigger）发生在 store 内部，订阅者完全不知情**：

> 摘自 `./code/vue3/mini-pinia/lib/reactivity.js`

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
            if (!Object.is(old, value)) trigger(obj, key) // 同值写入直接短路，不惊动订阅者（NaN 除外）
            return ok
        }
```

于是"改一个字段唤醒几个订阅者"变成了可以数出来的量：

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

> 摘自 `./code/vue3/mini-pinia/lib/reactivity.js`

```js
/**
 * 计算属性：惰性 + 缓存。依赖变化时 scheduler 只把 dirty 置 true 并通知消费者，
 * 真正重算推迟到下一次读 value；依赖没变就直接返回缓存值。
 * @param {Function} getter 求值函数：内部读响应式数据，建立自己的依赖
 * @returns {{__v_isRef: boolean, get value(): *, get evaluations(): number}} 计算引用：经 .value 读值；evaluations 记录真实重算次数（教学用）
 * @example
 *   const s = reactive({ price: 10, qty: 2 })
 *   const total = computed(() => s.price * s.qty)
 *   total.value      // → 20（第 1 次重算，evaluations → 1）
 *   total.value      // → 20（命中缓存，evaluations 仍 1）
 *   s.price = 20     // 只置脏，evaluations 仍 1
 *   total.value      // → 40（脏了才重算，evaluations → 2）
 */
function computed(getter) {
    const box = {} // 只作依赖表的键，本身不存值
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
    return {
        __v_isRef: true,
        get value() {
            track(box, 'value')
            if (dirty) {
                value = runner.run()
                dirty = false
                evaluations++
            }
            return value
        },
        get evaluations() {
            return evaluations
        }
    }
}
```

`scheduler` 就是"依赖变了但不立刻算"的挂点。实测：

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

"读两次只算一次""改了但没读不算""无关字段不算"——三句话对应三个可数的量。这一整套机制的完整推导（`cleanup` 清旧依赖、`activeEffect` 的保存-恢复等）见配套 [mini-vue](./Vue3%20原理.md) 的响应式实现（本模块「Vue3 原理」篇已并入推导），本篇不重复，只把它当作 Pinia 的底座来用。

## 三、store 是什么

Pinia 的 store 是"state + getters + actions"三件事，而 setup store 把三件事统一成**一个 setup 函数**：state 是 `ref`，getter 是 `computed`，action 是普通函数，全部从 setup 的返回值来：

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

> 摘自 `./code/vue3/mini-pinia/lib/pinia.js`

```js
/**
 * 定义一个 store：返回 useStore 函数（此刻并不创建实例）。
 * 过程：id 即命名空间——首次调用 useStore 时才跑 setup、把实例存进 pinia.stores，
 * 之后同一 id 的调用一律返回这同一份实例（"跨组件共享同一份 state"的机制来源）。
 * @param {string} id store 的唯一命名空间（如 'cart'），同时是注册表的键与实例的 $id
 * @param {Function} setup setup 函数：返回 { 字段: ref / computed / action 函数 }
 * @returns {Function} useStore(pinia?)：返回该 id 对应的 store 单例；pinia 未激活且未传参时抛错
 * @example
 *   const useCounter = defineStore('counter', () => { const n = ref(0); return { n } })
 *   const a = useCounter()
 *   const b = useCounter()
 *   a === b             // → true（同一个实例，setup 只跑过一次）
 */
function defineStore(id, setup) {
    // id 即命名空间：同一个 id 的 useStore 只实例化一次，跨组件共享同一份 state
    return function useStore(pinia = activePinia) {
        if (!pinia) throw new Error('useStore 需要在 pinia 激活后调用（先 createPinia + setActivePinia）')
        if (!pinia.stores.has(id)) {
            pinia.stores.set(id, createSetupStore(id, setup)) // 只有首次调用会跑 setup
        }
        return pinia.stores.get(id)
    }
}
```

### 解包第一层：store.count 而不是 store.count.value

setup 返回的是 ref，但模板和组件里不应该写 `.value`。store 外面包的这层 Proxy 负责**自动解包第一层**，同时把 action 绑定到 store 上：

> 摘自 `./code/vue3/mini-pinia/lib/pinia.js`

```js
    const store = new Proxy(target, {
        get(obj, key, receiver) {
            if (key in obj) return Reflect.get(obj, key, receiver) // $id / $state 等自有键优先，不进解包逻辑
            const value = state[key]
            if (isRef(value)) return value.value // ref 字段解包第一层：store.count 就是 count.value
            if (typeof value === 'function') return value.bind(store) // action 绑到 store：this 能读字段、调别的 action
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
        has(obj, key) {
            return key in obj || key in state
        },
        ownKeys() {
            // 让 Object.keys(store) 能看到 setup 返回的全部字段（ref / computed / action）
            return Reflect.ownKeys(target).concat(Object.keys(state))
        },
        getOwnPropertyDescriptor(obj, key) {
            if (key in state) {
                return { enumerable: true, configurable: true, value: state[key] }
            }
            return Reflect.getOwnPropertyDescriptor(obj, key)
        }
    })
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

> 摘自 `./code/vue3/mini-pinia/lib/pinia.js`

```js
/**
 * 把 store 摊成"可解构的字典"（proxyRefs 思路）：解构 store 不再丢响应式。
 * 过程：从 $state（setup 的原始返回值）遍历——ref / computed 字段保持 ref 形态
 * （解构出来还有 .value，仍是响应式的），action 函数原样保留（不解包成值）。
 * @param {object} store createSetupStore 产出的 store 实例
 * @returns {Object<string, (object|Function)>} 键与 store 一致：state / getter 字段是 ref，action 是函数
 * @example
 *   const cart = useCart() // items 是 ref(3)，add 是函数
 *   const { items, add } = storeToRefs(cart)
 *   items.__v_isRef   // → true（解构后仍是响应式的 ref）
 *   items.value       // → 3
 *   typeof add        // → 'function'（action 不解包，保持可调用）
 */
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

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

> 摘自 `./code/vue3/mini-pinia/lib/pinia.js`

```js
    store.$patch = partial => {
        for (const key of Object.keys(partial)) {
            if (isRef(state[key]) && !Object.is(state[key].value, partial[key])) {
                state[key].value = partial[key] // 逐键 Object.is：赋同值的键连通知都没有
            }
        }
    }
```

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

> 摘自 `./code/vue3/mini-pinia/demo/demo-pinia.html`

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

**依赖追踪的代价要先讲清楚。** 精确唤醒不是免费的：依赖是**运行时读出来的**，`activeEffect` 这类全局状态让时序问题变多——跨 `await` / 异步边界时依赖容易丢，所以 Vue 的渲染 effect 要跟组件生命周期绑在一起（卸载即 stop）；追踪本身也有开销（Proxy 代理 + 依赖表维护），高频读写的热路径要注意。这些在 [Vue3 原理](./Vue3%20原理.md) 篇有完整推导。

**先分清服务端状态与客户端状态。** 请求返回的数据（列表、详情、分页游标）有缓存、有失效、有重试、有竞态，属于**服务端缓存**问题，该交给 TanStack Query / SWR 这类库；真正需要 store 的是"跨模块共享、且客户端自己拥有"的状态（登录用户、主题、草稿、多步表单）。

**什么时候不需要 Pinia。** 状态只被一个子树用到，就放在最近的公共父组件里；一次性的表单状态就放在组件内部，`provide` / `inject` 甚至都不用。加状态库的门槛应该是"状态要被多个**互不相邻**的模块读写"，而不是"状态有点多"。

**为什么 Vue3 侧默认选响应式路线。** 因为判断已经存在于渲染机制里：组件的 render 就是一个 effect，依赖表是现成的，Pinia 只是把 store 接上去。反过来，如果组件渲染机制本身不是响应式的（React），才需要外部的"订阅 + 选择器"补齐判断——两条生态路线各自的取舍，见 [React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)。

## 配套代码

本篇配套在 `./code/vue3/` 下分成两层：`mini-pinia/lib/` 是按职责拆分的纯 JS 实现（零依赖、不碰 DOM，`<script>` 按序加载，全局暴露 `window.MiniPinia`，文件头注释标了覆盖机制与建议断点），`mini-pinia/demo/` 是交互式页面（浏览器直接打开，面板操作 + 实时视图 + 断点提示，`F12 → Sources` 可随时断点）。

**实现文件**（加载顺序即依赖顺序：reactivity → pinia → index）：

| 文件 | 内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-pinia/lib/reactivity.js` | 三层依赖表（target → key → dep）/ `track` / `trigger` / `cleanup` / `effect` / `reactive` / `computed` / `ref`（对应 @vue/reactivity） | 二、响应式底座 |
| `./code/vue3/mini-pinia/lib/pinia.js` | `createPinia` / `setActivePinia` / `defineStore`（id 即命名空间）/ `createSetupStore`（Proxy 解包与 action 绑定）/ `$patch` / `storeToRefs`（对应 pinia） | 三 · 四 |
| `./code/vue3/mini-pinia/lib/index.js` | 对外 API 聚合挂到 `window.MiniPinia`（对应 pinia 包入口） | 全篇入口 |

**交互 demo**：

| demo | 交互内容 | 对应小节 |
| ---- | ---- | ---- |
| `./code/vue3/mini-pinia/demo/demo-pinia.html` | 字段级唤醒计数（改三个字段看谁被唤醒）、computed 缓存计数、store 创建与 ref 解包、action / 直接赋值联动、`storeToRefs` 解构、`$patch` 逐键 Object.is、三条路线对照；页面顶部有全链路断点导览 | 二 · 三 · 四 · 五 |

demo 与正文实测数字一一对应：面板 1 的字段级唤醒（二）、面板 2 的 computed 缓存计数（二）、面板 4 的 action 唤醒（三）、面板 6 的 `$patch` 同值短路（四）、面板 7 的三条路线对照（五）。

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Vue3 原理](./Vue3%20原理.md)
- 下一篇：[性能优化体系与指标](../性能优化/性能优化体系与指标.md)
- 本模块另三篇：[React 高级与原理](../react/React%20高级与原理.md) · [Vue3 原理](./Vue3%20原理.md) · [手写 mini-react](../react/手写%20mini-react.md)
- 响应式完整机制：[Vue3 原理](./Vue3%20原理.md)
- React 侧两条路线（reducer / setState）：[React 状态管理原理与实现](../react/React%20状态管理原理与实现.md)
