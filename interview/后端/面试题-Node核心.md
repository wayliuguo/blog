# 面试题 · Node 核心

> 对齐知识体系：node 模块一·运行环境 + 模块二·网络底层。高频常考为主。
> 红线：定位「能独立完成服务端开发与部署的全栈拓展」，不吹后端专家；运行时事实以博客实跑结论为准，不背二手结论。

## 一、事件循环与异步模型

### 1. Node 事件循环和浏览器的区别？六个阶段说一下？

**结论：Node 的事件循环由 libuv 驱动，分 timers → pending callbacks → idle/prepare → poll → check → close 六个阶段；微任务不在每个宏任务后统一清，而是在「每个阶段切换之间」执行——这是与浏览器最大的差异。**

- 六个阶段各管什么

| 阶段 | 职责 | 典型回调 |
| --- | --- | --- |
| timers | 执行到期的 `setTimeout` / `setInterval` | 定时器 |
| pending callbacks | 执行上一轮延迟的 I/O 系统错误回调 | TCP `ECONNREFUSED` 等 |
| idle / prepare | 内部使用 | — |
| poll | 拉取新的 I/O 事件；队列空且有 `setImmediate` 则转 check，否则阻塞等待 | 大部分 I/O 回调 |
| check | 执行 `setImmediate` | setImmediate |
| close callbacks | 关闭回调 | `socket.on('close')` |

- 与浏览器的三点差异
  - `process.nextTick` 优先级最高——每个阶段切换前清空 nextTick 队列，再清微任务
  - 微任务的执行时机：浏览器是「每个宏任务后」，Node 是「阶段与阶段之间 + nextTick 队列之后」
  - Node 有多线程的后援（libuv 线程池处理文件/DNS 等），浏览器主线程更纯粹
- 追问：`setTimeout(fn, 0)` 和 `setImmediate` 谁先执行？
  - **主模块中不确定**（1ms 边界受进程启动性能影响）；**在 I/O 回调内 setImmediate 恒先**——poll 阶段后直接进 check，而 timers 要等下一轮循环

### 2. process.nextTick、Promise.then、setImmediate 的执行顺序？

**结论：同一轮同步代码结束后——nextTick 队列最先清空 → 微任务（Promise.then）→ 进入事件循环下一阶段（check 里才轮到 setImmediate）。**

- 记法：nextTick 是「插队王」，微任务次之，setImmediate 是「下一阶段的宏任务」
- 经典输出题

```js
setImmediate(() => console.log('immediate'))
process.nextTick(() => console.log('nextTick'))
Promise.resolve().then(() => console.log('promise'))
console.log('sync')
// sync → nextTick → promise → immediate
```

- 风险点（高级区分）：nextTick 递归调用会**饿死事件循环**（永远清不完，后续阶段永远进不去）——官方文档明确警告，库代码慎用；业务代码优先用 `setImmediate` / `queueMicrotask`
- 追问：nextTick 和 `queueMicrotask` 的区别？
  - nextTick 队列在微任务队列**之前**执行，且属于 Node 专有；`queueMicrotask` 是标准微任务

### 3. libuv 是什么？在 Node 架构里扮演什么角色？

**结论：libuv 是 Node 的异步 I/O 库，提供事件循环、线程池与跨平台抽象——Node「单线程」的准确说法是「JS 执行单线程」，I/O 由 libuv 线程池与系统异步接口完成后回调回主线程。**

- 分工
  - V8：执行 JS
  - libuv：事件循环 + 异步 I/O（网络用系统 epoll/kqueue/IOCP；文件、DNS 解析走**默认 4 个线程**的线程池）
  - Node 内置模块：胶水层，把结果回调回 JS
- 追问：哪些操作会占用线程池？怎么调大？
  - fs、dns.lookup、部分 crypto（pbkdf2/randomBytes 大量调用）——`UV_THREADPOOL_SIZE` 环境变量可调（上限 1024）；线程池打满时这些操作排队，表现为「明明是异步却慢」

### 4. Node 怎么处理 CPU 密集任务？worker_threads 和 child_process 怎么选？

**结论：事件循环单线程，CPU 密集会阻塞所有请求——方案按序：拆分计算 → worker_threads（并行线程）→ child_process（独立进程）；要共享内存选 worker，要隔离运行选进程。**

- worker_threads vs child_process

| 维度 | worker_threads | child_process |
| --- | --- | --- |
| 模型 | 同一进程内的并行线程 | 独立子进程 |
| 内存 | 可共享（SharedArrayBuffer） | 各自独立，开销大 |
| 通信 | MessagePort 结构化克隆 | IPC 管道 JSON 消息 |
| 启动开销 | 小 | 大（新进程 + 新 V8 实例） |
| 适用 | 纯计算（加密/图像处理/大数据排序） | 跑 shell 命令、隔离运行、复用 Node 环境 |

- child_process 四个 API 辨析：`exec`（缓冲全部输出，命令注入面）、`execFile`（不经过 shell，更安全）、`spawn`（流式，适合大输出）、`fork`（专用 Node 子进程，自带 IPC）
- 追问：为什么不用 cluster 做 CPU 密集？
  - cluster 是多进程**分摊 I/O 请求**（共享端口），不是把一个大计算拆开——CPU 密集的并行化要的是 worker_threads

### 5. 线上怎么发现「事件循环被阻塞」？

**结论：不要等用户反馈卡，用 `perf_hooks.monitorEventLoopDelay()` 采样延迟分布，配合 APM 上报 p99 事件循环延迟；阻塞阈值超过 100ms 就值得排查。**

- 三个层次
  - 采样：`monitorEventLoopDelay` 记录每次事件循环实际间隔与预期的偏差分布（p50/p99/max）
  - 定位：同步长循环、大 JSON `JSON.stringify`、同步 crypto、同步 fs（`readFileSync` 全家）是四大惯犯
  - 修复：拆任务（`setImmediate` 分批）、下沉 worker_threads、换流式处理
- 追问：`process.hrtime()` 能干这个吗？
  - 能手工打点测延迟，但 `monitorEventLoopDelay` 是官方提供的持续采样方案，免埋点

## 二、Stream 与 Buffer

### 6. Stream 是什么？四类流分别什么场景？背压怎么处理？

**结论：流是分块处理数据的抽象——处理大文件不占内存、可管道组合；背压（消费慢于生产）靠 `write` 返回 false 暂停读取、drain 后恢复，`pipeline` 已自动化这套握手。**

- 四类流

| 类型 | 方向 | 典型场景 |
| --- | --- | --- |
| Readable | 只读 | `fs.createReadStream`、HTTP 请求体 |
| Writable | 只写 | `fs.createWriteStream`、HTTP 响应体 |
| Duplex | 双向独立 | TCP socket |
| Transform | 双向且改数据 | zlib 压缩、加密流 |

- 背压机制
  - 生产快于消费时 `write()` 返回 false → 暂停 `read()` → 缓冲排空触发 `drain` → 恢复
  - **为什么 pipeline 优于 pipe**：pipe 出错不会自动销毁两端、也没有统一的清理回调——`stream.pipeline()`（或 `promisify` 版）错误与清理一体化，生产环境一律用 pipeline
- 场景题：10GB 日志文件统计出现次数——`createReadStream` + 行分割 Transform，内存占用恒定在 MB 级；`fs.readFile` 会直接把 10GB 读进内存
- 追问：流的 error 事件不监听会怎样？
  - 直接崩进程（error 没有默认监听器就抛成 uncaughtException）——每个流都必须挂 error 处理

### 7. Buffer 是什么？多字节字符被截断的乱码怎么解决？

**结论：Buffer 是堆外的二进制字节序列（不经 V8 对象结构），处理 TCP 流/文件流的原始数据；多字节字符（中文 3 字节）被 chunk 切断会乱码，用 `string_decoder` 或攒齐后再 `toString`。**

- 关键点
  - 堆外内存：不占 V8 老生代，GC 管不到——但大 Buffer 照样撑爆系统内存，上限意识不能少
  - 与 `Uint8Array` 的关系：Buffer 是 `Uint8Array` 的子类，额外带编码读写方法
  - 乱码根因：`chunk.toString('utf8')` 时 chunk 边界正好切在中文 3 字节中间
  - 解法：`string_decoder.StringDecoder` 记住上一次的不完整字节，拼上下一段再解码
- 追问：`Buffer.alloc(10)` 和 `Buffer.allocUnsafe(10)` 的区别？
  - alloc 清零（安全慢），allocUnsafe 不清零复用池（快但可能读到残留数据）——新代码一律 alloc

## 三、进程与稳定性

### 8. cluster 模块的原理？和 PM2 cluster 的关系？

**结论：cluster 由 master 进程 fork 多个 worker 共享同一端口，默认 round-robin 分发连接（Windows 除外），让单线程的 Node 榨干多核；PM2 cluster 模式是同一机制的封装。**

- 要点
  - master 不处理业务请求，只负责 fork、分发与重启死掉的 worker
  - worker 之间不共享内存——状态要放 Redis/数据库，这是 cluster 方案下最常见的坑
  - IPC：基于管道的 JSON 消息
- 追问：worker 挂了怎么办？
  - 监听 `exit` 事件在 master 里重新 fork；PM2 自带这个能力并叠加了零停机 reload

### 9. 未捕获异常怎么兜底？什么叫优雅退出？

**结论：`uncaughtException` 是最后一道兜底，此时进程状态不可信——记日志后停止接新请求、处理完存量请求再退出，交给 PM2/容器重启；`unhandledRejection` 从 Node 15 起默认直接崩，别靠吞掉。**

- 三层防御
  - 业务层：try-catch / async 错误正常捕获
  - 框架层：统一异常过滤器/中间件转错误响应
  - 进程层：`uncaughtException` / `unhandledRejection` 兜底记日志
- 优雅退出（graceful shutdown）四步
  1. 收到 SIGTERM → `server.close()` 停止接新请求
  2. 等存量请求处理完（设超时上限）
  3. 关闭数据库/Redis 连接、停定时器
  4. `process.exit(0)`
- 追问：为什么 uncaughtException 里不能继续跑？
  - 异常点之后内存状态、未完成事务都不可信，强行续命会造成脏数据——唯一正确动作是记日志后退出

### 10. Node 内存泄漏怎么排查？常见原因有哪些？

**结论：常见四类——意外全局变量、闭包持有大对象、未清理的定时器/监听器、无上限缓存；排查路径是 `process.memoryUsage()` 观测趋势 → heap snapshot 多次对比 → 定位持有链。**

- 排查三板斧
  - `memoryUsage()` 按 RSS/heapUsed/external 分项看趋势，heapUsed 持续爬升不回落是信号
  - `--inspect` + Chrome DevTools 抓 3 张堆快照（间隔操作）对比增量对象，看 retainer 链
  - 事件监听器泄漏用 `emitter.listenerCount` / MaxListenersExceededWarning 警告
- V8 分代回收一句：新生代 Scavenge（空间换时间）、老生代 Mark-Sweep/Mark-Compact；了解即可，重点在「谁持有谁」
- 追问：Node 里能设置堆上限吗？
  - `--max-old-space-size`；容器里还要注意 RSS 与容器 limit 的关系，OOMKilled 常发生在堆外内存

### 11. require 和 import 的区别？模块加载机制了解吗？

**结论：CommonJS 是运行时同步加载（值拷贝、可动态拼接路径），ESM 是编译期静态分析（绑定引用、支持 tree-shaking 与顶层 await）；Node 里两者互操作有明确规则。**

- 对比表

| 维度 | CJS `require` | ESM `import` |
| --- | --- | --- |
| 加载时机 | 运行时、同步 | 编译期静态分析 |
| 导出 | 值的拷贝（导出后模块内部变化不可见） | 绑定（实时反映导出值） |
| 顶层 await | 不支持 | 支持 |
| 动态加载 | `require()` 直接动态 | `import()` 动态导入 |
| tree-shaking | 不可 | 可（静态可分析） |

- 加载细节（加分）：require 有模块缓存（第二次同路径不重新执行）；路径解析按「核心模块 → `node_modules` 逐级向上」查找；ESM 里 `this` 是 undefined、CJS 里是 exports
- 追问：为什么 ESM 循环依赖「问题小一些」？
  - ESM 是引用绑定，取值发生在使用时；CJS 循环依赖时拿到的是执行到一半的 `module.exports`（半成品对象）

## 四、网络底层

### 12. TCP 粘包/拆包是什么？Node 怎么处理？

**结论：TCP 是字节流没有消息边界，粘包是应用层要解决的问题；方案是定长、分隔符、长度前缀三种，HTTP 自带边界所以业务里感知不到。**

- 三种方案
  - 定长：浪费带宽，少用
  - 分隔符：文本协议常用（如 `\r\n`），内容含分隔符要转义
  - **长度前缀**：header 声明 body 长度，二进制协议首选
- 为什么 HTTP 没这个问题：Content-Length / chunked 编码就是协议层的边界
- 追问：socket 里直接 `on('data')` 拿到的就是完整一条消息吗？
  - 不是——可能半条也可能两条粘一起，必须自己按上述方案封帧

### 13. HTTP keep-alive 与连接复用？服务端要注意什么？

**结论：keep-alive 复用 TCP 连接省掉每次握手，axios/undici 默认开启连接池；服务端要配连接池上限、空闲超时，高并发下连接数失控是常见事故。**

- 要点
  - 客户端：连接池上限（默认可能远小于并发量）、空闲连接超时（小于服务端 keep-alive 超时，避免拿到已被服务端关掉的连接）
  - 服务端：`server.keepAliveTimeout`（Node 默认 5s，若小于负载均衡器的空闲超时会出现 502——经典线上坑）
- 追问：Node 默认 keepAliveTimeout 5 秒，放有 Nginx/网关时为什么可能 502？
  - 网关认为连接可用（它的超时更长）复用了连接，Node 这边已把连接关了——把 Node 的 keepAliveTimeout 配置成大于网关超时即可

### 14. 场景题：一个上传大文件的接口怎么设计？

**结论：全程流式——请求体用流接住直接写盘/转存，不在内存里攒完整文件；配合限制大小、限流与分片续传，内存与稳定性都有保障。**

- 要点
  - `req` 本身是 Readable 流：`req.pipe(writeStream)` 或 pipeline 到对象存储的 SDK 流式上传
  - 限制：`content-length` 预检 + 流中途计数超限即销毁（防恶意无长度请求）
  - multipart 用 busboy/stream-based 解析器，不用把整个 body buffer 下来的库
  - 大文件进一步做分片上传 + 断点续传（前端切片，后端按片落盘合并）
- 追问：为什么不能用 `body-parser` 接文件？
  - 它把 body 全量读进内存，100 个并发上传 500MB 文件直接打爆内存
