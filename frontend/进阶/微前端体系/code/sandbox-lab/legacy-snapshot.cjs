// 快照沙箱：激活时给全局拍快照，失活时 diff 还原
// 这是 qiankun 早期（legacy）的方案，同一时刻只能跑一个应用
class SnapshotSandbox {
    constructor(global) {
        this.global = global
        this.snapshot = new Map() // 激活时的全局快照
        this.modify = new Map() // 本应用写过的属性及旧值
    }

    activate() {
        // 激活：先恢复上次失活时记录的修改，再对当前全局拍新快照
        for (const [k, v] of this.modify) this.global[k] = v
        this.snapshot = new Map(Object.entries(this.global))
    }

    deactivate() {
        // 失活：diff 当前全局与快照，记下本应用的修改，再把全局还原
        this.modify = new Map()
        for (const k of Object.keys(this.global)) {
            if (!this.snapshot.has(k)) {
                // 新增的属性：记下来，然后删掉
                this.modify.set(k, this.global[k])
                delete this.global[k]
            } else if (this.snapshot.get(k) !== this.global[k]) {
                // 改过的属性：记下新值，还原旧值
                this.modify.set(k, this.global[k])
                this.global[k] = this.snapshot.get(k)
            }
        }
    }
}

module.exports = { SnapshotSandbox }
