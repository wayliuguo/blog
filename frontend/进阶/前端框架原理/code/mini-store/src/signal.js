// 路线三：细粒度依赖追踪（Pinia / Vue reactive / Signal 的形状）
// 与前两条路线的根本差别：订阅单位不是"store"，而是"effect 读过的那个字段"。
// 依赖表仍是三层：target（被读的对象）→ key（被读的字段）→ dep（读它的 effect 集合）。

const targetMap = new WeakMap()
const reactiveCache = new WeakMap()
let activeEffect = null

function track(target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}

function trigger(target, key) {
    const depsMap = targetMap.get(target)
    const dep = depsMap && depsMap.get(key)
    if (!dep) return 0
    let woken = 0
    // 复制一份再遍历：effect 执行过程中可能重新收集依赖，改动原集合
    for (const eff of [...dep]) {
        if (eff.scheduler) eff.scheduler(eff)
        else eff.run()
        woken++
    }
    return woken
}

function cleanup(eff) {
    // 反向索引的用处：重新收集之前先把自己从旧依赖里摘掉，
    // 否则分支切换后"读过的字段"只增不减，脏字段也会唤醒它。
    for (const dep of eff.deps) dep.delete(eff)
    eff.deps.length = 0
}

function effect(fn, options = {}) {
    const eff = {
        deps: [],
        scheduler: options.scheduler,
        run() {
            cleanup(eff)
            const prev = activeEffect
            activeEffect = eff
            try {
                return fn()
            } finally {
                activeEffect = prev
            }
        }
    }
    if (!options.lazy) eff.run()
    return eff
}

function reactive(target) {
    if (typeof target !== 'object' || target === null) return target
    if (reactiveCache.has(target)) return reactiveCache.get(target)
    const proxy = new Proxy(target, {
        get(obj, key, receiver) {
            track(obj, key)
            const value = Reflect.get(obj, key, receiver)
            // 惰性深度代理：读到对象才继续代理，不预先遍历整棵树
            return typeof value === 'object' && value !== null ? reactive(value) : value
        },
        set(obj, key, value, receiver) {
            const old = obj[key]
            const ok = Reflect.set(obj, key, value, receiver)
            if (!Object.is(old, value)) trigger(obj, key)
            return ok
        }
    })
    reactiveCache.set(target, proxy)
    return proxy
}

function signal(initial) {
    const box = {} // 只作依赖表的键，本身不存值
    let value = initial
    return {
        get value() {
            track(box, 'value')
            return value
        },
        set value(next) {
            if (Object.is(next, value)) return
            value = next
            trigger(box, 'value')
        }
    }
}

function computed(getter) {
    const box = {}
    let value
    let dirty = true
    let evaluations = 0
    const runner = effect(getter, {
        lazy: true,
        // 依赖变化时只置脏 + 通知消费者，真正重算推迟到"有人来读"
        scheduler() {
            dirty = true
            trigger(box, 'value')
        }
    })
    return {
        get value() {
            track(box, 'value')
            if (dirty) {
                value = runner.run()
                dirty = false
                evaluations++
            }
            return value
        },
        get evaluations() {
            return evaluations
        }
    }
}

module.exports = { effect, reactive, signal, computed, track, trigger }
