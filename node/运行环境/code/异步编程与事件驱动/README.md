# 异步编程与事件驱动

《异步编程与事件驱动》配套实验代码：callback / Promise / async-await 的执行模型、all vs allSettled、EventEmitter 与事件驱动解耦。

对应博客：`node/运行环境/异步编程与事件驱动.md`。

## 环境要求

- Node.js 18+
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `async-serial.js` | 串行 await 三个任务 | `npm run serial` | 总耗时约 700ms（100+100+500） |
| `async-parallel.js` | Promise.all 并行 | `npm run parallel` | 总耗时约 500ms（=最慢一个），比串行写法快约 200ms |
| `callback-hell.js` | error-first 回调与回调地狱 | `npm run callback` | 先打印读取成功的内容；再用两层嵌套把业务结果挤到最右列（`[ 'p1', 'p2' ]`），直观展示"横向增长" |
| `promise-chain.js` | Promise 链与错误传播 | `npm run promise` | `.then` 链里第 2 步 throw 被后面的 `.catch` 接住（打印"第 2 步炸了"），`.finally` 无论成败都执行 |
| `async-await.js` | await 只挂起 async 函数，不阻塞外层同步代码 | `npm run await` | 4 行顺序：`0` 调用前 → `1` 进入 async 函数 → `2` async 之后的同步代码（先跑完）→ `3` 拿到 await 结果 |
| `all-settled.js` | `Promise.all` 快速失败 vs `Promise.allSettled` 逐项状态 | `npm run settled` | `allSettled` 三项都列出来（2 个成功 + 1 个失败）；`all` 遇到第一个失败立刻抛错（"report 1 挂了"） |
| `eventemitter.js` | `EventEmitter` 用法与两个坑 | `npm run emitter` | `on/emit` 正常收发；`error` 事件有监听时进程不崩、无监听时子进程退出码 1（崩溃首行 `node:events:497`）；反复 `on` 不 `off` 触发 `MaxListenersExceededWarning`，改 `once` 后 `listenerCount` 从 15 降到 2 |
| `event-driven.js` | 业务 emit + 观测层 on 解耦 | `npm run eventdriven` | 一次业务动作后，日志 / 监控 / 状态三个监听器各自打印，互不知道对方存在 |

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `async-serial.js` | `npm run serial` | 总耗时约 700ms（100+100+500） |
| `async-parallel.js` | `npm run parallel` | 总耗时约 500ms（=最慢一个），比串行写法快约 200ms |
| `callback-hell.js` | `npm run callback` | `读取成功，内容： Hello from callback demo`；随后 `回调地狱：业务结果被挤到最右列， [ 'p1', 'p2' ]` |
| `promise-chain.js` | `npm run promise` | `user = …` → `throw Error` → `接住错误： 第 2 步炸了` → `orders = …` → `最终结果： [ 'p1', 'p2' ]` → `无论成功失败都执行（释放资源等）`；重点：`接住错误` 排在 `orders` 前——return Promise 要多付一轮 thenable 采纳微任务，rejection 传播是即时的 |
| `async-await.js` | `npm run await` | 严格按 `0 → 1 → 2 → 3` 打印，第 2 行是 async 之后的同步代码，说明 await 不会阻塞外层 |
| `all-settled.js` | `npm run settled` | `allSettled` 打印 `✓ { id: 2, name: 'Alice' }` / `✗ report 2 挂了` / `✓ [ { sku: 'A' } ]`；`all` 打印 `all 快速失败： report 1 挂了` |
| `eventemitter.js` | `npm run emitter` | `收到消息： Hello Node` → `捕获到错误，进程不会崩： 出事了` → `无监听器时子进程退出码： 1`、`崩溃首行信息： node:events:497` → `listenerCount： 15` → `用 once 后 listenerCount： 2`，并附带一条 `MaxListenersExceededWarning`（正是本节要演示的坑） |
| `event-driven.js` | `npm run eventdriven` | 三行：`[日志] 任务开始 jobId=42`、`[监控] 调用外部服务：callPartnerApi`、`[状态] 完成：result-of-42` |

## 注意事项

- `eventemitter.js` 会故意触发 `MaxListenersExceededWarning` 来演示监听器泄漏，这是预期行为，不是 bug。
- 所有脚本自动结束，无常驻服务。
