# Node 知识体系 · 按三篇参考重构（大纲）

> 依据：参考三篇 —— Day2《nodejs 复习篇》(10 节) / Day3《深入 Node.js：事件循环、Buffer/Stream 与进程线程》(57 节) / 《Node.js 网络编程：从 TCP、Socket 到 HTTP、WebSocket》(33 节)，共 **100 节**
> 目标：**按这三篇重新划分并替换现有 `node/` 体系文档**；Agent 内容按既定边界处理（删叙事 / 换语境 / 删技术本体）
> 状态：**已于 2026-09-16 执行完毕** —— 模块一 8 篇 + 模块二 5 篇已落地；旧 12 篇已删除（git 历史可恢复）；`node/index.md` 已移除；配套代码移入各模块目录下的 `code/`；`check-links` / `check-sidebar-coverage` / `vitepress build` 全部通过。
> 执行时确认的 3 项：① 篇首「承上/启下」两行 + 「开篇」小节**一律去掉**；② `code/node/` 下 11 个项目**全部**随文档目录落位；③ 旧文档**直接删除**。

---

## 一、划分原则（为什么这么切）

| # | 原则 | 说明 |
|---|------|------|
| 1 | **按认知台阶切，不按原文节序堆** | Day3 是 57 节的单篇长文，必须切成可独立成页的篇目；否则一页 57 节无法阅读 |
| 2 | **同源知识合并去重** | Day2 与 Day3 重复讲 Event Loop、Buffer/Stream（Day2 浅、Day3 深）→ 合并为一处，取深 |
| 3 | **每篇回答一个问题** | 篇标题即问题（原文的写法范式），篇内小节标题即上一节留下的疑问 |
| 4 | **一篇只装一种认知任务** | "理解机器"（阶段、poll、epoll）与"精算输出题"（nextTick、微任务检查点）是两种任务 → 事件循环拆两篇 |
| 5 | **误区显式成节** | 原文 6 处"一个非常重要的误区"独立成节，不埋进正文 |
| 6 | **模块末尾必有一篇收束** | 收成"一张图 + 见 X 想 Y 决策表"，不给 API 清单 |
| 7 | **Agent 内容三分处理** | 纯叙事删 / 举例换语境 / Agent 技术本体（MCP·Function Calling·向量库·LLM API·RAG）删 |

---

## 二、总览：100 节 → 13 篇

```
模块一 · 运行环境（8 篇）—— 来源：Day2 全 10 节 + Day3 全 57 节
  01 Node.js 是什么：一笔 I/O 密集型服务的耗时账
  02 模块系统：CommonJS 与 ES Module
  03 事件循环（上）：六个阶段与内核就绪通知
  04 事件循环（下）：微任务与输出顺序精算
  05 异步编程与事件驱动
  06 Buffer 与 Stream：字节、背压与流式数据
  07 进程、线程与优雅退出
  08 运行机制收束：一张图 + 决策模型

模块二 · 网络底层（5 篇）—— 来源：网络编程篇全 33 节
  00 导读与全景图：网络层为什么在这里
  01 TCP 与 Socket 编程
  02 HTTP 与 HTTPS 深入
  03 WebSocket 与 SSE 实时通信
  04 一次请求完整经历了什么
```

> 现有体系为「模块一 7 篇 + 模块二 5 篇 = 12 篇」；新划分 **13 篇**，净增 1 篇（事件循环由 1 拆 2）。

---

## 三、模块一 · 运行环境（8 篇）

### 01 · Node.js 是什么：一笔 I/O 密集型服务的耗时账
**来源**：Day2 §一、§十 · Day3 §一

- 一次请求的真实耗时账（MySQL 30ms → 下游服务 100ms → 第三方 API 2000ms → Redis 5ms → 落库 30ms）
- 关键疑问：CPU 真正执行 JS 有多久？——只有几毫秒
- 阻塞模型 vs 非阻塞模型（三请求对照图）
- 结论：Node 擅长的不是"计算得快"，而是"等待的时候不闲着"
- Node.js 是什么（V8 运行环境）、能做什么、安装与验证
- Node 的四层结构：你的代码 → V8 → Node Bindings → libuv → 操作系统
- 常见误区：①单线程 ②什么都适合 ③Node 就是后端
- 代价清单：CPU 密集 / 同步 API / 异步心智
- 本篇为什么是整条主线的"锚"

### 02 · 模块系统：CommonJS 与 ES Module
**来源**：Day2 §二

- CommonJS：`require` / `module.exports`
- ES Module：`import` / `export`
- `package.json` 的 `"type": "module"`：一个"整包开关"
- `require` 与 `import` 的本质区别（运行时解析 vs 静态分析、加载语义、互操作、ESM 静态结构）
- ⚠️ **保留项**（原文未覆盖）：npm 包管理、语义化版本、锁文件、`node_modules`

### 03 · 事件循环（上）：六个阶段与内核就绪通知
**来源**：Day3 §一 ~ §十四

- 重新理解 Node：它真的只有一个线程吗（Application → V8 → Bindings → libuv → OS）
- 事件循环到底解决什么问题（同步模型下线程全在闲置）
- libuv 的六个阶段（timers → pending callbacks → idle/prepare → poll → check → close callbacks）
- **timers**：为什么 `setTimeout(fn, 1000)` 是"最小等待时间"而不是精确执行时间
- pending callbacks / idle · prepare（理解存在即可）
- **poll**：整个循环里最重要的阶段（检索新 I/O 事件 + 执行就绪回调）
- 网络 I/O 到底怎么异步：socket 注册给 epoll，而不是"一连接一线程"
- ⚠️ **误区一**：不是所有异步操作都在线程池里跑（网络 I/O 走 OS；fs / dns.lookup / crypto / zlib 走线程池）
- libuv 线程池：默认 4 个线程、`UV_THREADPOOL_SIZE`
- **check** 阶段与 `setImmediate`
- `setImmediate` 与 `setTimeout(0)` 谁先执行
- Node 20 / libuv 1.45 之后 timer 时机的重要变化（旧教程已过时）
- **close callbacks**

### 04 · 事件循环（下）：微任务与输出顺序精算
**来源**：Day3 §十五 ~ §二十二 · Day2 §三

- 只有宏任务是**不完整的**：加入微任务
- 同步代码永远先执行（`132` 与 `1432` 两个经典输出）
- `process.nextTickQueue`：不属于任何阶段的高优先级队列
- Promise 微任务队列
- ⚠️ **误区二**：微任务不是"一轮 Event Loop 才执行一次"（微任务检查点）
- ⚠️ **误区三**：递归 `process.nextTick` 会饿死 Event Loop（I/O starvation）
- 一张图彻底理解 Event Loop
- 为什么这套机制让 Node 特别适合 I/O 密集型服务

### 05 · 异步编程与事件驱动
**来源**：Day2 §四、§五

- Callback：error-first 约定与 Callback Hell
- Promise：三种状态、链式调用、`catch` / `finally`
- async/await：看起来像同步，但**没有**把异步 I/O 变成阻塞 I/O
- 串行 vs 并行：`Promise.all` 把 700ms 收敛到 500ms
- 并行中的错误处理：`all` 与 `allSettled` 的区别
- EventEmitter：注册 → 等待 → 触发 → 执行监听器
- 事件驱动在服务端的应用思路（解耦执行逻辑与观测 / 日志 / 推送）

### 06 · Buffer 与 Stream：字节、背压与流式数据
**来源**：Day3 §二十三 ~ §三十四 · Day2 §六、§七、§八

- Buffer 到底是什么（固定长度字节序列、`Uint8Array` 子类）
- 十六进制与字符串互转（`68656c6c6f`）
- Buffer 与 String 的区别：`'你好'.length = 2`，而 `Buffer.from('你好').length = 6`
- Buffer 的 5 个应用场景（文件 / TCP chunk / 图片音视频 / 加密 / Base64）
- Stream 是什么：`readFile` 一个 10GB 文件会直接炸
- Stream 的核心思想：一块一块地流动，内存只占几十 KB 到几 MB
- **Stream 与 Buffer 的关系**：Buffer = 一块数据，Stream = 数据运输方式（水桶 vs 水管）
- 四种 Stream：Readable / Writable / Duplex / Transform
- 实战：用 Stream 复制大文件
- **Stream 最大的价值：Backpressure 背压**（读 500MB/s、写 10MB/s 会 OOM）
- `pipe` 为什么重要，以及为什么更推荐 `pipeline()`
- 落地：`fs` 文件系统（`readFile` / `writeFile` / `mkdir` / `readdir` / 目录扫描）
- 流式推送：为什么流式接口必须用 Stream
- ⚠️ **保留项**（原文未覆盖）：`path` 模块

### 07 · 进程、线程与优雅退出
**来源**：Day3 §三十五 ~ §五十五

- 进程是什么（`process` 对象、pid / memoryUsage / uptime）
- 怎么创建进程：`child_process` 四把刀（`spawn` / `exec` / `execFile` / `fork`）
- 为什么需要多进程，`cluster` 怎么做
- 进程之间**默认不能共享内存**（只能靠 IPC / Socket / Pipe / Redis / MQ / HTTP）
- 线程是什么，`worker_threads` 怎么用
- Worker Thread 真正适合什么（CPU 密集），为什么**不**用于普通 I/O
- ⚠️ **误区四**：Worker Thread ≠ libuv Thread Pool
- **Process vs Worker Thread** 全维度对比（内存 / V8 实例 / Event Loop / 隔离性 / 创建成本 / 通信 / 外部程序 / CPU 计算 / 故障隔离）
- ⚠️ **误区五**：生产环境不能随便 `new Worker` → Worker Pool + Task Queue
- Worker Threads 的共享内存：`SharedArrayBuffer` 与竞态代价（Atomics）
- 四种并发方式怎么选（决策表）
- 进程生命周期：`SIGTERM` 与优雅关闭（Graceful Shutdown）
- ⚠️ **误区六**：不要滥用 `process.exit()`
- ⚠️ **保留项**（原文未覆盖）：错误类型与兜底（`uncaughtException` / `unhandledRejection`）、环境变量与 `.env`、`os` 模块

### 08 · 运行机制收束：一张图 + 决策模型
**来源**：Day3 §五十六、§五十七、§二十二 · Day2 §九、§十

- 重新看 Node.js 架构（完整结构图 + 可主动创建的线程/进程）
- 一张知识关系总图（8 篇怎么咬合）
- **决策模型：见 X → 想 Y**（不是背 API，是记判断表）
- 常见误区清单（六条汇总）
- 自测 6 问
- 交接：进入模块二

---

## 四、模块二 · 网络底层（5 篇）

### 00 · 导读与全景图：网络层为什么在这里
**来源**：网络篇 §一

- 为什么网络层排在运行环境之后（依赖关系，不是难易）
- 全景图：Browser → HTTP → TCP → IP → 网卡 → Kernel → Socket → epoll → libuv → Event Loop → node:http → Express/Fastify → NestJS → Controller
- 每一层出问题时的典型现象表
- 这个模块与后续框架层的关系

### 01 · TCP 与 Socket 编程
**来源**：网络篇 §二 ~ §十三、§二十八 ~ §三十

- TCP/IP 分层模型（应用层 / 传输层 / 网络层 / 网络接口层）
- TCP 到底解决了什么问题（面向连接、可靠、有序）
- 三次握手，为什么不是两次
- TCP 提供的是**可靠字节流**（`socket.on('data')` 拿到的是 Buffer）
- 粘包与拆包：`write('hello')` + `write('world')` 可能被合并
- 自定义协议分包：`Length(4B) + Body(NB)`；结论：**TCP ≠ 消息协议**
- Socket 是什么（四元组、IP:Port）
- 用 `node:net` 写 TCP Server / Client
- **Socket 为什么又和 Stream 联系起来了**（`net.Socket` 本质是 Duplex Stream）
- 内核与 libuv：只留结论（epoll / kqueue / IOCP；libuv 屏蔽平台差异）
- 这就回答了"单线程为什么能扛万连接"
- ⚠️ **误区**：网络 I/O 和 libuv 线程池不要混淆
- 网络侧的背压：`socket.write()` 返回 `false` → 等 `drain`；为什么推荐 `pipe`

### 02 · HTTP 与 HTTPS 深入
**来源**：网络篇 §十四 ~ §二十

- HTTP 是什么（TCP 之上定义的应用层协议：Method / URL / Header / Body / Status）
- Node.js 原生 HTTP Server（`node:http`）
- **HTTP Request / Response 本质上也是 Stream**（`req` 可读、`res` 可写）
- HTTP Keep-Alive 为什么重要（`keepAliveTimeout` / `headersTimeout` / `requestTimeout`）
- HTTPS = HTTP over TLS（加密 / 身份认证 / 数据完整性 + TLS 握手）
- HTTP/1.1 的问题与 HTTP/2 多路复用（一个 TCP 连接 × 多个 Stream）
- HTTP/3：QUIC over UDP，为什么还要它
- 关联错误：`ECONNRESET` / `socket hang up` / `502` / `504`

### 03 · WebSocket 与 SSE 实时通信
**来源**：网络篇 §二十一 ~ §二十七

- WebSocket：实时双向通信为什么需要它
- WebSocket 怎么建立连接：`HTTP Upgrade` → `101 Switching Protocols`
- WebSocket 和 TCP 到底是什么关系（应用层协议，不是替代品）
- 为什么 WebSocket 需要心跳（Ping / Pong 与断线重连）
- SSE：Server-Sent Events，服务端单向持续推送
- 为什么流式输出场景经常适合 SSE（**换语境**：聊天 / 日志 / 进度推送，原文的 LLM 语境去除）
- **SSE 与 WebSocket 应该怎么选**（选型表）

### 04 · 一次请求完整经历了什么
**来源**：网络篇 §三十一 ~ §三十三

- 一次请求的完整链路（逐层穿过：DNS → TCP → TLS → HTTP → 内核 → epoll → 事件循环 → Node → 框架 → Controller）
- 每一步出问题时是什么现象（排障表）
- **NestJS 到底帮我们封装了什么**（纵向分层 + 每层不知道会踩什么坑）
- 既然都封装了，为什么还要学这一层（线上错误码 → 排查思路链）
- 模块交接：进入框架层

---

## 五、替换范围与"会丢什么"（**需你确认，这是执行前最关键的一点**）

### 1. 三篇只覆盖"模块一 + 模块二"

| 现有模块 | 是否在三篇覆盖范围内 | 建议 |
|---|---|---|
| 模块一 运行环境（7 篇） | ✅ 全覆盖 | **替换** → 新 8 篇 |
| 模块二 网络底层（5 篇） | ✅ 全覆盖 | **替换** → 新 5 篇 |
| 模块三 Web 框架基础（Express/Koa 6 篇） | ❌ 未覆盖 | 保留 |
| 模块四 数据与缓存（MySQL/MongoDB/pgvector 7 篇 + Redis 5 篇） | ❌ 未覆盖 | 保留 |
| 模块五 后端架构（NestJS 19 篇） | ⚠️ 仅提到，未展开 | 保留 |
| 模块六 工程化与拓展（17 篇） | ❌ 未覆盖 | 保留 |
| 附录（9 篇：面试题库 / 学习路径 / 配套代码索引） | ❌ 未覆盖 | 保留 |

> 若"替换"指**整站只保留这 13 篇**，将删除 60+ 篇既有资产（数据库、Redis、NestJS、部署、面试题库、配套代码索引）。**我建议只替换模块一 + 模块二**，其余保留。

### 2. 严格按三篇重写会"丢内容"——建议作为保留项并入

以下是现有文档有、但这三篇**没写**的知识点，若不特殊处理会随替换一起消失：

| 保留项 | 现所在 | 建议归入 |
|---|---|---|
| npm 包管理 / 语义化版本 / 锁文件 / `node_modules` | `02` | 新 02 |
| `path` 模块 | `05` | 新 06 |
| 错误类型与兜底（`uncaughtException` / `unhandledRejection`） | `06` | 新 07 |
| 环境变量 / `.env` / `os` 模块 | `06` | 新 07 |
| 四层结构之外的可运行示例与"预期输出" | 各篇 | 各篇 `## 配套代码` |
| 面试题、`90-附录` 题库与索引 | 各篇 + 附录 | 保留不动 |

### 3. 上一轮已实测出的 12 处"原文有、现有缺"的知识点

本次会因"按原文重写"而**自然落地**（无需单独补）：

```
timers 最小等待时间 · UV_THREADPOOL_SIZE · Node 20 timer 时机前后对比 ·
'你好' 2 vs 6 字节 · Buffer/Stream 水桶水管类比 · pipeline() ·
进程间不共享内存 · Process vs Worker Thread 表 · SharedArrayBuffer 竞态 ·
Worker Pool · process.exit 危害 · (清理) 04 里的 getMemory 残留
```

---

## 六、执行方式（确认后按此进行）

| 步骤 | 内容 |
|---|---|
| 1 | **新建 8 篇**替换 `node/01-运行环境/` 下现有 7 篇；**新建 5 篇**替换 `node/03-网络编程与实时通信/` 下现有 5 篇 |
| 2 | 每篇沿用现有固定体例：`> 承上/启下` 两行 + 正文 + `## 面试题` + `## 配套代码` + `## 参考` |
| 3 | 篇内保持三种写法：**标题即问题**、**误区显式成节**、**决策模型收尾** |
| 4 | Agent 内容按三类边界处理（删 / 换语境 / 删），全程 grep 自检 0 残留 |
| 5 | 代码双轨：文档代码块补"预期输出"；`code/node/` 缺口脚本补齐并同步索引 |
| 6 | 同步 `node/index.md` 模块说明、`.vitepress/config/node.js` 侧边栏、`90-附录/02-学习路径图`、`08-自测记录表`、`09-配套代码索引` |
| 7 | 校验：`check-links.cjs`（链接 0 问题）+ `check-sidebar-coverage.cjs`（篇数 ↔ 侧边栏 0 遗漏）+ `vitepress build` 0 死链 |
| 8 | 删除被替换的旧文档（含被合并的 12 篇源文件） |

---

## 七、待你确认（4 点）

1. **划分是否认可**：模块一 **8 篇**（事件循环拆"上/下"两篇）、模块二 **5 篇** —— 同意？若希望事件循环保持 1 篇（回到 7 篇），请说明。
2. **替换范围**：只替换**模块一 + 模块二**（推荐，保留其余 60+ 篇资产）；还是"整站只保留这 13 篇"？
3. **保留项**：上表 6 类"原文未覆盖但现有有"的内容，**并进新篇目**还是**随替换删除**？（建议并入）
4. **旧文档处置**：被替换的 12 篇旧文档**直接删除**，还是先移到 `node/.archive/` 留档？
