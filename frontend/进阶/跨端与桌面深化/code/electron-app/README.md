# electron-app：Electron 订单工作台

跨端板块「Electron.md」配套实战工程。主进程数据层 + contextBridge preload + 零 Node 依赖渲染层，覆盖**进程模型、IPC 三形态、安全配置**三个核心机制。

## 结构

```
src/
├─ main.js          主进程：窗口生命周期 + ipcMain.handle 注册 + --smoke 烟雾测试
├─ preload.js       contextBridge 白名单桥（渲染进程唯一的系统能力入口）
├─ store.js         数据层：主进程独占，渲染进程只能拿 IPC 快照
└─ renderer/        渲染进程：纯 HTML/CSS/JS，window.desktop 调用桥
```

## 跑起来

```cmd
npm install
npm start
```

点击订单看详情 → 「推进到下一状态」→ invoke 到主进程改状态 → 列表刷新。渲染进程顶栏显示 preload 注入状态（桥接自检）。

## 烟雾测试（无界面验证主进程链路）

```cmd
npm run smoke
```

预期输出：

```
[smoke] orders: 4
[smoke] detail 1001: 机械键盘
[smoke] advance 1002: paid
[smoke] renderer loaded: true
```

## 安全要点（正文 3.3 的对照实现）

- `contextIsolation: true` + `nodeIntegration: false`：渲染进程拿不到 `require`
- preload 只通过 `contextBridge.exposeInMainWorld` 暴露四个白名单方法
- CSP `default-src 'self'`：拦截远程脚本注入

## 已知边界

- npm install 需要下载 Electron 二进制（约 100MB），走 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 加速；本机沙箱内需 `--ignore-scripts` 后手动 `node install.js`。
- 打包（electron-builder / forge）属正文 4.x 讨论范围，本工程不带打包配置。
