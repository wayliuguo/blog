/**
 * reactive / readonly：用 Proxy 代理整个对象
 *
 * 与 Vue2 的 Object.defineProperty 相比，Proxy 天然支持：
 *   · 属性增删（不需要 $set / $delete）
 *   · 数组下标与 length
 *   · 深度响应式——访问到嵌套对象时才递归代理（惰性，不用一开始就遍历整棵树）
 */

const { isObject } = require('../shared/index')
const { track, trigger } = require('./effect')

const ReactiveFlags = {
    IS_REACTIVE: '__v_isReactive',
    IS_READONLY: '__v_isReadonly'
}

// 同一个对象只代理一次，否则每次访问都新建 Proxy，依赖就收集不上了
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
        if (key === ReactiveFlags.IS_READONLY) return isReadonly

        const result = Reflect.get(target, key, receiver)

        // readonly 的对象永远不会被 set，收集依赖没有意义
        if (!isReadonly) track(target, key)

        if (isShallow) return result
        // 深度响应式：遇到对象才继续代理（惰性）
        if (isObject(result)) return isReadonly ? readonly(result) : reactive(result)
        return result
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]
        const result = Reflect.set(target, key, value, receiver)
        if (!Object.is(oldValue, value)) trigger(target, key)
        return result
    }
}

const mutableHandlers = { get: createGetter(), set: createSetter() }
const readonlyHandlers = {
    get: createGetter(true),
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true
    }
}

function reactive(target) {
    if (!isObject(target)) return target
    if (target[ReactiveFlags.IS_READONLY]) return target
    if (target[ReactiveFlags.IS_REACTIVE]) return target

    const existing = reactiveMap.get(target)
    if (existing) return existing

    const proxy = new Proxy(target, mutableHandlers)
    reactiveMap.set(target, proxy)
    return proxy
}

function readonly(target) {
    if (!isObject(target)) return target
    const existing = readonlyMap.get(target)
    if (existing) return existing

    const proxy = new Proxy(target, readonlyHandlers)
    readonlyMap.set(target, proxy)
    return proxy
}

// 只读第一层：props 用它——不能替换整个 prop，但 prop 值本身可能是对象且要能响应
const shallowReadonlyHandlers = {
    get: createGetter(true, true),
    set: readonlyHandlers.set
}

function shallowReadonly(target) {
    if (!isObject(target)) return target
    return new Proxy(target, shallowReadonlyHandlers)
}

const isReactive = (value) => !!(value && value[ReactiveFlags.IS_REACTIVE])
const isReadonly = (value) => !!(value && value[ReactiveFlags.IS_READONLY])
const isProxy = (value) => isReactive(value) || isReadonly(value)

module.exports = {
    reactive,
    readonly,
    shallowReadonly,
    isReactive,
    isReadonly,
    isProxy,
    ReactiveFlags
}
