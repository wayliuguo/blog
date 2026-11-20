# 进程线程与优雅退出

《进程线程与优雅退出》配套实验代码：child_process 四把刀（spawn / exec / execFile / fork 各一子目录）、worker_threads 与线程池、优雅关闭。

对应博客：`node/运行环境/进程线程与优雅退出.md`。

## 环境要求

- Node.js 18+
- 本目录 `package.json` 设了 `"type": "commonjs"`，`.js` 文件按 CommonJS 解析
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `src/spawn/spawn.js` | spawn：输出走流，适合长时间/大输出 | `npm run spawn` | 子进程输出实时出现在当前终端（`stdio: 'inherit'`），末尾打印退出码 0 |
| `src/exec/exec.js` | exec：走 shell，输出全缓冲一次回调 | `npm run exec` | `exec 结果: exec child process output: hello` |
| `src/exec-file/exec-file.js` | execFile：不走 shell，直接执行可执行文件 | `npm run exec-file` | `execFile 结果: execFile 运行 node 输出: hello` |
| `src/fork/fork.js` + `fork/fork-child.js` | fork：spawn 语法糖 + 内置 IPC 双向通信 | `npm run fork` | 父子互发消息各两条后子进程退出码 0 |
| `src/worker-thread/worker-thread.js` + `worker-thread-child.js` | Worker 让 CPU 密集任务不阻塞主线程 | `npm run worker` | 方案①主线程直接算，心跳卡住；方案②放进 Worker，心跳持续跳 |
| `src/worker-pool/worker-pool.js` + `worker-pool-child.js` | Worker Pool + 任务队列（反例 vs 正例） | `npm run pool` | 反例 20 个 `new Worker` 耗时与峰值内存均高于正例 4 个复用，证明不应“每请求一 Worker” |
| `src/graceful-shutdown.js` | 优雅关闭（服务脚本） | `npm run shutdown` | 起服务后按 Ctrl+C，先收尾再退出（需手动） |

> 各子目录里的 `*-child.js` 是被父脚本拉起的子进程 / Worker 侧脚本，不需要单独运行。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `spawn/spawn.js` | `npm run spawn` | `spawn 子进程输出: hello` + `--- spawn 退出码: 0` |
| `exec/exec.js` | `npm run exec` | `exec 结果: exec child process output: hello` |
| `exec-file/exec-file.js` | `npm run exec-file` | `execFile 结果: execFile 运行 node 输出: hello` |
| `fork/fork.js` | `npm run fork` | `[fork 子进程] 启动/收到`、`父进程收到子进程消息` 交替出现，末尾 `fork 子进程退出码: 0` |
| `worker-thread/worker-thread.js` | `npm run worker` | 方案①计算约 600-1000ms 期间心跳停滞；方案② Worker 计算期间心跳 #7 起持续跳动 |
| `worker-pool/worker-pool.js` | `npm run pool` | 反例（20 个 Worker）约 560ms / 峰值约 296MB；正例 Pool(4 复用) 约 490ms / 峰值约 113MB |
| `graceful-shutdown.js` | `npm run shutdown` | 起服务后按 Ctrl+C，打印关闭序列（停收新连接 → 关数据库 → 退出），需手动 |

## 为什么值得跑一遍

`spawn` / `exec` / `exec-file` / `fork` 四个脚本把四把刀的语义差异各自跑一遍：是否走 shell、流式还是全缓冲、有无 IPC；`worker` / `pool` 是面试和线上排障真正用得上的：CPU 密集别堵主线程、每请求 new Worker 为什么不行；`shutdown` 演示上线怎么优雅重启。

## 注意事项

- `graceful-shutdown.js` 是常驻服务，需手动 Ctrl+C 退出（其他脚本都会自动结束）。
- `worker-pool.js` 会预创建 4 个 Worker 组成线程池；脚本结束前 `terminate` 全部 Worker，进程正常退出。
