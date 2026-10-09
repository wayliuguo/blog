# VSCode 调试 Node：inspect 协议、launch 配置与断点绑定

先讲一个真实排查案例：NestJS 工程用 `npm run dev:debug` 启动，日志里明明有 `Debugger listening on ws://127.0.0.1:9229/...`，VSCode 里打了断点、curl 也发了请求，**断点就是不停**。本文把 Node 调试的完整体系讲清楚——从 `--inspect` 到底开了什么，到 launch.json 每个字段为什么存在，再到四种调试入口怎么选——每一条结论都来自实测。

## 调试的本质：两个进程、一条 WebSocket

### `--inspect` 打开的是一条 WebSocket，不是「进入调试模式」

`node --inspect app.js` 做的事情只有一件：在本进程里起一个 WebSocket 服务（惯例端口 9229，绑定 127.0.0.1），并打印：

```
Debugger listening on ws://127.0.0.1:9229/59b2de27-66b4-4df5-8a38-e3c77b51f4bd
For help, see: https://nodejs.org/en/docs/inspector
```

逐词读这行日志：**Debugger listening** = 调试端口在监听（只代表「开了门」）；后面那串 `ws://` 地址就是调试客户端要连的 WebSocket，遵循的是 **Chrome DevTools Protocol（CDP）**——和 Chrome DevTools 调试网页用的是同一套协议。此时进程照常运行，什么都不会停。

不想放过第一行代码的话，用 `--inspect-brk`：端口打开后**进程直接挂起**，等调试器连上并放行才继续。实测（配套脚本见文末）：

```
$ node --inspect-brk src/07-debug/07-inspect-brk.cjs
Debugger listening on ws://127.0.0.1:9229/59b2de27-66b4-4df5-8a38-e3c77b51f4bd
For help, see: https://nodejs.org/en/docs/inspector
（8 秒后进程仍停在这里，没有任何业务输出，被 timeout 杀掉）
```

`--inspect` 的代码等价形态是 `node:inspector` 模块的 `open()`——不借助命令行参数，在代码里打开端口：

> 摘自 `./code/node-basics/src/07-debug/07-inspector-runtime.cjs`（运行：`npm run 07inspector`）

```js
// 程序内打开 inspect 端口：`--inspect` 的代码等价形态。
// 运行：npm run 07inspector（进程保持存活，Ctrl+C 结束）
// 另开终端访问 http://127.0.0.1:9229/json/list 能看到本进程的调试目标——
// 此时任何调试器（VSCode attach 配置 / chrome://inspect）都可以连上来下断点。
// 9229 只是社区惯例端口；被占用时换任意空闲端口即可（坑见正文「9229 被占」）。
const inspector = require('node:inspector')

inspector.open(9229, '127.0.0.1')
console.log('[inspect] url =', inspector.url())
console.log('[inspect] 端口已打开，进程保持运行中……（Ctrl+C 退出）')

// 空转保活，模拟一个长期运行的服务；inspect 的监听句柄本身也会撑住事件循环
setInterval(() => {}, 1 << 30)
```

跑起来之后，`curl http://127.0.0.1:9229/json/list` 能列出本进程的调试目标（实测返回 `node.js instance` 与它的 ws 地址）——此时任何调试器都可以连进来下断点。

### 没有调试器客户端连上来，编辑器里的断点就只是个圆点

`--inspect` 只负责「开门」；**断点要停，必须有调试器客户端（VSCode / chrome://inspect / DevTools）真正连上这条 WebSocket**。这正是那次排查的答案：

```
Debugger listening on ws://127.0.0.1:9229/1be49506-...
```

只有 listening、**没有下一行 `Debugger attached.`**——调试器从未连上。终端里跑 `npm run dev:debug` 只是开了门，编辑器里点的断点没有「人」去执行。判活口诀：**`Debugger listening` 是开了门，`Debugger attached.` 才是有人进来了**；两个都看到，断点才会停。

### launch 与 attach：调试会话的两种模型

| | launch（启动并调试） | attach（连接到已运行的进程） |
| --- | --- | --- |
| 进程由谁拉起 | VSCode 按配置拉起，出生即带调试器 | 你自己在任意终端启动（如 `npm run dev:debug`） |
| 调试器何时连上 | 进程启动前就位，断点从第一行就有效 | 你按 F5 后主动连 9229 |
| 需要配置吗 | 需要 launch.json | 需要 launch.json 里的 `request: "attach"` |
| 适合场景 | 一键启动调试、团队共享配置 | 进程已在跑；连远程 / 容器里的服务 |

JS Debug Terminal（下文 ④ 种入口之一）本质上是 attach 的自动化版：进程「出生瞬间」就被 VSCode 接管，省掉手动连接。

## launch.json：把调试动作固化成配置

### type / request / name：骨架三要素

`.vscode/launch.json` 的最小骨架是三个字段：`type` 固定 `"node"`（用 VSCode 内置的 Node 调试器）；`request` 取 `launch`（VSCode 拉起进程）或 `attach`（连已在跑的进程）；`name` 是调试下拉框里显示的名字。

### launch 的两种写法：program 直启与 runtimeExecutable 走 npm scripts

写法一：`program` 直接指向一个 JS 入口——适合单文件脚本。写法二：`runtimeExecutable` + `runtimeArgs` 让 VSCode 去执行一条 npm 命令——**和 package.json 的 scripts 完全对齐**，这才是工程调试的正解（编译、环境变量、启动自检都走 scripts 里那一条链路）。下面是真实工程里「F5 一键全包」的配置，等价于在调试终端里执行 `npm run dev:debug`：

> 示意片段（无配套脚本；完整文件见本仓库 `ai/agent-development/code/agent-basics/.vscode/launch.json`）

```jsonc
{
    "type": "node",
    "request": "launch",
    "name": "调试启动（F5 全包）",
    "runtimeExecutable": "npm",
    "windows": { "runtimeExecutable": "npm.cmd" },   // Windows 下要指到 npm.cmd
    "runtimeArgs": ["run", "dev:debug"],
    "cwd": "${workspaceFolder}",
    "console": "integratedTerminal",                 // 在集成终端里跑，看得到 Nest 启动日志
    "skipFiles": ["<node_internals>/**"],            // 单步时不进 Node 内部源码
    "sourceMaps": true,
    "outFiles": ["${workspaceFolder}/dist/**/*.js"]
}
```

`${workspaceFolder}` 是 VSCode 的变量替换，指当前工作区根——配置因此不写死任何绝对路径。

### outFiles 与 sourceMaps：让 src 的断点映射到 dist 的产物

TypeScript 工程实际跑的是编译产物 `dist/*.js`，调试器要靠 **sourcemap** 才能把 `src/*.ts` 上的断点映射过去。三个字段各管一段：`sourceMap: true`（tsconfig 里）负责生成 `.js.map`；launch/attach 配置里 `sourceMaps: true` 开启映射；`outFiles` 告诉调试器去哪些文件里找产物（`${workspaceFolder}/dist/**/*.js`）。三者缺一，断点就是空心的。

### 作用域铁律：只有工作区根的 .vscode/launch.json 生效

VSCode 只加载**当前打开的工作区根目录**下的 `.vscode/launch.json`。仓库根打开时，子目录里的 launch.json **完全不生效**（调试下拉框里根本没有那条配置）——想用「每个项目各自维护调试配置」的组织方式，就必须把项目文件夹本身作为工作区打开。

## 断点绑定：空心断点的三大原因与排查路径

断点圆点是**实心红**才算绑定成功；空心灰圈标着 *unverified breakpoint* 时，按顺序查三件事：

1. **没 attach**——终端里只有 `Debugger listening` 没有 `Debugger attached.`。修复：用四种调试入口之一真正连上（见下章）。
2. **工作区开错**——你按 F5 时 VSCode 打开的是仓库根，配置根本没被加载；下拉框里找不到预期的那条配置就是证据。修复：`File → Open Folder` 打开项目目录本身。
3. **sourcemap 缺失或错位**——tsconfig 没开 `sourceMap`（TS 工程跑的是 dist，没 map 就映射不回 src），或 `outFiles` 没覆盖产物路径。修复：tsconfig 加 `"sourceMap": true` 重新编译，确认 `dist/**/*.js.map` 存在。

三个都满足后：断点实心红 → 发请求 → 停住。本仓库 ai 板块的两个 NestJS 工程（agent-basics / tool-calling）就是按这套配置落地的，`src/agent/agent.service.ts` 里的断点实测可命中。

## 执行控制与观测面板

### 调试工具条：六个按钮与快捷键

断点停住后，顶部浮出 **Debug Toolbar**，六个动作对应键盘：

| 按钮 | 快捷键 | 语义 |
| --- | --- | --- |
| Continue / Pause | `F5` | 放行到下一个断点 / 暂停 |
| Step Over | `F10` | 下一行，不进入函数 |
| Step Into | `F11` | 进入函数内部 |
| Step Out | `Shift+F11` | 执行完当前函数并跳出 |
| Restart | `Ctrl+Shift+F5` | 重启调试会话 |
| Stop / Disconnect | `Shift+F5` | launch 下杀掉进程；**attach 下只是断开连接，服务继续跑** |

### 三种断点：普通、条件、logpoint

普通断点停住等操作；**条件断点**（右键断点 → Edit Condition）只在表达式为真时停，适合循环里找特定元素；**logpoint**（右键 → Add Logpoint）根本不停车，只往 Debug Console 打一条消息——排查高频调用时比断点好用得多。

### 四个观测面板：VARIABLES / WATCH / CALL STACK / DEBUG CONSOLE

左侧 Run and Debug 视图：**VARIABLES** 看 Local / Closure / Global 实时值；**WATCH** 钉住自定义表达式；**CALL STACK** 看调用链（点击帧可跳到对应位置）；底部 **DEBUG CONSOLE** 可即时输入表达式求值——停在断点上时输入 `message` 就能看到请求参数。

## 四种调试入口：同一套机制，四种打开方式

四种入口最终都归结为同一件事——「让 VSCode 的调试器连上进程的 inspect 端口」，区别只在连接由谁发起、要不要配置：

### ① JavaScript Debug Terminal：零配置的自动 attach

命令面板（`Ctrl+Shift+P`）→ **Debug: Create JavaScript Debug Terminal**，在这个终端里启动的任何 node 进程都会**出生瞬间被自动接管**——零配置、不挑工作区、不用 launch.json。临时调试首选。连上后终端同样会出现 `Debugger attached.`。

### ② package.json 的 Debug CodeLens：脚本上方的 Debug 按钮

打开 package.json，每个 script 上方有一个 **Debug** CodeLens 按钮，点一下就启动该脚本并挂上调试器——底层与 ① 是同一套自动接管机制，等于「帮你把 `npm run xxx` 输进了调试终端」。适合 scripts 已经写好的工程，点一下就跑。

### ③ launch.json 的 F5 全包：runtimeExecutable 走 npm scripts

上章的 launch 写法二：`runtimeExecutable: npm` + `runtimeArgs: ["run", "dev:debug"]`。按一次 **F5**，VSCode 拉起 npm → scripts 链路（编译、环境加载）→ nest CLI 派生的应用子进程由 `autoAttachChildProcesses`（默认开启）自动接管。与 scripts 完全对齐、配置可入库团队共享，是工程调试的固定入口。

### ④ attach 配置：连一个已经在跑的进程

进程已在跑（`Debugger listening` 已出现），选下拉框里的 attach 配置按 **F5**，VSCode 主动连 9229。四步判活：**attach 前终端只有 listening；按 F5 后必须出现 `Debugger attached.`；断点变实心红；发请求停住**。任何一步缺失，回到「空心断点三查」。

### 四入口对照表

| 入口 | 进程谁拉起 | 连接谁发起 | 要配置吗 | 适合 |
| --- | --- | --- | --- | --- |
| JS Debug Terminal | 你（终端里跑命令） | 出生瞬间自动 | 否 | 临时快速调试 |
| package.json Debug CodeLens | VSCode（点按钮） | 出生瞬间自动 | 否 | scripts 已就绪的工程 |
| launch F5 全包 | VSCode（按 F5） | 启动前就位 | 是（入库共享） | 工程固定调试入口 |
| attach 配置 | 你（任意终端） | 按 F5 主动连 | 是 | 连已运行 / 远程进程 |

## 坑清单：每一条都来自真实踩坑

### listening 无 attached：没连上，一切白搭

`Debugger listening` 只证明端口开了。终端里跑 `npm run dev:debug` 然后在编辑器里点断点，是**没有任何调试器在场**的——断点自然不停。看见 listening 就以为在调试，是最常见的误判。

### 工作区开错：嵌套的 .vscode/launch.json 不生效

以仓库根打开 VSCode 时，子目录的 launch.json 不会出现在调试下拉框里。表现：F5 找不到配置，或跑的是别的工程的配置。修复只有一个：`File → Open Folder` 打开项目目录本身。

### 9229 被占：address already in use，且 --inspect-brk 会「不挂起」

端口已有监听时再起一个 inspect，实测报错：

```
Starting inspector on 127.0.0.1:9229 failed: address already in use
```

且 `--inspect-brk` 在这种情况下**不会挂起**，脚本直接跑完了——挂着「首行暂停」的预期去等，永远等不到。修复：换端口（`--inspect=9230`），或找出占用进程（`netstat -ano | findstr 9229`）。

### watch 重启后断点「失效」：让 restart 帮你重连

`nest start --watch` 这类模式会在文件变化时**杀掉应用进程重新拉起**，新进程的 inspect 会话是新的。attach 配置里 `"restart": true` 让 VSCode 在目标进程重启后自动重连；没有它，每次热重启后你都在对着一个没人连的端口调试。

### 子进程调试：autoAttachChildProcesses 与 shell spawn

npm scripts / nest CLI 都会派生**子进程**承载真正的应用（终端里 `(node:xxxx)` 的 PID 与应用日志的 PID 不同就是证据）。VSCode 默认开启 `autoAttachChildProcesses`，会自动 attach 被调试进程派生的子进程；如果发现断点打在子进程代码里不生效，先确认父进程是经 VSCode 启动的（③ 或 ①），而不是裸终端里跑的。

## 配套代码

| 文件 | 对应小节 | 演示什么 |
| --- | --- | --- |
| `./code/node-basics/src/07-debug/07-inspector-runtime.cjs` | 调试的本质（`npm run 07inspector`） | 程序内 `node:inspector.open()` 打开 9229——`--inspect` 的代码等价形态；`/json/list` 可列出本进程 |
| `./code/node-basics/src/07-debug/07-inspect-brk.cjs` | 调试的本质（`node --inspect-brk` 运行） | `--inspect-brk` 首行前挂起等调试器；不带参数直跑时 `debugger` 语句是空操作 |

## 参考

- Node.js 官方文档：[Debugging Guide](https://nodejs.org/en/learn/getting-started/debugging)（--inspect / --inspect-brk / CDP）
- VSCode 官方文档：[Debugging in Visual Studio Code](https://code.visualstudio.com/docs/debugtest/debugging)（launch.json / attach / 断点类型）
