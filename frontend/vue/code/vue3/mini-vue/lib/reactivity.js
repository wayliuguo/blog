// ============================================================
// mini-vue/reactivity —— 响应式系统
// 对应 Vue3 源码包：@vue/reactivity（可脱离框架独立使用）
// 依赖：shared.js；被 runtime-core.js / index.js 依赖
// 覆盖机制（对应《Vue3 原理》第三章）：
//   reactive 惰性深度代理（3.1）、track（3.2）、trigger（3.3）、
//   ReactiveEffect + effect 栈 + cleanup（3.4）、ref（3.5）、proxyRefs（3.6）、
//   computed 脏标记（3.7）、watch（3.8）、readonly / shallowReadonly（3.9）
// ★ 建议断点：track（建表）、trigger（唤醒）、ReactiveEffect.run（栈与 cleanup）、
//   createGetter（惰性深度代理）、ComputedRefImpl 的 scheduler 与 get value、watch.scheduler
// ============================================================

// ============================================================
// 依赖收集与触发：effect / track / trigger（源码 src/reactivity/effect.js）
//    ★ 断点：track（建表）、trigger（唤醒）、ReactiveEffect.run（栈与 cleanup）
// 核心数据结构是一张两层表：
//   targetMap: WeakMap<原始对象, Map<属性名, Set<ReactiveEffect>>>
//   读属性时 track 顺着表把当前 effect 记进去；写属性时 trigger 顺着表把 effect 全部唤醒。
//   WeakMap 的键是弱引用：对象没有其他引用时整条依赖链随垃圾回收一起消失，无需手动清理。
// ============================================================
const targetMap = new WeakMap()
/**
 * effect 执行栈。effect 里嵌套读另一个响应式数据时，收集到的是"栈顶"那个 effect，
 * 所以进入副作用函数前 push、退出后 pop，保证任意时刻 activeEffect 都是最内层的。
 */
const effectStack = []
/**
 * 当前正在执行的 effect（栈顶的快捷引用）。track 只为它收集依赖；
 * 为 null 说明不在任何 effect 里读属性（比如普通事件回调），此时不需要收集。
 */
let activeEffect = null

// 教学用：WeakMap 无法遍历，另存一份强引用只为了把依赖关系打印出来（生产实现不需要）
const debugRegistry = []

/**
 * 副作用：响应式系统的最小执行单元。fn 里读了哪些响应式属性，
 * 执行期间就会被 track 记录下来；之后这些属性一变，fn 就会被重新唤醒执行。
 *
 * 两个关键字段：
 *   - scheduler：可选的"替代 run 的唤醒方式"。组件渲染 effect 靠它实现
 *     「数据变化 → 不立刻渲染 → 排进微任务队列批量渲染」。
 *   - deps：反向记录"我依赖了哪些 dep 集合"。正向表（targetMap）能查到
 *     effect，反向表才能在 cleanup 时把 effect 从各集合里摘除。
 *
 * 对应文档 3.4；真实 Vue 中还包含 runner、onStop、allowRecurse 等字段，教学版只留核心。
 */
class ReactiveEffect {
    /**
     * @param {Function} fn - 副作用函数：读取响应式数据并产生效果（渲染 / 打日志 / 计算）
     * @param {Function} [scheduler] - 调度器：trigger 唤醒时不直接跑 fn，而是调用它
     */
    constructor(fn, scheduler) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = [] // 反向记录：我依赖了哪些 dep（stop 时要清理）
        this.active = true
    }

    /**
     * 执行副作用：入栈 → 清旧依赖 → 跑 fn（期间完成依赖收集）→ 出栈。
     *
     * @returns {*} fn 的返回值（computed 复用它拿 getter 的计算结果）
     */
    run() {
        if (!this.active) return this.fn() // 已 stop：依赖被摘干净了，只跑函数不再收集
        try {
            effectStack.push(this) // 入栈：接下来 track 收集的是"我"
            activeEffect = this
            cleanupEffect(this) // 先清掉旧依赖：分支切换时才不会漏掉旧分支
            return this.fn()
        } finally {
            effectStack.pop() // 出栈：恢复外层 effect，嵌套场景才能正确收集
            activeEffect = effectStack[effectStack.length - 1] || null
        }
    }

    /**
     * 停止响应：清空全部依赖后置 active = false。之后数据再变不会唤醒它，
     * 再调用 run 也只执行 fn、不再收集依赖（对应 watch 返回的停止函数）。
     */
    stop() {
        if (!this.active) return
        cleanupEffect(this)
        this.active = false
    }
}

/**
 * 把 effect 从它依赖的所有 dep 集合中摘除，并清空它的反向记录。
 *
 * 为什么每次 run 前都要 cleanup？
 *   依赖在 fn 执行时"读什么收什么"——条件分支变了，依赖也应跟着变：
 *   `if (obj.a) obj.b`：a 真时依赖 {a,b}；a 变假后重跑只读 a，不该再依赖 b。
 *   先清旧再收新，执行完留下的就是"本轮真实读到的"依赖。
 *
 * @param {ReactiveEffect} effect - 待清理的副作用
 */
function cleanupEffect(effect) {
    for (const dep of effect.deps) dep.delete(effect)
    effect.deps.length = 0
}

/**
 * effect 入口：创建 ReactiveEffect 并立刻执行一次（建立初始依赖），
 * 返回可复用、可停止的 runner。
 *
 * @param {Function} fn - 副作用函数
 * @param {{scheduler?: Function}} [options] - 传 scheduler 可接管"数据变化后做什么"
 * @returns {Function} runner：调用即重新执行；runner.effect.stop() 可解除全部依赖
 *
 * @example
 *   const obj = reactive({ n: 1 })
 *   const runner = effect(() => console.log(obj.n))
 *   obj.n = 2            // → 打印 2（依赖变化自动重跑）
 *   runner()             // → 手动再打印一次
 *   stop(runner)         // → 解除依赖，之后改 obj.n 不再打印
 */
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler)
    _effect.run()

    // 返回一个 runner：既能手动触发，也能通过 runner.effect.stop() 解除所有依赖
    const runner = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

/**
 * 依赖收集：把 activeEffect 记进「target → key → dep」表的对应格子里。
 * 由 Proxy 的 get 处理器调用；effect 之外读属性时 activeEffect 为 null，直接跳过。
 *
 * 三级不存在就逐级建：对象级 Map → 属性级 Set → 塞入 effect。
 *
 * @param {Object} target - 被读取的原始对象（表的键，WeakMap 弱引用它）
 * @param {string|symbol} key - 被读取的属性名
 */
function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读属性，不需要收集

    if (!debugRegistry.includes(target)) debugRegistry.push(target)

    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))

    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))

    if (!dep.has(activeEffect)) {
        dep.add(activeEffect) // 正向：这个属性知道哪些 effect 关心它
        activeEffect.deps.push(dep) // 反向：这个 effect 也知道自己依赖了它（cleanup 用）
    }
}

/**
 * 派发更新：属性被写入时，找到依赖它的所有 effect 并唤醒。
 * 唤醒方式二选一：有 scheduler 走 scheduler（组件渲染 → 排队批处理、computed → 置脏），
 * 没有就直接 run（重新执行副作用函数）。
 *
 * @param {Object} target - 被写入的原始对象
 * @param {string|symbol} key - 被写入的属性名
 */
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

/**
 * 停止一个 effect（effect() 返回的 runner 的便捷包装）。
 *
 * @param {Function} runner - effect() 的返回值
 *
 * @example
 *   const runner = effect(() => console.log(obj.n))
 *   stop(runner) // 之后 obj.n 的变化不再触发打印
 */
function stop(runner) {
    runner.effect.stop()
}

/**
 * 把"哪个对象的哪个属性被谁依赖"打出来，demo 里用来观察收集结果
 * @returns {string} 多行文本，每行形如 `  {"n":1}  n → 2 个 effect`；无依赖时为「  （空）」
 */
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

// ============================================================
// reactive / readonly（源码 src/reactivity/reactive.js）
//    ★ 断点：createGetter（track + 惰性深度代理）、createSetter（值变了才 trigger）
// 实现：Proxy 的 handlers 由工厂函数生成，isReadonly / isShallow 两个开关
// 决定 get 的行为分支（要不要 track、要不要继续深度代理）。
// ============================================================
/**
 * 挂在 Proxy get 上的"哨兵键"：访问这些特殊 key 时不走正常取值，
 * 而是返回代理自身的元信息——isReactive / isReadonly / isProxy 全靠它们实现。
 */
const ReactiveFlags = {
    IS_REACTIVE: '__v_isReactive',
    IS_READONLY: '__v_isReadonly'
}

// 同一个对象只代理一次，否则每次访问都新建 Proxy，依赖就收集不上了
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

/**
 * 生成 Proxy 的 get 处理器。职责依次是：
 *   1. 哨兵键直接返回元信息（isReactive 就是这样实现的）；
 *   2. Reflect.get 拿到真实值后 track 收集依赖（readonly 不收集——永远不会写）；
 *   3. 浅层模式直接返回原始值；否则遇到对象就递归 reactive/readonly ——
 *      这就是「惰性深度代理」：只有被访问到的嵌套对象才付出代理的成本。
 *
 * @param {boolean} isReadonly - 是否生成只读版 get（不 track、嵌套走 readonly）
 * @param {boolean} isShallow - 是否只代理第一层（shallowReadonly 的 props 场景用）
 * @returns {Function} 可放进 Proxy handlers 的 get(target, key, receiver)
 */
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

/**
 * 生成 Proxy 的 set 处理器：先 Reflect.set 真正写入，值确实变了才 trigger。
 * 「值变了才触发」靠 Object.is 比较——赋同样的值不会白跑一轮更新。
 * 数组特例：push / 纯插入 splice 的条目写入走 DefineProperty（数组会静默把 raw length
 * 先行扩容），等真正写 length 时 Object.is(oldValue, value) 已相等，按旧逻辑会漏发
 * 更新——因此数组的 length 写入一律唤醒依赖（真实 Vue 用数组方法拦截解决此问题）。
 *
 * @returns {Function} 可放进 Proxy handlers 的 set(target, key, value, receiver)
 */
function createSetter() {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]
        const result = Reflect.set(target, key, value, receiver)
        if (!Object.is(oldValue, value) || (Array.isArray(target) && key === 'length')) trigger(target, key)
        return result
    }
}

/**
 * 深度可响应代理的 handlers（reactive() 使用）。
 */
const mutableHandlers = { get: createGetter(), set: createSetter() }
/**
 * 只读代理的 handlers（readonly() 使用）：get 不收集依赖，
 * set 直接拦截并告警——对象从头到尾不会变，自然也不会有更新要派发。
 */
const readonlyHandlers = {
    get: createGetter(true),
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
        return true
    }
}

/**
 * 深度响应式代理：读属性时自动收集依赖、嵌套对象访问到才继续代理。
 *
 * @param {Object} target - 要代理的目标对象（非对象原样返回）
 * @returns {Object} 代理对象；同一原始对象重复调用返回同一代理
 *
 * @example
 *   const state = reactive({ count: 0, nested: { n: 1 } })
 *   effect(() => console.log(state.count))
 *   state.count++        // → effect 重跑打印 1
 *   state.nested.n = 2   // → 访问 state.nested 时才代理它，同样具备响应式
 *   isReactive(state)    // → true
 */
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

/**
 * 深度只读代理：任何属性可读，写入被拦截并 console.warn。
 * 依赖不会被收集（只读对象不会引发更新），代理结果按原始对象缓存复用。
 *
 * @param {Object} target - 要代理的目标对象（非对象原样返回）
 * @returns {Object} 只读代理
 *
 * @example
 *   const ro = readonly({ n: 1 })
 *   ro.n          // → 1（可读）
 *   ro.n = 2      // → console.warn('Set operation on key "n" failed: ...')，值不变
 */
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

/**
 * 浅层只读代理：第一层不可写不可改，嵌套对象保持原样（照常可改、可被组件内依赖）。
 * 组件 props 的防篡改就是它：父组件传进来的 props 不允许子组件整体替换，
 * 但 prop 里的对象若来自父组件的响应式数据，子组件读取时仍能建立依赖。
 *
 * @param {Object} target - 要代理的目标对象
 * @returns {Object} 浅层只读代理
 *
 * @example
 *   const props = shallowReadonly({ item: { count: 1 } })
 *   props.item = {}      // → warn，被拦截
 *   props.item.count = 2 // → 可以改（第二层没被代理拦截，item 原对象本身可响应）
 */
function shallowReadonly(target) {
    if (!isObject(target)) return target
    return new Proxy(target, shallowReadonlyHandlers)
}

/**
 * 是否为 reactive 代理。靠 get 里的哨兵键实现：普通对象访问 __v_isReactive 是 undefined。
 *
 * @param {*} value - 任意值
 * @returns {boolean}
 *
 * @example
 *   isReactive(reactive({}))  // → true
 *   isReactive({})            // → false
 *   isReactive(readonly({}))  // → false（IS_REACTIVE 哨兵返回 !isReadonly = false）
 */
const isReactive = value => !!(value && value[ReactiveFlags.IS_REACTIVE])
/**
 * 是否为 readonly 代理。
 *
 * @param {*} value - 任意值
 * @returns {boolean}
 *
 * @example
 *   isReadonly(readonly({}))  // → true
 *   isReadonly(reactive({}))  // → false
 */
const isReadonly = value => !!(value && value[ReactiveFlags.IS_READONLY])
/**
 * 是否为任意响应式代理（reactive 或 readonly）。
 *
 * @param {*} value - 任意值
 * @returns {boolean}
 *
 * @example
 *   isProxy(reactive({}))    // → true
 *   isProxy(readonly({}))    // → true
 *   isProxy({})              // → false
 */
const isProxy = value => isReactive(value) || isReadonly(value)

// ============================================================
// ref / proxyRefs（源码 src/reactivity/ref.js）
// ============================================================
/**
 * ref 的实现。为什么需要 ref？Proxy 只能代理对象，拦不住
 * `let n = 1` 这样的原始值——ref 用「一个带 value 存取器的实例对象」把值包起来，
 * 对 .value 的读写就能走 track / trigger 了。
 *
 * 存值时做了两层包装：
 *   - _value：内部保存值。对象先转 reactive——读 .value 得到的是响应式代理；
 *   - __v_isRef：isRef 的识别标记。
 */
class RefImpl {
    /**
     * @param {*} value - 初始值；对象会被转成 reactive 代理后保存
     */
    constructor(value) {
        this._value = isObject(value) ? reactive(value) : value
        this.__v_isRef = true
    }

    /**
     * 读 ref：把 ref 实例自身当作 target、'value' 当作 key 走 track。
     *
     * @returns {*} 解包后的值（对象为响应式代理）
     */
    get value() {
        track(this, 'value') // 把 ref 实例自身当作 target，'value' 当作 key
        return this._value
    }

    /**
     * 写 ref：值有变化才更新内部 _value（对象同样转 reactive）并 trigger。
     *
     * @param {*} newValue - 新值
     */
    set value(newValue) {
        if (!hasChanged(newValue, this._value)) return
        this._value = isObject(newValue) ? reactive(newValue) : newValue
        trigger(this, 'value')
    }
}

/**
 * 创建一个 ref。若传入的已经是 ref 则原样返回（幂等）。
 *
 * @param {*} value - 初始值（原始值或对象）
 * @returns {RefImpl} ref 实例，通过 .value 读写
 *
 * @example
 *   const n = ref(1)
 *   n.value      // → 1
 *   n.value = 2  // → 触发依赖 n.value 的 effect
 *   ref(n) === n // → true
 */
function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
}

/**
 * 是否为 ref（读 __v_isRef 标记）。
 *
 * @param {*} value - 任意值
 * @returns {boolean}
 *
 * @example
 *   isRef(ref(1))       // → true
 *   isRef(computed(() => 1)) // → true（computed 也是 ref）
 *   isRef({ value: 1 }) // → false（没有标记）
 */
const isRef = value => !!(value && value.__v_isRef)

/**
 * 解包：是 ref 就取 .value，否则原样返回。
 *
 * @param {*} value - 任意值
 * @returns {*} 解包后的值
 *
 * @example
 *   unref(ref(1))  // → 1
 *   unref(1)       // → 1（非 ref 原样返回）
 */
function unref(value) {
    return isRef(value) ? value.value : value
}

// 只解包第一层：obj.count 等价于 typeof obj.count === 'ref' ? obj.count.value : obj.count
/**
 * 把「值可能是 ref」的对象包一层代理：读时自动 .value 解包，
 * 写时若目标原本是 ref 而新值不是 ref，则写进 ref.value（保持 ref 引用不变）。
 * setup 返回值经它处理后，模板里才不用写 .value。
 *
 * @param {Object} objectWithRefs - 属性值可能是 ref 的对象（如 setup 的返回值）
 * @returns {Proxy} 自动解包的代理对象
 *
 * @example
 *   const state = proxyRefs({ count: ref(0) })
 *   state.count       // → 0（等价 state.count.value）
 *   state.count = 5   // → 实际写的是 ref.value = 5
 *   state.count       // → 5
 */
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

// ============================================================
// computed：惰性求值 + 缓存（源码 src/reactivity/computed.ts）
//    ★ 断点：scheduler（依赖变化只置脏）、get value（有人来读才重算）
// ============================================================
/**
 * computed 的实现：一个"带缓存的 ref"。
 *
 * 与普通 effect 的区别全在 scheduler：
 *   - 依赖变化时不重算，只把 _dirty 置 true（脏标记），并 trigger 通知下游；
 *   - 真正的重算发生在有人来读 .value 且发现脏了的时候——没人读就一分钱不花。
 * 这就是「惰性求值 + 缓存」：依赖多次变化只算一次；值没变下游也不被惊动
 * （set value 的 hasChanged 会拦住）。
 */
class ComputedRefImpl {
    /**
     * @param {Function} getter - 计算函数：读响应式数据，返回计算结果
     */
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

    /**
     * 读计算值：脏了才重算（执行 getter），干净则直接返回缓存；
     * 无论重不重算都要 track——下游（别的 computed / 渲染 effect）要依赖本值。
     *
     * @returns {*} 计算结果（缓存值或新算的值）
     */
    get value() {
        if (this._dirty) {
            this._value = this.effect.run() // 重算时才真正执行 getter
            this._dirty = false
        }
        track(this, 'value')
        return this._value
    }
}

/**
 * 创建计算属性。getter 里读了什么响应式数据，它就依赖什么；依赖一变即置脏。
 *
 * @param {Function} getter - 计算函数
 * @returns {ComputedRefImpl} 带缓存的 ref，通过 .value 读取
 *
 * @example
 *   const count = ref(1)
 *   const double = computed(() => count.value * 2)
 *   double.value  // → 2（此时才执行 getter）
 *   count.value = 5
 *   double.value  // → 10（脏了，重算）
 */
function computed(getter) {
    return new ComputedRefImpl(getter)
}

// ============================================================
// watch：effect + scheduler 的组合能力（源码 src/reactivity/apiWatch.ts）
//    ★ 断点：watch.scheduler（源变化 → 取新值 → 交给用户回调）
// 对应文档 3.8：对源（getter / ref / reactive 对象）建立副作用，源变化时经
// scheduler 执行用户回调。deep 靠 traverse 把每一层属性都读一遍（触发 track）。
// ============================================================

// 深度遍历：读一遍每个属性，让响应式对象的全部层级都建立依赖
/**
 * 递归读取对象每一层每个属性——纯为了触发 track。
 * seen 集合防环：对象互相引用时不会死循环。
 *
 * @param {*} value - 任意值（非对象原样返回）
 * @param {Set} [seen] - 已访问对象集合（递归内部用，防循环引用）
 * @returns {*} 原值（watch 拿它当"新值"参与比较）
 */
function traverse(value, seen = new Set()) {
    if (!isObject(value)) return value
    if (seen.has(value)) return value
    seen.add(value)
    for (const key of Object.keys(value)) traverse(value[key], seen)
    return value
}

/**
 * 侦听响应式数据变化，执行用户回调；返回停止函数。
 *
 * 源的三种形态（getter / ref / reactive 对象）最终都归一成一个 getter：
 *   - 函数源：直接用；
 *   - ref：读 .value；
 *   - reactive 对象：traverse 全量读一遍（深度监听——每一层都建立了依赖）。
 *
 * 实现核心是 effect + scheduler：源变化时 trigger 不直接重跑副作用，
 * 而是进 scheduler——在 scheduler 里重跑 runner 拿新值，与旧值比较后交给用户回调。
 *
 * @param {Function|Object} source - 侦听源：getter 函数 / ref / reactive 对象
 * @param {Function} cb - 回调 (newValue, oldValue) => void
 * @param {{immediate?: boolean}} [options] - immediate: 首次立即以 (值, undefined) 回调
 * @returns {Function} 停止侦听函数（内部即 stop(runner)）
 *
 * @example
 *   const n = ref(1)
 *   const stopW = watch(n, (nv, ov) => console.log(nv, ov))
 *   n.value = 2          // → 打印 2 1
 *   stopW()
 *   n.value = 3          // → 无输出（已停止）
 *
 *   watch(() => obj.a.b, v => console.log(v), { immediate: true })
 *   // → 立即打印当前值；之后 obj.a.b 每次变化打印新值
 */
function watch(source, cb, options = {}) {
    let getter
    if (isFunction(source)) {
        getter = source // getter 函数：返回什么就侦听什么
    } else if (isRef(source)) {
        getter = () => source.value
    } else if (isReactive(source)) {
        // reactive 源默认深度监听（与 Vue 行为一致）：全量读一遍建依赖
        getter = () => traverse(source)
    } else {
        return () => {}
    }

    let oldValue
    const runner = effect(getter, {
        // 源变化时 trigger 不直接重跑 run，而是走 scheduler：取新值后交给用户回调
        scheduler: () => {
            const newValue = runner()
            if (hasChanged(newValue, oldValue)) {
                cb(newValue, oldValue)
                oldValue = newValue
            }
        }
    })
    oldValue = runner() // 首次执行：建立依赖，记下旧值
    if (options.immediate) cb(oldValue, undefined) // 立刻执行：首次就以"新值"身份回调
    return () => stop(runner) // 返回停止侦听函数
}
