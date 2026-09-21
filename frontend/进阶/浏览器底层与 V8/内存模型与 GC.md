# 内存模型与 GC

内存问题最难的地方是「感觉漏了但拿不出证据」。这一篇先讲清 V8 堆的分代结构与 GC 策略，再用 `--expose-gc` 探针把「回收」和「泄漏」都变成可复现的实验，最后给出工程上定位泄漏的固定套路。

## 一、JS 内存结构：栈与堆

> 示意片段（无配套脚本）

```
调用栈（每个执行上下文）：局部变量/参数——原始值直接存值，对象存引用
堆（V8 托管）：对象、数组、闭包环境——分配由 V8 管，回收靠 GC
栈外：Buffer（Node）等堆外内存，不占 V8 堆、不走 V8 GC
```

GC 只管堆里「从根（全局对象、当前栈、Worker 等）出发还能触达的对象」。**触达 = 活；触达不到 = 垃圾**——这一定义直接决定泄漏的形态：*不是你不再用它，而是你还能摸到它*。

## 二、V8 堆的分代与 GC 策略

对象分两代，因为统计上「大多数对象朝生夕死」：

| 代 | 存什么 | 算法 | 成本 |
| --- | --- | --- | --- |
| 新生代（两个 semi-space） | 新对象 | Scavenge（复制存活对象，来回复制） | 快，空间小（默认十几 MB） |
| 老生代 | 活过两轮 GC 的大对象 | Mark-Compact（标记-清除-整理） | 慢，空间大 |

老生代全量标记会长时间停顿，V8 的解法是把标记拆碎：**增量标记**（标记与 JS 交替执行）、**并发标记**（标记在后台线程做，主线程只做少量收尾）。你在性能面板里看到的 GC 停顿从「几百毫秒」降到「几毫秒」级，就是这些机制的成果。

## 三、GC 实测：回收是如何发生的

`--expose-gc` 暴露 `global.gc()`，配合 `v8.getHeapStatistics()` 可以精确观察堆的变化：

> 摘自 `./code/v8-lab/gc.cjs`

```js
// ── 场景一：作用域内的垃圾 → GC 能收干净 ────────────────────────
function makeGarbage() {
  const arr = []
  for (let i = 0; i < 2e6; i++) arr.push({ i }) // 200 万个小对象
  return arr.length
}
global.gc()
const base = mb()
makeGarbage() // 返回后 arr 不再被引用
global.gc()
global.gc()
const after = mb()
console.log(`作用域垃圾: 基线 ${base}MB → 制造后 ${Math.max(mb(), after)}MB → GC 后 ${after}MB`)
assert.ok(after <= base + 5, '无引用的垃圾应被回收回基线')
```

实测输出：

> 摘自 `./code/v8-lab/gc.cjs`

```js
console.log(`作用域垃圾: 基线 ${base}MB → 制造后 ${Math.max(mb(), after)}MB → GC 后 ${after}MB`)
```

200 万个对象在函数返回后只剩「不可触达的垃圾」，两次 `gc()` 后堆回到 4MB 基线——**只要没有引用活着，V8 一定收得回来**。

## 四、泄漏：GC 无能为力的唯一原因

泄漏不是「V8 忘了回收」，而是**你（或你的代码路径）仍然持有引用**：

> 摘自 `./code/v8-lab/gc.cjs`

```js
// ── 场景二：全局缓存只进不出 → GC 也救不回来（泄漏的定义）───────
const cache = []
for (let i = 0; i < 2e6; i++) cache.push({ i })
global.gc()
global.gc()
const held = mb()
console.log(`全局持有  : GC 后仍占 ${held}MB（引用还在，GC 无能为力）`)
assert.ok(held > base + 50, '被全局引用的对象不会被回收')

cache.length = 0 // 放开引用
global.gc()
global.gc()
const freed = mb()
console.log(`放开引用  : ${held}MB → ${freed}MB`)
assert.ok(freed <= base + 5, '引用放开后可回收')
```

实测：`GC 后仍占 88MB（引用还在）→ 放开引用 88MB → 4MB`。**88MB 与 4MB 之间隔着的，只是「引用是否还活着」**。

> 摘自 `./code/v8-lab/gc.cjs`（场景三 / 四）

```js
// 场景三：未清理的定时器闭包 → 大对象被长期持有（泄漏）
function timerLeak() {
  let leak3 = 0
  const big = Array.from({ length: 1e6 }, (_, i) => ({ i }))
  const timer = setInterval(() => { leak3 += big.length }, 50) // big 被回调闭包捕获
  global.gc() global.gc() global.gc()
  const held = mb()
  clearInterval(timer) // 清掉定时器，闭包随之失引用
  global.gc() global.gc() global.gc()
  return held
}
const heldTimer = timerLeak()
global.gc() global.gc() global.gc()
console.log(`定时器闭包: GC 后仍占 ${heldTimer}MB（setInterval 回调攥着 big，清不掉）`)
assert.ok(heldTimer > base + 30, '被 setInterval 闭包捕获的对象不会被回收')
assert.ok(mb() <= base + 5, 'clearInterval 后引用随作用域结束放开，可回收')

// 场景四：未退订的监听器闭包 → 持有外部大对象（泄漏）
function listenerLeak() {
  const { EventEmitter } = require('node:events')
  const bus = new EventEmitter()
  const big4 = Array.from({ length: 1e6 }, (_, i) => ({ i }))
  bus.on('tick', () => { void big4.length }) // big4 被监听器闭包捕获
  global.gc() global.gc() global.gc()
  const held = mb()
  bus.off('tick', bus.listeners('tick')[0]) // 退订，放开引用
  global.gc() global.gc() global.gc()
  return held
}
const heldListener = listenerLeak()
global.gc() global.gc() global.gc()
console.log(`监听器闭包: GC 后仍占 ${heldListener}MB（add 后忘了 off，big4 收不掉）`)
assert.ok(heldListener > base + 30, '被监听器闭包捕获的对象不会被回收')
assert.ok(mb() <= base + 5, 'off 后引用放开，可回收')
```

实测：定时器闭包 `GC 后仍占 43MB（setInterval 回调攥着 big，清不掉）`，`clearInterval` 后随作用域结束回到基线；监听器闭包同样 `GC 后仍占 43MB`，`off` 后回到基线。**闭包是隐性持有的主通道**——回调函数捕获整个外层作用域，一个没清理的定时器/监听器就能拖住整棵它闭包里的大对象。

工程上最常见的四种持有：

| 模式 | 典型现场 | 解法 |
| --- | --- | --- |
| 全局缓存只进不出 | 手写 memoize 无上限 | LRU / WeakMap（键可回收） |
| 定时器没清 | 组件销毁后 `setInterval` 仍闭包引用大对象 | 卸载时 `clearInterval` |
| 事件监听没退订 | 全局事件总线 add 后忘了 off | `useEffect` cleanup / `AbortController` |
| 分离 DOM 节点 | 变量握着已从页面移除的节点 | 及时置 null，别存「快照 DOM」 |

> 提示：闭包是隐性持有的主通道——回调函数捕获了整个外层作用域，一个未退订的监听器就能拖住整棵组件树。

## 五、工程定位套路

**Chrome DevTools 三步对比法**（定位「页面越用越卡」）：

> 示意片段（无配套脚本）

```
① Memory 面板 → 拍快照 A（操作前）
② 复现可疑操作 N 次（如打开/关闭弹窗 10 次）
③ 拍快照 B → 选 Comparison 视图，按 Delta 排序
   → 看哪些构造函数的对象数/大小在 N 次操作后净增长
④ 点进 Retainers 链，看是谁攥着它（通常一路指到某个全局数组/监听器/闭包）
```

Node 侧的等价工具：`v8.getHeapStatistics()`（本次实验台所用）、`process.memoryUsage()`（rss / heapUsed / external）、`--heap-prof` 采样。

> 提示：判断泄漏的标准不是「内存高」，而是**多次操作后堆的阶梯式净增长不回落**——健康的页面 heapUsed 是锯齿形，泄漏的页面是楼梯形。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/v8-lab/gc.cjs` | 回收 + 三类泄漏场景（全局缓存 / 定时器闭包 / 监听器闭包，需 `--expose-gc`） | 三、四 |
| `./code/v8-lab/opt.cjs` | 优化探针（V8 篇已引） | — |
| `./code/v8-lab/run.cjs` | 总入口（按 flag 分子进程） | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[V8 执行与优化](./V8%20执行与优化.md)
- 下一篇：[WebAssembly](./WebAssembly.md)
- 参考：[Trash talk: the Orinoco garbage collector](https://v8.dev/blog/trash-talk) · [DevTools Memory](https://developer.chrome.com/docs/devtools/memory-problems/)
