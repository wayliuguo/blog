// Proxy 多例沙箱：每个应用一份自己的 fakeWindow，用 Proxy 串到共享原型上
// 天然互不污染，也不需要激活/失活还原——qiankun 2.x 与 micro-app 的做法
const sharedGlobal = Object.create(globalThis)

function createSandbox(name) {
    const fakeWindow = Object.create(sharedGlobal)
    fakeWindow.__MICRO_APP_NAME__ = name
    return new Proxy(fakeWindow, {
        get(target, key) {
            // 读：优先读自己的，读不到沿原型链回落到共享全局
            return target[key]
        },
        set(target, key, value) {
            // 写：永远只写进自己的 fakeWindow，共享全局不动
            target[key] = value
            return true
        }
    })
}

module.exports = { createSandbox }
