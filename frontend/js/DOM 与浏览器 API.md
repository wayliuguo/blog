# DOM 与浏览器 API

本篇按「查询 → 改动 → 事件 → 观察者 → 网络」的链路组织 DOM 与浏览器 API 的核心知识，只保留高频与工程上必须知道的点。

## 一、查询节点

### 两个查询家族

- **返回单个元素**：`document.getElementById(id)`（最快，只按 id）、`element.querySelector(css)`（返回第一个匹配或 `null`）。
- **返回集合**：`element.querySelectorAll(css)`（返回**静态** `NodeList`）、`element.getElementsByTagName(name)` / `getElementsByClassName(cls)`（返回**活** `HTMLCollection`）。

`querySelectorAll` 接受任何 CSS 选择器（包括 `:nth-child()`、`[data-x]`），是今天的主力；`getElementsByTagName` 只在"要跟着 DOM 自动更新"时才值得用。

### 活集合会跟着 DOM 变

这是两组 API 唯一需要真正记住的差别：

> 示意片段（无配套脚本）

```js
const host = document.getElementById('live-list')
const live = host.getElementsByTagName('li')   // 活集合
const stat = host.querySelectorAll('li')       // 静态集合
console.log(live.length, stat.length)          // 2 2
host.appendChild(document.createElement('li'))
console.log(live.length, stat.length)          // 3 2 —— live 自己变了，stat 不变
```

由此两条推论：

1. **别把活集合当快照用**。`for (let i = 0; i < live.length; i++)` 里若改动了 DOM，循环次数会跟着变。
2. **`length` 是一次查询，不是缓存字段**。活集合的 `length` 每次读都要重新匹配，写在循环条件里等于每轮都查一遍树。

工程上一条就够了：**拿到集合先 `Array.from()` 或 `[...]` 展开成真数组再遍历**。需要"跟随变化"的语义时，正确工具是 `MutationObserver`（第六节），不是活集合。顺带一个差异：`NodeList` 有 `forEach`，`HTMLCollection` 没有，只能 `for` 循环或 `Array.from()`。

## 二、改动节点

### 批量插入

往一个已挂载的容器塞大量节点，三种写法——逐条 `appendChild`、先攒 `DocumentFragment` 一次挂载、拼字符串交 `innerHTML` 一次解析。三者性能处在同一量级：**逐条 `appendChild` 并不会每次都触发布局**，追加节点只把子树标脏，浏览器把样式重算与布局攒到下一次渲染统一做。`DocumentFragment` 的价值在于"避免 N 次插入的中间状态被读到"，只有在循环里接着读几何量、或宿主子树复杂时才体现。

### innerHTML 的真实代价

`innerHTML` 在"整块替换"时最省事，代价不在速度而在**它把整棵子树重建了**：

- 已有节点的**状态全丢**：输入框未提交内容、焦点、滚动位置、动画、挂在节点上的事件监听器。
- 「追加」写成 `host.innerHTML += html` 会连**已插入的部分一起重建**，代价随列表变长线性上涨。
- 掺了用户输入的 `innerHTML` 就是 XSS 入口（见[「前端安全」](../网络/前端安全.md)）。

选型结论：**要保留已有节点就用 `fragment` 或 `insertAdjacentHTML('beforeend', html)`，明确要整块重画才用 `innerHTML =`**。

### 强制同步布局：读写交替是性能杀手

样式写入只是**标脏**，不立即计算；而 `offsetWidth` 这类几何量**必须返回准确数字**，浏览器只能先把待处理的样式重算与布局全部做完（flush）才能回答。于是下面这个循环 = N 次布局而不是 1 次：

> 示意片段（无配套脚本）

```js
// 坏：每读一次 offsetWidth 就强制一次布局
els.forEach((el) => { el.style.width = el.offsetWidth + 1 + 'px' })

// 好：先集中读完，再统一写
const widths = els.map((el) => el.offsetWidth)
els.forEach((el, i) => { el.style.width = widths[i] + 1 + 'px' })
```

会触发强制同步布局的读取：`offsetTop/Width/Height`、`clientWidth`、`scrollWidth`、`getBoundingClientRect()`、`getComputedStyle()` 等；而 `style.x = ...`、`classList.add()`、`appendChild()` 只标脏。

工程做法：**读写分离**（如上）、读的结果缓存、动画只用 `transform` / `opacity`（走合成层，不触发布局）。连续触发场景（resize、scroll）再把一帧内的多次写合批到 `requestAnimationFrame` 里执行，按帧收敛、延迟上限约 16ms。

## 三、事件流与事件对象

### 三个阶段

一次点击的传播分三段：**捕获**（`window` → 目标元素的父链）→ **目标** → **冒泡**（父链 → `window`）。`addEventListener` 默认在冒泡阶段触发，第三参传 `true` 或 `{ capture: true }` 改为捕获阶段。

- 想在事件到达目标**之前**拦截（统一埋点、权限校验），用捕获。
- **冒泡是事件委托的前提**；`focus` / `blur` / `mouseenter` / `mouseleave` 不冒泡——要委托就用冒泡版 `focusin` / `focusout` / `mouseover` / `mouseout`。

### target 与 currentTarget

先看场景：监听器挂在外层卡片上，点的是里面的内层小标签——

> 示意片段（无配套脚本）

```html
<div id="card">
  <div class="chip">小标签</div>
</div>
```

点击的是内层的 `.chip`，事件冒泡到 `#card` 触发监听器：

> 示意片段（无配套脚本）

```js
card.addEventListener('click', (e) => {
  console.log(e.target.className)     // 'chip' —— 事件真实发生在谁身上
  console.log(e.currentTarget.id)     // 'card' —— 监听器挂在谁身上
})
```

- **`e.target`**：事件真正发生在哪个元素上，整个传播过程中不变。
- **`e.currentTarget`**：当前正在执行监听器所绑定的元素，随传播路径变化。
- 注意：**回调结束后 `currentTarget` 被置为 `null`**。把事件对象存下来在异步逻辑里再读，拿到的一定是 `null`——要留就在回调里先存进变量。

### 阻止默认行为与阻止传播

- `e.preventDefault()`：只拦**浏览器默认动作**（跳转、提交、右键菜单），事件照样传播。
- `e.stopPropagation()`：不再往父链传播，但**同一元素上后续监听的同类型回调仍会执行**。
- `e.stopImmediatePropagation()`：连同一元素的后续监听也拦掉。

警惕 `stopPropagation`：它会把上层的事件委托一起打断——接入第三方组件时常出现"套了一层之后委托不生效"。

### 高频事件记得 passive

对 `wheel` / `touchstart` / `touchmove` 这类高频事件，若监听器可能调 `preventDefault()`，浏览器必须**等回调执行完**才能决定滚不滚动，等于给滚动加同步阻塞。声明 `{ passive: true }` 表示"不阻止默认行为"，浏览器可立刻滚动：

> 示意片段（无配套脚本）

```js
window.addEventListener('wheel', onWheel, { passive: true })
```

Chrome 对 `window` / `document` / `body` 的这三类事件已默认 passive，但**挂在普通元素上的监听仍默认非 passive**，显式写出来更保险。

## 四、事件委托与解绑

### 事件委托：一个监听器管住所有子节点

列表项很多、还会动态增加时，不逐个绑事件，只在容器上绑一次：

> 示意片段（无配套脚本）

```js
list.addEventListener('click', (e) => {
  const li = e.target.closest('li') // 从真实目标向上找最近的匹配祖先
  if (!li) return
  handle(li.dataset.id)             // 数据从 data-* 走
})
```

要点：

- **`e.target.closest('li')` 而不是 `e.target`**：点击可能落在子元素（图标、文字）上，`closest()` 把"点在子元素上"也覆盖。
- **数据从 `data-*` 走**：`li.dataset.id` 读的就是 `data-id`。
- 代价只是每次多走一遍 `closest`，换来监听器数量从 N 降到 1：内存、解绑成本、"新增节点忘了绑"的 bug 一起消失。
- 前提是冒泡：链上有 `stopPropagation` 委托就断。

### 解绑监听器的三种手段

监听器持有回调，回调持有闭包——不解绑的监听器是一整条引用链，是[内存泄漏](./内存管理与垃圾回收.md)的常见来源：

1. **`removeEventListener(type, fn, options)`**——最基础也最容易失败：按"类型 + 函数引用 + `capture`"三者匹配，匿名函数、`.bind()` 产物都**解不掉且不报错**。必须把函数引用存住。
2. **`{ once: true }`**——"只处理一次"的语义直接写在注册处（引导浮层、只提交一次的按钮），不用回调里手写解绑。
3. **`{ signal }`**——一个 `AbortController` 管一组监听器，`abort()` 一次全摘：

> 示意片段（无配套脚本）

```js
const ac = new AbortController()
window.addEventListener('scroll', onScroll, { signal: ac.signal })
window.addEventListener('resize', onResize, { signal: ac.signal })
ac.abort() // 组件卸载时一次清理，还能顺带取消 fetch（见第八节）
```

常见疑问：**移除元素会自动解绑吗？** 元素没有其他引用时会被 GC、监听器一起消失；但节点被变量或闭包持有（分离 DOM）时引用链还在——问题不在"要不要解绑"，而在"为什么还留着引用"。

## 五、自定义事件与程序化触发

### 不依赖框架的组件通信

子元素派发自定义事件、祖先监听，`detail` 带数据、`bubbles: true` 让它冒泡上去——原生组件通信与 Web Components 的标准做法：

> 示意片段（无配套脚本）

```js
toolbar.addEventListener('cart:add', (e) => console.log(e.detail.id))
addBtn.addEventListener('click', () => {
  addBtn.dispatchEvent(new CustomEvent('cart:add', { detail: { id: 42 }, bubbles: true }))
})
```

要点：`detail` 是 `CustomEvent` 独有的字段（`new Event()` 没有）；事件名建议带命名空间前缀（`cart:add`）避免撞原生事件；`bubbles: true` 不写就只能在本元素监听到。

### 程序化触发

自动化测试、埋点回放靠这两个 API：`el.click()` 最省事（等价派发一个会冒泡的 click）；要带 `key` / `metaKey` 等真实属性则用 `el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`。合成事件的 **`isTrusted` 为 `false`**，可据此区分"真用户"与"脚本触发"，风控与埋点会用到。

## 六、三个观察者：把轮询换成变化通知

"进视口了吗""尺寸变了吗""DOM 被谁改了"过去靠 `setInterval` 反复量，三个 Observer 把它们变成**变化发生时回调一次**：

### IntersectionObserver：元素进没进视口

> 示意片段（无配套脚本）

```js
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        load(e.target)      // 懒加载：进入视口才加载
        io.unobserve(e.target) // 加载完摘掉，别一直挂在观察列表
      }
    })
  },
  { rootMargin: '0px 0px 200px 0px', threshold: 0 } // 提前 200px 触发
)
document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img))
```

- **`rootMargin` 是判定边界的扩缩**，不是位移：`rootMargin: '0px 0px 200px 0px'` 把判定下边界外扩 200px，元素还在屏幕外就能触发——图片懒加载的预加载带与无限滚动就是这么实现的。
- `threshold` 指定"露出多少比例才回调"（如 `[0, 0.5, 1]`）；只触发一次就在回调里 `unobserve`。

### ResizeObserver：元素自己的尺寸变了

盯的是**被观察元素自己的内容盒尺寸**，比 `window.resize` 精确——窗口没变但被 flex 挤窄、侧边栏折叠、字体加载撑高都能感知。

场景：一个图表容器，宽度由 flex 布局决定。侧边栏折叠时它变宽了，但窗口尺寸没变，`window.resize` 不会触发——这时就该观察元素本身：

> 示意片段（无配套脚本）

```html
<div id="chart" style="width: 100%; height: 200px;"></div>
```

> 示意片段（无配套脚本）

```js
const box = document.getElementById('chart')

// 按新尺寸重画图表（这里简化为输出文本）
function render(width, height) {
  box.textContent = `当前尺寸：${Math.round(width)} × ${Math.round(height)}`
}

const ro = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect
  render(width, height)
})

ro.observe(box) // 开始观察；此后每次尺寸变化（侧边栏折叠等）回调自动执行
// ro.disconnect() // 组件卸载时停止观察
```

坑：**在回调里改被观察元素自身的尺寸**会形成"改尺寸 → 回调 → 再改"循环，浏览器跳过通知并打 `ResizeObserver loop completed` 警告。把写操作放 `requestAnimationFrame`，或临时 `unobserve` 再恢复。

### MutationObserver：DOM 被改了

订阅子节点增删、属性与文本变化，回调还能读出"改之前是什么"（`attributeOldValue`）。用途：检测第三方脚本插了什么、富文本编辑器改了什么、DOM 变更当埋点。

场景：页面里有个容器，第三方脚本或编辑器会往里改东西，想知道"谁在什么时候改了什么"：

> 示意片段（无配套脚本）

```html
<div id="editor"></div>
```

> 示意片段（无配套脚本）

```js
const host = document.getElementById('editor')

const mo = new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    if (m.type === 'childList') console.log('节点增删：', m.addedNodes, m.removedNodes)
    if (m.type === 'attributes') {
      console.log(`属性 ${m.attributeName} 从 "${m.oldValue}" 改为 "${m.target.getAttribute(m.attributeName)}"`)
    }
  })
})

mo.observe(host, {
  childList: true,       // 子节点增删
  subtree: true,         // 连同所有后代
  attributes: true,      // 属性变化
  attributeOldValue: true, // 回调里能拿到改之前的值
})

mo.takeRecords()   // 主动取走尚未投递的记录（可选）
// mo.disconnect() // 停止观察
```

关键差异：**`MutationObserver` 回调走微任务队列**（与 `Promise.then` 同类），不依赖渲染帧；IO / RO 的回调依赖渲染帧。

### 选型

| 想知道什么 | 用什么 | 别用什么 |
| --- | --- | --- |
| 元素进没进视口 / 露出比例 | `IntersectionObserver`（配 `rootMargin` 做提前量） | `scroll` + `getBoundingClientRect()` 手算 |
| 元素自己的尺寸变了 | `ResizeObserver` | `window.resize` 后自己遍历重测 |
| DOM 被改了 | `MutationObserver` | `setInterval` 轮询 `innerHTML` 比对 |

## 七、fetch 与 XMLHttpRequest

### 拿到响应不等于请求成功

`fetch()` 返回的 Promise **只在网络层失败时 reject**（断网、DNS 失败、CORS 被拒）。HTTP 层的 4xx / 5xx 是"成功拿到了一个表示错误的响应"，`await` 正常返回，必须自己判 `res.ok`（`status` 在 200–299 时为 `true`）：

> 示意片段（无配套脚本）

```js
const res = await fetch(url)
if (!res.ok) {
  throw new Error(`HTTP ${res.status}`) // 不判 ok，会把 500 当正常数据处理
}
const data = await res.json()
```

另外两点：`res.json()` / `res.text()` / `res.blob()` 各自是一次 Promise，响应体是流**只能读一次**，第二次读抛 `TypeError`；受 CORS 约束，`res.headers.get()` 只能拿到 `Access-Control-Expose-Headers` 放行的字段。

### 超时与取消

> 示意片段（无配套脚本）

```js
// 超时：最省事的写法
await fetch(url, { signal: AbortSignal.timeout(5000) })

// 主动取消：用户点关闭、切路由时调用
const ctrl = new AbortController()
fetch(url, { signal: ctrl.signal })
ctrl.abort()
```

需要既超时又能手动取消时，用 `AbortSignal.any([userSignal, AbortSignal.timeout(5000)])` 合并信号。`abort()` 是**真的掐断请求**（连接取消、响应体停止下载），"请求照发只是不处理结果"照样消耗带宽与后端资源。错误类型与统一模型见下一节。

### 竞态：别让旧结果覆盖新结果

搜索建议的经典 bug：先输入 `a` 再输入 `ab`，`a` 的请求更慢、响应后到，把 `ab` 的结果覆盖掉。两种守卫：

> 示意片段（无配套脚本）

```js
// 序号守卫：只认最后一次输入的响应，改动最小
let seq = 0
async function search(q) {
  const mine = ++seq
  const d = await (await fetch(`/api/search?q=${q}`)).json()
  if (mine === seq) render(d) // 响应回来时若序号已不是最新，丢弃
}

// 取消守卫：发新请求前掐掉上一个，顺带省资源
let ctrl = null
async function searchAbort(q) {
  if (ctrl) ctrl.abort()          // 必须吞掉旧请求的 AbortError
  ctrl = new AbortController()
  try {
    const d = await (await fetch(`/api/search?q=${q}`, { signal: ctrl.signal })).json()
    render(d)
  } catch (e) {
    /* 被新请求取消的旧请求走这里，属于预期 */
  }
}
```

| 写法 | 结果 | 代价 | 适用 |
| --- | --- | --- | --- |
| 无守卫 | 旧结果覆盖新结果 | — | 只在请求绝不会并发时成立 |
| 序号守卫 | 正确 | 旧请求仍跑完、白耗带宽 | 改动最小，加一个序号 + 一次比对 |
| 取消守卫 | 正确 | 多一个 controller，须 catch `AbortError` | 关心带宽、后端 QPS |

### 与 XMLHttpRequest 对照

| | `fetch` | `XMLHttpRequest` |
| --- | --- | --- |
| API 形态 | 原生 Promise、`Request` / `Response` / `Headers` | 回调 + 事件（`onload` / `onprogress`） |
| 上传进度 | 需 Request 流，兼容性差 | `xhr.upload.onprogress` 直接可用 |
| 超时 | `AbortSignal.timeout()` | `xhr.timeout` 属性 |
| 取消 | `AbortController` | `xhr.abort()` |
| 流式响应 | 支持（`ReadableStream`） | 不支持 |

结论：**新代码一律用 `fetch`**；只有需要**上传进度**或维护老代码时才碰 XHR。（`axios` 浏览器端长期默认走 XHR，所以 Network 面板看到 XHR 类型，不代表业务代码直接调了 `XMLHttpRequest`。）

## 八、AbortController 与 AbortSignal：一套统一的中断标记

前文几处出现的 `AbortController` / `AbortSignal` 是同一套机制：**controller 是控制端，signal 是信号端**。controller 调 `abort()`，所有持有对应 signal 的 API 同时被中断——一次生成、多处分发，这是它比"逐个取消"好的根本原因：

> 示意片段（无配套脚本）

```js
const controller = new AbortController()
const { signal } = controller

signal.addEventListener('abort', () => {
  console.log('被中断了，原因：', signal.reason)
})

// 同一个 signal 可以分发给任意多个支持中断的 API：
fetch('/api/user', { signal })
window.addEventListener('scroll', onScroll, { signal })
const reader = response.body.getReader()
reader.cancel(signal.reason) // 读流也能带上中断原因

controller.abort('用户离开页面') // 一处调用，fetch 取消 + 监听器移除
```

支持 signal 的 API：`fetch` / `Request`、`addEventListener`、`ReadableStream` 取消、以及各类封装了 fetch 的库。

### 两个静态工具

- **`AbortSignal.timeout(ms)`**：超时工厂，不需要手动建 controller，到点自动中断。
- **`AbortSignal.any([signalA, signalB])`**：合并多个信号，任一触发即触发——"既超时又能手动取消"就靠它组合。

### 错误语义：中断不是网络故障

| 中断方式 | 抛出的错误 `name` | 典型场景 |
| --- | --- | --- |
| `controller.abort()` | `AbortError` | 用户主动取消（点关闭、切路由） |
| `AbortSignal.timeout(ms)` | `TimeoutError` | 超时 |

两者都表示"**被我方取消**"，不是网络故障：把 `AbortError` 当异常上报，用户每点一次取消就产生一条假告警。正确做法是按 `error.name` 分型——`AbortError` 静默处理（属于预期），`TimeoutError` 才值得提示用户或重试。

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[内存管理与垃圾回收](./内存管理与垃圾回收.md)
- 下一篇：[手写实现与源码](./手写实现与源码.md)
