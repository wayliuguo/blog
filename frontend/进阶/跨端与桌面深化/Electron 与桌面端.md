# Electron 与桌面端

跨端的最后一站是桌面：VS Code、Slack、Figma 桌面版、钉钉都选了 Electron。它把 Chromium 和 Node.js 打包进同一个应用——Web 团队的全部生态直接复用，代价是包体积与内存。这一篇拆 Electron 的进程模型、IPC 与安全边界，并用 `cross-lab/electron.cjs` 实测 invoke/handle 往返、contextBridge 白名单和自动更新状态机。

## 一、进程模型：主进程与渲染进程

Electron 应用只有**一个主进程**和**若干渲染进程**（每个窗口/WebView 各一个）：

| | 主进程 | 渲染进程 |
| --- | --- | --- |
| 运行环境 | Node.js 完整环境 | Chromium 渲染环境（可带受限 Node） |
| 职责 | 窗口生命周期、系统 API（托盘/菜单/文件对话框）、原生模块、自动更新 | 页面 UI、业务逻辑、Web API |
| 危险度 | 能力最大，代码必须可信 | 面向不可信内容，必须假设会被攻破 |

这个分层与浏览器「内核进程 vs 站点进程」同构：**把系统能力收拢在一个可信进程，把不可信内容隔离在渲染进程**——渲染进程即使被 XSS 攻破，能碰到的也只有渲染层沙箱里的东西。老项目的经典反模式是在渲染进程开 `nodeIntegration: true`，等于把文件系统与执行能力直接交给网页代码，一次 XSS 就全盘沦陷。

## 二、IPC：invoke/handle 与 contextBridge

渲染进程要能力，主进程才持有能力，中间就是 IPC。现代写法是 **invoke/handle** 的 Promise 往返——渲染层 `invoke(channel, ...args)`，主进程 `handle(channel, handler)` 接住：

> 摘自 `./code/cross-lab/electron.cjs`

```js
// 渲染进程 ipcRenderer.invoke(channel, ...args) → 主进程 ipcMain.handle(channel, handler)
// 返回 Promise；channel 未注册 handle 则明确 reject
class IpcMain {
  constructor() { this.handlers = new Map() }
  handle(channel, fn) { this.handlers.set(channel, fn) }
}
class IpcRenderer {
  constructor(main) { this.main = main }
  invoke(channel, ...args) {
    const fn = this.main.handlers.get(channel)
    if (!fn) return Promise.reject(new Error(`No handler registered for '${channel}'`))
    return Promise.resolve(fn(...args))
  }
}
```

探针实测两条路径（`node ./code/cross-lab/electron.cjs`）：注册过的 channel 正常往返；**未注册的 channel 明确报错**——「静默无响应」的 IPC 是排查地狱，宁可在开发期就炸出来。

能力如何进入渲染层？靠 **contextBridge 白名单暴露**：主进程把精挑细选的 API 挂到 `window.desktop`，没暴露的能力在渲染层**根本不存在**：

> 摘自 `./code/cross-lab/electron.cjs`

```js
// 主进程把「精挑细选的 API」挂到 window.desktop——未暴露的能力在渲染层根本不存在
function exposeInMainWorld(api) {
  const exposed = {}
  for (const [name, def] of Object.entries(api)) {
    if (def.expose) exposed[name] = def.fn
  }
  return exposed
}
```

实测：白名单里的 `readFile` / `appVersion` 可调用，`expose: false` 的 `exec` 在暴露对象上查无此键。安全基线三件套：**`contextIsolation: true` + `nodeIntegration: false` + contextBridge 白名单**——让渲染层看到的不是「整个 Node」，而是你愿意给的少数几个函数。

## 三、打包与体积：诚实面对 Chromium 的重量

Electron 应用的体积构成很直白：**每个平台捆绑一份完整的 Chromium + Node.js**，空应用就有 80~100MB。工程要点：

1. **按平台分发**：Windows/macOS/Linux 各自出包，别打通用包；
2. **asar 归档**：源码打包成单个 asar 文件（本质是未压缩的归档格式，可被解包——**它是加载优化，不是安全边界**，敏感逻辑要走主进程 + 混淆/服务端下发）;
3. **依赖瘦身**：渲染层走 Vite/Webpack 正常 tree-shaking；主进程与渲染进程分开打包（主进程是 CommonJS 环境，别混打包配置）；
4. **原生模块**用 N-API 编写，按平台预编译二进制分发，避免用户端编译。

## 四、自动更新：check → download → verify → swap

桌面应用没有「刷新即上线」，更新是桌面端工程化的核心命题。`electron-updater` 们的流程本质是一个状态机：**检查清单版本 → 下载 → 校验 → 重启替换**。探针把关键的三条分支实测了出来：

> 摘自 `./code/cross-lab/electron.cjs`

```js
check() {
  return this.manifest.version !== this.current ? this.manifest.version : null
}
apply() {
  const next = this.check()
  if (!next) return 'up-to-date'
  const body = this.download(next)
  if (sha256(body) !== this.manifest.hash) return 'verify-failed: rollback' // 校验失败回滚
  this.installed.version = next
  this.installed.body = body
  return `updated to ${next}`
}
```

实测三条分支：新版本正常更新落盘；版本相同返回 up-to-date；**下载内容 hash 与清单不符时回滚、不落盘**——本地仍是旧版本。这是更新系统的底线设计：宁可让用户停在旧版本，也不能让损坏/被篡改的包污染本机。工程上还有两条配套：**增量更新**（只下 diff，包体从 100MB 降到几 MB）与**双版本目录**（新版装到独立目录，重启时切换入口，失败可回退旧目录）。

## 五、桌面端的性能与体验账

| 关注点 | 说明 |
| --- | --- |
| 内存 | 每窗口一个渲染进程；多窗口应用要做窗口复用或懒创建（同 Hybrid 预热池的取舍） |
| 启动 | 主进程先起、窗口后建；渲染层首帧前的脚本越少越好（与 Web 首屏同一套逻辑） |
| 离线可用 | 数据落本地（SQLite / IndexedDB），更新走后台静默 |
| 多窗口协调 | 主进程是唯一权威：窗口注册表、单实例锁（`requestSingleInstanceLock`）都在主进程维护 |
| 原生体验 | 托盘、全局快捷键、协议注册、崩溃上报（主进程 + 渲染进程双端上报） |

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/cross-lab/electron.cjs` | IPC 往返 / contextBridge 白名单 / 更新状态机 | 二、四 |
| `./code/cross-lab/bridge.cjs` | 桥协议 / 回调表 / 批量 / 白名单（JSBridge 篇引用） | — |
| `./code/cross-lab/jsi.cjs` | 通信开销基准（跨端框架篇引用） | — |
| `./code/cross-lab/twin.cjs` | 双线程 setData（跨端框架篇引用） | — |
| `./code/cross-lab/webview.cjs` | 预热池 / 离线包（Hybrid 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行五探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：待补充（跨端与桌面深化）
- 上一篇：[JSBridge 设计与演进](./JSBridge%20设计与演进.md)
- 参考：[Electron 进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model) · [Electron 安全清单](https://www.electronjs.org/docs/latest/tutorial/security) · [electron-updater](https://www.electron.build/auto-update)
