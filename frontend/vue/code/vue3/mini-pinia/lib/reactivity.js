// ============================================================
// mini-pinia/reactivity —— 响应式底座（"改完通知谁"的机制来源）
// 对应真实包：@vue/reactivity（Pinia 不另起炉灶，直接复用 Vue 的响应式）
// 依赖：无（纯 JS，不碰 DOM）；被 pinia.js 依赖，经 index.js 聚合暴露
// 覆盖机制（对应《Vue3 状态管理原理与实现》第二章）：
//   三层依赖表 target → key → dep、track（收集）、trigger（字段级精确唤醒）、
//   cleanup（重跑前先退订旧依赖，分支切换才不脏）、effect（activeEffect
//   保存-恢复）、reactive（惰性深度代理 + Object.is 同值短路）、
//   computed（惰性 + 缓存，依赖变化只置脏不重算）、ref / isRef
// ★ 建议断点：
//   track（看 depsMap / dep 何时被建出来）· trigger（看 dep 里几个 effect、woken 返回几）·
//   reactive 的 get / set（惰性深度代理、同值短路）·
//   computed 的 scheduler（只置脏）与 get value（有人来读才重算）
// ============================================================

// ============================================================
// 依赖收集与触发：track / trigger / cleanup（源码 packages/reactivity/src/effect.ts）
//    ★ 断点：track（建表）、trigger（精确唤醒）、cleanup（分支切换退订）
// ============================================================
const targetMap = new WeakMap()
const reactiveCache = new WeakMap()
let activeEffect = null

/**
 * 依赖收集：把"当前正在运行的 effect"记进 target[key] 的依赖集合。
 * 过程：effect 里读到响应式字段 → Proxy 的 get 调 track → 沿三层表逐层建容器
 * （WeakMap → Map → Set，都惰性创建），最后把 activeEffect 塞进最内层 Set，
 * 同时让 effect 反向记住这个 Set（cleanup 退订时要用）。
 * @param {object} target 被读的原始对象（依赖表第一层的键）
 * @param {string|symbol} key 被读的字段名（依赖表第二层的键）
 * @returns {void} 无返回值；效果是依赖表里多一条 target → key → effect 记录
 * @example
 *   const s = reactive({ n: 1 })
 *   effect(() => s.n)      // 读 s.n 的瞬间内部调用 track(s, 'n')
 *   // 此后 targetMap：s → 'n' → Set{ 那个 effect }，改 s.n 会唤醒它
 */
function track(target, key) {
    if (!activeEffect) return // 不在任何 effect 里读（事件回调里随手一读），没什么可收集
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map())) // 第一层：对象 → Map
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set())) // 第二层：字段 → effect 集合（同样惰性建）
    dep.add(activeEffect)
    activeEffect.deps.push(dep) // 反向索引：effect 也记住自己进了哪些 Set，重跑前好退订
}

/**
 * 精确唤醒：target 的 key 字段变了，只唤醒"读过它"的那批 effect。
 * 过程：沿依赖表取到该字段的 Set，逐个执行（有 scheduler 就走 scheduler、
 * 否则直接 run），返回唤醒个数——"改一个字段唤醒几个订阅者"由此变成可数出的量。
 * @param {object} target 被改的原始对象
 * @param {string|symbol} key 被改的字段名
 * @returns {number} 本次唤醒的 effect 个数；该字段从没被读过则为 0
 * @example
 *   const s = reactive({ a: 1, b: 2 })
 *   effect(() => s.a)      // 只读过 a
 *   trigger(s, 'a')        // → 1（唤醒上面那个 effect）
 *   trigger(s, 'b')        // → 0（没人读过 b，依赖表里根本没有它）
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    const dep = depsMap && depsMap.get(key)
    if (!dep) return 0 // 该字段从没被任何 effect 读过：不用通知任何人
    let woken = 0
    // 复制一份再遍历：effect 执行过程中可能重新收集依赖，改动原集合
    for (const eff of [...dep]) {
        if (eff.scheduler) eff.scheduler(eff) // 有 scheduler 就不立刻重跑（computed 靠它只置脏）
        else eff.run()
        woken++
    }
    return woken
}

/**
 * 退订：把 effect 从它记住的所有依赖集合里摘掉。
 * 过程：run() 开头调用——重新收集之前先清旧依赖，
 * 这样分支切换后"读过的字段"才不会只增不减，脏字段也不会误唤醒。
 * @param {{deps: Array<Set<any>>}} eff 待清理的 effect 对象（deps 是反向索引）
 * @returns {void}
 * @example
 *   const s = reactive({ ok: true, a: 'A', b: 'B' })
 *   const eff = effect(() => (s.ok ? s.a : s.b))
 *   s.ok = false // 重跑时先 cleanup(eff)：s.a 上的旧依赖被摘掉，之后改 a 不再唤醒它
 */
function cleanup(eff) {
    // 反向索引的用处：重新收集之前先把自己从旧依赖里摘掉，
    // 否则分支切换后"读过的字段"只增不减，脏字段也会唤醒它。
    for (const dep of eff.deps) dep.delete(eff)
    eff.deps.length = 0
}

/**
 * 创建副作用：包一层 run（清旧依赖 → 保存上一个 activeEffect → 执行 → 恢复现场），
 * 执行期间读到的响应式字段都会把 eff 收进依赖表。非 lazy 立即执行一次完成首次收集。
 * @param {Function} fn 副作用函数：内部读响应式数据，字段变化时被唤醒重跑
 * @param {{lazy?: boolean, scheduler?: Function}} [options] lazy: 只建不跑；scheduler: 被唤醒时不直接 run 而改走它
 * @returns {{deps: Array<Set<any>>, scheduler?: Function, run: Function}} effect 对象，可手动调 run() 重跑
 * @example
 *   const s = reactive({ n: 0 })
 *   let runs = 0
 *   effect(() => { runs++; return s.n }) // 立即执行一次：runs → 1
 *   s.n = 1                              // 唤醒重跑：runs → 2
 */
function effect(fn, options = {}) {
    const eff = {
        deps: [],
        scheduler: options.scheduler,
        run() {
            cleanup(eff)
            const prev = activeEffect
            activeEffect = eff // 执行期间全局指向自己：fn 里读字段时 track 才知道记谁
            try {
                return fn()
            } finally {
                activeEffect = prev // 恢复现场：嵌套 effect 时内层不"偷走"外层的收集
            }
        }
    }
    if (!options.lazy) eff.run() // 非 lazy：立刻跑一次，完成首轮依赖收集
    return eff
}

// ============================================================
// reactive：读写代理（源码 packages/reactivity/src/reactive.ts）
//    ★ 断点：get（track + 惰性深度代理）、set（值变了才 trigger）
// ============================================================

/**
 * 惰性深度代理：把对象包成 Proxy——读时 track、写时（值真变了才）trigger。
 * 嵌套对象不预先遍历：读到时才递归 reactive，整棵树按需代理。
 * @param {object} target 要代理的原始对象（非对象原样返回）
 * @returns {object|*} 代理对象；同一原始对象重复调用返回同一份代理（reactiveCache 缓存）
 * @example
 *   const s = reactive({ n: 0 })
 *   effect(() => s.n)  // 收集依赖
 *   s.n = 1            // set 里 Object.is(0, 1) 为 false → trigger → effect 重跑
 *   s.n = 1            // Object.is(1, 1) 为 true → 不触发，订阅者安睡
 *   reactive(42)       // 非对象原样返回 42 本身
 */
function reactive(target) {
    if (typeof target !== 'object' || target === null) return target
    if (reactiveCache.has(target)) return reactiveCache.get(target) // 同一对象只代理一次，否则两次读到的是不同代理、依赖对不上
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
            if (!Object.is(old, value)) trigger(obj, key) // 同值写入直接短路，不惊动订阅者（NaN 除外）
            return ok
        }
    })
    reactiveCache.set(target, proxy)
    return proxy
}

// ============================================================
// computed：惰性求值 + 缓存（源码 packages/reactivity/src/computed.ts）
//    ★ 断点：scheduler（依赖变化只置脏）、get value（有人来读才重算）
// ============================================================

/**
 * 计算属性：惰性 + 缓存。依赖变化时 scheduler 只把 dirty 置 true 并通知消费者，
 * 真正重算推迟到下一次读 value；依赖没变就直接返回缓存值。
 * @param {Function} getter 求值函数：内部读响应式数据，建立自己的依赖
 * @returns {{__v_isRef: boolean, get value(): *, get evaluations(): number}} 计算引用：经 .value 读值；evaluations 记录真实重算次数（教学用）
 * @example
 *   const s = reactive({ price: 10, qty: 2 })
 *   const total = computed(() => s.price * s.qty)
 *   total.value      // → 20（第 1 次重算，evaluations → 1）
 *   total.value      // → 20（命中缓存，evaluations 仍 1）
 *   s.price = 20     // 只置脏，evaluations 仍 1
 *   total.value      // → 40（脏了才重算，evaluations → 2）
 */
function computed(getter) {
    const box = {} // 只作依赖表的键，本身不存值
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
        __v_isRef: true,
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

// ============================================================
// ref / isRef（源码 packages/reactivity/src/ref.ts）
//    ★ 断点：set value（Object.is 短路 + trigger）
// ============================================================

/**
 * 判断一个值是不是 ref（本实现与 Vue 一致，用 __v_isRef 标记位识别）。
 * @param {*} value 任意值
 * @returns {boolean} 是 ref 返回 true，否则 false
 * @example
 *   isRef(ref(1))       // → true
 *   isRef(reactive({})) // → false（reactive 不带 __v_isRef 标记）
 *   isRef(42)           // → false
 */
function isRef(value) {
    return !!(value && typeof value === 'object' && value.__v_isRef === true)
}

/**
 * 创建一个带依赖收集的 ref（与 Vue 的 ref 同构：读收集、写触发，Object.is 跳过同值）。
 * 过程：闭包持有真实值，box 只当依赖表的键；setup store 的 state 字段就是它。
 * @param {*} initial 初始值
 * @returns {{__v_isRef: boolean, get value(): *, set value(*): void}} ref 对象，经 .value 读写
 * @example
 *   const n = ref(0)
 *   effect(() => n.value) // 读 .value → track
 *   n.value = 1           // Object.is(0, 1) 为 false → trigger → effect 重跑
 *   n.value = 1           // 同值短路：effect 不重跑
 */
function ref(initial) {
    const box = {} // 只作依赖表的键，本身不存值
    let value = initial
    return {
        __v_isRef: true,
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
