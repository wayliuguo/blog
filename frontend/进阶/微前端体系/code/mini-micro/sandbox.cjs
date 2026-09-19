// 子应用沙箱：多例 Proxy + 副作用记账
// 写隔离靠"一人一份 fakeWindow"，定时器/监听器这类副作用记在案，卸载时统一清理
function createAppSandbox(name, sharedGlobal) {
  const fakeWindow = Object.create(sharedGlobal)
  fakeWindow.__MICRO_APP_NAME__ = name
  const sideEffects = { timers: [], listeners: [] }

  const proxy = new Proxy(fakeWindow, {
    get(target, key) {
      // 拦截副作用 API：调用照常生效，但先记一笔账
      if (key === 'setInterval') {
        return (fn, ms) => {
          const id = setInterval(fn, ms)
          sideEffects.timers.push(id)
          return id
        }
      }
      if (key === 'addEventListener') {
        return (type, fn) => {
          sideEffects.listeners.push({ type, fn })
        }
      }
      return target[key]
    },
    set(target, key, value) {
      // 写永远落在自己的 fakeWindow，共享全局不动
      target[key] = value
      return true
    },
  })

  function cleanup() {
    for (const id of sideEffects.timers) clearInterval(id)
    for (const { type, fn } of sideEffects.listeners) {
      // 真实浏览器里这里是 window.removeEventListener，模拟环境记清理即可
      void type
      void fn
    }
    sideEffects.timers = []
    sideEffects.listeners = []
    // 撤销子应用写在沙箱上的属性，保留应用名标记
    for (const k of Object.keys(fakeWindow)) {
      if (k !== '__MICRO_APP_NAME__') delete fakeWindow[k]
    }
  }

  return { proxy, cleanup, sideEffects }
}

module.exports = { createAppSandbox }
