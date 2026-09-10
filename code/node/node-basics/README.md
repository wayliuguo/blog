# node-basics

Node.js 后端知识体系 —— 模块一「运行环境」配套实验代码。
对应博客：`node/02-Node.js 基础/01-模块系统与包管理` ～ `05-进程与环境`。

## 环境要求

- Node.js 18+（部分脚本用到顶层 await、fetch 等较新特性）
- 本仓库 `package.json` 设了 `"type": "commonjs"`，所以 `.js` 文件按 CommonJS 解析
- 需要单文件用 ESM 的，单独用 `.mjs`（如 `01-module-esm.mjs`）
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `01-module-cjs.cjs` | CommonJS 的 require / module.exports 写法 | `npm run 01cjs` | 打印 `userInfo()` 结果、`__filename`、`__dirname` |
| `01-module-esm.mjs` | ESM 的 import / export + 顶层 await | `npm run 01esm` | 打印 ESM 导出结果、约 100ms 的加载等待、`import.meta.url` |
| `02-async-serial.js` | 串行 await 三个任务 | `npm run 02` | 总耗时约 700ms（100+100+500） |
| `03-async-parallel.js` | Promise.all 并行 | `npm run 03` | 总耗时约 500ms（=最慢一个），比 02 快约 200ms |
| `04-eventloop-order.js` | 经典事件循环输出顺序 | `npm run 04` | 顺序固定为 `start end nextTick promise timeout` |
| `05-microtask-checkpoint.js` | 微任务在每次回调检查点执行 | `npm run 05` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `06-nexttick-starve.js` | nextTick 递归导致饥饿 | `npm run 06` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `07-buffer.js` | 字节 vs 字符、各种编码 | `npm run 07` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节） |
| `08-stream-copy.js` | readFile vs stream 内存对比 | `npm run 08` | 两种复制都成功，stream 的 RSS 明显更平稳 |
| `09-backpressure.js` | 背压：write 返回 false + drain | `npm run 09` | 打印触发了几次背压、几次 drain |
| `10-child-process.js` | spawn/exec/execFile/fork 对照 | `npm run 10` | 四个 API 依次输出，fork 走 IPC 双向通信 |
| `11-worker-thread.js` | 主线程阻塞 vs Worker 不阻塞 | `npm run 11` | 方案①心跳卡住，方案②心跳持续跳 |
| `12-graceful-shutdown.js` | 优雅关闭（服务脚本） | `npm run 12` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `13-fs-dir.js` | 目录遍历 + 批量读 .md 文件 | `npm run 13` | 扫描 3 个 .md，逐文件打印「字节数 + 首行」，汇总总数/总字节；跑完自动清理临时目录 |
| `14-error-fallback.js` | 错误三层防线（同步/异步/进程级兜底） | `npm run 14` | 默认只演示前两道且进程不崩；加 `uncaught`/`unhandled` 看进程级兜底后优雅退出 |

## 为什么值得跑一遍

这些脚本不是“演示 API 怎么调”，而是让你**亲眼复现**博客里讲的心智模型：
- 事件循环那几题（`04`/`05`/`06`）跑出来后，你就不会再记混 nextTick、Promise、timer 的先后；
- `07` 的“2 个字符 6 个字节”会直接纠正“字符串长度 = 字节长度”的错觉，这是写分包协议的根；
- `08`/`09` 把“流为什么省内存、背压为什么不会写爆”变得可观测；
- `10`/`11`/`12` 则是面试和线上排障真正用得上的：子进程怎么选、CPU 密集别堵主线程、上线怎么优雅重启。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `01-module-cjs.cjs` | `npm run 01cjs` | 打印 `userInfo()` 结果、`__filename`、`__dirname` |
| `01-module-esm.mjs` | `npm run 01esm` | 打印 ESM 导出结果、约 100ms 的加载等待、`import.meta.url` |
| `02-async-serial.js` | `npm run 02` | 总耗时约 700ms（100+100+500） |
| `03-async-parallel.js` | `npm run 03` | 总耗时约 500ms（=最慢一个），比 02 快约 200ms |
| `04-eventloop-order.js` | `npm run 04` | 顺序固定为 `start → end → nextTick → promise → timeout` |
| `05-microtask-checkpoint.js` | `npm run 05` | 第一个 timer 内的微任务夹在它与第二个 timer 之间 |
| `06-nexttick-starve.js` | `npm run 06` | 10 次 nextTick 先打印，最后才打印 setTimeout |
| `07-buffer.js` | `npm run 07` | `'你好'.length=2` 但字节长度=6（UTF-8 每字 3 字节） |
| `08-stream-copy.js` | `npm run 08` | 两种复制都成功，stream 的 RSS 明显更平稳 |
| `09-backpressure.js` | `npm run 09` | 打印触发了几次背压、几次 drain |
| `10-child-process.js` | `npm run 10` | 四个 API 依次输出，fork 走 IPC 双向通信 |
| `11-worker-thread.js` | `npm run 11` | 方案①心跳卡住，方案②心跳持续跳 |
| `12-graceful-shutdown.js` | `npm run 12` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `13-fs-dir.js` | `npm run 13` | 扫描出 3 个 `.md`，逐文件打印「字节数 + 首行」，末尾汇总「文件总数：3 / 总字节数：167」，跑完自动删临时目录 |
| `14-error-fallback.js` | `npm run 14` | 默认只演示前两道（同步 + 异步）防线，进程正常退出；加 `uncaught`/`unhandled` 参数则触发进程级兜底并打印「最后一道防线，应记录日志后优雅退出」再 `process.exit(1)` |

## 注意事项

- `12-graceful-shutdown.js` 是常驻服务，需手动 Ctrl+C 退出（其他脚本都会自动结束）。
- `08-stream-copy.js` 会临时生成一个 200MB 文件，运行结束后自动删除，不会污染仓库。
- `13-fs-dir.js` 在 `os.tmpdir()` 下自建示例目录并写入文件，不依赖仓库内任何文件；传 `keep` 参数可保留临时目录：`node src/13-fs-dir.js keep`。
- `14-error-fallback.js` 默认不会让进程崩溃；只有显式传 `uncaught` / `unhandled` 时才会由进程级兜底接住并主动退出。
