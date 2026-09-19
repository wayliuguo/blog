/**
 * 依赖收集与触发：整个响应式系统的地基
 *
 * 三层结构（真实 Vue 也是这三层）：
 *   targetMap: WeakMap<对象, Map<属性, Set<effect>>>
 *   get 时 track：把"当前正在跑的 effect"塞进对应属性的集合
 *   set 时 trigger：把集合里的 effect 全部叫醒（有 scheduler 就交给它排期）
 *
 * effect 用栈而不是单个变量：effect 里可能再跑 effect（computed、嵌套组件渲染），
 * 必须能恢复到外层。
 */

const targetMap = new WeakMap()
const effectStack = []
let activeEffect = null

// 教学用：WeakMap 无法遍历，另存一份强引用只为了把依赖关系打印出来（生产实现不需要）
const debugRegistry = []

class ReactiveEffect {
    constructor(fn, scheduler) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = [] // 反向记录：我依赖了哪些 dep（stop 时要清理）
        this.active = true
    }

    run() {
        if (!this.active) return this.fn()
        try {
            effectStack.push(this)
            activeEffect = this
            cleanupEffect(this) // 先清掉旧依赖：分支切换时才不会漏掉旧分支
            return this.fn()
        } finally {
            effectStack.pop()
            activeEffect = effectStack[effectStack.length - 1] || null
        }
    }

    stop() {
        if (!this.active) return
        cleanupEffect(this)
        this.active = false
    }
}

function cleanupEffect(effect) {
    for (const dep of effect.deps) dep.delete(effect)
    effect.deps.length = 0
}

function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler)
    _effect.run()

    // 返回一个 runner：既能手动触发，也能通过 runner.effect.stop() 解除所有依赖
    const runner = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读属性，不需要收集

    if (!debugRegistry.includes(target)) debugRegistry.push(target)

    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))

    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)
        activeEffect.deps.push(dep)
    }
}

function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return

    // 复制一份再遍历：effect 执行过程中可能修改集合
    for (const _effect of [...dep]) {
        if (_effect === activeEffect) continue // 别把自己叫醒（真实 Vue 是 allowRecurse 控制）
        if (_effect.scheduler) _effect.scheduler()
        else _effect.run()
    }
}

function stop(runner) {
    runner.effect.stop()
}

// 把"哪个对象的哪个属性被谁依赖"打出来，脚本里用来观察收集结果
function describeDeps() {
    const lines = []
    for (const target of debugRegistry) {
        const depsMap = targetMap.get(target)
        if (!depsMap) continue
        const label = JSON.stringify(target)
        const keys = []
        for (const [key, dep] of depsMap) {
            if (!dep.size) continue
            keys.push(`${String(key)} → ${dep.size} 个 effect`)
        }
        if (keys.length) lines.push(`  ${label}  ${keys.join('，')}`)
    }
    return lines.length ? lines.join('\n') : '  （空）'
}

// 清空调试记录（单测里用来断言"这次读有没有产生依赖"）
function resetDebug() {
    debugRegistry.length = 0
}

module.exports = {
    ReactiveEffect,
    effect,
    track,
    trigger,
    stop,
    describeDeps,
    resetDebug,
    get activeEffect() {
        return activeEffect
    }
}
