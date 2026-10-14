# Electron

## 一、入门：进程模型的心智迁移

### 1.1 你已经会什么，缺什么

Electron = Chromium + Node.js 捆绑发行。web 技能全部复用，新心智只有一条：**一个应用内有两种进程，能力分布完全不对称**。

| | 主进程 | 渲染进程 |
| --- | --- | --- |
| 运行环境 | Node.js 完整环境 | Chromium 渲染环境（默认无 Node） |
| 职责 | 窗口生命周期、系统 API（托盘/菜单/文件对话框）、数据层、自动更新 | 页面 UI、业务逻辑、Web API |
| 危险度 | 能力最大，代码必须可信 | 面向不可信内容，必须假设会被攻破 |

这个分层与浏览器「内核进程 vs 站点进程」同构：**把系统能力收拢在一个可信进程，把不可信内容隔离在渲染进程**——渲染进程即使被 XSS 攻破，能碰到的也只有渲染层沙箱里的东西。老项目的经典反模式是开 `nodeIntegration: true`，等于把文件系统与执行能力直接交给网页代码，一次 XSS 就全盘沦陷。

### 1.2 上手：electron-app 最小可跑

`code/electron-app` 是完整工程（Electron 33，零业务依赖）。安装会下载约 100MB 的 Electron 二进制（`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 加速）：

```cmd
cd frontend/进阶/跨端与桌面深化/code/electron-app
npm install
npm start        :: 真实窗口：订单列表 + 详情 + 状态推进
npm run smoke    :: 无界面烟雾测试
```

烟雾测试实测输出（本机实跑，真实窗口创建 + 渲染层加载 + 主进程数据层）：

> 摘自 `./code/electron-app/README.md`

```md
[smoke] orders: 4
[smoke] detail 1001: 机械键盘
[smoke] advance 1002: paid
[smoke] renderer loaded: true
```

**CI/无人值守环境的真坑**：沙箱与 CI 常设 `ELECTRON_RUN_AS_NODE=1`，此时 electron.exe 会**退化成纯 Node**——`require('electron')` 拿到的是路径字符串，`ipcMain` 全是 undefined。本仓库实测就踩了这一下。排查口诀：Electron 环境下 `require('electron')` 返回对象；纯 Node 下返回字符串。跑 Electron 必须 `env -u ELECTRON_RUN_AS_NODE`（置空串都不行，Electron 只看「是否定义」）。

## 二、进阶：IPC 与 contextBridge

### 2.1 IPC：invoke/handle 的 Promise 往返

渲染进程要能力，主进程才持有能力，中间就是 IPC。现代写法是 **invoke/handle** 的 Promise 往返：

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

### 2.2 contextBridge：白名单暴露

能力如何进入渲染层？主进程在 **preload**（渲染进程加载前执行的特权脚本）里把精挑细选的 API 挂上去，没暴露的能力在渲染层**根本不存在**：

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

## 三、实战：订单工作台（electron-app 走读）

**主进程窗口与数据层**——窗口配置即安全配置：

> 摘自 `./code/electron-app/src/main.js`

```js
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            // preload 是唯一合法的桥：渲染进程拿不到 nodeRequire，只能拿到白名单 API
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
    return win
}

// IPC 三种形态：invoke/handle（请求响应）、on/send（事件推送）
ipcMain.handle('orders:list', () => orders)
ipcMain.handle('orders:detail', (_e, id) => findOrder(id))
ipcMain.handle('orders:advance', (_e, id) => advanceStatus(id))
```

**preload 白名单桥**——渲染进程唯一的系统能力入口：

> 摘自 `./code/electron-app/src/preload.js`

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
    // 请求-响应：渲染进程 await 调用，主进程 ipcMain.handle 应答
    listOrders: () => ipcRenderer.invoke('orders:list'),
    getOrder: (id) => ipcRenderer.invoke('orders:detail', id),
    advance: (id) => ipcRenderer.invoke('orders:advance', id),
    // 事件订阅：主进程 webContents.send 推送，渲染进程收
    onOrderUpdated: (fn) => {
        const listener = (_e, payload) => fn(payload)
        ipcRenderer.on('orders:updated', listener)
        return () => ipcRenderer.removeListener('orders:updated', listener)
    },
})
```

**渲染层桥接自检**——preload 没生效时给出明确提示（Electron 最常见的翻车点）：

> 摘自 `./code/electron-app/src/renderer/app.js`

```js
// 桥接自检：preload 没生效时给出明确提示（这是 Electron 最常见的翻车点）
if (window.desktop) {
    hintEl.textContent = 'preload 已注入：window.desktop 可用（contextIsolation 开启）'
} else {
    hintEl.textContent = 'window.desktop 不存在：检查 preload 路径与 contextIsolation 配置'
}
```

CSP `default-src 'self'` 拦截远程脚本注入（见 `renderer/index.html`）。

### 3.1 打包与体积：诚实面对 Chromium 的重量

体积构成很直白：**每个平台捆绑一份完整的 Chromium + Node.js**，空应用就有 80~100MB。工程要点：

1. **按平台分发**：Windows/macOS/Linux 各自出包，别打通用包；
2. **asar 归档**：源码打包成单个 asar 文件（本质是未压缩的归档格式，可被解包——**它是加载优化，不是安全边界**，敏感逻辑走主进程 + 服务端下发）；
3. **依赖瘦身**：渲染层走 Vite/Webpack 正常 tree-shaking；主进程与渲染进程**分开打包**（主进程是 CommonJS 环境，别混打包配置）；
4. **原生模块**用 N-API 编写，按平台预编译二进制分发，避免用户端编译。

## 四、最小实现：自动更新状态机

桌面应用没有「刷新即上线」，更新是桌面端工程化的核心命题。`electron-updater` 们的流程本质是一个状态机：**检查清单版本 → 下载 → 校验 → 重启替换**。探针把关键分支实测了出来（`node ./code/cross-lab/electron.cjs`）：

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

实测三条分支：新版本正常更新落盘；版本相同返回 up-to-date；**下载内容 hash 与清单不符时回滚、不落盘**——本地仍是旧版本。这是更新系统的底线设计：宁可让用户停在旧版本，也不能让损坏/被篡改的包污染本机。工程上还有两条配套：**增量更新**（只下 diff，包体从 100MB 降到几 MB）与**双版本目录**（新版装到独立目录，重启切换入口，失败可回退）。

## 五、对比与边界

| 维度 | 判断 |
| --- | --- |
| 选它的理由 | Web 栈全复用；系统能力（托盘/快捷键/文件/自更新）齐全；跨平台一致性靠捆绑 Chromium 兜底 |
| 不选的理由 | 内存与体积重（每窗口一个渲染进程）；启动慢于原生；沙箱应用商店（MAS）有额外限制 |
| 高频坑 | `ELECTRON_RUN_AS_NODE` 退化（§1.2）；contextIsolation 与 preload 的时序；多窗口内存失控（做窗口复用/懒创建） |

桌面端性能与体验账：内存（多窗口复用）、启动（主进程先起、窗口后建、首帧前脚本最少）、离线（数据落 SQLite/IndexedDB）、单实例锁（`requestSingleInstanceLock`）——四项都由主进程统筹，这是「主进程是唯一权威」的工程化落点。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/electron-app/src/main.js` | 窗口 + IPC handle 注册 + 烟雾测试 | 一、三 |
| `./code/electron-app/src/preload.js` | contextBridge 白名单桥 | 三 |
| `./code/electron-app/src/store.js` | 主进程独占数据层 | 三 |
| `./code/electron-app/src/renderer/app.js` | 渲染层 + 桥接自检 | 三 |
| `./code/cross-lab/electron.cjs` | IPC 往返 / 白名单 / 更新状态机探针 | 二、四 |
| `./code/cross-lab/jsi.cjs` | 通信模型基准（RN 篇引用） | — |
| `./code/cross-lab/mapper.cjs` | 原生映射器（RN 篇引用） | — |
| `./code/cross-lab/three-trees.cjs` | 三棵树（Flutter 篇引用） | — |
| `./code/cross-lab/twin.cjs` | 双线程 setData（Hybrid 篇引用） | — |
| `./code/cross-lab/webview.cjs` | 预热池 / 离线包（Hybrid 篇引用） | — |
| `./code/cross-lab/bridge.cjs` | 桥协议（Hybrid 篇引用） | — |
| `./code/cross-lab/run.cjs` | 总入口：依次执行七探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[Flutter](./Flutter.md)
- 下一篇：[Hybrid 与 JSBridge](./Hybrid%20与%20JSBridge.md)
- 参考：[Electron 进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model) · [Electron 安全清单](https://www.electronjs.org/docs/latest/tutorial/security) · [electron-updater](https://www.electron.build/auto-update)
