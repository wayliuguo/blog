# VSCode 调试 Node：inspect 协议、launch 配置与断点绑定

《VSCode 调试 Node：inspect 协议、launch 配置与断点绑定》配套实验代码：inspect 协议的程序内等价形态与 `--inspect-brk` 首行挂起。

对应博客：`node/运行环境/VSCode 调试 Node：inspect 协议、launch 配置与断点绑定.md`。

## 环境要求

- Node.js 18+
- 全部使用 Node 内置模块，**无第三方依赖**，无需 `npm install`

## 脚本清单（`src/07-debug/`）

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `07-inspector-runtime.cjs` | 程序内 `node:inspector.open()` 打开 inspect 端口（`--inspect` 的代码等价形态） | `npm run 07inspector` | 打印 `url = ws://127.0.0.1:9229/...` 后保持运行；另开终端 `curl http://127.0.0.1:9229/json/list` 能列出本进程调试目标。Ctrl+C 退出；9229 被占时换脚本里的端口号 |
| `07-inspect-brk.cjs` | `debugger` 语句与 `--inspect-brk` 首行挂起 | `npm run 07brk`（即 `node --inspect-brk src/07-debug/07-inspect-brk.cjs`） | 只打印 `Debugger listening` 后挂起（等调试器 Continue）；不带 `--inspect-brk` 直跑则 3 行秒完（无调试器时 `debugger` 是空操作）。注意 9229 被占会报 `address already in use` 且不挂起 |

## 注意事项

- 两个脚本都涉及 9229 调试端口：`07inspector` 是常驻运行（Ctrl+C 退出），`07brk` 需要挂上调试器（VSCode「附加到 Node.js 进程」或 Chrome DevTools `chrome://inspect`）才能继续。
