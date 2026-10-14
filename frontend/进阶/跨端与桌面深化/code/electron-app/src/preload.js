// preload：在渲染进程加载前执行，contextBridge 把白名单 API 挂到 window.desktop
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
