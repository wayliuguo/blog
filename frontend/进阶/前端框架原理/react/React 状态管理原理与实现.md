# React 状态管理原理与实现

## 一、状态管理在解决什么

把状态从组件里搬出来之后，真正要回答的其实只有三个问题：

1. **状态放在哪**：一份数据被三个模块读到，它应该属于谁
2. **谁能改它**：是任何地方都能 `set`，还是必须经过一个统一入口
3. **改完通知谁**：这次更新到底影响哪些视图，谁该重渲染、谁不该

三个问题里，前两个是"约定"，第三个是"机制"。React 生态里各家状态库的分野几乎全在第三个问题上——不是因为 API 长得不一样，而是因为**"这次更新跟我有没有关系"这个判断，被放在了不同的层**：

```
reducer + dispatch      判断放在订阅者手里（store 一律通知，选择器自己拦）
setState + 选择器        判断放在订阅者手里，但 store 会先做一次"同值就没变"
signal（依赖追踪）        判断放在 store 内部（依赖表记着"谁读过这个字段"）
```

前两条是 React 侧的主流路线——**Redux（reducer）与 Zustand（setState）**；第三条（signal / 依赖追踪）是 Vue3 侧的回答，见本模块 [Vue3 状态管理原理与实现](../vue3/Vue3%20状态管理原理与实现.md)。这一篇只写前两条：各一份最小实现，跑同一份场景，把"被唤醒的订阅者数"和"实际重渲染的组件数"数出来。

先立住一个贯穿全篇的区分：**被唤醒 ≠ 重渲染**。订阅回调被 store 叫醒，和组件真的重渲染，是两件事——前者可以被选择器拦下来，后者才是你感知到的卡顿。后面所有的对照都绕着这两个数字转。

全部代码在 `../code/react/mini-state/`，零依赖、约 200 行，三个观察脚本 + 14 条断言。

## 二、路线一：reducer 与不可变更新（mini-redux）

### reducer 是一个纯函数

路线一把"谁能改状态"收成一个入口：**只能通过 dispatch 一个 action，让 reducer 算出新状态**。

> 摘自 `../code/react/mini-state/src/redux-like.js`

```js
function createStore(reducer, preloadedState) {
    let state = preloadedState
    let listeners = []

    function getState() {
        return state
    }

    function dispatch(action) {
        state = reducer(state, action)
        // 忠实照搬 Redux：dispatch 一律叫醒所有订阅者，
        // "这次更新跟我有没有关系"由订阅者自己的选择器判断，store 不管。
        for (const listener of listeners.slice()) listener()
        return action
    }
```

reducer 必须是纯函数，所以它只能"返回一个新对象"，不能改入参——这不是风格偏好，而是这套机制成立的前提：状态是不可变的，新旧状态才可以用**引用比较**来回答"变没变"。

> 摘自 `../code/react/mini-state/steps/01-reducer.js`（运行：`npm run step:reducer`）

```js
const cartState = { items: 0 }
const nextCart = cartReducer(cartState, { type: 'cart/setItems', items: 5 })
console.log('返回值 =', JSON.stringify(nextCart), '| 入参被改动 =', JSON.stringify(cartState) !== '{"items":0}')
const untouched = cartReducer(cartState, { type: 'other' })
console.log('不认领的 action → 返回原引用 =', untouched === cartState)
```

实测输出：

```
---- reducer 是纯函数 ----
返回值 = {"items":5} | 入参被改动 = false
不认领的 action → 返回原引用 = true
```

第二行是这套机制里最容易被忽略的一个约定：**没被这个 action 影响的切片，要返回原引用**。有了这条，"根状态变了没有"就能靠一层层的引用比较算出来。

### combineReducers 的引用短路

真实 Redux 里状态是一棵切片树，`combineReducers` 负责逐片比较：

> 摘自 `../code/react/mini-state/src/redux-like.js`

```js
function combineReducers(reducers) {
    const keys = Object.keys(reducers)
    return function rootReducer(state = {}, action) {
        let changed = false
        const next = {}
        for (const key of keys) {
            const prev = state[key]
            const value = reducers[key](prev, action)
            next[key] = value
            // 逐个子 reducer 比较引用：谁换了新对象，才算这一层变了
            if (!Object.is(value, prev)) changed = true
        }
        // 一处都没变就返回原引用，避免"白换一次根对象"
        return changed ? next : state
    }
}
```

效果是：改动一条深层路径，只有**路径上的那几层**会被重建，没被碰到的切片原样带过去。

```
---- dispatch({ type: "cart/setItems", items: 1 }) ----
cart.items = 1
根对象换了新引用 = true
user 切片换了新引用 = false  <- 没被碰到的切片原样带过去
cart 切片换了新引用 = true
订阅者被叫醒 = 1 次 <- dispatch 之后一律通知，不看"这次更新跟谁有关"

---- dispatch 一个没人认领的 action ----
根对象换了新引用 = false  <- combineReducers 逐片比较后短路
订阅者被叫醒 = 2 次（累计） <- 但通知照样发出去了
```

注意最后两行：**"根引用没变"和"没有通知"是两件事**。`combineReducers` 省掉的是这次白重建一棵树的成本；Redux 的 `dispatch` 仍然把所有订阅者全都叫醒了——它不判断"这次更新跟谁有关"。

### 原地改的后果

不可变的另一面是：任何绕过 dispatch 的原地修改，整套机制都感知不到。

```
---- 直接原地改的后果 ----
原地改 cart.items，订阅者被叫醒 = 0 次 <- 不经过 dispatch，没有任何通知
（订阅者看到的还是那个 99，但它没有任何机会知道）
```

状态已经不对了，但屏幕不会变——而且不会有任何报错。这是"不可变"真正要防的事故，不是"多拷贝一次对象"的性能开销。

### 不可变的代价在哪

真实项目里，一次深层更新的手写成本是"把路径上的每一层都摊开重写"：

> 示意片段（无配套脚本）

```js
// 改 cart.items：要重建 cart，再重建根
{ ...state, cart: { ...state.cart, items: 1 } }
// 再深一层（user.profile.address.city）：三层展开
{ ...state, user: { ...state.user, profile: { ...state.user.profile, address: { ...state.user.profile.address, city } } } }
```

这条链正是 `immer` 存在的理由：用 Proxy 记录"你改了哪些路径"，结束时只重建这些路径。写起来是可变风格，产出仍然满足"路径上换新引用、其余原样"的约定。

## 三、路线二：setState 与订阅切片（mini-zustand）

### setState：不必发明 action

路线二保留"订阅切片"的机制，但去掉了 action 这层仪式：直接告诉 store 要改哪几个键，默认浅合并。

> 摘自 `../code/react/mini-state/src/zustand-like.js`

```js
    function setState(partial, replace = false) {
        const next = typeof partial === 'function' ? partial(state) : partial
        if (Object.is(next, state)) return

        if (replace) {
            state = next
        } else {
            let changed = false
            const merged = {}
            for (const key of Object.keys(next)) {
                if (!Object.is(state[key], next[key])) changed = true
                merged[key] = next[key]
            }
            if (!changed) return // 赋的是同值：状态没动，订阅者不必醒
            state = { ...state, ...merged }
        }
        for (const listener of [...listeners]) listener(state)
    }
```

与路线一的差别就集中在"逐键 Object.is"这几行：**赋同值时，连通知都不发**。

```
---- 赋同值：setState({ theme: "light" }) ----
store 层的订阅回调被调用 = 0 次 <- 逐键 Object.is 之后连通知都省了
渲染次数有没有变 = false
```

对比上一节末尾那行"订阅者被叫醒 = 2 次（累计）"——同一个"什么都没变"的更新，路线一通知了，路线二没通知。**这就是"判断放在哪一层"的第一个可观测差异。**

### 选择器：订阅切片，而不是订阅 store

组件不应该关心整棵状态树。它订阅的是"我用到的那一片"：

> 摘自 `../code/react/mini-state/src/harness.js`

```js
function subscribeWithSelector(store, selector, onChange, isEqual = Object.is) {
    let prev = selector(store.getState())
    const unsubscribe = store.subscribe(() => {
        const next = selector(store.getState())
        if (isEqual(prev, next)) return
        prev = next
        onChange(next)
    })
    return unsubscribe
}
```

`isEqual` 默认为 `Object.is`：切片是原始类型时，一次比较就够。真实框架里这一层就是 `useSelector` / `useStore`，位置和作用完全相同。

`mount` 是一个"假组件"：只有订阅、选择器、渲染计数三件事，用来把重渲染次数数出来。

> 摘自 `../code/react/mini-state/src/harness.js`

```js
function mount(store, selector, view, isEqual = Object.is) {
    const instance = { renders: 0, lastSlice: undefined }
    const render = slice => {
        instance.renders++
        instance.lastSlice = slice
        view(slice)
    }
    render(selector(store.getState()))
    instance.unsubscribe = subscribeWithSelector(store, selector, render, isEqual)
    return instance
}
```

> 摘自 `../code/react/mini-state/steps/02-selector.js`（运行：`npm run step:selector`）

```js
const comps = {
    header: mount(store, selectors.header, () => {}),
    badge: mount(store, selectors.badge, () => {}),
    toggle: mount(store, selectors.toggle, () => {})
}
```

实测输出：

```
---- 三个组件各订阅一个切片 ----
挂载后渲染次数（user.name / cart.items / theme）= 1 / 1 / 1

---- setState({ cart: { items: 1 } }) ----
渲染次数 = 1 / 2 / 1  <- 只有订阅 cart.items 的那个重渲染
重渲染 = 0 / 1 / 0

---- 两个键一起改 ----
渲染次数 = 1 / 3 / 2  <- 各订阅者只收到一次通知
```

三个组件里只有一个真的重渲染。但注意这一层的成本：**store 依然把三个订阅回调都跑了一遍**，"谁该重渲染"是每个订阅者自己用选择器比出来的。

### 坑：选择器返回新对象

`Object.is` 这一关很容易被自己弄丢：

> 摘自 `../code/react/mini-state/steps/02-selector.js`

```js
const toObject = state => ({ name: state.user.name })
const byReference = mount(store, toObject, () => {})
const byShallow = mount(store, toObject, () => {}, shallowEqual)
```

两个组件的选择器是同一个 `toObject`，区别只在传不传 `shallowEqual`：

```
---- 坑：选择器返回新对象 ----
挂载后渲染 = 1 / 1
两次无关更新后渲染 = 3 / 1
Object.is：每次都是新对象 → 无关更新也重渲染
shallowEqual：字段逐个比 → 无关更新被拦下
```

一个跟着无关更新重渲染了 3 次，另一个 1 次都没多。这就是 `useSelector` 那条著名的告警的由来（选择器返回值不稳定会造成多余渲染）。两条解法：**让选择器返回扁平的基本类型**，或者**换一个相等判断**：

> 摘自 `../code/react/mini-state/src/harness.js`

```js
function shallowEqual(a, b) {
    if (Object.is(a, b)) return true
    if (typeof a !== 'object' || a === null) return false
    if (typeof b !== 'object' || b === null) return false
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => Object.is(a[key], b[key]))
}
```

只比一层键值——这正是它的分界线，也是"选择器最好返回扁平对象"这条最佳实践的由来。

### 选择器在 store 层也不是"免检"的

还有一笔开销容易被忘记：**选择器每次通知都会跑一遍**，跑完才决定要不要渲染。

> 摘自 `../code/react/mini-state/steps/02-selector.js`

```js
const emptyState = create(() => ({ ...initialState }))
let selectorCalls = 0
const counted = mount(
    emptyState,
    state => {
        selectorCalls++
        return state.cart.items
    },
    () => {}
)
```

实测输出：

```
---- 选择器在 store 层是不是也"免检"？ ----
选择器被调用次数 = 4 （2 次挂载：首次渲染 + 取初值；2 次通知）<- 每次通知都会跑一遍选择器，跑完才决定要不要渲染
```

所以重选择器（遍历大数组、做深比较）本身也是成本，需要用记忆化（reselect 一类）把"输入没变就不重算"补齐。

## 四、绑定层：把 store 接到组件上

前两节讲的是 store 本身。组件这一侧还缺一层：怎么把"订阅 + 选择器"变成 Hooks。真实 React 生态里这一层是 react-redux 的 `Provider` / `useSelector` / `useDispatch`，以及 Zustand 的 `useStore`（内部就是 `useSyncExternalStore`：`getSnapshot` + `subscribe` + selector）。实验台里的绑定层跑在假渲染器（`mount`）上——唯一的"真实"部分就是订阅 + 选择器 + 引用相等。

### Redux 绑定：Provider + useSelector + useDispatch

> 摘自 `../code/react/mini-state/src/binding.js`

```js
function createReduxBinding(store) {
    // Provider 的语义是"把 store 提供给子树"；在假渲染器里，store 由闭包提供即可
    function Provider(render) {
        return render()
    }

    // 组件在渲染期调用：读切片 + 订阅切片，切片没变（引用相等）就不重渲染
    function useSelector(selector, isEqual = Object.is) {
        return mount(store, selector, () => {}, isEqual)
    }

    // 触发更新的唯一入口：直接给出 store.dispatch
    function useDispatch() {
        return store.dispatch
    }

    return { Provider, useSelector, useDispatch }
}
```

真实 react-redux 的 `Provider` 用 context 把 store 传下去，假渲染器里 store 由闭包提供——语义等价，省掉的只是 React 渲染树。组件的写法不变：

> 摘自 `../code/react/mini-state/steps/03-binding.js`

```js
const header = Provider(() => useSelector(selectors.header))
const badge = Provider(() => useSelector(selectors.badge))
const toggle = Provider(() => useSelector(selectors.toggle))
const renders = () => `${header.renders} / ${badge.renders} / ${toggle.renders}`
```

### Zustand 绑定：useStore

> 摘自 `../code/react/mini-state/src/binding.js`

```js
function createZustandBinding(store) {
    const getSnapshot = () => store.getState()
    const subscribe = store.subscribe.bind(store)

    function useStore(selector = state => state, isEqual = Object.is) {
        // 把 store 包成"订阅 + 快照"的形状，交给假渲染器
        return mount({ getState: getSnapshot, subscribe }, selector, () => {}, isEqual)
    }

    return { useStore }
}
```

四步语义与 `useSyncExternalStore` 完全对齐：1. 订阅 store；2. 每次通知后 `getSnapshot` 拿最新状态；3. selector 收敛到切片；4. 引用相等就跳过重渲染。

### 可跑可计数：一次真实的重渲染计数

> 摘自 `../code/react/mini-state/steps/03-binding.js`（运行：`npm run step:binding`）

```js
const dispatch = useDispatch()
dispatch({ type: 'cart/setItems', items: 1 })
```

用同一份状态（`user` / `cart` / `theme`）挂三个组件，实测：

```
---- Redux 绑定：Provider + useSelector + useDispatch ----
挂载后渲染次数（user.name / cart.items / theme）= 1 / 1 / 1

---- dispatch({ type: "cart/setItems", items: 1 }) ----
渲染次数 = 1 / 2 / 1  <- 只有订阅 cart.items 的组件重渲染
重渲染 = 0 / 1 / 0

---- dispatch 一个没人认领的 action ----
根对象换了新引用 = false  <- combineReducers 逐片比较后短路
渲染次数 = 1 / 2 / 1  <- 选择器切片没变，3 个组件都不重渲染

---- Zustand 绑定：useStore（getSnapshot + subscribe + selector）----
挂载后渲染次数 = 1 / 1 / 1

---- setState({ cart: { items: 1 } }) ----
渲染次数 = 1 / 2 / 1  <- 只有订阅 cart.items 的组件重渲染

---- 赋同值：setState({ theme: "light" }) ----
渲染次数 = 1 / 2 / 1  <- 逐键 Object.is 之后连通知都省了

---- 坑：选择器返回新对象 ----
挂载后渲染 = 1 / 1
两次无关更新后渲染 = 3 / 1
Object.is：每次都是新对象 → 无关更新也重渲染
shallowEqual：字段逐个比 → 无关更新被拦下
```

四条信息都能直接读出来：dispatch 之后 `0 / 1 / 0` 的重渲染、没人认领的 action 之后 0 重渲染、赋同值之后 0 重渲染、新对象选择器把 1 次渲染放大成 3 次。**绑定层本身没有魔法，它只是把"订阅 + 选择器 + 引用相等"接到了组件上。**

## 五、两条路线放在一起看

同一份状态、三个组件各订阅一个切片，只改 `cart.items`，把两条路线的"被唤醒 / 重渲染"并排（数字来自 `03-binding.js` 的同一套场景）：

```
场景一：只改 cart.items（1 个组件该动，另外 2 个不该动）
路线                          被唤醒     重渲染     说明
--------------------------------------------------------------------------------------------------------------
reducer + useSelector           3       1       dispatch 一律通知，收敛全靠订阅者手里的选择器
setState + useStore             3       1       不用 action，直接给"要改的键"；通知之后仍靠选择器收敛

场景二：无关更新 / 赋同值（三个组件都不该动）
路线                          被唤醒     重渲染     说明
--------------------------------------------------------------------------------------------------------------
reducer + 不认领的 action         3       0       combineReducers 短路返回原引用 → 0 重渲染，但通知照样发了 3 次
setState 赋同值                  0       0       逐键 Object.is → 连通知都不发，订阅者连"被叫醒"都没有

场景三：选择器返回新对象（改一次 cart.items）
路线                          被唤醒     重渲染     说明
--------------------------------------------------------------------------------------------------------------
选择器返回新对象                      3       3       每次调用都是新对象，Object.is 永远不等 → 无关更新也重渲染
同上 + shallowEqual             3       0       逐字段比 → 切片其实没变，被拦下
```

几张表读下来，可以收成三句话：

**第一，被唤醒 ≠ 重渲染。** 场景一里两条路线都是"3 个订阅者全被叫醒，1 个真的渲染"——多出来的两次是白跑的选择器。要减少的是渲染次数，靠的是引用相等；要减少叫醒次数，得把判断再往下沉一层（signal 那一路是 `1 / 1`，见 [Vue3 状态管理原理与实现](../vue3/Vue3%20状态管理原理与实现.md)）。这两个指标经常被混着说，其实是两条不同的优化路径。

**第二，"有没有变"的判断位置决定下限。** 场景二里，赋同值这件事：reducer 通知了 3 次（判断全靠选择器，它只能拦下重渲染）、setState 通知 0 次（在 store 层就断了）。**判断越靠前，省掉的越多。**

**第三，批处理不是 store 的职责。** 连续 10 次 `setState` 就是 10 次通知 × 3 个订阅者 = 30 次回调、10 次渲染，一次都不会合并。原因不是实现偷懒：每次 `setState` 之后状态都真的变了，store 没有理由猜"你后面还要改"。真正的批处理有两条路——**把多次修改合并成一次函数式 `setState`**，或者**由调度器把渲染推迟到下一个微任务 / 下一帧**（React 的自动批处理就属于后者）。所以"用 Zustand 就不会重复渲染"是个误解：省掉的是 action 与 reducer 的仪式，不是更新频率。

## 六、选型与边界

**先分清服务端状态与客户端状态。** 请求返回的数据（列表、详情、分页游标）有缓存、有失效、有重试、有竞态，属于**服务端缓存**问题，该交给 TanStack Query / SWR 这类库；真正需要 store 的是"跨模块共享、且客户端自己拥有"的状态（登录用户、主题、草稿、多步表单）。把接口数据硬塞进 store，往往最后要手写一遍缓存失效逻辑。

**单一 store 还是多个。** 单一 store 便于调试与持久化，代价是任何改动都要经过根；按域拆多个 store 便于边界清晰，代价是跨域联动要显式写。判断标准不是规模而是**谁能改**：改它的模块超过一个、且需要一致的时间线（可回放、可调试），就适合收成单一 store。

**不可变的成本要提前算。** 路线一在深层更新上的展开成本真实存在，`immer` 是标准解法；但 `immer` 也是成本（Proxy 开销 + 冻结大对象），列表页那种"上千条对象整体替换"的场景要留意。

**什么时候不需要状态库。** 状态只被一个子树用到，就放在最近的公共父组件里；一次性的表单状态就放在表单组件内部。加状态库的门槛应该是"状态要被多个**互不相邻**的模块读写"，而不是"状态有点多"。

**最后回到两条路线的取舍。** reducer 路线的价值是**可回放与可追溯**（每个改动是有名字的 action，能记日志、能时间旅行），代价是样板代码；setState + 选择器路线的价值是**上手成本低、订阅粒度可控**，代价是"收敛责任在调用方"（选择器写不对就会多渲染）。至于更细粒度的 signal 路线，把"判断放在 store 内部"，是 Vue3 侧的回答——见 [Vue3 状态管理原理与实现](../vue3/Vue3%20状态管理原理与实现.md)。三条路线没有优劣，只有"判断放在哪一层"的取舍。

## 配套代码

本篇示例来自 `../code/react/mini-state/`（零依赖，不需要 `npm install`；单测用 Node 内置的 `node:test`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `../code/react/mini-state/src/redux-like.js` | `createStore`（dispatch + subscribe）与 `combineReducers`（逐片比较后短路） | 二、reducer 与不可变更新 |
| `../code/react/mini-state/src/zustand-like.js` | `create`：`setState` 浅合并 + 逐键 `Object.is` | 三、setState 与订阅切片 |
| `../code/react/mini-state/src/harness.js` | `subscribeWithSelector` / `mount` / `shallowEqual`（订阅式渲染器） | 三、setState 与订阅切片 |
| `../code/react/mini-state/src/binding.js` | Redux 绑定（`Provider` / `useSelector` / `useDispatch`）与 Zustand 绑定（`useStore`） | 四、绑定层 |
| `../code/react/mini-state/src/demo.js` | 两条路线共用的状态、reducer 与三个订阅切片 | 五、两条路线对照 |
| `../code/react/mini-state/src/index.js` | 对外出口 | 二 · 三 · 四 |
| `../code/react/mini-state/steps/01-reducer.js` | reducer 纯函数、引用短路、原地改的后果 | 二、reducer 与不可变更新 |
| `../code/react/mini-state/steps/02-selector.js` | 选择器 + 引用相等，数重渲染次数 | 三、setState 与订阅切片 |
| `../code/react/mini-state/steps/03-binding.js` | 绑定层重渲染计数（可跑可计数的主脚本） | 四、绑定层 |
| `../code/react/mini-state/test/redux.test.js` | `createStore` / `combineReducers` 的 4 条断言 | 二、reducer 与不可变更新 |
| `../code/react/mini-state/test/zustand.test.js` | `setState` 浅合并与逐键比较的 5 条断言 | 三、setState 与订阅切片 |
| `../code/react/mini-state/test/binding.test.js` | `useSelector` / `useStore` 重渲染计数的 5 条断言 | 四、绑定层 |

运行：`cd code/react/mini-state`，然后

- `npm run step:reducer` / `step:selector` / `step:binding` —— 三个观察脚本
- `npm test` —— 14 个单测

## 参考

- 本模块总结：[总结](../总结.md)
- 本模块面试题：[面试题](../面试题.md)
- 上一篇：[手写 mini-react](./手写%20mini-react.md)
- 下一篇：[Vue3 原理](../vue3/Vue3%20原理.md)
- 本模块另三篇：[React 高级与原理](./React%20高级与原理.md) · [Vue3 原理](../vue3/Vue3%20原理.md) · [手写 mini-vue](../vue3/手写%20mini-vue.md)
- 依赖追踪路线（signal 归 Vue3）：[Vue3 状态管理原理与实现](../vue3/Vue3%20状态管理原理与实现.md)
