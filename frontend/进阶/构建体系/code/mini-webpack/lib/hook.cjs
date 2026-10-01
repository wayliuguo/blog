'use strict'

// tapable 的极简版：webpack 的 hook 就是这个原理——注册一批 fn，触发时按序调用。
// 真实的 tapable 还分 SyncHook / AsyncSeriesHook / SyncBailHook 等，差别只在「怎么调用」，
// 「先注册、后触发」这套模型完全一致。
class Hook {
    constructor() {
        this.taps = []
    }

    tap(name, fn) {
        this.taps.push({ name, fn })
    }

    call(...args) {
        for (const t of this.taps) t.fn(...args)
    }
}

module.exports = { Hook }