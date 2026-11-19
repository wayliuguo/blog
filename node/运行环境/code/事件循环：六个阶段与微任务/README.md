# 事件循环：六个阶段与微任务

《事件循环：六个阶段与微任务》配套实验代码：多阶段观测、微任务检查点、nextTick 饥饿、libuv 线程池。

对应博客：`node/运行环境/事件循环：六个阶段与微任务.md`。

## 环境要求

- Node.js 20+（Node 20 / libuv 1.45 起 timers 阶段时机有调整，本组结论以新版本为准）
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `03-eventloop-phases.js` | 事件循环多阶段观测：timers / poll / check / close callbacks | `npm run 03phases` | 13 行输出。稳定部分：同步代码 → nextTick → 对照 close → Promise → timers → 微任务检查点 → check；随后 `[close callbacks] client socket close` 与 `[poll] fs.readFile I/O callback` 的相对顺序随计时抖动（连跑 10 次约 9 次 close 在前、1 次 poll 在前） |
| `03-microtask-checkpoint.js` | 微任务在每次回调检查点执行 | `npm run 03check` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `03-nexttick-starve.js` | nextTick 递归导致饥饿 | `npm run 03starve` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `03-uv-threadpool.js` | libuv 线程池默认只有 4 个线程 | `npm run 03pool` | 10 个 pbkdf2 呈 4/4/2 三批完成；用 `UV_THREADPOOL_SIZE=8` 再跑一次变 8/2 两批 |

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `03-eventloop-phases.js` | `npm run 03phases` | 13 行，稳定的是前 7 行：同步代码 → nextTick → 对照 close → Promise → timers → 微任务检查点 → check。三处关键：① `[check] 顶层 setImmediate` 出现在 `[poll] fs.readFile I/O callback` 之前（第一轮 poll 没有就绪的 I/O，直接进 check）；② poll 回调里注册的 `setImmediate` 紧跟在同轮 poll 之后，而 `setTimeout(fn, 0)` 要等下一轮 timers；③ `[close callbacks] client socket close` 与 `[poll]` 的相对顺序**不固定**——前者等真实 socket 销毁、后者等文件读完，谁先就绪谁先跑（实测 10 次：9 次 close 在前、1 次 poll 在前），而 `[对照] 无连接 server 的 close` 稳定夹在 nextTick 与 Promise 之间 |
| `03-microtask-checkpoint.js` | `npm run 03check` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `03-nexttick-starve.js` | `npm run 03starve` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `03-uv-threadpool.js` | `npm run 03pool` | 10 个 pbkdf2 分三批完成（前 4 约 130ms、中 4 约 240ms、后 2 约 316ms）；`UV_THREADPOOL_SIZE=8` 跑则分两批（前 8 约 141ms、后 2 约 206ms） |

## 为什么值得跑一遍

事件循环这几题（`03check` / `03starve`）跑出来后，你就不会再记混 nextTick、Promise、timer 的先后；`03phases` 更进一步，直接让你看到“回调究竟在哪个阶段跑”。

## 注意事项

- `03-uv-threadpool.js` 想看线程池扩容效果，启动前设 `UV_THREADPOOL_SIZE=8` 再跑（运行时改无效）；默认 4 线程。
- `03-eventloop-phases.js` 是唯一一个“观测阶段”而不是“推输出顺序”的事件循环脚本：它会短暂地起一个本地 TCP 服务端再立刻销毁，用来把 `close callbacks` 阶段点亮；跑完进程自动退出，不占端口、不留文件。
