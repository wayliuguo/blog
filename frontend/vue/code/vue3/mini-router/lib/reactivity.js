// ============================================================
// mini-router/reactivity —— 最小响应式：ref + effect
// 对应真实包：@vue/reactivity（这里只取 ref / effect / track / trigger 最小子集）
// 依赖：无；被 router.js 依赖（currentRoute 的响应式由它撑起）
// 覆盖机制（对应《Vue Router 原理》4.1 · 4.3）：
//   effect 执行期间读 ref.value → track 收集依赖；ref.value 被赋新值 → trigger
//   唤醒收集到的 effect 重跑 —— 这就是「currentRoute 一变、RouterView 重渲染」的底层
// ★ 建议断点：ref 的 set（Object.is 拦重复赋值 + trigger）、trigger（唤醒视图 effect）、
//   effect 的 run（activeEffect 的挂起与恢复）
// ============================================================

let activeEffect = null
const targetMap = new WeakMap()

/**
 * 依赖收集：把「当前正在执行的 effect」登记为 target[key] 的订阅者。
 * 过程：activeEffect 为空（不在任何 effect 里）直接返回；否则按
 * WeakMap → Map → Set 三层建表，把 activeEffect 存进 dep 集合。
 * @param {object} target 依赖的宿主对象，router 里永远是 ref 的包装 box
 * @param {string} key 被读的属性名，router 里永远是 'value'
 * @returns {void}
 * @example const r = ref(0); effect(() => r.value) → 读 value 时触发 track(box, 'value')
 */
function track(target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))
    dep.add(activeEffect)
}

/**
 * 派发更新：target[key] 变化后，逐个唤醒订阅它的 effect 重跑。
 * 过程：从 targetMap 查出 dep 集合，逐个调用（router 场景里就是重跑视图 effect）。
 * @param {object} target 变化的宿主对象
 * @param {string} key 变化的属性名
 * @returns {void}
 * @example ref 的 value 被赋新值 → trigger(box, 'value') → 视图 effect 恰好重跑一次
 */
function trigger(target, key) {
    const dep = targetMap.get(target)?.get(key)
    dep && dep.forEach(fn => fn())
}

/**
 * 创建一个响应式数据盒：读 value 时收集依赖，写不同新值时触发更新。
 * 过程：用 Object.defineProperty 定义 value 的 getter / setter；getter 里 track，
 * setter 里先用 Object.is 拦下「同一路由重复赋值」，真的变了才 trigger。
 * @param {*} value 初始值，router 里是 resolve 出来的完整路由对象
 * @returns {{ __isRef: true, value: * }} 带响应式 value 的 ref 盒
 * @example const r = ref('/'); effect(() => r.value) 先跑 1 次；r.value = '/about' 后 effect 再跑 1 次
 * @example r.value = '/about' 再赋同样的值 → Object.is 判定相同 → 不触发重跑
 */
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
        }
    })
    return box
}

/**
 * 注册副作用：立即执行 fn，执行期间把它设为 activeEffect，fn 里读过的 ref
 * 都会把它记为订阅者；之后任何依赖变化都会重跑它。
 * 过程：包一层 run —— 先挂 activeEffect 再执行、finally 里恢复为 null，
 * 保证只有 fn 同步执行期间发生的读取才算依赖。
 * @param {Function} fn 副作用函数，router 场景就是「渲染 RouterView」的渲染函数
 * @returns {Function} run 函数，可手动重跑（与首次执行收集到同一批依赖）
 * @example let n = 0; effect(() => { n++; return route.value.name }) → 首跑 n = 1；route.value 变化后自动重跑 n = 2
 */
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
