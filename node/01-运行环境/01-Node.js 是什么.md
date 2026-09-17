# Node.js 是什么：一笔 I/O 密集型服务的耗时账

## 一次 API 请求，时间到底花在哪

先不谈概念，算一笔真实的账。假设后端收到一个"获取首页信息流"的请求，需要聚合并行多个下游环节，一次完整处理链路大致是这样：

```
用户请求
   ↓
查询 MySQL               30ms
   ↓
查询下游服务（聚合）      100ms
   ↓
请求第三方 API          2000ms
   ↓
查询 Redis                5ms
   ↓
保存访问记录             30ms
   ↓
返回结果
```

把时间加起来，整条链路要 **两三秒**。这还是每个环节串行等待的保守估计——现实中这些等待往往会叠加，单请求两秒出头是常态。

注意这一节要建立的第一个直觉：**这两三秒里，绝大部分时间不是"算"出来的，而是"等"出来的**。这一点会在下一节被拆开验证。

## CPU 真算了两三秒吗：理解 I/O 密集型

两秒多的总耗时里，有一个非常关键的问题值得单独拎出来问：

> Node.js 的 CPU 真正计算了这两三秒吗？

答案是 **没有**。

真正执行 JavaScript、跑你写的那段业务逻辑的时间，可能只有 **几毫秒**。剩下的两秒多，全都花在了"等待"上：

```
等待数据库返回
等待网络往返
等待文件读写
等待第三方 API 响应
等待下游服务聚合结果
```

CPU 在那些等待窗口里，要么被阻塞（阻塞模型下），要么干脆去处理别的请求（非阻塞模型下），几乎没有在为你这次请求做"计算"。

由此可以给出这类服务的标准定义：

**I/O 密集型（I/O Bound）服务**——指一次请求中，真正消耗在 CPU 计算上的时间极短，绝大部分耗时来自磁盘、网络、外部服务等输入/输出等待的服务。

聚合网关、接口编排、实时推送、BFF 层、数据中转这些后端场景天然就是这个形态：MySQL、Redis、下游服务、第三方 API 几乎都走网络 I/O。所以这类后端本质上就是一个非常典型的 I/O 密集型应用。

下面这段摘自配套脚本，把上面那笔账真正跑一遍——用 `setTimeout` 模拟各段等待、用 `process.cpuUsage()` 量出 CPU 的真实占用：

> 摘自 `./code/node-basics/src/01-io-cost.js`（运行：`npm run 01`）

```js
// SCALE 缩放系数：真实总等待约 2165ms（30+100+2000+5+30），演示按 1/4 缩放，避免读者干等 2 秒
// 想看真实时长，把 SCALE 改成 1 即可（总耗时约 2.2 秒）。
const SCALE = 0.25

// 真实各段耗时(ms)。演示时实际等待 = ms * SCALE
const REAL_STAGES = [
    { name: '查询数据库', ms: 30 },
    { name: '调用下游服务', ms: 100 },
    { name: '请求第三方 API', ms: 2000 },
    { name: '查询缓存', ms: 5 },
    { name: '写库', ms: 30 }
]

// 模拟一段 I/O 等待（Promise + setTimeout）。setTimeout 挂起期间 CPU 几乎不工作
function wait(realMs) {
    return new Promise(resolve => setTimeout(resolve, realMs * SCALE))
}

// 模拟该阶段真正执行的 JS（解析参数、拼装响应等），让 CPU 时间可见（约几毫秒）
function cpuWork() {
    let acc = 0
    for (let i = 0; i < 3e6; i += 1) acc += Math.sqrt(i) * 0.5
    return acc
}

// …

    const endWall = process.hrtime.bigint()
    const endCpu = process.cpuUsage(startCpu) // 与 startCpu 做差，得到区间 CPU 用量
    const totalWallMs = Number(endWall - startWall) / 1e6
    const totalCpuMs = (endCpu.user + endCpu.system) / 1000 // 微秒 → 毫秒

    console.log('阶段 | 真实耗时(ms) | 演示耗时(ms)')
    console.log('-'.repeat(48))
    for (const r of rows) {
        printRow([r.name, r.real, r.demo.toFixed(1)])
    }
    console.log('-'.repeat(48))
    console.log(`总墙上时间   : ${totalWallMs.toFixed(1)} ms  （真实约 ${(totalWallMs / SCALE).toFixed(0)} ms）`)
    console.log(`CPU 实际占用 : ${totalCpuMs.toFixed(2)} ms`)
    const ratio = totalWallMs > 0 ? (totalCpuMs / totalWallMs) * 100 : 0
    console.log(`CPU / 墙上   : ${ratio.toFixed(2)} %`)
    console.log('\n结论：等待占绝大多数，CPU 真正执行 JS 只有几毫秒 —— 这正是 Node 适合 I/O 密集服务的根因。')
```

实测输出（`npm run 01`）：

```
阶段 | 真实耗时(ms) | 演示耗时(ms)
------------------------------------------------
查询数据库              | 30             | 48.6
调用下游服务             | 100            | 36.0
请求第三方 API          | 2000           | 512.6
查询缓存               | 5              | 16.5
写库                 | 30             | 15.9
------------------------------------------------
总墙上时间   : 629.8 ms  （真实约 2519 ms）
CPU 实际占用 : 16.00 ms
CPU / 墙上   : 2.54 %

结论：等待占绝大多数，CPU 真正执行 JS 只有几毫秒 —— 这正是 Node 适合 I/O 密集服务的根因。
```

## 三个并发请求：阻塞模型 vs 非阻塞模型

理解了"大部分时间在等"，下一个问题自然变成：**大量请求同时来时，怎么组织才不浪费 CPU？**

假设同时来了三个请求：

```
请求 A → 调用下游服务   → 等待 2000ms
请求 B → 查询 MySQL    → 等待   50ms
请求 C → 查询 Redis    → 等待    5ms
```

### 阻塞模型：来一个，等完再处理下一个

如果采用阻塞模型，主线程会老老实实地"等完才走"：

```
处理 A
   ↓ 发起下游服务请求
   ↓ 等待 2000ms（这段时间 CPU 几乎空转）
处理 B
   ↓ 发起 MySQL 查询
   ↓ 等待 50ms
处理 C
   ↓ 发起 Redis 查询
   ↓ 等待 5ms
```

问题很直观：A 等待下游服务的两秒钟里，CPU 大部分时间什么都没干，B 和 C 明明只要几十毫秒就能完成，却被死死堵在后面。线程被"等"这件事占住了，能力完全释放不出来。

### 非阻塞模型：发起之后不等待，转去处理别的

Node.js 的思路不是这样。它把"I/O 等待"从主线程手里交出去，自己不干等：

```
处理 A
   ↓ 发起下游服务请求
   ↓ 不等待，立刻去处理 B
处理 B
   ↓ 发起 MySQL 查询
   ↓ 不等待，立刻去处理 C
处理 C
   ↓ 发起 Redis 查询
某个 I/O 完成 → 回来执行它对应的回调
```

画成并发视角就是：

```
                ┌── 下游服务 ───────────┐
                │                       ↓
                ├── MySQL ────→ 完成 → 回调
Node.js 主线程 ─┤
（Event Loop）  ├── Redis ──→ 完成 → 回调
                │
                └── 第三方 API ───────→ 完成 → 回调
```

A 在等下游服务的两秒里，主线程已经把 B、C 都处理完了，甚至还能接住新来的 D、E、F。等到某个 I/O 完成，内核发出"就绪通知"，事件循环再回过头来执行对应的回调。

把上面"不等待、转去处理别的"的说法落到一个最经典的输出顺序题上——同步代码先一口气跑完，回调（宏任务）排在最后才执行：

> 摘自 `./code/node-basics/src/03-eventloop-order.js`（运行：`npm run 03order`）

```js
// 03 经典事件循环输出顺序题
// 关键心智模型（阶段顺序）：同步代码 -> nextTick 队列 -> 微任务(Promise.then) -> timer
console.log('start') // 同步代码，最先执行

setTimeout(() => {
    console.log('timeout') // 宏任务：进入 timer 阶段，排在最后
}, 0)

Promise.resolve().then(() => {
    console.log('promise') // 微任务：在同步代码之后、timer 之前执行
})

process.nextTick(() => {
    // nextTick 队列优先级高于微任务队列，所以先于 promise 打印
    console.log('nextTick')
})

console.log('end') // 同步代码
```

实测输出（`npm run 03order`）：

```
start
end
nextTick
promise
timeout
```

一句话概括全篇的锚点：

> **Node.js 擅长的不是"计算得快"，而是"等待的时候不闲着"。**

一个主线程就能同时照看成千上万个正在"等 I/O"的请求——因为它们大部分时间不需要 CPU，只需要在 I/O 就绪时有人"叫它一声"。而"叫它一声"这件事，由操作系统内核（epoll / kqueue / IOCP）替我们做了。

## Node.js 到底是什么

回到更基础的问题：Node.js 究竟是什么？

Node.js **不是**一门新语言，而是 **JavaScript 的运行环境**。在它出现之前，JavaScript 基本只在浏览器里跑；Node.js 基于 Chrome 的 V8 引擎，把 JS 带到了服务端，让 JS 能直接调用文件系统、网络、进程等系统能力。

三者的关系可以这样记：

- **语言**：JavaScript / TypeScript
- **运行环境**：Node.js
- **底层引擎**：V8（和 Chrome 浏览器同款）

V8 只负责"把 JS 跑起来"，它本身并不知道 `fs.readFile()`、`http.createServer()` 是什么。这些服务器端能力，是 Node.js 在 V8 之外补上的一整层：

```
V8 负责：
   解析 JavaScript
   JIT 编译
   执行 JavaScript
   内存管理 / GC

Node.js 在 V8 之外补的（部分）：
   fs          文件系统
   http / net  网络与 HTTP 服务
   crypto      加密与哈希
   stream      流式数据处理
   child_process  子进程
   worker_threads 工作线程
```

所以准确地说：**V8 提供"执行 JS"的能力，Node.js 提供"做服务端该做的事"的能力**。两者打包在一起，才是你终端里那个 `node` 命令。

## 四层结构：你的代码如何触达磁盘与网络

理解了"等的时候不闲着"，再看 Node.js 在机器里到底由哪几层组成。一个 Node.js 进程背后至少涉及四层：

```
你的代码（JavaScript）
        │
        ▼
     V8 引擎（执行 JS）
        │
        ▼
  Node.js Bindings（把 JS 调用翻译为底层能力）
        │
        ▼
     libuv（Event Loop + Thread Pool + 异步 I/O）
        │
        ▼
  操作系统（epoll / kqueue / IOCP）
```

四个核心角色各自负责什么：

- **V8**：执行 JavaScript，做解析、编译、内存管理与 GC。
- **Node.js Bindings**：你写的 `fs.readFile()` 经过这一层，翻译成对 libuv 或系统能力的调用。
- **libuv**：Node.js 异步能力的底座，负责 Event Loop、线程池、定时器、跨平台的异步 I/O 封装。它轮询 I/O 状态，并调度来自不同来源的回调。
- **操作系统**：真正执行底层 I/O 的地方。Linux 用 `epoll`，macOS / BSD 用 `kqueue`，Windows 用 `IOCP`。

这里要纠正一个常见误解：**Node.js 的高并发，不是因为"没有等待"，而是因为"不让主线程等待"**。等待本身无法消除——下游服务该两秒还是两秒——Node.js 只是把等待从主线程挪到了内核和线程池，让主线程在等待期间去处理别的请求。

## 能做什么，不适合做什么

Node.js 适用的场景和它的"不闲着"特性高度一致：

| 场景 | 为什么适合 | 例子 |
|------|-----------|------|
| Web / API 服务 | 大部分时间在等数据库、缓存、下游返回 | Express、NestJS、Koa |
| 接口聚合 / BFF | 单请求聚合多个 I/O 源，等待占比极高 | 网关、中台 BFF |
| 命令行工具 | 启动快、生态成熟 | Vite、构建脚本、CLI |
| 实时推送 | 长连接 + 大量并发等待 | WebSocket 服务 |

反过来看，明显不适合的是 **CPU 密集型** 场景：大数运算、图像 / 视频编解码、复杂加密压缩、超大对象 `JSON.parse` 等。这类任务会让主线程长时间被占住，事件循环转不动，所有其他请求一起跟着卡。

## 安装与验证

下载 **LTS（长期支持）** 版本一路默认安装即可。装完在终端验证：

```bash
node -v
# 输出形如：v20.11.0

node -e "console.log('hello from node')"
# 输出：hello from node
```

`node -v` 确认版本；`node -e` 直接执行一段内联 JS，是快速验证运行环境是否正常的常用手段。本系列结论以 **Node 20 及以上**为准——Node 20（libuv 1.45）对事件循环的 timers 阶段时机做过调整，一些老教程里的结论已经不准了，这一点在《事件循环》一篇会具体讲。

## 三个常见误区

### 误区一："Node.js 是单线程的"

严格说，只有 **执行 JavaScript 的那条主线程**是单线程。进程内部，libuv 维护着一个**线程池**（默认 4 个线程），专门处理操作系统没提供真正异步接口的操作：文件 I/O、DNS 解析、`crypto` 加密计算等；定时器、网络 I/O 则由事件循环和内核协作完成。所以准确表述是：**Node.js 是"单线程执行 JS + 多线程处理底层 I/O"**。

### 误区二："Node.js 什么都适合"

错。它的强项是"等 I/O 的时候不闲着"，弱项是"算得重"。一旦业务逻辑塞满 CPU 密集计算，主线程被占住，事件循环转不动，所有请求一起卡死。这类任务应交给 Worker Thread 或子进程（见《进程线程与并发决策》）。

### 误区三："Node.js 就是后端框架"

Node.js 是**运行环境**，不是后端框架。它提供的是 JS 运行时、事件循环、系统级 API（文件、网络、进程）。真正定义"后端架构"的是 Express、Koa、NestJS 这些框架——它们负责路由、中间件、依赖注入、控制器。没有框架也能用内置 `http` 模块写后端，但那只是"裸 HTTP 服务"，谈不上后端架构。

## 代价清单

任何设计都有取舍，Node.js 的代价也很明确：

| 代价 | 说明 | 后面哪一篇展开 |
|------|------|---------------|
| CPU 密集任务会拖垮服务 | 只有一个 JS 主线程，一段重计算占住它，所有请求都得等 | 进程线程与并发决策 |
| 同步 API 会破坏"不闲着" | `readFileSync`、超大对象 `JSON.parse` 这类操作把异步模型打回阻塞原形 | 内置模块与文件操作 |
| 异步心智成本 | 写惯同步代码的人容易写出"看着像并发、其实是串行"的 await | 异步编程入门 |

## 从"为什么是 I/O 密集型"到"代码怎么组织"

上面这笔账回答了一个关键问题：**为什么后端场景会选 Node.js**——因为它把"等待"这件事从主线程手里交了出去，让一个线程能在大量 I/O 等待期间始终保持忙碌。

但"不闲着"只是一种能力，真正要把服务写出来，还得回到代码本身：你的 `fs`、`http`、`crypto` 这些能力，在 `.js` 文件里是怎么被引入、被拆分、被复用的？Node.js 提供了 CommonJS 与 ES Module 两套模块系统，它们决定了你如何组织一个可维护的项目。下一篇就来讲模块系统，以及两套机制的核心区别与加载时机。

## 小结

- **Node 的定位与结构**
  - 定位：JavaScript 的运行环境，不是语言也不是后端框架；V8 只负责执行 JS，fs/http/crypto 等服务端能力是 Node 在 V8 之外补的
  - 四层：你的代码 → V8（执行 JS）→ Bindings（翻译为底层调用）→ libuv（事件循环 + 线程池）→ OS（epoll / kqueue / IOCP）
- **I/O 密集型**：一次请求两三秒，CPU 真正只算几毫秒，其余全是等数据库、网络、外部服务的等待——这是 Node 擅长它的根因
- **并发模型：阻塞 vs 非阻塞**
  1. 阻塞：主线程"等完才走"，A 在等待时 B/C 被堵在后面
  2. 非阻塞：发起 I/O 后转去处理别的请求，完成再由事件循环执行回调
  3. 锚点：Node 强在"等待时不闲着"，不是"算得快"；高并发是"不让主线程等"
- **适用边界**
  - 适合：Web/API、BFF 聚合、CLI、实时推送——共同点都是等待占比高
  - 不适合：CPU 密集（编解码、大 JSON.parse），会占住主线程让事件循环转不动
- **三个常见误区**
  1. "单线程"只指 JS 主线程，libuv 另有线程池（默认 4）处理文件 I/O、DNS、crypto
  2. "什么都适合"：弱项是算得重，CPU 密集应交给 Worker Thread 或子进程
  3. "就是后端框架"：运行环境只提供运行时/事件循环/系统 API，架构由 Express/Koa/NestJS 定义
- **版本基准**：装 LTS，结论以 Node 20+ 为准（libuv 1.45 改了 timers 时机，旧教程可能失准）

## 配套代码

本篇的机制性结论可以在 `./code/node-basics/src/01-io-cost.js` 里亲手复现：它模拟一次真实请求的各段等待，并把"墙上时间"与"CPU 时间"分开打印出来。

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/node-basics/src/01-io-cost.js` | 一次 API 请求，时间到底花在哪 | 一次请求的耗时账：等待时间占绝大多数，CPU 真正执行的只有几毫秒 |
| `./code/node-basics/src/03-eventloop-order.js` | 三个并发请求：阻塞模型 vs 非阻塞模型 | 主线程在等待期间并没有闲着：同步代码与回调的实际执行顺序 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 下一篇：[模块系统：CommonJS 与 ES Module](./02-模块系统与包管理.md)

