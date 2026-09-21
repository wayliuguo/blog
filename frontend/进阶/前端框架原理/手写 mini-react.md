# 手写 mini-react

## 一、手写之前：React 在回答什么问题

React 高级与原理那篇给出的结论是四句话：渲染分 render / commit 两阶段；Fiber 用链表把大更新拆成可中断的小单元；diff 靠三条启发式把复杂度压到 O(n)；Hooks 是按调用顺序挂在 Fiber 上的链表。

结论好记，但有个问题绕不过去：**"可中断"到底是怎么实现的？"按调用顺序存取"错位了会怎样？**

这一篇换一条路：把这些结论落到一份 400 行、能跑、有单测的实现上。整个实现只有五层，每层都能单独跑起来看输出：

```
element.js      createElement → 一棵普通对象树
host.js         宿主抽象：6 个操作（浏览器 DOM / Node 假 DOM）
internal.js     渲染器状态：roots / wipRoot / nextUnitOfWork
reconciler.js   Fiber 链表 · workLoop 时间切片 · diff · 两阶段提交
hooks.js        useState / useEffect，挂在 Fiber 上的链表
```

## 二、元素：createElement 产出的只是对象

`createElement` 做的事非常少：把参数摆成 `{ type, key, props }`。文本与数字被包装成 `TEXT_ELEMENT` 节点，`key` 独立成字段而不进 `props`——因为它只影响 diff 的匹配，不参与属性更新。

> 摘自 `./code/mini-react/src/element.js`

```js
function createElement(type, config, ...children) {
    const { key = null, ...props } = config || {}
    props.children = children
        .flat(Infinity) // <ul>{items.map(...)}</ul> 会传进来数组，先拍平
        .filter(child => child !== null && child !== undefined && child !== false)
        .map(child =>
            typeof child === 'object' ? child : createTextElement(String(child))
        )
    return { type, key, props }
}
```

> 摘自 `./code/mini-react/src/element.js`

```js
function createTextElement(text) {
    return { type: TEXT_ELEMENT, key: null, props: { nodeValue: text, children: [] } }
}
```

> 摘自 `./code/mini-react/steps/01-element.js`（运行：`npm run step:element`）

```js
const vdom = h(
    'ul',
    { className: 'list' },
    h('li', null, '苹果'),
    h('li', null, 1 + 1),
    h(Fragment, null, h('li', null, '橘子'))
)
```

实测输出：

```
---- createElement 的产物 ----
<ul className="list">
  <li>
    文本 "苹果"
  </li>
  <li>
    文本 "2"
  </li>
  <Fragment>
    <li>
      文本 "橘子"
    </li>
  </Fragment>
</ul>

---- 几个关键字段 ----
type            : "ul"
key             : null
props.className : "list"
props.children  : 3 个子节点（文本也被包成节点）
children[0].type: "li"
children[1].type: "li"
数字 1+1 被转成了: "2"
children[2].type: Symbol(Fragment)
```

三件事值得留意：**children 统一进 `props.children`**（和 React 一致，所以 diff 时不用处理两套结构）；**文本也是节点**（`1 + 1` 变成 `"2"`，所以"改文案"在 diff 眼里是"更新一个节点"）；**Fragment 只是一个 Symbol**（它不产生任何真实节点，这点在下一层会看得更清楚）。

## 三、宿主抽象：渲染器不认识 DOM

渲染器全程只调用这几个操作。把这一组换掉就换了一个平台——浏览器用真 DOM，Node 里用假 DOM 才能跑单测。

> 摘自 `./code/mini-react/src/host.js`

```js
function browserHost() {
    return {
        createInstance: type => document.createElement(type),
        createTextInstance: text => document.createTextNode(text),
        appendChild: (parent, child) => parent.appendChild(child),
        insertBefore: (parent, child, before) => parent.insertBefore(child, before),
        removeChild: (parent, child) => parent.removeChild(child),
        setProperty: (node, name, value) => {
            if (name === 'children') return
            if (name === 'nodeValue') {
                node.nodeValue = value
                return
            }
            if (value === null || value === undefined || value === false) node.removeAttribute(name)
            else node.setAttribute(name, value)
        }
    }
}
```

Node 环境下的假 DOM 只有两个概念：元素节点（`type` + `attrs`）与文本节点（`text`），实现完全一样的 6 个方法。这不是为了省事——**它恰好证明了渲染器的平台无关性**：`host.js` 末尾一行根据环境二选一。

> 摘自 `./code/mini-react/src/host.js`

```js
const host = typeof document !== 'undefined' ? browserHost() : nodeHost()
```

第一次渲染（还没有 diff）跑出来是这样：

> 摘自 `./code/mini-react/steps/02-mount.js`（运行：`npm run step:mount`）

```js
function App() {
    return h(
        Fragment,
        null,
        h(Header, { title: '待办清单' }),
        h(
            'ul',
            null,
            h('li', { key: 'a' }, '写文档'),
            h('li', { key: 'b' }, '跑单测')
        )
    )
}
```

实测输出：

```
---- 渲染后 ----
<div>
  <h1 className="title">
    "待办清单"
  </h1>
  <ul>
    <li>
      "写文档"
    </li>
    <li>
      "跑单测"
    </li>
  </ul>
</div>
```

容器里只有 `h1` 和 `ul`：`App`、`Header`、`Fragment` 都是"逻辑节点"，没有自己的 DOM。这个事实在 diff 与 commit 里会反复出现——**找一个节点的父 DOM，必须沿着 `parent` 指针往上走，直到遇到一个真有 DOM 的祖先**：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function domParentOf(fiber) {
    let parent = fiber.parent
    while (parent && !parent.dom) parent = parent.parent
    return parent ? parent.dom : null
}
```

## 四、Fiber 链表：把递归拆成工作单元

如果用递归渲染，一旦开始就必须跑完——中途没法把主线程让出去。所以 React 不递归：每个 Fiber 有 `child` / `sibling` / `parent` 三个指针，遍历变成了一条可以被随时打断的循环。

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function performUnitOfWork(fiber) {
    if (fiber.effectTag === 'PLACEMENT') fiber.dom = createDom(fiber)

    if (typeof fiber.type === 'function') updateFunctionComponent(fiber)
    else reconcileChildren(fiber, fiber.props.children)

    // 深度优先：先孩子，没孩子找兄弟，都没了就回到父节点继续找兄弟
    if (fiber.child) return fiber.child
    let next = fiber
    while (next) {
        if (next.sibling) return next.sibling
        next = next.parent
    }
    return null
}
```

一个函数只做"一件事 + 找下一个"，这就是"工作单元"的全部含义。它顺手解释了 `createDom` 里那两个 `return null`：**函数组件与 Fragment 不创建 DOM**，它们的 `dom` 保持为 `null`。

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function createDom(fiber) {
    if (fiber.type === 'ROOT' || fiber.type === Fragment) return null
    if (typeof fiber.type === 'function') return null
    if (fiber.type === TEXT_ELEMENT) return host.createTextInstance(fiber.props.nodeValue)
```

驱动的循环只有八行：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function workLoop(dl) {
    let shouldYield = false
    while (state.nextUnitOfWork && !shouldYield) {
        state.nextUnitOfWork = performUnitOfWork(state.nextUnitOfWork)
        shouldYield = dl.timeRemaining() < 1
    }
    if (!state.nextUnitOfWork && state.wipRoot) commitRoot()
}
```

`flushWork()` 是它的同步版本（不受时间片限制，一次跑完），脚本与单测用后者才能复现：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
state.pump = () => {
    if (state.manual) return // 交给调用方驱动 workLoop（用来观察切片行为）
    if (state.sync) flushWork()
    else requestIdleCallback(workLoop)
}
```

### 实测：切片切掉了什么

光看代码看不出"可中断"值多少钱，得量。`step:slice` 渲染一个 4000 项的列表（8002 个宿主节点），对照组是完全不许让出的 `flushWork`，实验组是每次只给 2ms 的假 deadline。

> 摘自 `./code/mini-react/steps/05-slice.js`（运行：`npm run step:slice`）

```js
function budgetDeadline(budget) {
    const start = performance.now()
    return { timeRemaining: () => budget - (performance.now() - start) }
}
```

> 摘自 `./code/mini-react/steps/05-slice.js`

```js
function runSliced() {
    const container = host.createInstance('div')
    render(h(List, { n: N }), container, { manual: true }) // 不自己调度，由下面手动驱动

    const t0 = performance.now()
    const durations = []
    while (state.nextUnitOfWork) {
        const sliceStart = performance.now()
        workLoop(budgetDeadline(BUDGET))
        durations.push(performance.now() - sliceStart)
    }
    return {
        ms: performance.now() - t0,
        durations,
        longest: Math.max(...durations),
        nodes: countNodes(container)
    }
}
```

实测输出（预热后取 3 轮中位数）：

```
渲染一个 4000 项的列表（宿主节点 8002 个），取 3 轮中位数

---- 一次跑完 ----
  总耗时        18.1 ms
  最长一次阻塞  18.1 ms（= 总耗时，中途主线程完全没法响应输入）

---- 每次只给 2ms 时间片 ----
  总耗时        19.6 ms
  片数          11
  最长一次阻塞  5.8 ms
  每片耗时
    # 1    6.8 ms  ← 含 List 组件函数：造 4000 个 vnode，这一整块不可切分
    # 2    1.4 ms
    # 3    1.0 ms
// …
    #11    9.2 ms  ← 含 commit 阶段：所有 DOM 写入，不可中断
```

三个能直接下判断的结论：

1. **切片不省时间**。节点数一样是 8002，总耗时 18.1 → 19.6 ms（+8%）。
2. **换来的是响应性**。最长一次阻塞从 18.1 ms 降到 5.8 ms，输入与点击才有机会插进来。说到底它是把"一次长卡顿"换成"多次短卡顿"。
3. **切片有边界，而且边界很具体**。第一片特别长，因为它包含执行 `List` 组件函数——造 4000 个 vnode 是一整件事，不可再分；最后一片特别长，因为它后面紧跟 commit，所有 DOM 写入必须一次做完。**组件自己算得久，时间切片救不了它**，那是 memo 与虚拟列表要解决的问题。

## 五、diff：三条启发式与 key 的真实作用

diff 入口是 `reconcileChildren`，它只做一件事：给每个子节点算出一个 `effectTag`（`PLACEMENT` / `UPDATE` / `DELETION`）。

匹配身份由这里决定：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function identityOf(key, index) {
    return key === null || key === undefined ? `i:${index}` : `k:${key}`
}
```

**有 key 用 key，没 key 退化成下标**——这是"index 陷阱"的源头，不是实现偷懒，而是没有别的信息可用。旧子节点先按身份建索引，然后逐个新元素去查：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
    const matched = oldByIdentity.get(identityOf(element.key, index))
    if (matched) reused.add(matched)

    let newFiber = null
    // 启发式一 + 二：类型相同就复用 DOM 只更 props，类型不同整棵重建
    if (matched && matched.type === element.type) {
        newFiber = {
            type: matched.type,
            key: element.key,
            props: element.props,
            dom: matched.dom,
            parent: wipFiber,
            alternate: matched,
            effectTag: 'UPDATE'
        }
    } else {
        newFiber = {
            type: element.type,
            key: element.key,
            props: element.props,
            dom: null,
            parent: wipFiber,
            alternate: null,
            effectTag: 'PLACEMENT'
        }
        if (matched) {
            matched.effectTag = 'DELETION'
            state.deletions.push(matched)
        }
    }
```

`alternate` 指向旧树上的对应 Fiber，这是双缓存的接口：新树在内存里长好了才一次性切过去，构建中途被打断也不影响屏幕。最后要处理"新列表里没出现过的旧节点"：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
    // 新列表里没出现过的旧节点，一并删除
    for (const old of oldChildren) {
        if (reused.has(old)) continue
        old.effectTag = 'DELETION'
        state.deletions.push(old)
    }
```

### 实测：数宿主操作

断言 diff 最直接的办法是数"这一轮真实发生了多少次宿主操作"。两个结构完全相同的列表，只差有没有 key：

> 摘自 `./code/mini-react/steps/03-keyed-diff.js`（运行：`npm run step:keyed`）

```js
// 无 key：只能按下标对号入座
const noKey = items => h('ul', null, ...items.map(it => h('li', null, it.name)))
// 有 key：身份跟着数据走
const withKey = items => h('ul', null, ...items.map(it => h('li', { key: it.id }, it.name)))
```

实测输出（场景：删掉列表第一项「苹果」）：

```
==== 删掉列表第一项，看宿主操作 ====

---- 无 key（按下标匹配）：删掉「苹果」----
  1. removeChild <li> ← <ul>
  2. setProperty 文本"苹果".nodeValue = "香蕉"
  3. setProperty 文本"香蕉".nodeValue = "橘子"

---- 有 key（按身份匹配）：删掉「苹果」----
  1. removeChild <li> ← <ul>

---- 结论 ----
无 key：3 次宿主操作；有 key：1 次
无 key 时，剩下的元素被"就地改写"成新文案，末尾多出来的节点才被删掉。
真实页面上，被改写的那个 <li> 内部的输入框内容、焦点、组件状态都会串位。
```

**两种写法的 DOM 结果看起来完全一样**（都是"香蕉、橘子"），差别只在过程：无 key 时第 1 个 `<li>` 被改写成"香蕉"、第 2 个被改写成"橘子"、最后一个删掉。如果那个 `<li>` 内部有输入框、有组件状态，被"就地改写"意味着它的 DOM 被复用而内容被换掉——这才是线上事故的来源。

key 相同就复用、只更属性这条也固化成断言了：

> 摘自 `./code/mini-react/test/diff.test.js`（运行：`npm test`）

```js
test('无 key：删掉第一项时，剩下的元素被就地改写', () => {
    const { ops } = opsOfUpdate(noKey(fruits), noKey(fruits.slice(1)))
    assert.deepEqual(ops, [
        'remove <li> from <ul>',
        '"苹果".nodeValue = "香蕉"',
        '"香蕉".nodeValue = "橘子"'
    ])
})
```

## 六、commit：不可中断的那一段

render 阶段只算 `effectTag`，真正碰宿主环境的是 commit。顺序固定：先处理删除，再按 `child` / `sibling` 走一遍树，最后跑 effect。

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function commitRoot() {
    for (const fiber of state.deletions) commitDeletion(fiber, domParentOf(fiber))
    commitWork(state.wipRoot.child)
    const root = state.wipRoot
    state.roots.set(root.dom, root) // 双缓存切换：wip 变 current，并按容器记住
    state.wipRoot = null
    runEffects(root) // 副作用统一在 commit 之后执行
}
```

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function commitWork(fiber) {
    if (!fiber) return

    if (fiber.effectTag === 'PLACEMENT') {
        if (fiber.dom) insertDom(fiber)
        // 函数组件 / Fragment 没有自己的 DOM，交给它下面的孩子去插
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
```

注意 `commitWork` 是**递归**的，而且没有 deadline 参数——这解释了第四步实测里最后一片为什么那么长：commit 阶段就是不可中断的。

插入位置要找"右边最近的兄弟"，这样才不需要移动已存在的节点：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function insertDom(fiber) {
    const parentDom = domParentOf(fiber)
    let sibling = fiber.sibling
    while (sibling) {
        if (sibling.dom) return host.insertBefore(parentDom, fiber.dom, sibling.dom)
        sibling = sibling.child
    }
    host.appendChild(parentDom, fiber.dom)
}
```

`state.roots` 那个 `Map` 对应真实 React 的 `createRoot(container)`：**根是按容器区分的**。这点在实现时踩过一次——最初把"当前根"存成单个全局变量，于是往第二个容器渲染时会去复用第一个容器的 DOM，第二次渲染看起来什么都没发生。渲染进另一个容器，本来就是另一棵树。

## 七、Hooks：挂在 Fiber 上的链表

状态不放在任何全局变量里，而是按调用顺序存进当前 Fiber 的 `hooks` 数组。`useState` 的核心是那两行"消费队列"：

> 摘自 `./code/mini-react/src/hooks.js`

```js
function useState(initial) {
    const oldHook = currentHook()
    const hook = {
        state: oldHook ? oldHook.state : typeof initial === 'function' ? initial() : initial,
        queue: [] // 还没被消费的更新
    }

    // 把上次渲染期间攒下的更新，按顺序作用到当前状态上
    for (const action of oldHook ? oldHook.queue : []) {
        hook.state = typeof action === 'function' ? action(hook.state) : action
    }

    const setState = action => {
        hook.queue.push(action)
        scheduleRerender(state.wipFiber) // 重渲染"这个组件所属的那棵树"
    }

    state.wipFiber.hooks.push(hook)
    state.hookIndex++
    return [hook.state, setState]
}
```

`useEffect` 只是把依赖比较的结论记成 `hasEffect`，真正执行留到 commit 之后：

> 摘自 `./code/mini-react/src/hooks.js`

```js
function useEffect(fn, deps) {
    const oldHook = currentHook()
    const hook = {
        fn,
        deps,
        cleanup: oldHook ? oldHook.cleanup : undefined,
        hasEffect: false
    }

    // 没传 deps = 每次渲染都跑；传了数组 = 逐项浅比较，有一项变了才跑
    if (!oldHook || deps === undefined) hook.hasEffect = true
    else if (deps.some((dep, i) => dep !== oldHook.deps[i])) hook.hasEffect = true

    state.wipFiber.hooks.push(hook)
    state.hookIndex++
}
```

> 摘自 `./code/mini-react/src/hooks.js`

```js
function runEffects(fiber) {
    if (!fiber) return
    for (let f = fiber; f; f = f.sibling) {
        for (const hook of f.hooks || []) {
            if (!hook.hasEffect) continue
            if (hook.cleanup) hook.cleanup()
            hook.cleanup = hook.fn()
            hook.hasEffect = false
        }
        runEffects(f.child)
    }
}
```

### 实测：队列语义、执行时机与批处理

> 摘自 `./code/mini-react/steps/04-hooks.js`（运行：`npm run step:hooks`）

```js
function Counter({ step }) {
    const [count, setCount] = useState(0)
    bump = setCount

    useEffect(() => {
        log.push(`effect   count=${count}`) // 首次渲染后、count 变化后执行
        return () => log.push(`cleanup  count=${count}`) // 依赖变化或卸载时先清理
    }, [count])

    return h('p', null, `count = ${count}，步长 ${step}`)
}
```

实测输出（节选三段）：

```
==== 2. 同步模式：连续两次 setState ====
结果： count = 6，步长 1
effect 日志： ["cleanup  count=0","effect   count=5","cleanup  count=5","effect   count=6"]
→ 函数式更新读到的是队列里的前一个结果（5 → 6），不是渲染时的旧值；
  同步模式下每次 setState 立刻渲染一轮，所以日志里有两组 cleanup/effect。

==== 3. 默认（异步）调度：同一轮里的两次 setState 被合并 ====
结果： count = 2，步长 1
effect 日志： ["cleanup  count=0","effect   count=2"]
→ 两次更新进了同一个队列，重渲染只发生一次，effect 也只按最终值跑一次。

==== 4. 组件被卸载 ====
effect 日志： ["cleanup  count=2"]
→ 卸载时执行清理函数，定时器/订阅这类副作用才不会泄漏
```

第一段回答一个高频疑问：`bump(5)` 之后紧接着 `bump((c) => c + 1)`，为什么结果是 6 而不是 1？因为 `setState` 把动作推进队列，下次渲染时**按顺序全部作用到旧状态上**，所以函数式更新看到的是 5 而不是上一轮的 0。

第二段是批处理。它不是额外实现的——**批处理是"把渲染交给调度器"的自然结果**：两次 `setState` 都只是往同一个队列里推，等 `requestIdleCallback` 真跑起来时才渲染，于是只渲染一次。反过来，`sync: true` 让每次 `setState` 都立刻 `flushWork`，重复渲染就出现了。这也说明为什么平时感觉不到这件事、而一旦在 React 之外的地方（`setTimeout`、原生事件）改状态就要手动批处理。

第三段是 effect 的清理时机：依赖变化先 `cleanup` 再 `effect`，组件卸载则把整棵子树上的 cleanup 都跑一遍。这一步在 `commitDeletion` 里：

> 摘自 `./code/mini-react/src/reconciler.js`

```js
function commitDeletion(fiber, parentDom) {
    runCleanups(fiber) // 先跑完整棵子树的 effect 清理
    removeDom(fiber, parentDom)
}
```

最后看一下 Fiber 树本身——`printFibers` 把 `roots` 里那棵树打印出来：

```
- ROOT  dom:<div>
  - Counter  dom:（无）  hooks:[state=0, effect]
    - p  dom:<p>
      - TEXT_ELEMENT  dom:"count = 0，步长 2"
```

`Counter` 没有 DOM，hooks 挂在它身上：一个 state 节点、一个 effect 节点，顺序就是调用顺序。

## 八、反例：Hooks 放进 if 里

"不能在条件/循环里调用 Hooks"这条规则，看过链表实现就不需要背了——它只是"链表只能按顺序对上号"的必然结果。

> 摘自 `./code/mini-react/steps/04-hooks.js`

```js
function Bad({ flag }) {
    if (flag) useState('只在 flag=true 时读一次')
    const [label] = useState('本来应该是我')
    return h('p', null, `拿到的是：${label}`)
}
```

实测输出：

```
==== 6. 反例：useState 放进 if，状态会串位 ====
flag=true  → 拿到的是：本来应该是我
flag=false → 拿到的是：只在 flag=true 时读一次
→ 第二个 useState 读到了链表上"第 0 个"旧节点，状态整体错位一格。
  规则不是"React 要求你写在顶层"，而是"链表只能按顺序对上号"。
```

`flag` 从 true 变 false 后，第二个 `useState` 读的是链表第 0 个节点（旧的那句"只在 flag=true 时读一次"），于是"该显示自己状态"的组件拿到了别人的状态。同样的测试在单测里也固化了：

> 摘自 `./code/mini-react/test/hooks.test.js`（运行：`npm test`）

```js
test('hooks 顺序错位：放进 if 里会读到别人的状态', () => {
    function Bad({ flag }) {
        if (flag) useState('第一个')
        const [label] = useState('第二个')
        return h('p', null, label)
    }

    const container = host.createInstance('div')
    render(h(Bad, { flag: true }), container, { sync: true })
    assert.equal(textOf(container), '第二个')

    render(h(Bad, { flag: false }), container, { sync: true })
    assert.equal(textOf(container), '第一个', '链表按顺序对号入座，整体错位一格')
})
```

## 九、这份实现省略了什么

和真实 React 比，下面这些都是有意留白的，写清楚边界比假装完整有用：

- **事件系统**：没有合成事件与事件委托，`onClick` 只是被写进属性表
- **优先级调度**：只有"时间切片 + 切到底"，没有 Lane 模型，也没有 `startTransition`
- **组件能力**：没有 Context、ref / forwardRef、memo / useMemo / useCallback / useReducer、错误边界、Suspense
- **渲染模式**：没有服务端渲染、没有 `StrictMode` 的双调用、没有"状态不变就跳过渲染"的浅比较

反过来说，上面那些省掉的东西都不是新机制，而是在这五层上各自加的一层：Lane 是给 `nextUnitOfWork` 排优先级，memo 是在 `updateFunctionComponent` 前加一次浅比较，Context 是借 `parent` 指针向上查找。骨架对了，加层是顺序问题。

## 配套代码

本篇示例来自 `code/mini-react`（零依赖，不需要 `npm install`；单测用 Node 内置的 `node:test`）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/mini-react/src/element.js` | `createElement` / `TEXT_ELEMENT` / `Fragment` | 二、元素 |
| `./code/mini-react/src/host.js` | 宿主抽象：浏览器与 Node 两份实现 + `printTree` | 三、宿主抽象 |
| `./code/mini-react/src/internal.js` | 渲染器状态（`roots` / `wipRoot` / `nextUnitOfWork`）与重渲染调度 | 四、Fiber 链表 · 六、commit |
| `./code/mini-react/src/reconciler.js` | Fiber 链表、`workLoop`、diff、commit | 四 · 五 · 六 |
| `./code/mini-react/src/hooks.js` | `useState` / `useEffect` / `runEffects` / `runCleanups` | 七、Hooks |
| `./code/mini-react/src/index.js` | 对外出口 + `printFibers` | 七、Hooks |
| `./code/mini-react/steps/01-element.js` | 观察 createElement 的产物 | 二、元素 |
| `./code/mini-react/steps/02-mount.js` | 首次渲染到宿主节点 | 三、宿主抽象 |
| `./code/mini-react/steps/03-keyed-diff.js` | 给宿主操作装记录器，对照有 / 无 key | 五、diff |
| `./code/mini-react/steps/04-hooks.js` | 队列语义、批处理、卸载清理、顺序错位 | 七 · 八 |
| `./code/mini-react/steps/05-slice.js` | 时间切片实测：片数与最长阻塞 | 四、Fiber 链表 |
| `./code/mini-react/test/helper.js` | 记录宿主操作的开关式 sink | 五、diff |
| `./code/mini-react/test/diff.test.js` | diff 的 8 条断言（含宿主操作序列） | 五、diff |
| `./code/mini-react/test/hooks.test.js` | hooks 的 10 条断言（含顺序错位） | 七 · 八 |

运行：`cd code/mini-react`，然后

- `npm run step:element` / `step:mount` / `step:keyed` / `step:hooks` / `step:slice` —— 五个观察脚本
- `npm test` —— 26 个单测

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[Vue3 原理](./Vue3%20原理.md)
- 下一篇：[手写 mini-vue](./手写%20mini-vue.md)
- 本模块另三篇：[React 高级与原理](./React%20高级与原理.md) · [Vue3 原理](./Vue3%20原理.md) · [手写 mini-vue](./手写%20mini-vue.md)
