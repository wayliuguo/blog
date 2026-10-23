// ============================================================
// mini-pinia/pinia —— store 本体
// 对应真实包：pinia（src/createPinia.ts / src/defineStore.ts / src/store.ts）
// 依赖：reactivity.js（track / trigger / computed / ref / isRef），必须先按序加载；
//       被 index.js 依赖（聚合到 window.MiniPinia）
// 覆盖机制（对应《Vue3 状态管理原理与实现》第三·四章）：
//   createPinia / setActivePinia（pinia 实例 = store 注册表 + 全局激活态）、
//   defineStore（id 即命名空间：useStore 首次调用才实例化，之后一律复用）、
//   createSetupStore（Proxy：ref 字段解包第一层 / action bind 到 store /
//   has·ownKeys·getOwnPropertyDescriptor 让 Object.keys(store) 看得全）、
//   $patch（批量更新入口，逐键 Object.is，赋同值不触发）、
//   storeToRefs（从 $state 取 ref 形态，解构不丢响应式）
// ★ 建议断点：
//   defineStore 返回的 useStore（stores.set 只走一次）·
//   createSetupStore 的 Proxy get（解包 / bind）/ set（写走 ref setter）·
//   store.$patch（逐键 Object.is 短路）· storeToRefs
// ============================================================

let activePinia = null

/**
 * 创建 pinia 实例：本质是一张 store 注册表（id → store 实例的 Map）。
 * @returns {{stores: Map<any, any>}} pinia 实例，配合 setActivePinia（全局激活）或 useStore(pinia)（显式传入）使用
 * @example
 *   const pinia = createPinia()
 *   pinia.stores.size   // → 0（还没有任何 store 被实例化）
 *   setActivePinia(pinia)
 *   useCartStore()      // 实例化后 pinia.stores.size → 1
 */
function createPinia() {
    return { stores: new Map() }
}

/**
 * 设置全局激活的 pinia 实例：之后调用 useStore 不传参时都落到它。
 * @param {{stores: Map<any, any>}|null} pinia createPinia() 的返回值（传 null 即取消激活）
 * @returns {void}
 * @example
 *   setActivePinia(createPinia()) // 应用入口先激活，组件里才能直接 useStore()
 *   // 不激活就调用 useStore() 会 throw：'useStore 需要在 pinia 激活后调用…'
 */
function setActivePinia(pinia) {
    activePinia = pinia
}

/**
 * 定义一个 store：返回 useStore 函数（此刻并不创建实例）。
 * 过程：id 即命名空间——首次调用 useStore 时才跑 setup、把实例存进 pinia.stores，
 * 之后同一 id 的调用一律返回这同一份实例（"跨组件共享同一份 state"的机制来源）。
 * @param {string} id store 的唯一命名空间（如 'cart'），同时是注册表的键与实例的 $id
 * @param {Function} setup setup 函数：返回 { 字段: ref / computed / action 函数 }
 * @returns {Function} useStore(pinia?)：返回该 id 对应的 store 单例；pinia 未激活且未传参时抛错
 * @example
 *   const useCounter = defineStore('counter', () => { const n = ref(0); return { n } })
 *   const a = useCounter()
 *   const b = useCounter()
 *   a === b             // → true（同一个实例，setup 只跑过一次）
 */
function defineStore(id, setup) {
    // id 即命名空间：同一个 id 的 useStore 只实例化一次，跨组件共享同一份 state
    return function useStore(pinia = activePinia) {
        if (!pinia) throw new Error('useStore 需要在 pinia 激活后调用（先 createPinia + setActivePinia）')
        if (!pinia.stores.has(id)) {
            pinia.stores.set(id, createSetupStore(id, setup)) // 只有首次调用会跑 setup
        }
        return pinia.stores.get(id)
    }
}

/**
 * 实例化 setup store：跑一次 setup，把返回值包成带解包行为的响应式 store。
 * 过程：
 *   1. setup() 返回 { 字段: ref / computed / action 函数 }，存进闭包里的 state；
 *   2. 外面包一层 Proxy：读 ref 字段自动解包（store.count 而不是 store.count.value）、
 *      读到函数就 bind 到 store（action 里 this 指向 store）、写 ref 字段走它的 setter；
 *   3. has / ownKeys / getOwnPropertyDescriptor 三件套让 in / Object.keys(store)
 *      能看到 setup 返回的全部字段；
 *   4. 挂 $patch：批量更新入口，逐键 Object.is，赋同值的键直接跳过。
 * @param {string} id store 命名空间，落到实例的 $id 上
 * @param {Function} setup setup 函数（defineStore 的第二个参数）
 * @returns {Proxy} store 对象：$id / $state / $patch + setup 返回的全部字段（ref 已解包）
 * @example
 *   const useCart = defineStore('cart', () => {
 *       const items = ref(0)
 *       const double = computed(() => items.value * 2)
 *       function add(step = 1) { items.value += step }
 *       return { items, double, add }
 *   })
 *   const cart = useCart()
 *   cart.items       // → 0（ref 已解包，不用写 .value）
 *   cart.add(3)      // items → 3，double → 6
 *   cart.$patch({ items: 6 }) // 批量更新：items → 6，double → 12
 */
function createSetupStore(id, setup) {
    const state = setup()
    const target = { $id: id }
    // $state 暴露 setup 原始返回值（ref 未解包），storeToRefs 从这里取 ref 形态
    Object.defineProperty(target, '$state', { value: state, enumerable: false })

    const store = new Proxy(target, {
        get(obj, key, receiver) {
            if (key in obj) return Reflect.get(obj, key, receiver) // $id / $state 等自有键优先，不进解包逻辑
            const value = state[key]
            if (isRef(value)) return value.value // ref 字段解包第一层：store.count 就是 count.value
            if (typeof value === 'function') return value.bind(store) // action 绑到 store：this 能读字段、调别的 action
            return value
        },
        set(obj, key, value, receiver) {
            if (isRef(state[key])) {
                state[key].value = value // 通过 ref 的 setter 触发依赖
                return true
            }
            state[key] = value
            return true
        },
        has(obj, key) {
            return key in obj || key in state
        },
        ownKeys() {
            // 让 Object.keys(store) 能看到 setup 返回的全部字段（ref / computed / action）
            return Reflect.ownKeys(target).concat(Object.keys(state))
        },
        getOwnPropertyDescriptor(obj, key) {
            if (key in state) {
                return { enumerable: true, configurable: true, value: state[key] }
            }
            return Reflect.getOwnPropertyDescriptor(obj, key)
        }
    })

    store.$patch = partial => {
        for (const key of Object.keys(partial)) {
            if (isRef(state[key]) && !Object.is(state[key].value, partial[key])) {
                state[key].value = partial[key] // 逐键 Object.is：赋同值的键连通知都没有
            }
        }
    }

    return store
}

/**
 * 把 store 摊成"可解构的字典"（proxyRefs 思路）：解构 store 不再丢响应式。
 * 过程：从 $state（setup 的原始返回值）遍历——ref / computed 字段保持 ref 形态
 * （解构出来还有 .value，仍是响应式的），action 函数原样保留（不解包成值）。
 * @param {object} store createSetupStore 产出的 store 实例
 * @returns {Object<string, (object|Function)>} 键与 store 一致：state / getter 字段是 ref，action 是函数
 * @example
 *   const cart = useCart() // items 是 ref(3)，add 是函数
 *   const { items, add } = storeToRefs(cart)
 *   items.__v_isRef   // → true（解构后仍是响应式的 ref）
 *   items.value       // → 3
 *   typeof add        // → 'function'（action 不解包，保持可调用）
 */
function storeToRefs(store) {
    const refs = {}
    // 从 $state（setup 原始返回值）遍历：ref 字段保持 ref 形态，action 原样保留
    for (const key of Object.keys(store.$state)) {
        const value = store.$state[key]
        if (isRef(value)) refs[key] = value
        else if (typeof value === 'function') refs[key] = value
    }
    return refs
}
