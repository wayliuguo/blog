# DOM 与浏览器 API

前六篇讲的都是语言本身：值怎么存、变量在哪可见、对象怎么沿原型链复用、单线程怎么并发、内存怎么回收。但 JavaScript 之所以能"做点什么"，靠的是**宿主给的接口**——浏览器把页面暴露成一棵可读写的对象树（DOM），再加上事件、观察者、帧调度、网络四套 API，语言才有了落点。

这一篇讲的就是这层接口：怎么找到节点、怎么改最省、事件到底怎么流动、监听器怎么解才不会泄漏、变化怎么"通知"而不是靠轮询、请求怎么发才不会被旧响应覆盖。

和上一篇一样，本篇的结论都来自配套 demo 的**真实输出**：页面里预先跑一遍并把结果打进页尾探针，你打开就能核对。差异在于，有些 API 的输出依赖浏览器产生渲染帧，`--dump-dom` 这种无头抓取拿不到——遇到这种情况正文会明确写出"需要在真实浏览器里看"，并把判定依据（几何量）一并算出来供核对，而不是编一组数字。

## 一、查询节点：静态快照与活集合不是一回事

### 两个查询家族

DOM 提供两组查找方式，语义完全不同：

- **返回单个元素**：`document.getElementById(id)`（最快，只按 id）、`element.querySelector(css)`（返回第一个匹配或 `null`）。
- **返回集合**：`element.querySelectorAll(css)`（返回静态 `NodeList`）、`element.getElementsByTagName(name)` / `getElementsByClassName(cls)`（返回**活** `HTMLCollection`）、`element.children`（活）、`form.elements`（活）。

`querySelectorAll` 接受任何 CSS 选择器（包括 `:nth-child()`、`[data-x]`、`:has()`），是今天的主力；`getElementsByTagName` 只在"要跟着 DOM 自动更新"时才值得用。顺带一个容易被忽略的差异：`NodeList` 有 `forEach`，`HTMLCollection` 没有——它是类数组，只能 `for` 循环或 `Array.from()`。

### 活集合会跟着 DOM 变

这是两组 API 唯一需要真正记住的差别。

> 摘自 `./code/site/dom-query-batch.js`（运行：`npm start`）

```js
/** 活集合（HTMLCollection）会跟着 DOM 变，静态集合（NodeList）不会 */
function compareCollections() {
    const host = document.getElementById('live-list')
    host.innerHTML = '<li>a</li><li>b</li>'
    const live = host.getElementsByTagName('li')
    const stat = host.querySelectorAll('li')
    const before = { live: live.length, stat: stat.length }
    host.appendChild(document.createElement('li'))
    const after = { live: live.length, stat: stat.length }
    return { before, after }
}
```

同一时刻取到两个集合、各读一次 `length`，然后插入一个 `li`、再各读一次：

> 实测（`chrome --headless=new --dump-dom` 读页面内探针）

```
③ 两种集合
   插入前：getElementsByTagName().length = 2，querySelectorAll().length = 2
   插入一个 li 后：HTMLCollection = 3（跟着变），NodeList = 2（不变）
```

插入前后变量一个都没重新赋值，`live.length` 自己从 2 变成了 3。这意味着两件事：

1. **别把活集合当快照用**。`for (let i = 0; i < live.length; i++)` 里如果改动了 DOM，循环次数会跟着变；边遍历边往同层插节点，就会一直有"下一个"。
2. **`length` 是一次查询，不是缓存字段**。活集合的 `length` 每次读都要重新遍历匹配，把它写在循环条件里等于每轮都查一遍树。

工程上一条就够了：**拿到集合先 `Array.from()` 或 `[...]` 展开成真数组再遍历**。需要"跟随变化"的语义时，正确工具是 `MutationObserver`（见第八节），不是活集合。

## 二、改动节点：批量插入的三种写法

### 三种写法

往一个已经在文档里的容器塞 3000 个 `li`，三种写法：

> 摘自 `./code/site/dom-query-batch.js`（运行：`npm start`）

```js
/** 逐条 appendChild 到已挂载的容器 */
function appendOneByOne(host, n) {
    host.innerHTML = ''
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
        const li = document.createElement('li')
        li.textContent = 'item ' + i
        host.appendChild(li)
    }
    return performance.now() - t0
}

/** 先攒在 DocumentFragment 里，最后一次性挂上去 */
function appendWithFragment(host, n) {
    host.innerHTML = ''
    const frag = document.createDocumentFragment()
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
        const li = document.createElement('li')
        li.textContent = 'item ' + i
        frag.appendChild(li)
    }
    host.appendChild(frag)
    return performance.now() - t0
}

/** 拼字符串交给 innerHTML 一次解析 */
function appendWithHtml(host, n) {
    const t0 = performance.now()
    const html = Array.from({ length: n }, (_, i) => '<li>item ' + i + '</li>').join('')
    host.innerHTML = html
    return performance.now() - t0
}
```

### 实测：同一量级，没有稳定赢家

> 实测（`chrome --headless=new --dump-dom` 读页面内探针，取第二轮；首次已热身）

```
② 批量插入（3000 个 li，插入到已挂载的容器）
   逐条 appendChild        -> 2.1 ms
   DocumentFragment 一次挂 -> 2.8 ms
   innerHTML 一次解析      -> 1.9 ms
```

连跑若干次，区间是 **逐条 2.1～4.7 ms、DocumentFragment 2.8～7.2 ms、innerHTML 1.9～6.4 ms**——三者互相重叠，谁快取决于当次运行的抖动，而不是写法。

这个结果和"逐条 appendChild 慢，要用 DocumentFragment"的经验之谈是冲突的，值得解释清楚：**逐条 `appendChild` 并不会每次都触发布局**。追加节点只会把相关子树标脏（style / layout invalid），浏览器会把样式重算与布局攒到下一次渲染时机统一做——3000 次追加只对应一次批量计算，所以单次成本接近纯对象创建。DocumentFragment 的价值在于"避免 N 次插入的中间状态被人读到"，只有在循环里**接着读了几何量**（下一节）或者宿主每次插入都要做额外工作（深层嵌套子树、自定义元素、带插槽的组件）时才体现出来。

### innerHTML 的真实代价

`innerHTML` 在"整块替换"时最省事，代价不在速度而在**它把整棵子树重建了**：

- 已有节点的**状态全丢**：输入框里没提交的内容、焦点位置、滚动位置、正在播放的动画、挂在节点上的事件监听器。
- 「追加」写成 `host.innerHTML += html` 会连**已插入的部分一起重建**，代价随列表变长线性上涨。
- 拼接字符串必须考虑转义，凡是掺了用户输入的 `innerHTML` 就是 XSS 入口（见[「前端安全」](../网络与浏览器/前端安全.md)）。

所以选型很简单：**要保留已有节点就用 `fragment` 或 `insertAdjacentHTML('beforeend', html)`，明确要整块重画才用 `innerHTML =`**。需要频繁增删长列表时，真正的解法是虚拟滚动（只渲染视口内的节点），而不是在插入 API 上抠毫秒。

## 三、强制同步布局：读写交替把一次布局变成 N 次

### 两段代码只差读写顺序

下面两段做的事完全一样——把每个盒子的宽度 +1px。差别只在**读写的顺序**：

> 摘自 `./code/site/dom-query-batch.js`（运行：`npm start`）

```js
/** 写法 A：写一次就读一次——每次读都逼着浏览器立刻把样式落地成布局 */
function thrashLayout(host, n) {
    const els = buildBoxes(host, n)
    const t0 = performance.now()
    for (const el of els) {
        el.style.width = el.offsetWidth + 1 + 'px'
    }
    return performance.now() - t0
}

/** 写法 B：先把要读的都读完，再统一写——循环里一次布局都不触发 */
function batchLayout(host, n) {
    const els = buildBoxes(host, n)
    const t0 = performance.now()
    const widths = els.map(el => el.offsetWidth)
    els.forEach((el, i) => {
        el.style.width = widths[i] + 1 + 'px'
    })
    return performance.now() - t0
}
```

### 实测：几十倍差距

> 实测（`chrome --headless=new --dump-dom` 读页面内探针，500 个元素）

```
① 强制同步布局（500 个元素，同样把宽度 +1px）
   读写交替 el.style.width = el.offsetWidth + 1  -> 321.3 ms
   先读后写（先 map 收集再统一写）              -> 2.8 ms
   倍数 = 114.7x
```

多次运行的区间：**读写交替 288～539 ms、先读后写 2.8～9.6 ms，倍数落在 40～115 倍**。绝对毫秒数随机器与运行波动，但"几十倍"这个量级非常稳定。

### 为什么会这样

样式写入只是**标脏**，不立即计算；而 `offsetWidth` **必须要一个准确的数字才能返回**，浏览器只能把之前所有待处理的样式重算与布局先做完（术语叫 flush），才能回答。于是循环里每读一次就强制一次布局，500 个元素 = 500 次布局 + 500 次样式重算，而不是 1 次。

会触发强制同步布局的读取（都是"要立刻知道尺寸/位置"的）：

- 几何属性：`offsetTop/Left/Width/Height`、`clientWidth/Height/Top/Left`、`scrollWidth/Height/Top/Left`
- 方法：`getBoundingClientRect()`、`getComputedStyle()`（读具体属性值时）、`element.scrollIntoView()`、部分场景下的 `element.focus()`
- 反过来，`element.style.x = ...`、`classList.add()`、`appendChild()`、`setAttribute()` 这些**只标脏**

### 工程做法

1. **读写分离**：先集中读、把值存进变量，再集中写。这就是 `batchLayout` 相对 `thrashLayout` 唯一的变化。
2. **读的结果缓存**：循环里反复读同一个元素的尺寸，读一次就够。
3. **写合批到下一帧**（下面一小节）。
4. **动画只用 `transform` / `opacity`**：它们改变的是合成层，不触发布局也不触发重绘；改 `width` / `top` / `margin` 做动画则每帧都要重新布局（见[「动画与变换」](../CSS/动画与变换.md)）。

### 把写合批到下一帧

连续触发里改样式（resize、scroll、输入、拖拽）时，一帧内可能写很多次，而渲染只看最后一次结果。用一个"本帧已经排过队了吗"的标志，就能把一帧内的多次写收敛成一次：

> 摘自 `./code/site/dom-query-batch.js`（运行：`npm start`）

```js
/** 把连续 n 次写合并到下一帧：不管排多少次，每帧只落一次 style 写入 */
function coalesceToFrame(box, n) {
    let pending = null
    let scheduled = false
    const state = { scheduled: n, writes: 0 }
    for (let i = 1; i <= n; i++) {
        pending = 100 + i
        if (scheduled) continue
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            state.writes++
            box.style.width = pending + 'px'
        })
    }
    return state
}
```

排 200 次，实际写 1 次：

> 实测（页面探针自动输出）

```
④ 把连续写合并到下一帧（连续排 200 次宽度调整）
   排入 requestAnimationFrame 200 次 -> 实际写入 1 次
```

它和防抖/节流的区别在"收敛的边界"：这个模式按**帧**收敛，延迟上限就是一帧（约 16ms），所以既去重又不会让用户感觉到迟滞；防抖按"停止触发后 N 毫秒"收敛，延迟不可控。虚拟列表、图表重绘、resize 重排这类场景用的都是按帧收敛。

## 四、事件流与事件对象

### 三个阶段

一次点击的传播分三段：**捕获阶段**（`window` → 目标元素的父链）→ **目标阶段**（在目标元素上）→ **冒泡阶段**（目标元素的父链 → `window`）。`addEventListener` 默认在冒泡阶段触发，第三参数传 `true` 或 `{ capture: true }` 就改成捕获阶段触发。

三条推论：

- 想在事件到达目标**之前**拦截（做统一埋点、权限校验），用捕获。
- 想在事件处理完之后统一收口，用冒泡。
- **冒泡是事件委托的前提**，而 `focus` / `blur` / `mouseenter` / `mouseleave` 不冒泡——要委托就用它们的冒泡版 `focusin` / `focusout` / `mouseover` / `mouseout`。

### target 与 currentTarget

这是最容易记混的一对。

> 摘自 `./code/site/dom-events.js`（运行：`npm start`）

```js
/* ------------------------------------------------------------------ ① 事件对象 */
const card = document.getElementById('evt-card')
const chip = card.querySelector('.chip')

card.addEventListener('click', e => {
    log(
        '① 点在 .chip 上：e.target = ' +
            e.target.className +
            '（真实目标），e.currentTarget = ' +
            e.currentTarget.id +
            '（挂着监听器的那个）'
    )
})
chip.dispatchEvent(new MouseEvent('click', { bubbles: true }))
```

点是内部的小标签，但监听器挂在外层卡片上：

> 实测（页面探针自动输出）

```
① 点在 .chip 上：e.target = chip（真实目标），e.currentTarget = evt-card（挂着监听器的那个）
```

- **`e.target`**：事件真正发生在哪个元素上（点到了谁），整个传播过程中不变。
- **`e.currentTarget`**：当前正在执行监听器所绑定的元素，会随传播路径变化。

`currentTarget` 还有个容易踩的坑，顺手验证一下：

> 实测（CDP 在真实时间下执行 `Runtime.evaluate`）

```
{"currentTarget_inCallback":"evt-card","currentTarget_afterDispatch":"null","isTrusted_after_el_click":false,"bubbles":true}
```

**回调结束后 `currentTarget` 会被置为 `null`**（事件对象的生命周期到 `dispatchEvent` 返回为止）。把事件对象存下来、在异步逻辑里再读 `e.currentTarget`，拿到的一定是 `null`——要留就在回调里先把它存进变量。

同一个探针还确认了另一件事：用 `el.click()` 派发出来的事件，**`isTrusted` 为 `false`**。合成事件与真实用户交互在这一点上是可区分的，风控与部分埋点 SDK 会据此过滤（见第七节）。

### 阻止默认行为与阻止传播

- `e.preventDefault()`：只拦住**浏览器默认动作**（链接跳转、表单提交、右键菜单），事件照样继续传播；对不可取消的事件（`cancelable: false`）无效。
- `e.stopPropagation()`：不再往父链传播，但**同一元素上后续监听的同类型回调仍会执行**。
- `e.stopImmediatePropagation()`：连同一元素上后续的同类型监听也一并拦掉。

实践里要警惕 `stopPropagation`：它会把上层的事件委托一起打断——自己写的组件没问题，接入第三方组件时经常出现"套了一层之后委托不生效"。

### 滚动与触摸监听记得声明 passive

对 `wheel` / `touchstart` / `touchmove` 这类高频事件，如果监听器里可能调 `preventDefault()`，浏览器就必须**等回调执行完**才能决定要不要滚动，等于给滚动加了一个同步阻塞。声明 `{ passive: true }` 表示"我保证不阻止默认行为"，浏览器就能立刻开始滚动：

> 示意片段（无配套脚本）

```js
window.addEventListener('wheel', onWheel, { passive: true })
```

Chrome 对 `window` / `document` / `body` 上的 `touchstart` / `touchmove` / `wheel` 已经默认按 passive 处理，但**挂在普通元素上的监听仍然默认非 passive**，所以显式写出来更保险。

## 五、事件委托：一个监听器管住所有子节点

### 一个监听器处理 4 次点击

列表项可能有很多、还可能动态增加。不逐个绑事件，只在容器上绑一次：

> 摘自 `./code/site/dom-events.js`（运行：`npm start`）

```js
/* ------------------------------------------------------------------ ② 事件委托 */
const list = document.getElementById('delegated')
const handled = []

list.addEventListener('click', e => {
    const li = e.target.closest('li')
    if (!li) return
    handled.push(li.dataset.id)
})

// 已有的 3 项
list.querySelectorAll('li').forEach(li => li.dispatchEvent(new MouseEvent('click', { bubbles: true })))

// 动态新增的项：没有重新绑任何监听器
const fresh = document.createElement('li')
fresh.dataset.id = 'dyn'
fresh.textContent = '动态新增的项'
list.appendChild(fresh)
fresh.dispatchEvent(new MouseEvent('click', { bubbles: true }))

log('② 委托在 ul 上只注册了 1 个监听器，处理了 ' + handled.length + ' 次点击：' + handled.join(', '))
log('   最后一项是插入 DOM 后才被点击的，没有重新绑监听器也照样命中')
```

> 实测（页面探针自动输出）

```
② 委托在 ul 上只注册了 1 个监听器，处理了 4 次点击：a, b, c, dyn
   最后一项是插入 DOM 后才被点击的，没有重新绑监听器也照样命中
```

### 要点

- **`e.target.closest('li')` 而不是 `e.target`**：点击可能落在这行里的图标、文字节点、徽标上，`closest()` 会从真实目标向上找最近的匹配祖先（含自身），这一步把"点在子元素上"也覆盖了。
- **数据从 `data-*` 走**：`li.dataset.id` 读的就是 `data-id`，不用再存一份映射表。
- **委托的前提是冒泡**：只要冒泡链上有 `stopPropagation`，委托就断（上一节）。
- **事件不冒泡就不能委托**：`focus` / `blur` 用 `focusin` / `focusout`。
- 代价只是"每次点击多走一遍 `closest`"，换来的是**监听器数量从 N 降到 1**：内存占用、解绑成本（见下一节）与"新增节点忘了绑"这类 bug 一起消失。

## 六、解绑监听器：三种手段

监听器持有回调，回调持有闭包，闭包持有作用域里的变量——**不解绑的监听器是一整条引用链**，这正是[「内存管理与垃圾回收」](./内存管理与垃圾回收.md)里的第三类泄漏。三种解绑手段各有适用面：

> 摘自 `./code/site/dom-events.js`（运行：`npm start`）

```js
/* ------------------------------------------------------------------ ③ 解绑三招 */
const onceBtn = document.getElementById('once-btn')
let onceCount = 0
onceBtn.addEventListener(
    'click',
    () => {
        onceCount++
    },
    { once: true }
)
onceBtn.click()
onceBtn.click()
onceBtn.click()
log('③ { once: true }：连点 3 次，回调实际执行 ' + onceCount + ' 次')

const signalBtn = document.getElementById('signal-btn')
const ac = new AbortController()
let sigCount = 0
signalBtn.addEventListener(
    'click',
    () => {
        sigCount++
    },
    { signal: ac.signal }
)
signalBtn.click()
ac.abort()
signalBtn.click()
log('③ AbortController.signal：abort 前后各点 1 次，回调实际执行 ' + sigCount + ' 次（一次性解绑整组监听）')
```

> 实测（页面探针自动输出）

```
③ { once: true }：连点 3 次，回调实际执行 1 次
③ AbortController.signal：abort 前后各点 1 次，回调实际执行 1 次（一次性解绑整组监听）
```

三种手段的分工：

1. **`removeEventListener(type, fn, options)`**——最基础，也最容易失败。它按"类型 + 函数引用 + `capture` 标志"三者匹配：匿名函数、`.bind()` 之后的新函数、以及 `capture` 值不一致的注册，都**解不掉且不报错**。所以要么用变量把函数引用存住，要么直接用第 3 种。
2. **`{ once: true }`**——"这次交互只处理一次"的语义直接写在注册处：引导浮层、只允许提交一次的按钮、只需触发一次的上报。不用再在回调里手写"先 `removeEventListener` 再干活"。
3. **`{ signal }`**——一个 `AbortController` 管一组监听器，`abort()` 一次全部摘掉。组件卸载时最省事：把 `signal` 当参数传给内部所有 `addEventListener`，清理阶段只调一次 `abort()`，不需要逐个记住函数引用。它同时还能取消 `fetch`（见第九节），所以"组件级清理"用同一个 controller 就够了。

顺带回答一个常见疑问：**移除元素会不会自动解绑？** 元素本身没有其他引用时会被 GC，监听器一起消失。但如果节点被变量持有（已经从文档摘下来、却还挂在 JS 变量或闭包里），那它就是[分离 DOM](./内存管理与垃圾回收.md)，监听器与闭包都会跟着留着——问题不在"要不要解绑"，而在"为什么还留着引用"。

## 七、自定义事件与程序化触发

### 不依赖框架的组件通信

子元素派发一个自定义事件、祖先监听着，`detail` 带数据、`bubbles: true` 让它能冒泡上去——这就是原生组件的通信方式，也是 Web Components 的标准做法：

> 摘自 `./code/site/dom-events.js`（运行：`npm start`）

```js
/* ------------------------------------------------------------------ ④ 自定义事件 */
const toolbar = document.getElementById('toolbar')
const received = []
toolbar.addEventListener('cart:add', e => received.push(e.detail.id))

document.getElementById('add-btn').addEventListener('click', function () {
    this.dispatchEvent(new CustomEvent('cart:add', { detail: { id: 42 }, bubbles: true }))
})
```

> 实测（页面探针自动输出）

```
④ 按钮派发 CustomEvent("cart:add")，祖先 #toolbar 收到 detail.id = 42
```

要点：`detail` 是 `CustomEvent` 独有的字段（`new Event()` 没有）；事件名建议带命名空间前缀（`cart:add`），避免和原生事件名撞车；`bubbles: true` 不写就只能在元素自己身上监听到。

### 程序化触发事件

自动化测试、埋点回放、以及"模拟用户操作"都靠这两个 API：

> 摘自 `./code/site/dom-events.js`（运行：`npm start`）

```js
/* ------------------------------------------------------------------ ⑤ 程序化事件 */
let keyboard = '(未触发)'
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') keyboard = 'Enter'
})
document.getElementById('search-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
```

> 实测（页面探针自动输出）

```
⑤ 用 new KeyboardEvent("keydown", { key: "Enter" }) 模拟回车，document 上的监听收到 key = Enter
```

- **`el.click()`**：最省事，等价于派发一个会冒泡的 `click`，也会走默认行为。
- **`el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`**：能带 `key`、`metaKey`、`clientX` 这些真实属性——需要判断"是不是按了 Enter"、"是不是按着 Ctrl 点的"，只能用这种写法。
- **`isTrusted` 为 `false`**（上一节已实测）：这是合成事件的固有特征，可用于区分"真用户"与"脚本触发"，风控场景会用到。

## 八、三个观察者：把轮询换成变化通知

"元素进视口了吗""容器尺寸变了吗""DOM 被谁改了"这三个问题，过去都是开个 `setInterval` 反复量。三个 `Observer` 把它们变成了**变化发生时回调一次**，而且回调本身不阻塞渲染。

### IntersectionObserver：元素进没进视口

`rootMargin` 是这里最容易讲错的概念：它不是"元素位置变了多少"，而是**把判定边界向外扩大或向内收缩**。同一个目标元素挂两个观察者——一个用默认边界，一个把底部外扩 100px：

> 摘自 `./code/site/dom-observer.js`（运行：`npm start`）

```js
function observeIntersection() {
    const target = document.getElementById('below-fold')
    const ioLog = document.getElementById('io-log')
    const parts = []
    // 两个观察者的回调投递顺序不保证，按下标落位再统一渲染，避免"谁后到谁把先到的覆盖掉"
    const render = () => {
        ioLog.textContent = parts.filter(Boolean).join(' ｜ ')
    }
    const observeWith = (index, label, options) => {
        new IntersectionObserver(entries => {
            const e = entries[0]
            parts[index] =
                label + '：isIntersecting = ' + e.isIntersecting + '，ratio = ' + e.intersectionRatio.toFixed(2)
            render()
        }, options).observe(target)
    }
    observeWith(0, '默认 rootMargin')
    observeWith(1, '底部扩 100px', { rootMargin: '0px 0px 100px 0px' })
}
```

目标元素被摆在折叠线下方 50px（页面用占位块算出来的，不是手调的）：

> 实测（CDP 在真实时间下等 3 秒后读页面探针）

```
① 视口高 749px；目标元素 rect.top = 799px，正好在折叠线下方 50px
   默认 rootMargin：判定下边界 = 视口底部 = 749px → 还没进入
   rootMargin 底部扩 100px：判定下边界 = 849px → 已进入（虽然还看不见）
② #resize-box 初始：200×40
   改成 width:320px 之后：320×40
   再改成 height:60px 之后：320×60（只动高度也会触发一次回调）
③ MutationObserver 收到 5 条记录：{"childList":3,"attributes":1,"characterData":1}
   每条都带"改了哪、改前是什么"：childList / childList / childList / attributes / characterData

① 回调输出：默认 rootMargin：isIntersecting = false，ratio = 0.00 ｜ 底部扩 100px：isIntersecting = true，ratio = 1.00
② 回调输出：回调收到的尺寸序列：200×40 -> 320×40 -> 320×60
```

元素明明还在屏幕外，`isIntersecting` 却已经是 `true`、`ratio` 甚至是 `1.00`——因为**判定用的边界被外扩了 100px**。这正是图片懒加载的预加载带（提前 200~400px 就开始下载）与无限滚动（快到底部就请求下一页）的实现原理：让回调早于"真的看得见"发生。

其他要点：`threshold` 可以指定"露出多少比例才回调"（`[0, 0.5, 1]`）；只想触发一次就在回调里 `io.unobserve(target)`（图片加载完就摘掉，别让它一直挂在观察列表里）。

### ResizeObserver：元素自己的尺寸变了

它盯的是**被观察元素自己的内容盒尺寸**，比 `window.resize` 精确得多——窗口没变但被 flex 挤窄、侧边栏折叠、字体加载完撑高，它都能感知，而 `window.resize` 只会告诉你"窗口变了，自己再去量一遍所有元素"。

> 摘自 `./code/site/dom-observer.js`（运行：`npm start`）

```js
function observeResize() {
    const box = document.getElementById('resize-box')
    const roLog = document.getElementById('ro-log')
    const sizes = []

    new ResizeObserver(entries => {
        const cr = entries[0].contentRect
        sizes.push(Math.round(cr.width) + '×' + Math.round(cr.height))
        roLog.textContent = '回调收到的尺寸序列：' + sizes.join(' -> ')
    }).observe(box)

    return box
}
```

回调收到的尺寸序列是 `200×40 -> 320×40 -> 320×60`（见上面的实测输出），注意第三段：**只改高度也会回调**——它跟的是"尺寸变了"，不是"宽度变了"。

坑在于**在回调里改被观察元素自身的尺寸**：改尺寸 → 触发回调 → 再改尺寸就成了循环，浏览器只能跳过该次通知并打一条 `ResizeObserver loop completed with undelivered notifications` 的警告。要改就把写操作放到 `requestAnimationFrame` 里（回到第三节的"合批到下一帧"），或者临时 `unobserve` 再恢复。

### MutationObserver：DOM 被改了

订阅子节点增删、属性变化、文本变化，回调里还能读出"改之前是什么"：

> 摘自 `./code/site/dom-observer.js`（运行：`npm start`）

```js
function observeMutation() {
    const host = document.getElementById('mutate-host')
    const records = []
    new MutationObserver(list => records.push(...list)).observe(host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true
    })

    const a = document.createElement('p')
    a.textContent = '第一段'
    a.setAttribute('data-state', 'off')
    host.appendChild(a)

    const b = document.createElement('p')
    b.textContent = '第二段'
    host.appendChild(b)

    a.remove()
    b.setAttribute('data-state', 'on')
    b.firstChild.textContent = '第二段（改过文字）'

    return new Promise(resolve => {
        // MutationObserver 的回调走微任务队列，等一轮就够；这里给两轮以防时序抖动
        setTimeout(() => resolve(records), 0)
        setTimeout(() => resolve(records), 50)
    })
}
```

上面这串操作收到 5 条记录，按类型分布是 `{"childList":3,"attributes":1,"characterData":1}`（见实测输出）。

关键差异：**`MutationObserver` 的回调走微任务队列**，和 `Promise.then` 同一类（见[「异步编程与事件循环」](./异步编程与事件循环.md)）——所以它不依赖渲染帧，任何环境都能收到；而 IO / RO 的回调依赖渲染帧。这也意味着回调时机是"当前宏任务结束后立刻"，改完 DOM 紧接着读 `records` 还看不到，得等一次微任务。

用途：检测第三方脚本往页面插了什么、富文本编辑器把 DOM 改成了什么、把 DOM 变更当埋点上报。`takeRecords()` 可主动取走尚未投递的记录，`disconnect()` 停止观察。

### 选型

| 想知道什么 | 用什么 | 别用什么 |
| --- | --- | --- |
| 元素进没进视口 / 露出多少 | `IntersectionObserver`（配 `rootMargin` 做提前量） | `scroll` + `getBoundingClientRect()` 手算 |
| 元素自己的尺寸变了 | `ResizeObserver` | `window.resize` 后自己遍历重测 |
| DOM 被改了 | `MutationObserver` | `setInterval` 轮询 `innerHTML` 做指纹比对 |

> 说明：IO / RO 的回调依赖浏览器产生渲染帧。无头 Chrome 用 `--dump-dom` 抓这类页面时**收不到回调**（`MutationObserver` 照常收到，因为它走微任务）。本节引用的回调输出是用 CDP 在真实时间里等待后读到的；用真实浏览器窗口打开 `dom-observer.html` 也能看到（页面里灰色那行就是回调原文）。

## 九、fetch 与 XMLHttpRequest

### 拿到响应不等于请求成功

这是 `fetch` 最常被踩的一点。

> 摘自 `./code/site/dom-fetch.js`（运行：`npm start`）

```js
/* ------------------------------------------------ ① 基本用法与响应状态 */
async function basic() {
    const res = await fetch(api('/api/search?q=well&delay=60'))
    const data = await res.json()
    log('① status = ' + res.status + '，res.ok = ' + res.ok + '，content-type = ' + res.headers.get('content-type'))
    log('   await res.json() 得到：' + JSON.stringify(data))
}

/* ------------------------------------------------ ② 4xx/5xx 不会 reject */
async function notOk() {
    const res = await fetch(api('/api/search?status=500'))
    log('② 请求一个 500：没有抛异常，res.ok = ' + res.ok + '，res.status = ' + res.status)
    log('   所以“请求成功”必须自己判 res.ok，只看 await 有没有 throw 会把服务端错误当成成功')
}
```

> 实测（CDP 在真实时间下读页面探针，请求打到配套的本地接口）

```
① status = 200，res.ok = true，content-type = application/json; charset=utf-8
   await res.json() 得到：{"q":"well","delay":60,"at":1789715830204,"from":"server"}
② 请求一个 500：没有抛异常，res.ok = false，res.status = 500
   所以“请求成功”必须自己判 res.ok，只看 await 有没有 throw 会把服务端错误当成成功
```

`fetch()` 返回的 Promise **只在网络层失败时 reject**（DNS 解析失败、断网、连接被拒、CORS 被拒）。HTTP 层的 4xx / 5xx 属于"成功拿到了一个表示错误的响应"，`await` 正常返回，只能靠 `res.ok`（`status` 在 200–299 时为 `true`）或 `res.status` 判断。把 `await fetch()` 当成功判据，线上就会把 500 当正常数据处理。

另外两点：`res.json()` / `res.text()` / `res.blob()` 各自也是一次 Promise（响应体是流，**只能读一次**，第二次读抛 `TypeError`——已实测）；响应头受 CORS 约束，`res.headers.get()` 只能拿到服务端在 `Access-Control-Expose-Headers` 里放行的字段。

### 超时与取消

> 摘自 `./code/site/dom-fetch.js`（运行：`npm start`）

```js
/* ------------------------------------------------ ③ 超时 */
async function timeout() {
    try {
        await fetch(api('/api/search?delay=800'), { signal: AbortSignal.timeout(120) })
        log('③ 超时：没有抛异常（不符合预期）')
    } catch (e) {
        log('③ AbortSignal.timeout(120) 打给一个 800ms 才返回的接口 -> 抛 ' + e.name)
    }
}

/* ------------------------------------------------ ④ 主动取消 */
async function manualAbort() {
    const ctrl = new AbortController()
    const p = fetch(api('/api/search?delay=800'), { signal: ctrl.signal })
    setTimeout(() => ctrl.abort(), 60)
    try {
        await p
        log('④ 主动取消：没有抛异常（不符合预期）')
    } catch (e) {
        log('④ controller.abort() 之后 -> 抛 ' + e.name + '，请求真的被掐断，不是“忽略结果”')
    }
}
```

接口被要求 800ms 后才返回，两个调用分别给 120ms 超时和 60ms 后手动 `abort()`：

> 实测（CDP 在真实时间下读页面探针）

```
③ AbortSignal.timeout(120) 打给一个 800ms 才返回的接口 -> 抛 TimeoutError
④ controller.abort() 之后 -> 抛 AbortError，请求真的被掐断，不是“忽略结果”
```

- **`AbortSignal.timeout(ms)`**：最省事的超时写法，抛出的错误 `name` 是 `TimeoutError`。
- **`AbortController` + 手动 `abort()`**：适合"用户主动取消"（点关闭、切路由、输入框清空）。抛出的错误 `name` 是 `AbortError`。
- **两者都要分类型处理**：都是"被我方取消"，不等于网络故障。把 `AbortError` 当异常上报，用户每点一次取消就产生一条假告警。
- 需要"既超时又能手动取消"时，用 `AbortSignal.any([userSignal, AbortSignal.timeout(5000)])` 合并信号（已实测可用，合并后 `aborted` 与 `reason` 都能正确带出）。
- `abort()` 是**真的掐断请求**——连接被取消、响应体不再下载；而"请求照发、只是不处理返回结果"是完全不同的做法，后者照样消耗带宽与后端资源。

### 竞态：三种守卫

搜索建议的经典 bug：先输入 `a`、再输入 `ab`，如果 `a` 的请求更慢，它的响应后到、会把 `ab` 的结果覆盖掉。

> 摘自 `./code/site/dom-fetch.js`（运行：`npm start`）

```js
/* ------------------------------------------------ ⑤ 竞态 */
async function race() {
    // 无守卫：先发的请求后回来，会把后发的结果覆盖掉
    let noGuard = null
    const searchNoGuard = (q, delay) =>
        fetch(api('/api/search?q=' + q + '&delay=' + delay))
            .then(r => r.json())
            .then(d => {
                noGuard = d.q
            })
    await Promise.all([searchNoGuard('a', 400), searchNoGuard('ab', 80)])
    log('⑤ 无守卫：依次输入 a、ab（a 的请求更慢）-> 最终显示 ' + JSON.stringify(noGuard) + ' ← 用旧结果覆盖了新结果')

    // 序号守卫：只认最后一次输入的响应
    let seq = 0
    let guarded = null
    const searchGuarded = async (q, delay) => {
        const mine = ++seq
        const d = await (await fetch(api('/api/search?q=' + q + '&delay=' + delay))).json()
        if (mine === seq) guarded = d.q
    }
    await Promise.all([searchGuarded('a', 400), searchGuarded('ab', 80)])
    log('   序号守卫：只接受“序号最新”的响应 -> 最终显示 ' + JSON.stringify(guarded))

    // 取消守卫：发新请求前掐掉上一个
    let ctrl = null
    let aborted = null
    const searchAbort = async (q, delay) => {
        if (ctrl) ctrl.abort()
        ctrl = new AbortController()
        try {
            const d = await (await fetch(api('/api/search?q=' + q + '&delay=' + delay), { signal: ctrl.signal })).json()
            aborted = d.q
        } catch (e) {
            /* 被新请求取消的旧请求会走到这里，属于预期，忽略即可 */
        }
    }
    await Promise.all([searchAbort('a', 400), searchAbort('ab', 80)])
    log('   取消守卫：新请求发出前 abort 掉旧的 -> 最终显示 ' + JSON.stringify(aborted) + '（顺带省掉一次无用响应）')
}
```

三种写法都让"慢请求先发、快请求后发"：

> 实测（CDP 在真实时间下读页面探针）

```
⑤ 无守卫：依次输入 a、ab（a 的请求更慢）-> 最终显示 "a" ← 用旧结果覆盖了新结果
   序号守卫：只接受“序号最新”的响应 -> 最终显示 "ab"
   取消守卫：新请求发出前 abort 掉旧的 -> 最终显示 "ab"（顺带省掉一次无用响应）
```

| 写法 | 结果 | 代价 | 适用 |
| --- | --- | --- | --- |
| 无守卫 | `"a"`（错误） | — | 只在"请求绝不会并发"时才成立 |
| 序号守卫 | `"ab"` | 旧请求仍跑完、白耗带宽 | 改动最小：加一个自增序号 + 一次比对 |
| 取消守卫 | `"ab"` | 要多写一个 controller，且必须 catch 掉 `AbortError` | 关心带宽、后端 QPS、以及想顺手做"取消后不再渲染" |

选择标准很简单：只是"别让旧结果覆盖新结果"→ 序号/标记位，改一行就够；关心资源消耗 → 取消。这也解释了[面试题](./面试题.md)里那个"接口竞态为什么用请求标记位"的取舍——标记位只丢弃结果、不中断请求，在"连续触发试算"这类场景里更省事。**注意取消守卫必须吞掉 `AbortError`**，否则每次换输入都会产生一条未处理的 rejection。

### 与 XMLHttpRequest 对照

`XMLHttpRequest` 是 `fetch` 之前的标准，今天仍会在老库里遇到：

> 摘自 `./code/site/dom-fetch.js`（运行：`npm start`）

```js
/* ------------------------------------------------ ⑥ XHR 对照 */
function xhrGet(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url)
        xhr.onload = () => resolve({ readyState: xhr.readyState, status: xhr.status, body: xhr.responseText })
        xhr.onerror = () => reject(new Error('network error'))
        xhr.send()
    })
}

async function xhrCompare() {
    const r = await xhrGet(api('/api/echo?msg=hello'))
    log('⑥ 同一件事用 XMLHttpRequest：readyState = ' + r.readyState + '（DONE），status = ' + r.status + '，响应体 ' + r.body)
    log('   XHR 只有回调式 API，要自己拼 Promise；fetch 原生返回 Promise，但少了上传进度、同步模式这些能力')
}
```

> 实测（CDP 在真实时间下读页面探针）

```
⑥ 同一件事用 XMLHttpRequest：readyState = 4（DONE），status = 200，响应体 {"msg":"hello","at":1789715831356}
```

| | `fetch` | `XMLHttpRequest` |
| --- | --- | --- |
| API 形态 | 原生 Promise、`Request` / `Response` / `Headers` 对象 | 回调 + 事件（`onload` / `onprogress` / `readyState`） |
| 上传进度 | 需要 Request 流，兼容性差 | `xhr.upload.onprogress` 直接可用 |
| 下载进度 | 读 `res.body.getReader()` 自己算 | `xhr.onprogress` |
| 超时 | `AbortSignal.timeout()` | `xhr.timeout` 属性 |
| 取消 | `AbortController` | `xhr.abort()` |
| 流式响应 | 支持（`ReadableStream`） | 不支持 |
| 页面卸载后仍发送 | `keepalive: true` | 用 `sendBeacon` 替代 |

结论：**新代码一律用 `fetch`**；只有在需要**上传进度**、或维护老代码时才碰 XHR。（`axios` 浏览器端长期默认走 XHR，新版本才提供 fetch 适配器——所以浏览器 Network 面板里看到 XHR 类型，不代表业务代码直接调了 `XMLHttpRequest`。）

## 配套代码

四个 demo 都在仓库 `frontend/基础/JavaScript 核心/code/site/`，每个 `dom-*.js` 对应同名的 `dom-*.html` 页面，页面末尾的探针就是本文引用的那些输出。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/dom-query-batch.js` | 强制同步布局（读写交替 vs 先读后写）、批量插入三种写法、活集合与静态集合、写操作合批到下一帧（页面 `dom-query-batch.html`） | 一、查询节点：静态快照与活集合不是一回事 / 二、改动节点：批量插入的三种写法 / 三、强制同步布局：读写交替把一次布局变成 N 次 |
| `./code/site/dom-events.js` | `target` 与 `currentTarget`、事件委托（含动态节点）、`{ once }` 与 `AbortController.signal` 解绑、`CustomEvent`、程序化事件（页面 `dom-events.html`） | 四、事件流与事件对象 / 五、事件委托：一个监听器管住所有子节点 / 六、解绑监听器：三种手段 / 七、自定义事件与程序化触发 |
| `./code/site/dom-observer.js` | 两个 `IntersectionObserver` 对照 `rootMargin`、`ResizeObserver` 尺寸序列、`MutationObserver` 记录明细（页面 `dom-observer.html`） | 八、三个观察者：把轮询换成变化通知 |
| `./code/site/dom-fetch.js` | 状态码与 `res.ok`、超时不 reject、`AbortController` 取消、竞态三种守卫、XHR 对照（页面 `dom-fetch.html`） | 九、fetch 与 XMLHttpRequest |

启动方式：在 `code` 目录执行 `npm start`（即 `node server.js`），打开 `http://localhost:5176/` 从示例目录进入四个新页面。`dom-fetch` 页依赖 `server.js` 提供的 `/api/search`、`/api/echo` 两个接口（带 CORS 头，`file://` 直接打开也能请求到本地接口）。

复现本文的实测值：`--dump-dom` 这类无头抓取足够覆盖一、二、三节与 `MutationObserver`；**依赖渲染帧的输出**（第四节的 `currentTarget` 生命周期与 `isTrusted`、第八节的 IO / RO 回调、第九节的异步网络结果）需要在真实时间里读——用真实浏览器窗口打开页面看页尾探针即可，或按下面的方式用 CDP 等一段时间后取探针：

> 示意片段（无配套脚本）

```
# dom-query-batch / dom-events：无头抓取即可
chrome --headless=new --dump-dom --virtual-time-budget=4000 \
  "file:///.../frontend/基础/JavaScript 核心/code/site/dom-query-batch.html"

# 需要真实时间的页面：先 npm start，再用 CDP 导航并等待后读取 #probe
node cdp-probe.mjs "http://localhost:5176/dom-observer.html" 3000 \
  "document.getElementById('probe').textContent"

# dom-fetch 必须先启动本地接口（npm start），file:// 直接打开时页面会自动指向 localhost:5176
```

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[内存管理与垃圾回收](./内存管理与垃圾回收.md)
- 下一篇：[手写实现与源码](./手写实现与源码.md)
