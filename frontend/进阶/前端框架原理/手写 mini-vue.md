# 手写 mini-vue

## 一、手写之前：Vue3 的三层架构落到五个目录

`Vue3 原理` 那篇给出的结论是四句话：编译期给节点打静态标记，运行时只比对动态节点；响应式用 Proxy 代理，读时 track、写时 trigger；`createRenderer` 把宿主操作注入平台无关的核心；组件的 render 被包成一个带 scheduler 的 effect，所以同一轮改多次只渲染一次。

结论好记，但有两个问题绕不过去：**"数据一变就知道通知谁"的那张依赖表长什么样？"改三次只渲染一次"到底是谁在排队？**

这一篇换一条路：把这些结论落到一份 1100 行左右、零依赖、能跑、有 26 个单测的实现上。目录结构本身就是分层答案：

```
shared/index.js        类型判断 + ShapeFlags
reactivity/            effect（track / trigger）· reactive / readonly · ref · computed
runtime-core/          vnode · scheduler · renderer（createRenderer）· component · componentProps
runtime-dom/           nodeOps（真实 DOM）· patchProp · createApp
test/fake-dom.js       把浏览器那份 nodeOps 跑在 Node 里的最小 DOM
```

自底向上，每层都能单独跑起来看输出：`step:reactivity` / `step:effect` / `step:renderer` / `step:diff` / `step:component`。

## 二、响应式地基：一张三层的依赖表

整个系统只有三个变量：一张依赖表、一个 effect 栈、一个"当前正在跑的 effect"。

> 摘自 `./code/mini-vue/src/reactivity/effect.js`

```js
const targetMap = new WeakMap()
const effectStack = []
let activeEffect = null
```

`effect` 负责"把函数包成可被追踪的东西"。它做三件事：入栈、**先清掉旧依赖再执行**、出栈。

> 摘自 `./code/mini-vue/src/reactivity/effect.js`

```js
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = [] // 反向记录：我依赖了哪些 dep（stop 时要清理）
        this.active = true
    }

    run() {
        if (!this.active) return this.fn()
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
    // …
}
```

两个容易忽略的设计：**用栈而不是单个变量**，因为 effect 里可能再跑 effect（computed 的 getter、子组件渲染），必须能恢复外层；**`deps` 是反向索引**，每个 effect 记下自己进过哪些 dep，`stop()` 时才知道要退订哪些。

> 摘自 `./code/mini-vue/src/reactivity/effect.js`

```js
function cleanupEffect(effect) {
    for (const dep of effect.deps) dep.delete(effect)
    effect.deps.length = 0
}
```

收集与触发分别落在 get 与 set 上。`track` 是"建表"的过程——`targetMap`（对象）→ `depsMap`（属性）→ `dep`（effect 集合），三层逐级补空：

> 摘自 `./code/mini-vue/src/reactivity/effect.js`

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
        activeEffect.deps.push(dep)
    }
}
```

`trigger` 只有几行，但有两个细节值钱：**遍历前先复制一份**，因为 effect 执行过程中可能增删集合；**跳过自己**，避免"在 effect 里改自己依赖的数据"导致死循环。

> 摘自 `./code/mini-vue/src/reactivity/effect.js`

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

观察脚本把这几件事按顺序摆开：

> 摘自 `./code/mini-vue/steps/01-reactivity.js`（运行：`npm run step:reactivity`）

```js
const log = []
const state = reactive({ count: 0, nested: { deep: 1 }, list: ['a'] })

console.log('==== 1. effect 里读了 count，之后改 count 就会重跑 ====')
effect(() => {
    log.push(`run  count=${state.count}`)
})
```

实测输出：

```
==== 1. effect 里读了 count，之后改 count 就会重跑 ====
首次执行后： ["run  count=0"]
两次修改后： ["run  count=1","run  count=10"] （这一层是同步的，每次 set 都立刻唤醒）
改一个没人依赖的属性： [] （空 = 没触发）

==== 2. 依赖表（谁依赖了哪个对象的哪个属性）====
  {"count":10,"nested":{"deep":999},"list":["a"]}  count → 1 个 effect

==== 3. 深度响应式与惰性收集 ====
还没人读过 nested.deep： [] （空）
读一下 state.nested，此刻才把它代理起来：isReactive = true
有人读过了： ["deep=1000"]

==== 4. Proxy 支持增删属性（Vue2 需要 Vue.set）====
读一个不存在的属性： ["added=undefined"]
新增属性后： ["added=undefined","added=new"]

==== 5. 数组下标也一样 ====
改 list[0]： ["list[0]=a","list[0]=b"]

==== 6. 一个属性可以有多个人依赖 ====
改一次 count： ["run  count=42","A 看到 42","B 看到 42"]
注意第 1 节那个 effect 还活着，所以也一起被唤醒了 —— dep 是一个集合，不是单个回调
```

第 1 节回答了一个常被混淆的问题：**依赖收集只认"读过"**。第 3 节的 `nested.deep` 被改过两次都没人理，因为那一刻它还没被任何 effect 读到；等 `state.nested` 被读一次（此时才惰性代理成 reactive）、effect 里读了 `deep`，才建立联系。第 6 节则说明 dep 是 Set 而不是单个回调——一个属性可以被任意多个 effect 依赖。

`readonly` 那部分留了个"反常识"的点：**只读代理不收集依赖**。原因很简单——不会被 set 的对象永远不会触发 trigger，收集了也没人用。单测把这条固化了：

> 摘自 `./code/mini-vue/test/reactivity.test.js`（运行：`npm test`）

```js
test('readonly：读不收集依赖，写被忽略', () => {
    const raw = { count: 1 }
    const copy = readonly(raw)
    assert.equal(isReadonly(copy), true)
    assert.equal(isReadonly(raw), false)
    assert.equal(isProxy(copy), true)

    effect(() => {
        void copy.count
    })
    resetDebug() // 调试记录里只剩"这次读产生的依赖"，便于断言
    assert.equal(describeDeps(), '  （空）', 'readonly 读属性不收集依赖')
```

## 三、effect 的清理、惰性代理与 computed

### 3.1 分支切换：旧依赖必须被清掉

`ReactiveEffect.run()` 里那句 `cleanupEffect(this)` 常被当成优化细节略过，但它决定的是正确性。想象一个 effect 里写 `flag ? a : b`：第一次收集了 `flag` 与 `a`，切到 `b` 分支后，如果 `a` 的依赖还在，**改 `a` 会触发一次结果完全没变的渲染**。清理后重新收集，依赖表才始终等于"这次真正读了什么"。

> 摘自 `./code/mini-vue/steps/02-effect-scheduler.js`（运行：`npm run step:effect`）

```js
effect(() => {
    // 每次执行都会重新收集依赖；上一次分支上的依赖要被清理掉
    runs.push(branch.flag ? `a=${branch.a}` : `b=${branch.b}`)
})
```

实测输出：

```
==== 2. 分支切换：旧依赖必须被清掉 ====
  切分支后： ["b=2"]
  改 a（旧分支）： [] （空 = 清理生效）
  改 b（新分支）： ["b=200"]

==== 3. stop：手动断开全部依赖 ====
  停止后改 n： [0,1] （最后一次变化没被收到）
```

`stop` 用的是同一套反向索引：把 effect 从它待过的每个 dep 里摘掉，再把 `active` 置 false。组件卸载时就是靠它——否则组件已经不在界面上，更新还会继续来。

### 3.2 惰性深度代理：访问到才代理

`reactive` 的 getter 里做了两件事：收集依赖、把"值是对象"的属性继续代理。后一件事是**惰性**的——不是一开始就递归遍历整棵树。

> 摘自 `./code/mini-vue/src/reactivity/reactive.js`

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
```

`reactive` 本身很短，但**缓存那三行是必须的**：同一对象每次访问都新建 Proxy，依赖就会收集到不同的 dep 上，触发时自然对不上号。

> 摘自 `./code/mini-vue/src/reactivity/reactive.js`

```js
    const existing = reactiveMap.get(target)
    if (existing) return existing

    const proxy = new Proxy(target, mutableHandlers)
    reactiveMap.set(target, proxy)
    return proxy
```

### 3.3 ref：Proxy 代理不了基本类型

`reactive` 只接受对象，所以基本类型要用一个类包起来，靠 `.value` 读写。注意构造时那句"值是对象就转 reactive"——所以 `ref({a: 1}).value.a` 也是响应式的。

> 摘自 `./code/mini-vue/src/reactivity/ref.js`

```js
class RefImpl {
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value
        this.__v_isRef = true
    }
```

而 `proxyRefs` 解决的是体验问题：`setup` 返回的 ref 被包一层 Proxy，模板里写 `count` 而不是 `count.value`。它只解包第一层，嵌套 ref 不递归。

### 3.4 computed：脏标记 + 把 getter 包成 effect

computed 的价值是"没人读就不算"。实现只需要一个布尔值加一处调度：

> 摘自 `./code/mini-vue/src/reactivity/computed.js`

```js
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty) return // 已经是脏的，不用再通知一遍
            this._dirty = true
            trigger(this, 'value') // 叫醒依赖方，它们会在读 value 时触发重算
        })
```

> 摘自 `./code/mini-vue/src/reactivity/computed.js`

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

**依赖变化时不重算，只置脏 + 通知**；真正算什么时候算，由"有人来读"决定。脚本里的 `getterCalls` 计数器把这条看得最清楚：

```
==== 4. computed：惰性求值 + 缓存 ====
  第一次读 total = 20，getter 调用 1 次
  再读一次   total = 20，getter 调用 1 次（命中缓存）
  改了依赖但没读：getter 调用 1 次（不立刻重算，只置脏）
  读的时候才算   total = 30，getter 调用 2 次

==== 5. computed 作为别人依赖的值 ====
  改 price： ["total=60"] （getter 累计 3 次）
  → computed 的 scheduler 只负责"置脏 + 通知"，真正重算发生在被读到时
```

同一个"交给 scheduler 决定何时执行"的机制，在运行时那层被用来做批量更新——见第七节。

## 四、宿主抽象：createRenderer 注入的那 9 个操作

运行时核心不认识 DOM。所有平台相关的动作都由调用方注入，核心只负责"什么时候该调用哪个"：

> 摘自 `./code/mini-vue/src/runtime-core/renderer.js`

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

> 摘自 `./code/mini-vue/src/runtime-dom/nodeOps.js`

```js
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    remove: (child) => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
```

`runtime-dom` 这一层的全部职责就是"把两样东西装到一起"：

> 摘自 `./code/mini-vue/src/runtime-dom/index.js`

```js
const { render, createApp } = createRenderer({ ...nodeOps, patchProp })

// 让 h 在浏览器侧也可以直接用（模板编译产物也是调它）
module.exports = { createApp, render, h, createVNode, nextTick, nodeOps, patchProp }
```

### 实测：同一份 runtime-core，两个宿主

这是"平台无关"最直接的证明。宿主 A 用真实 DOM 的替身（`nodeOps` + 假 DOM），宿主 B 干脆把界面拼成字符串——相当于服务端渲染的雏形。两边跑的是同一个组件定义、同一份 runtime-core。

> 摘自 `./code/mini-vue/steps/03-renderer.js`（运行：`npm run step:renderer`）

```js
// ---------- 宿主 B：不建节点，直接拼字符串 ----------
function stringHost() {
    return {
        createElement: (tag) => ({ tag, attrs: {}, children: [], text: null }),
        createText: (text) => ({ tag: null, text }),
        createComment: (text) => ({ tag: null, text, comment: true }),
        setText: (node, text) => {
            node.text = text
        },
        setElementText: (el, text) => {
            el.text = text
        },
        insert: (child, parent) => {
            parent.children.push(child)
            child.parent = parent
        },
```

实测输出：

```
==== 宿主 A（假 DOM）产物 ====
<div>
  <div class="card">
    <h2>
      "一张卡片"
    </h2>
    <p>
      "同一份 render，两个宿主"
    </p>
  </div>
</div>

==== 宿主 B（字符串）产物 ====
<root><div class="card"><h2>一张卡片</h2><p>同一份 render，两个宿主</p></div></root>

==== 两个宿主的操作次数 ====
  操作               假 DOM   字符串
  createElement        3        3
  createText           0        0
  createComment        0        0
  setText              0        0
  setElementText       2        2
  insert               3        3
  remove               0        0
  nextSibling          0        0
  patchProp            1        1

---- 结论 ----
renderer 全程只调用注入进来的那 9 个函数，所以：
  · 换成假 DOM 就是单测环境（不用 jsdom）
  · 换成字符串拼接就是服务端渲染的雏形
  · 官方把 runtime-core 与 runtime-dom 拆成两个包，原因就在这里
```

两次的调用次数逐项相同。这说明**组件、diff、patch 的逻辑里没有一行假设过"节点是 DOM"**——官方把它拆成两个包，就是这条实测的工程版本；换成小程序、Canvas 也是换一份 `nodeOps` 的事。

## 五、VNode 与 shapeFlag：patch 按位分发

VNode 是普通对象，`shapeFlag` 用一个整数表达两件正交的事：**是元素还是组件**、**孩子是文本还是数组**。

> 摘自 `./code/mini-vue/src/runtime-core/vnode.js`

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

> 摘自 `./code/mini-vue/src/shared/index.js`

```js
const ShapeFlags = {
    ELEMENT: 1, // 0001
    STATEFUL_COMPONENT: 1 << 1, // 0010
    TEXT_CHILDREN: 1 << 2, // 0100
    ARRAY_CHILDREN: 1 << 3, // 1000
    SLOTS_CHILDREN: 1 << 4
}
```

`key` 那一行踩过一次坑。原本写的是 `props ? props.key : null`，看起来没问题——**但有 props 却没有 key 的节点，`props.key` 是 `undefined` 而不是 `null`**。而 `null !== undefined`，于是 `isSameVNodeType` 把它判成"类型变了"，每次更新都整棵重建、监听器全部重挂。单测里表现得很隐蔽：只渲染一次的用例全绿，只有"渲染三次、中间摘掉 `onClick`"那条挂了。修法就是把它归一成 `null`。

分发本身很短，因为它靠位运算把两层判断压成了一次：

> 摘自 `./code/mini-vue/src/runtime-core/renderer.js`

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

`Fragment` 没有自己的节点，所以它用**两个空文本节点夹住自己这一段**当锚点——插入子节点时以尾锚点为参照，删除时把两个锚点一起摘掉。这也是为什么"顶层直接渲染一个数组"不会多出包裹节点：

> 摘自 `./code/mini-vue/src/runtime-core/renderer.js`

```js
    function render(vnode, container) {
        if (vnode == null) {
            if (container._vnode) unmount(container._vnode, true)
        } else {
            // 顶层也允许直接给数组 / 字符串：统一成 VNode 再进 patch
            vnode = normalizeVNode(vnode)
            patch(container._vnode || null, vnode, container, null)
        }
        container._vnode = vnode
    }
```

## 六、列表 diff：头尾同步 + 按 key 配对

Vue3 的列表 diff 是**先对齐头尾、再处理中间乱序**，也就是常说的"双端比较"。前两步便宜且常见：

> 摘自 `./code/mini-vue/src/runtime-core/renderer.js`

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

头尾都没对上时才走"中间乱序"：按 key 建索引，找出哪些还能复用、哪些是新增，再统一搬移。

> 摘自 `./code/mini-vue/src/runtime-core/renderer.js`

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

`key` 只影响"匹配谁"，不参与属性更新，所以它被单独放在 VNode 上而不是 `props` 里。属性更新的三种写法（事件 / DOM property / attribute）也集中在 `patchProp`：

> 摘自 `./code/mini-vue/src/runtime-dom/patchProp.js`

```js
const isOn = (key) => /^on[A-Z]/.test(key)

// 应该写成 property 而不是 attribute 的几个
const SHOULD_USE_PROPERTY = /^(value|checked|selected|disabled|muted)$/

function patchProp(el, key, prevValue, nextValue) {
    if (isOn(key)) {
        const name = key.slice(2).toLowerCase()
        if (prevValue) el.removeEventListener(name, prevValue)
        if (nextValue) el.addEventListener(name, nextValue)
        return
    }
```

### 实测：有 key / 无 key 各改了多少次宿主节点

和 React 那篇一样，断言 diff 最直接的办法是数宿主操作。两个结构完全相同的列表，只差有没有 key：

> 摘自 `./code/mini-vue/steps/04-dom-diff.js`（运行：`npm run step:diff`）

```js
// 每个 <li> 上挂一个 data-id：无 key 时"就地改写"会把它也一起改掉，看得见
const noKey = (items) => h('ul', null, items.map((it) => h('li', { 'data-id': it.id }, it.name)))
const withKey = (items) =>
    h('ul', null, items.map((it) => h('li', { key: it.id, 'data-id': it.id }, it.name)))
```

实测输出：

```
==== 场景一：删掉列表第一项 ====

---- 无 key ----
  场景：[苹果, 香蕉, 橘子] → [香蕉, 橘子]
  宿主操作 5 次：
    · patchProp(<li>, data-id = "b")
    · setElementText(<li>, "香蕉")
    · patchProp(<li>, data-id = "c")
    · setElementText(<li>, "橘子")
    · remove(<li>)

---- 有 key ----
  场景：[苹果, 香蕉, 橘子] → [香蕉, 橘子]
  宿主操作 1 次：
    · remove(<li>)

==== 场景二：把最后一项移到最前（纯重排）====

---- 无 key ----
  宿主操作 6 次：
    · patchProp(<li>, data-id = "c")
    · setElementText(<li>, "橘子")
    · patchProp(<li>, data-id = "a")
    · setElementText(<li>, "苹果")
    · patchProp(<li>, data-id = "b")
    · setElementText(<li>, "香蕉")

---- 有 key ----
  宿主操作 3 次：
    · insert(<li>, append → <ul>)
    · insert(<li>, before <li>)
    · insert(<li>, before <li>)

==== 两次场景汇总 ====
  场景                    无 key   有 key
  删掉第一项                  5        1
  最后一项移到最前            6        3
```

第二组数据比第一组更能说明问题：**无 key 的纯重排，6 次操作全是"改内容"，一个节点都没搬**；有 key 则是 3 次搬移、一次内容都没改。两种写法的 DOM 结果看起来完全一样（都是"橘子、苹果、香蕉"），差别只在过程——而"就地改写"意味着 DOM 被复用、内容被换掉，节点上的输入框内容、焦点、组件内部状态都会串位。

第三点也要说清楚：**有 key 的重排不是零成本**。真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的节点（这里 3 个节点里其实只需搬 1 个）；本实现为了好读简化成"从后往前逐个插"，所以搬运次数偏多。这几条同样固化成了断言：

> 摘自 `./code/mini-vue/test/diff.test.js`（运行：`npm test`）

```js
test('有 key：纯重排只搬移节点，不改内容', () => {
    const reordered = [fruits[2], fruits[0], fruits[1]]
    const { ops, container } = opsOfUpdate(withKey(fruits), withKey(reordered))
    assert.equal(ops.length, 3, '三次搬移')
    assert.equal(ops.every((line) => line.startsWith('insert')), true)
    assert.equal(
        container.childNodes[0].childNodes.map((li) => li.getAttribute('data-id')).join(','),
        'c,a,b'
    )
})
```

## 七、组件：setup、props 与渲染 effect

到这里，前三层终于合上了：**组件的 render 被包成一个 effect**，它读到的响应式数据就是它的依赖。

> 摘自 `./code/mini-vue/src/runtime-core/component.js`

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

`isMounted` 那一个布尔值区分了"挂载"和"更新"两种 patch 签名——`patch(null, subTree)` 与 `patch(prevSubTree, nextSubTree)`，这正是虚拟 DOM 那套"新旧对比"的入口。

而"改三次只渲染一次"就发生在 scheduler 里。它用的是**微任务**，所以整块同步代码跑完、DOM 还是旧的，`nextTick()` 之后才能读到新值：

> 摘自 `./code/mini-vue/src/runtime-core/scheduler.js`

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

`queue.includes(job)` 这一句就是批处理的全部——**同一个组件的 update 在队列里只会出现一次**，所以一轮里改多少次状态，最终都只渲染一次。

props 那层解决的是另一类问题：子组件改父组件传下来的值必须被拦住，但 props 本身还得跟着父组件更新。

> 摘自 `./code/mini-vue/src/runtime-core/componentProps.js`

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

`shallowReadonly` 是这里的关键选型：**浅**只读，所以能拦住"子组件替换整个 prop"，又不妨碍 prop 内部的对象继续响应式。至于 `propsRaw`，是因为只读代理挡不住框架自己更新 props —— 框架拿着一份原始引用直接改，代理自动读到新值。

### 实测：挂载、批处理、只读告警、跳过子渲染、卸载

> 摘自 `./code/mini-vue/steps/05-component.js`（运行：`npm run step:component`）

```js
const Counter = {
    props: { label: String },
    setup(props) {
        const count = ref(0)
        const double = computed(() => count.value * 2)
        return { count, double, inc: () => count.value++ }
    },
    render() {
        renders++
        return h('div', { class: 'counter' }, [
            h('span', null, `${this.label}：count=${this.count}，double=${this.double}`),
            h('button', { onClick: this.inc }, '+1')
        ])
    }
}
```

本文件里的 `renders++` 计数器是观察批处理的手段，实测输出：

```
==== 1. 挂载：setup 返回值 + props 都能在 render 里通过 this 访问 ====
<div>
  <div class="counter">
    <span>
      "计数器：count=0，double=0"
    </span>
    <button>
      "+1"
    </button>
  </div>
</div>

==== 2. 点击按钮：事件 -> 改状态 -> DOM 更新（但不在同一个 tick）====
  点击后：渲染次数 +0，DOM 里还是旧文案：「计数器：count=0，double=0」
  await nextTick() 之后：渲染次数 +1
  DOM 变成「计数器：count=1，double=2」

==== 3. 同一个 tick 改三次，只渲染一次（批处理）====
  三次赋值后立刻看：渲染次数 +0，DOM 仍是「计数器：count=1，double=2」
  await nextTick() 之后：渲染次数 +1
  DOM 变成「计数器：count=3，double=6」
  → 同一个 job 在队列里只会出现一次，所以三次修改只换来一次渲染

==== 4. props 是只读的：子组件改父组件传下来的值会被告警 ====
  控制台告警： Set operation on key "title" failed: target is readonly.
  界面没被改动，还是「父组件给的」

==== 5. 子组件只在 props 变化时才重渲染 ====
  父组件重新渲染后：子组件渲染次数 +0，父组件文案「父组件 n=1」
  → 子组件的 props 与插槽都没变，跳过一次没有意义的子渲染

==== 6. 卸载：渲染 effect 必须被停掉 ====
  卸载后改状态：渲染次数 +0（0 = effect 已被 stop，不会泄漏）
```

四个能直接下判断的结论：

1. **`this.count` 里没有 `.value`**。`setup` 返回的 ref 被 `proxyRefs` 包过，模板（这里直接写 render 函数）拿到的是解包后的值。
2. **批处理不是额外实现**。它就是"渲染交给调度器"的自然结果：三次 `vm.count = n` 都只是把同一个 job 往队列里推，微任务真正执行时才渲染一次。
3. **只读是浅只读**。子组件 `props.title = '我要改'` 被代理拦下并告警，但父组件传新值照常生效。
4. **卸载要 stop 渲染 effect**。这是第 3 节 `stop` 的真实用途：组件已经不在了，依赖还在的话更新会一直来，就是内存泄漏。

顺带说明第 5 条为什么能跳：父组件重渲染时会走 `updateComponent`，那里先比一次 props 与插槽，都没变就直接 return，连 `instance.update()` 都不调。

## 八、这份实现省略了什么

和真实 Vue3 比，下面这些都是有意留白的：

- **编译层完全没有**：没有模板解析、没有静态标记 / PatchFlags、没有 `<script setup>` 与 scoped 样式——本篇吃的是"编译产物"（render 函数与 VNode），编译本身见 `Vue3 原理`
- **diff 的收尾优化**：没有最长递增子序列（搬移次数偏多）、没有静态提升 / 缓存事件、没有 `patchFlag` 驱动的定向更新
- **组件能力**：没有生命周期钩子注册、没有 `provide / inject`、没有 `onMounted` 之类的 `instance.xxx` 数组、没有 `emit` 之外的事件修饰
- **响应式 API**：没有 `shallowReactive` / `toRaw` / `markRaw` / `watch` / `watchEffect` / `effectScope`，`computed` 不支持 setter，`ref` 的 `RefImpl` 没做 getter / setter 类型分流
- **渲染模式**：没有 `Teleport` / `Suspense` / `KeepAlive`、没有 SSR 水合、没有 `Transition`
- **列表与调度**：`flushJobs` 没有按组件 id 排序（真实 Vue 保证父先于子），没有 `pre` / `post` 刷新队列

这些都不是新机制，而是在这四层上各自加的一层：PatchFlags 是"编译期多写一个数字、运行时少跑一段比较"，`Teleport` 是换一个插入容器，`provide / inject` 是沿实例的 `parent` 链向上查。骨架对了，加层是顺序问题。

## 配套代码

本篇示例来自 `code/mini-vue`（零依赖，不需要 `npm install`；单测用 Node 内置的 `node:test`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/mini-vue/src/shared/index.js` | 类型判断与 `ShapeFlags` | 五、VNode 与 shapeFlag |
| `./code/mini-vue/src/reactivity/effect.js` | `ReactiveEffect` / `effect` / `track` / `trigger` / `stop` | 二、响应式地基 |
| `./code/mini-vue/src/reactivity/reactive.js` | `reactive` / `readonly` / `shallowReadonly` 与代理缓存 | 三、effect 的清理 |
| `./code/mini-vue/src/reactivity/ref.js` | `RefImpl` / `proxyRefs` / `unref` | 三、effect 的清理 |
| `./code/mini-vue/src/reactivity/computed.js` | 脏标记 + scheduler 实现的惰性 `computed` | 三、effect 的清理 |
| `./code/mini-vue/src/reactivity/index.js` | reactivity 层出口 | 二 · 三 |
| `./code/mini-vue/src/runtime-core/vnode.js` | `createVNode` / `h` / `shapeFlag` / `normalizeVNode` | 五、VNode 与 shapeFlag |
| `./code/mini-vue/src/runtime-core/scheduler.js` | `queueJob` / `flushJobs` / `nextTick`（微任务批处理） | 七、组件 |
| `./code/mini-vue/src/runtime-core/renderer.js` | `createRenderer`：patch 分发、列表 diff、组件挂载与卸载 | 四 · 五 · 六 · 七 |
| `./code/mini-vue/src/runtime-core/component.js` | 组件实例、`setup` 代理、渲染 effect | 七、组件 |
| `./code/mini-vue/src/runtime-core/componentProps.js` | `props` 浅只读、`attrs` 分流、`slots` 归一 | 七、组件 |
| `./code/mini-vue/src/runtime-dom/nodeOps.js` | 浏览器宿主操作（真实 DOM） | 四、宿主抽象 |
| `./code/mini-vue/src/runtime-dom/patchProp.js` | 事件 / property / attribute 三种属性写法 | 六、列表 diff |
| `./code/mini-vue/src/runtime-dom/index.js` | `createRenderer({ ...nodeOps, patchProp })` 与 `createApp` | 四、宿主抽象 |
| `./code/mini-vue/steps/01-reactivity.js` | 依赖收集与触发、惰性深度代理、增删属性 | 二、响应式地基 |
| `./code/mini-vue/steps/02-effect-scheduler.js` | scheduler、分支清理、`stop`、`computed` 惰性 | 三、effect 的清理 |
| `./code/mini-vue/steps/03-renderer.js` | 两个宿主跑同一份 render，对调用次数 | 四、宿主抽象 |
| `./code/mini-vue/steps/04-dom-diff.js` | 有 / 无 key 的宿主操作次数对照 | 六、列表 diff |
| `./code/mini-vue/steps/05-component.js` | 挂载、批处理、只读 props、跳过子渲染、卸载 | 七、组件 |
| `./code/mini-vue/test/fake-dom.js` | 让 `nodeOps` 能跑在 Node 里的最小 DOM + 宿主操作记录器 | 四 · 六 |
| `./code/mini-vue/test/reactivity.test.js` | 响应式 11 条断言（含 readonly 不收集依赖） | 二 · 三 |
| `./code/mini-vue/test/renderer.test.js` | 挂载 / 属性 / 事件 / Fragment 7 条断言 | 五、VNode 与 shapeFlag |
| `./code/mini-vue/test/diff.test.js` | 列表 diff 8 条断言（含宿主操作序列） | 六、列表 diff |

运行：`cd code/mini-vue`，然后

- `npm run step:reactivity` / `step:effect` / `step:renderer` / `step:diff` / `step:component` —— 五个观察脚本
- `npm test` —— 26 个单测

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[手写 mini-react](./手写%20mini-react.md)
- 下一篇：[性能指标与评估](../性能优化/性能指标与评估.md)
- 本模块另三篇：[React 高级与原理](./React%20高级与原理.md) · [Vue3 原理](./Vue3%20原理.md) · [手写 mini-react](./手写%20mini-react.md)
