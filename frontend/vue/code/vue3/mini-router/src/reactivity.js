// 最小响应式：只有 ref + effect，够撑起「currentRoute 一变、视图 effect 重跑」这根线。
// 完整机制（三层依赖表 / effect cleanup / computed）见 ../mini-vue 与 ../mini-pinia。
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))
    dep.add(activeEffect)
}

function trigger(target, key) {
    const dep = targetMap.get(target)?.get(key)
    dep && dep.forEach((fn) => fn())
}

function ref(value) {
    const box = { __isRef: true }
    Object.defineProperty(box, 'value', {
        get() {
            track(box, 'value')
            return value
        },
        set(next) {
            if (Object.is(next, value)) return // 同一路由重复赋值不触发
            value = next
            trigger(box, 'value')
        },
    })
    return box
}

function effect(fn) {
    const run = () => {
        activeEffect = run
        try {
            return fn()
        } finally {
            activeEffect = null
        }
    }
    run()
    return run
}

module.exports = { ref, effect }
