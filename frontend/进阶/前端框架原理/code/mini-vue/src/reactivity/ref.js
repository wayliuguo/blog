/**
 * ref：把基本类型也变成"可被追踪的"
 *
 * Proxy 只能代理对象，所以基本类型要用一个类包起来，通过 .value 读写。
 * 值为对象时自动转成 reactive，这样 ref({a:1}).value.a 也是响应式的。
 *
 * proxyRefs 是给 setup() 用的：让模板里写 count 而不是 count.value。
 */

const { isObject, hasChanged } = require('../shared/index')
const { reactive } = require('./reactive')
const { track, trigger } = require('./effect')

class RefImpl {
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value
        this.__v_isRef = true
    }

    get value() {
        track(this, 'value') // 把 ref 实例自身当作 target，'value' 当作 key
        return this._value
    }

    set value(newValue) {
        if (!hasChanged(newValue, this._value)) return
        this._value = isObject(newValue) ? reactive(newValue) : newValue
        trigger(this, 'value')
    }
}

function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
}

const isRef = (value) => !!(value && value.__v_isRef)

function unref(value) {
    return isRef(value) ? value.value : value
}

// 只解包第一层：obj.count 等价于 typeof obj.count === 'ref' ? obj.count.value : obj.count
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key, receiver) {
            return unref(Reflect.get(target, key, receiver))
        },
        set(target, key, value, receiver) {
            const oldValue = target[key]
            // 原来是 ref、新值不是 ref -> 写进 ref.value（保持引用不变）
            if (isRef(oldValue) && !isRef(value)) {
                oldValue.value = value
                return true
            }
            return Reflect.set(target, key, value, receiver)
        }
    })
}

module.exports = { ref, isRef, unref, proxyRefs, RefImpl }
