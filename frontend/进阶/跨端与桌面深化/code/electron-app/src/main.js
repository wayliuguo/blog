// 主进程：应用生命周期、窗口管理、数据层——所有 Node 能力都住在这里
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { orders, findOrder, advanceStatus } = require('./store')

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

// 烟雾测试：CI/无界面环境验证主进程数据链路，ready 后走一遍再退出
if (process.argv.includes('--smoke')) {
    app.whenReady().then(async () => {
        const win = createWindow()
        await win.webContents.loadURL('file://' + path.join(__dirname, 'renderer', 'index.html'))
        console.log('[smoke] orders:', Array.isArray(orders) ? orders.length : 'FAIL')
        console.log('[smoke] detail 1001:', findOrder('1001')?.title ?? 'FAIL')
        console.log('[smoke] advance 1002:', advanceStatus('1002')?.status ?? 'FAIL')
        console.log('[smoke] renderer loaded:', win.webContents.getURL().endsWith('index.html'))
        app.quit()
    })
} else {
    app.whenReady().then(createWindow)
    app.on('window-all-closed', () => {
        // darwin 保留 dock 惯例，其余平台直接退出——桌面端差异走 app 层判断
        if (process.platform !== 'darwin') app.quit()
    })
}
