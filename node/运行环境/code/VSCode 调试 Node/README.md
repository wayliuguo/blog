# VSCode 调试 Node

《VSCode 调试 Node》配套实验代码：四种调试入口共用的调试目标与可直接 F5 体验的 launch.json。

对应博客：`node/运行环境/VSCode 调试 Node.md`。

## 环境要求

- Node.js 18+
- 全部使用 Node 内置模块，**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `src/server.js` | **四种调试入口共用的调试目标**：最小 HTTP 服务，常驻运行 | `npm run demo`（或 `node --inspect src/server.js` 供 attach） | `listening on http://127.0.0.1:3000`；`curl http://127.0.0.1:3000/sum` 返回 `total = 500`，调试器在场时请求停在 `reduce` 断点上 |
| `.vscode/launch.json` | attach Debug 与 launch.json Debug 两节：attach 连 9229、launch（program 直启 / npm scripts） | 把本目录作为 VSCode 工作区打开，按 F5 选配置 | attach 一条连接已在跑的 demo 服务；launch 两条直接拉起 `server.js` 进入调试 |

## 四种调试入口怎么用这份代码

1. **JavaScript Debug Terminal**：调试终端里 `node src/server.js`，出生即被接管；
2. **package.json Debug**：点 `demo` script 上方的 Debug 按钮；
3. **attach Debug**：先 `node --inspect src/server.js` 起服务，再 F5 跑 attach 配置连 9229；
4. **launch.json Debug**：F5 跑 launch 配置，VSCode 拉起 `server.js`。

判活口诀：终端出现 `Debugger attached.` 调试器才算在场，此时 `curl http://127.0.0.1:3000/sum` 断点会停住。

## 注意事项

- VSCode 只加载**工作区根**的 `.vscode/launch.json`：想用 F5 体验，必须把本目录本身作为工作区打开（File → Open Folder）。
- `demo` 是常驻运行（Ctrl+C 退出）；attach 前终端只有 `Debugger listening`，按 F5 后才出现 `Debugger attached.`。
- 9229（inspect）与 3000（demo 服务）是惯例端口，被占用时换端口号即可。
