// 手写 mini-pinia：setup store 风格
// 核心分工：
//   createPinia()         建一个 pinia 实例（stores 集合 + 全局 activePinia）
//   defineStore(id, setup) id 即命名空间；返回 useStore，首次调用时实例化
//   useStore(pinia?)      取 activePinia 实例化 / 复用已有 store
//   storeToRefs(store)    proxyRefs 思路：只解包第一层，拿回 ref 形态
//   $patch(partial)       批量更新 + 逐键 Object.is（赋同值不动，少触发依赖）
//   跨 store 引用：store 的 action / getter 里调另一个 useStore，读它的 ref 即建立依赖
const { track, trigger } = require('./reactivity')

let activePinia = null

function createPinia() {
    return { stores: new Map() }
}

function setActivePinia(pinia) {
    activePinia = pinia
}

function isRef(value) {
    return !!(value && typeof value === 'object' && value.__v_isRef === true)
}

// 一个带依赖收集的 ref（与 Vue 的 ref 同构：读收集、写触发，Object.is 跳过同值）
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

function defineStore(id, setup) {
    // id 即命名空间：同一个 id 的 useStore 只实例化一次，跨组件共享同一份 state
    return function useStore(pinia = activePinia) {
        if (!pinia) throw new Error('useStore 需要在 pinia 激活后调用（先 createPinia + setActivePinia）')
        if (!pinia.stores.has(id)) {
            pinia.stores.set(id, createSetupStore(id, setup))
        }
        return pinia.stores.get(id)
    }
}

// setup 返回 { 字段: ref / computed / action 函数 }，实例化时包成响应式 store：
//   - 访问 ref 字段自动解包第一层（store.count 而不是 store.count.value）
//   - action 函数绑定到 store 上（this 指向 store，能读别的字段、调别的 action）
//   - $patch 走批量更新：逐键 Object.is，赋同值不触发
function createSetupStore(id, setup) {
    const state = setup()
    const target = { $id: id }
    // $state 暴露 setup 原始返回值（ref 未解包），storeToRefs 从这里取 ref 形态
    Object.defineProperty(target, '$state', { value: state, enumerable: false })

    const store = new Proxy(target, {
        get(obj, key, receiver) {
            if (key in obj) return Reflect.get(obj, key, receiver)
            const value = state[key]
            if (isRef(value)) return value.value
            if (typeof value === 'function') return value.bind(store)
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
                state[key].value = partial[key]
            }
        }
    }

    return store
}

// proxyRefs 思路：把 store 摊成"可解构的字典"。
// 只解包第一层：store 里是 ref 的字段（state / getter 的底层）保持 ref 形态；
// action 是普通函数，原样保留（不解包成值）。
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

module.exports = { createPinia, setActivePinia, defineStore, storeToRefs, ref, isRef }
