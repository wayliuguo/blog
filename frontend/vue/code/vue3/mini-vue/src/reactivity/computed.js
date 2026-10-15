/**
 * computed：惰性求值 + 缓存
 *
 * 两条关键设计：
 *   1. _dirty 脏标记 —— 依赖没变就直接返回缓存，getter 一次都不重跑
 *   2. 把 getter 包成一个带 scheduler 的 effect —— 依赖变化时**不立刻重算**，
 *      只把 dirty 置 true 并通知"依赖这个 computed 的渲染 effect"去取新值
 */

const { ReactiveEffect, track, trigger } = require('./effect')

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true
        this._value = undefined
        this.__v_isRef = true
        this.effect = new ReactiveEffect(getter, () => {
            if (this._dirty) return // 已经是脏的，不用再通知一遍
            this._dirty = true
            trigger(this, 'value') // 叫醒依赖方，它们会在读 value 时触发重算
        })
    }

    get value() {
        if (this._dirty) {
            this._value = this.effect.run() // 重算时才真正执行 getter
            this._dirty = false
        }
        track(this, 'value')
        return this._value
    }
}

function computed(getter) {
    return new ComputedRefImpl(getter)
}

module.exports = { computed, ComputedRefImpl }
