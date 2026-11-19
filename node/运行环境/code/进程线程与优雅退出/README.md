# 进程线程与优雅退出

《进程线程与优雅退出》配套实验代码：child_process 四把刀、worker_threads 与线程池、错误兜底、优雅关闭。

对应博客：`node/运行环境/进程线程与优雅退出.md`。

## 环境要求

- Node.js 18+
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `06-child-process.js` | spawn/exec/execFile/fork 对照 | `npm run 06child` | 四个 API 依次输出，fork 走 IPC 双向通信（子进程侧脚本为 `06-worker-fork-child.js`） |
| `06-worker-thread.js` | 主线程阻塞 vs Worker 不阻塞 | `npm run 06worker` | 方案①心跳卡住，方案②心跳持续跳（Worker 侧脚本为 `06-worker-thread-child.js`） |
| `06-worker-pool.js` | Worker Pool + 任务队列（反例 vs 正例） | `npm run 06pool` | 反例 20 个 `new Worker` 峰值内存远高于正例 4 个复用；总耗时反例更高，证明不应“每请求一 Worker”（Worker 侧脚本为 `06-worker-pool-child.js`） |
| `06-graceful-shutdown.js` | 优雅关闭（服务脚本） | `npm run 06shutdown` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `06-error-fallback.js` | 错误三层防线（同步/异步/进程级兜底） | `npm run 06fallback` | 默认只演示前两道且进程不崩；加 `uncaught`/`unhandled` 看进程级兜底后优雅退出 |

> `*-child.js` 是被父脚本拉起的子进程 / Worker 侧脚本，不需要单独运行。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `06-child-process.js` | `npm run 06child` | 四个 API 依次输出，fork 走 IPC 双向通信 |
| `06-worker-thread.js` | `npm run 06worker` | 方案①心跳卡住，方案②心跳持续跳 |
| `06-worker-pool.js` | `npm run 06pool` | 反例 20 个 Worker：约 560ms / 峰值约 277MB；正例 Pool(4 复用)：约 460ms / 峰值约 99MB，内存与耗时均更优 |
| `06-graceful-shutdown.js` | `npm run 06shutdown` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |
| `06-error-fallback.js` | `npm run 06fallback` | 默认只演示前两道（同步 + 异步）防线，进程正常退出；加 `uncaught`/`unhandled` 参数则触发进程级兜底并打印「最后一道防线，应记录日志后优雅退出」再 `process.exit(1)` |

## 为什么值得跑一遍

`06child` / `06worker` / `06pool` / `06shutdown` 是面试和线上排障真正用得上的：子进程怎么选、CPU 密集别堵主线程、每请求 new Worker 为什么不行、上线怎么优雅重启。

## 注意事项

- `06-graceful-shutdown.js` 是常驻服务，需手动 Ctrl+C 退出（其他脚本都会自动结束）。
- `06-error-fallback.js` 默认不会让进程崩溃；只有显式传 `uncaught` / `unhandled` 时才会由进程级兜底接住并主动退出。
- `06-worker-pool.js` 会预创建 4 个 Worker 组成线程池；脚本结束前 `terminate` 全部 Worker，进程正常退出。
