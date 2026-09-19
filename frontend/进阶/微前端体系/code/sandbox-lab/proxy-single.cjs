// Proxy 单例沙箱：不用整份快照，靠 Proxy 在 set 时顺手记录"写过什么"
// 失活时删掉本应用写的属性，激活时再恢复——同一时刻仍只跑一个应用
class ProxySandbox {
  constructor() {
    this.fakeWindow = Object.create(null)
    this.added = new Map()     // 本应用写过的属性 -> 写入的值
    const added = this.added
    this.proxy = new Proxy(this.fakeWindow, {
      set(target, key, value) {
        added.set(key, value)
        target[key] = value
        return true
      },
      deleteProperty(target, key) {
        delete target[key]
        added.delete(key)
        return true
      },
    })
  }

  activate() {
    // 激活：把本应用上次写入的属性恢复到沙箱全局
    for (const [k, v] of this.added) this.fakeWindow[k] = v
  }

  deactivate() {
    // 失活：把本应用写入的属性全部撤销，全局回到干净状态
    for (const k of this.added.keys()) delete this.fakeWindow[k]
  }
}

module.exports = { ProxySandbox }
