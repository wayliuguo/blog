# node-basics

Node.js 后端知识体系 —— 模块一「运行环境」配套实验代码。
对应博客：`node/01-运行环境/01-Node.js 是什么` ～ `07-运行机制收束`（文件名前缀就是篇号，`01`~`06`；收束篇不引入新代码）。

## 环境要求

- Node.js 22+（`02-module-realm/05-cjs-require-esm.cjs` 用到「同步 require ESM」的新能力；其余脚本 Node 18+ 即可）
- 本仓库 `package.json` 设了 `"type": "commonjs"`，所以 `.js` 文件按 CommonJS 解析
- 需要单文件用 ESM 的，单独用 `.mjs`（如 `02-module-esm.mjs`）
- 例外：`src/02-module-realm/08-type-switch/` 有自己的 `package.json`（`"type": "module"`），用来演示「整包开关 vs 后缀强制」
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `01-io-cost.js` | 一次请求的耗时账：墙上时间 vs CPU 时间 | `npm run 01` | 每段等待耗时对照表 + 总墙上时间（演示约 580ms）、CPU 实际占用（几毫秒），CPU/墙上比值极低，结论“等待占绝大多数” |
| `02-module-cjs.cjs` | CommonJS 侧的两个本质特征：值拷贝 + 互引 ESM | `npm run 02cjs` | 6 行输出：`module.exports` 的键、`count` 快照恒为 0、`cjs.peek()` 却是 1；ESM 侧 `inc()` 后活绑定立刻变 1 |
| `02-module-esm.mjs` | ES Module 侧的两个本质特征：活绑定 + 互引 CJS | `npm run 02esm` | 与 `npm run 02cjs` **逐行相同**（同一对模块，只是入口不同） |
| `03-eventloop-phases.js` | 事件循环多阶段观测：timers / poll / check / close callbacks | `npm run 03phases` | 12 行输出、连跑 5 次稳定：同步代码 → nextTick → 对照 close → Promise → timers → 微任务检查点 → check → poll → 微任务 → check → timers → close callbacks |
| `03-eventloop-order.js` | 经典事件循环输出顺序 | `npm run 03order` | 顺序固定为 `start → end → nextTick → promise → timeout` |
| `03-microtask-checkpoint.js` | 微任务在每次回调检查点执行 | `npm run 03check` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `03-nexttick-starve.js` | nextTick 递归导致饥饿 | `npm run 03starve` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `03-uv-threadpool.js` | libuv 线程池默认只有 4 个线程 | `npm run 03pool` | 10 个 pbkdf2 呈 4/4/2 三批完成；用 `UV_THREADPOOL_SIZE=8` 再跑一次变 8/2 两批 |
| `04-async-serial.js` | 串行 await 三个任务 | `npm run 04serial` | 总耗时约 700ms（100+100+500） |
| `04-async-parallel.js` | Promise.all 并行 | `npm run 04parallel` | 总耗时约 500ms（=最慢一个），比串行写法快约 200ms |
| `05-buffer.js` | 字节 vs 字符、各种编码 | `npm run 05buffer` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节） |
| `05-stream-copy.js` | readFile vs stream 内存对比 | `npm run 05copy` | 两种复制都成功，stream 的 RSS 明显更平稳 |
| `05-backpressure.js` | 背压：write 返回 false + drain | `npm run 05backpressure` | 打印触发了几次背压、几次 drain |
| `05-stream-pipeline.js` | pipe() vs pipeline() + 出错统一销毁 | `npm run 05pipeline` | pipe 复制成功(RSS 峰值)、pipeline 出错时 `rs.destroyed=true`(整链销毁)、pipe 出错时 `rs.destroyed=false`(不自动销毁上游)、pipeline+gzip 压缩成功；跑完自动清临时目录 |
| `05-fs-dir.js` | 目录遍历 + 批量读 .md 文件 | `npm run 05fs` | 扫描 3 个 .md，逐文件打印「字节数 + 首行」，汇总总数/总字节；跑完自动清理临时目录 |
| `06-child-process.js` | spawn/exec/execFile/fork 对照 | `npm run 06child` | 四个 API 依次输出，fork 走 IPC 双向通信 |
| `06-worker-thread.js` | 主线程阻塞 vs Worker 不阻塞 | `npm run 06worker` | 方案①心跳卡住，方案②心跳持续跳 |
| `06-worker-pool.js` | Worker Pool + 任务队列（反例 vs 正例） | `npm run 06pool` | 反例 20 个 `new Worker` 峰值内存远高于正例 4 个复用；总耗时反例更高，证明不应“每请求一 Worker” |
| `06-graceful-shutdown.js` | 优雅关闭（服务脚本） | `npm run 06shutdown` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `06-error-fallback.js` | 错误三层防线（同步/异步/进程级兜底） | `npm run 06fallback` | 默认只演示前两道且进程不崩；加 `uncaught`/`unhandled` 看进程级兜底后优雅退出 |

### 模块系统实验组（`src/02-module-realm/`）

上面的一对 `02-module-cjs.cjs` / `02-module-esm.mjs` 只做**最小对照**：各自亮出自己的本质特征（值拷贝 vs 活绑定），并互相导入对方一次。想逐条深挖，用这一组实验：它专门演示 CommonJS 与 ES Module 的**区别与互操作**，主线就是正文反复强调的四件事：**解析时机**（静态解析 vs 运行时解析）、**加载语义**（值的拷贝 vs 活绑定）、**同步 vs 异步加载**（require 阻塞 vs import() 不阻塞）、**互操作**（ESM 引 CJS / CJS 引 ESM / 动态 import()）；另外还覆盖缓存、`exports` 陷阱、解析算法、`type` 字段与后缀强制。全部零依赖，都能单独 `node src/02-module-realm/xx` 跑通。

公共模块放在 `lib/`：`counter.cjs`（CJS 计数器）、`counter.mjs`（ESM 计数器）、`store.cjs`（CJS 多导出）、`only-esm.mjs`（纯 ESM）、`tla-esm.mjs`（带顶层 await 的 ESM）、`eval-trace.mjs`（被引入时打印顶层执行痕迹，用于观察解析时机）、`slow.cjs` / `slow.mjs`（顶层忙等 300ms，用于观察同步 vs 异步加载）；`exports` 陷阱专用模块放在 `traps/`。

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `02-module-realm/01-cache.cjs` | 模块缓存：同一路径只执行一次 | `npm run mr01` | 三次 `require` 拿到的对象两两 `===` 全为 `true`；`require.cache` 里只有 1 条 `counter.cjs` 记录；手动删缓存后再 `require` 会重新执行模块体、拿到新对象 |
| `02-module-realm/02-exports-trap.cjs` | `exports` 与 `module.exports` 的陷阱 | `npm run mr02` | `exports === module.exports` 为 `true`；`exports.xxx` 挂的属性外部可见；模块里 `exports = {...}` 时外部只拿到 `{}`；替换 `module.exports` 后挂的 `exports.xxx` 是 `undefined` |
| `02-module-realm/03-cjs-value-vs-esm-binding.mjs` | 值的拷贝 vs 活绑定 | `npm run mr03` | 各调一次 `increase()` 后：CJS 快照 `count = 0`（仍是 0），ESM 活绑定 `count = 1`；`peek()` 显示 CJS 内部其实也是 1 |
| `02-module-realm/04-esm-import-cjs.mjs` | ESM 导入 CJS：默认导入 vs 命名导入 | `npm run mr04` | 默认导入拿到完整 `module.exports`；命名导入取到 `name` / `version`；`Object.keys(namespace)` = `['default','describe','name','version']`；计算属性名挂的 `dynamic` 默认导入可见、命名空间里是 `undefined` |
| `02-module-realm/05-cjs-require-esm.cjs` | CJS 用 `require()` 加载 ESM（Node 22 新能力） | `npm run mr05` | 打印 Node 版本；`require` 纯 ESM 模块成功（返回值 `[object Module]`、`__esModule = true`、`default` 与命名导出都在）；带顶层 await 的模块抛 `ERR_REQUIRE_ASYNC_MODULE` |
| `02-module-realm/06-dynamic-import.cjs` | CJS 里用 `await import()` 动态导入 ESM | `npm run mr06` | `import()` 返回值是 Promise；await 后拿到命名空间对象；对 CJS 同样有效（多一层 `default`）；变量拼路径可用 |
| `02-module-realm/07-resolve-path.cjs` | 模块解析算法与向上查找 | `npm run mr07` | `node:path` / `path` / `fs` / `os` 原样返回；相对路径解析成绝对路径；省略 `.cjs` / `.mjs` 后缀抛 `MODULE_NOT_FOUND`；不存在的包名抛 `MODULE_NOT_FOUND`；`module.paths` 打印逐级向上的 `node_modules` 链 |
| `02-module-realm/08-type-switch/run.cjs` | `"type"` 字段与后缀强制 | `npm run mr08` | 依次以独立入口运行 `esm-default.js`（ESM：`typeof require` / `__dirname` 均为 `undefined`）与 `cjs-forced.cjs`（CJS：`require` 可用），两者同目录却分属两套模块系统 |
| `02-module-realm/09-parse-time.mjs` | 解析时机：静态解析 vs 运行时解析 | `npm run mr09` | 写在 `import` 声明**上方**的 `console.log` 反而后打印，证明 import 被提升、依赖先求值；静态 import 的路径不能是变量而 `import()` 可以；静态 import 一个不存在的命名导出直接判 `SyntaxError: Named export 'notExist' not found`（退出码 1、stdout 为空），而 CJS 同样写法只是 `undefined` |
| `02-module-realm/10-sync-vs-async.mjs` | 同步 vs 异步加载：require 阻塞 vs import() 不阻塞 | `npm run mr10` | `require` 前后耗时约 303ms（对方模块顶层忙等 300ms，期间主线程被占住）；`import()` 发起后当前行耗时 0~2ms 就继续往下走、返回值是 Promise，`await` 之后才变成约 303ms |

## 为什么值得跑一遍

这些脚本不是“演示 API 怎么调”，而是让你**亲眼复现**博客里讲的心智模型：

- `02cjs` / `02esm` 这一对把“值拷贝 vs 活绑定”和“两套系统怎么互引”压到最小：两个文件、六行输出，跑哪个入口都一样；
- `02-module-realm/01`~`10` 再把“解析时机、同步 vs 异步加载、缓存只执行一次、`exports` 陷阱、解析算法”逐条放大成可对照的输出，被追问 `require` 与 `import` 的区别时可以直接用跑出来的结果回答；
- 事件循环那几题（`03order` / `03check` / `03starve`）跑出来后，你就不会再记混 nextTick、Promise、timer 的先后；`03phases` 更进一步，直接让你看到“回调究竟在哪个阶段跑”；
- `05buffer` 的“2 个字符 6 个字节”会直接纠正“字符串长度 = 字节长度”的错觉，这是写分包协议的根；
- `05copy` / `05backpressure` / `05pipeline` 把“流为什么省内存、背压为什么不会写爆、pipeline 为什么能统一销毁”变得可观测；
- `06child` / `06worker` / `06pool` / `06shutdown` 则是面试和线上排障真正用得上的：子进程怎么选、CPU 密集别堵主线程、每请求 new Worker 为什么不行、上线怎么优雅重启。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `01-io-cost.js` | `npm run 01` | 每段等待耗时对照表；总墙上时间约 580ms（真实约 2.3 秒，按 1/4 缩放）、CPU 实际占用仅几毫秒，CPU/墙上比值远低于 1% |
| `02-module-cjs.cjs` | `npm run 02cjs` | 6 行：`[CJS 模块体] 执行完毕，导出 = TAG, count, inc, peek` → `[ESM 模块体] 开始执行` → `[互操作 ESM→CJS] 调 inc() 后 count = 0 但 cjs.peek() = 1` → `[互操作 CJS→ESM] 调 inc() 后 count = 1` |
| `02-module-esm.mjs` | `npm run 02esm` | 与 `npm run 02cjs` 的输出**逐行相同**，两者退出码均为 0 |
| `03-eventloop-phases.js` | `npm run 03phases` | 12 行、连跑 5 次稳定。三处关键：① `[check] 顶层 setImmediate` 出现在 `[poll] fs.readFile I/O callback` 之前（第一轮 poll 没有就绪的 I/O，直接进 check）；② poll 回调里注册的 `setImmediate` 紧跟在同轮 poll 之后，而 `setTimeout(fn, 0)` 要等下一轮 timers；③ `[close callbacks] client socket close` 排最后，而 `[对照] 无连接 server 的 close` 却夹在 nextTick 与 Promise 之间 |
| `03-eventloop-order.js` | `npm run 03order` | 顺序固定为 `start → end → nextTick → promise → timeout` |
| `03-microtask-checkpoint.js` | `npm run 03check` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `03-nexttick-starve.js` | `npm run 03starve` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `03-uv-threadpool.js` | `npm run 03pool` | 10 个 pbkdf2 分三批完成（前 4 约 130ms、中 4 约 240ms、后 2 约 316ms）；`UV_THREADPOOL_SIZE=8` 跑则分两批（前 8 约 141ms、后 2 约 206ms） |
| `04-async-serial.js` | `npm run 04serial` | 总耗时约 700ms（100+100+500） |
| `04-async-parallel.js` | `npm run 04parallel` | 总耗时约 500ms（=最慢一个），比串行写法快约 200ms |
| `05-buffer.js` | `npm run 05buffer` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节） |
| `05-stream-copy.js` | `npm run 05copy` | 两种复制都成功，stream 的 RSS 明显更平稳 |
| `05-backpressure.js` | `npm run 05backpressure` | 打印触发了几次背压、几次 drain |
| `05-stream-pipeline.js` | `npm run 05pipeline` | pipe 复制成功、RSS 峰值约 60MB；pipeline 出错捕获异常且上游 `destroyed=true`、pipe 出错上游 `destroyed=false`；pipeline+gzip 压缩到约 0.03MB；跑完删除 `os.tmpdir()` 下临时目录 |
| `05-fs-dir.js` | `npm run 05fs` | 扫描出 3 个 `.md`，逐文件打印「字节数 + 首行」，末尾汇总「文件总数：3 / 总字节数：167」，跑完自动删临时目录 |
| `06-child-process.js` | `npm run 06child` | 四个 API 依次输出，fork 走 IPC 双向通信 |
| `06-worker-thread.js` | `npm run 06worker` | 方案①心跳卡住，方案②心跳持续跳 |
| `06-worker-pool.js` | `npm run 06pool` | 反例 20 个 Worker：约 560ms / 峰值约 277MB；正例 Pool(4 复用)：约 460ms / 峰值约 99MB，内存与耗时均更优 |
| `06-graceful-shutdown.js` | `npm run 06shutdown` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `06-error-fallback.js` | `npm run 06fallback` | 默认只演示前两道（同步 + 异步）防线，进程正常退出；加 `uncaught`/`unhandled` 参数则触发进程级兜底并打印「最后一道防线，应记录日志后优雅退出」再 `process.exit(1)` |
| `02-module-realm/01-cache.cjs` | `npm run mr01` | `a === b`、`b === c`、`a === c` 全为 `true`；`counter.cjs` 在 `require.cache` 中只有 1 条记录、`loaded = true`；删缓存后再 `require` 得到新对象，且模块体日志第二次出现 |
| `02-module-realm/02-exports-trap.cjs` | `npm run mr02` | 本文件 `exports === module.exports` 为 `true`；`store` 打印出 `name` / `version` / `describe` / `dynamic`；陷阱模块分别拿到 `{}` 与 `{ viaModuleExports: true }`，`viaExportsAfterOverwrite` 是 `undefined` |
| `02-module-realm/03-cjs-value-vs-esm-binding.mjs` | `npm run mr03` | 调用前两者都是 0；各调一次 `increase()` 后 `CJS 快照 count = 0`、`ESM 活绑定 count = 1`；`cjsCounter.peek()` 返回 1，证明 CJS 内部变了只是外部看不到 |
| `02-module-realm/04-esm-import-cjs.mjs` | `npm run mr04` | 默认导入打印出完整对象；`name = node-basics-store`、`version = 1.0.0`；`Object.keys(namespace) = [ 'default', 'describe', 'name', 'version' ]`；`store.dynamic` 有值而 `namespace.dynamic` 是 `undefined` |
| `02-module-realm/05-cjs-require-esm.cjs` | `npm run mr05` | 打印 `当前 Node 版本: v22.22.2`；`require` 成功、返回值类型 `[object Module]`、`flavor = ESM`、`esm.default` 是默认导出、`__esModule = true`；第二段反例抛 `ERR_REQUIRE_ASYNC_MODULE`（顶层 await 的 ESM 同步 require 不了） |
| `02-module-realm/06-dynamic-import.cjs` | `npm run mr06` | `require` 同步返回 object；`import()` 返回值是 Promise；await 后拿到 `flavor` / `features` / `default`；`import('./lib/store.cjs')` 的键含 `default` 与命名导出；变量拼路径也能导入成功 |
| `02-module-realm/07-resolve-path.cjs` | `npm run mr07` | 内置模块 `node:path` / `path` / `fs` / `os` 原样返回；相对路径解析为绝对路径；`./lib/store`、`./lib/counter` 与不存在的包名均 `失败(MODULE_NOT_FOUND)`；`module.paths` 列出 9 级 `node_modules` 链（从 `02-module-realm` 一直到 `E:\node_modules`） |
| `02-module-realm/08-type-switch/run.cjs` | `npm run mr08` | 先打印本目录 `package.json` 的 `{"type":"module"}`；随后 `esm-default.js` 输出 `typeof require = undefined` 且 `import.meta.url` 可用，`cjs-forced.cjs` 输出 `typeof require = function`、`__dirname` 可用；两个子进程退出码都是 0 |
| `02-module-realm/09-parse-time.mjs` | `npm run mr09` | 第 1 节先打印 `[依赖模块 eval-trace.mjs] 顶层代码被执行`、再打印本文件的 A 与 B；第 2 节 `import('./lib/eval-trace.mjs')` 成功且**不会**再打印一次 eval-trace 的日志（静态 import 与动态 import() 共用同一份实例）；第 3 节子进程退出码 1、stdout 为空、报 `SyntaxError: Named export 'notExist' not found`，而 `require` 的 `store.notExist` 只是 `undefined` |
| `02-module-realm/10-sync-vs-async.mjs` | `npm run mr10` | 先 `[slow.cjs] 顶层求值完成，忙等了约 300 ms`、再 `require 返回，t = 303 ms`；`import()` 刚发起时 `t = 2 ms` 且返回值是 Promise，`[slow.mjs]` 忙等后 `await 之后拿到模块，t = 303 ms`（说明「异步」指的是调度时机，不是加载过程不占 CPU） |

## 注意事项

- `06-graceful-shutdown.js` 是常驻服务，需手动 Ctrl+C 退出（其他脚本都会自动结束）。
- `05-stream-copy.js` 会临时生成一个 200MB 文件，运行结束后自动删除，不会污染仓库。
- `05-fs-dir.js` 在 `os.tmpdir()` 下自建示例目录并写入文件，不依赖仓库内任何文件；传 `keep` 参数可保留临时目录：`node src/05-fs-dir.js keep`。
- `06-error-fallback.js` 默认不会让进程崩溃；只有显式传 `uncaught` / `unhandled` 时才会由进程级兜底接住并主动退出。
- `03-uv-threadpool.js` 想看线程池扩容效果，启动前设 `UV_THREADPOOL_SIZE=8` 再跑（运行时改无效）；默认 4 线程。
- `05-stream-pipeline.js` 在 `os.tmpdir()` 下自建临时目录生成 30MB 源文件，演示完自动删除，不污染仓库。
- `06-worker-pool.js` 会预创建 4 个 Worker 组成线程池；脚本结束前 `terminate` 全部 Worker，进程正常退出。
- `02-module-realm/08-type-switch/` 是唯一自带 `package.json`（`"type": "module"`）的子目录，入口 `run.cjs` 靠后缀强制按 CommonJS 解析；请按 `npm run mr08` 或 `node src/02-module-realm/08-type-switch/run.cjs` 运行，子目录里另有 README 说明。
- `02-module-realm/lib/counter.cjs` 在被加载时会打印一行「模块体被执行」，这是 `01-cache.cjs` / `03-*.mjs` 判断模块体执行了几次的依据，看到这行重复出现说明缓存被清过。
- `02-module-realm/05-cjs-require-esm.cjs` 需要 Node 20.17+ / 22.12+ 才支持同步 `require` ESM；版本不够时脚本会 catch 住错误并打印 `code`，不会崩溃。
- `03-eventloop-phases.js` 是唯一一个“观测阶段”而不是“推输出顺序”的事件循环脚本：它会短暂地起一个本地 TCP 服务端再立刻销毁，用来把 `close callbacks` 阶段点亮；跑完进程自动退出，不占端口、不留文件。
- `02-module-realm/09-parse-time.mjs` 会用子进程（`--input-type=module -e`）跑一段“导入不存在的命名导出”的代码，只为让你看到退出码与报错；子进程失败不影响主进程，主进程退出码仍是 0。
- `02-module-realm/10-sync-vs-async.mjs` 会连续忙等 2×300ms，这是它的观测手段（用来让“阻塞”可计时），不是脚本卡死。

模块系统实验组不写任何文件到磁盘，也不安装任何依赖。
