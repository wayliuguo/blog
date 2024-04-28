'use strict'

Object.defineProperty(exports, '__esModule', { value: true })

const isObject = value => typeof value === 'object' && value !== null
const extend = Object.assign
const isArray = Array.isArray
const isFunction = value => typeof value === 'function'
const isIntegerKey = key => `${parseInt(key)}` === key
// 判断对象是否存在此属性
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key)
const hasChanged = (oldValue, value) => oldValue !== value

/* eslint-disable indent */
function effect(fn, options = {}) {
    // 需要让这个 effect 变成响应式的 effect，实现数据变化重新执行
    const effect = createReactiveEffect(fn, options)
    // 响应式的effect默认会先执行一次，如果是lazy不执行
    if (!options.lazy) {
        effect()
    }
    return effect
}
// 全局 effect，用于存储当前的 effect，供 track 获取
let activeEffect
/**
 * effect 栈，用于effect 嵌套中获得正确的effect上下文
 * 保证每个属性收集的effect是正确的
 * effect(() => {
 *  state.name // effect1
 *  effect(() => {state.age}) //effect2
 *  state.sex // effect1
 * })
 */
const effectStack = []
// effect 唯一标识,用于区分 effect
let uid = 0
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        // 保证此effect没有加入到effectStack 中，防止死循环
        // 如 effect(() => state.age++) 如果没有这个判断，状态改变后重新执行会死循环
        if (!effectStack.includes(effect)) {
            try {
                effectStack.push(effect)
                activeEffect = effect
                // 函数执行时会执行对应的 getter 方法，这个时候进行关联
                // baseHanlers.ts => createGetter(if (!isReadonly)) 分支
                return fn()
            } finally {
                effectStack.pop()
                activeEffect = effectStack[effectStack.length - 1]
            }
        }
    }
    // 唯一标识
    effect.id = uid++
    // 用于标识这个是响应式effect
    effect._isEffect = true
    // 记录effect对应的函数
    effect.raw = fn
    // 记录选项
    effect.options = options
    return effect
}
// 收集effect依赖
const targetMap = new WeakMap()
/**
 * 让某个对象中的属性收集对应的effect函数
 * @param target 目标对象
 * @param type 类型
 * @param key 属性
 */
function track(target, type, key) {
    // 构建对应的weakMap(key: target value: map(key: key(依赖属性名), value: set[effect1,...]))
    // 没在effect中使用的属性不用收集
    if (activeEffect === undefined) return
    // 从 targetMap 获取 target 对应的值，如果没有则创建并赋值给 depsMap，其值是一个map，用于存放key => set[effect]
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    // 从 depsMap 获取 key 对应的值，如果没有则创建并赋值给 dep，其值是一个set数组，用于存放effect数组
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    // 避免添加重复的
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)
    }
    console.log(targetMap)
}
function trigger(target, type, key, newValue, oldValue) {
    console.log(target, type, key, newValue, oldValue)
    // 如果这个属性没有收集过 effect 不需要做任何操作
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    // 将所有的effect全部暂存到一个新的集合中，最终一起执行
    const effects = new Set()
    // 添加 effect
    const add = effectsToAdd => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => effects.add(effect))
        }
    }
    // 1.判断是否修改数组的长度，修改数组的长度影响较大
    if (key === 'length' && isArray(target)) {
        // 如果对应的长度有依赖收集，则需要更新
        depsMap.forEach((dep, key) => {
            console.log(depsMap, dep, key)
            // 如果更改的长度小于收集的索引，那么这个索引也需要触发effect重新更新（state.arr.length = 1）
            // 如果不是直接更改length，如push的这种，key已经是新增的下标了
            if (key === 'length' || key > newValue) {
                add(dep)
            }
        })
    } else {
        // 2.如果不是修改数组的长度
        if (key !== undefined) {
            add(depsMap.get(key))
        }
        // 如果是修改数组中某一个索引
        switch (type) {
            case 0 /* ADD */:
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get('length'))
                }
                break
        }
    }
    // 执行所有effect
    effects.forEach(effect => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    })
}

// Relect 的优点
// 1.后续Object的方法属性会往Reflect迁移
// 2.如果用target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识
// 2.Reflect 方法具备返回值,判断是否设置成功
// 是否是仅读的，是的话set时会报异常
// 是否是深度的
function createGetter(isReadonly = false, shallow = false) {
    // target: 目标对象 key: 属性名 receiver: Proxy
    return function get(target, key, receiver) {
        // 使用 reflect获取结果
        // target: 需要取值的目标对象 key: 需要获取的值的键值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值
        // 相当于 target[key]
        const res = Reflect.get(target, key, receiver)
        // 如果是非仅读的，进行依赖收集，等会数据变化后更新对应视图
        if (!isReadonly) {
            console.log('执行 effect 时会取值，收集 effect')
            // 调用 track 收集依赖
            track(target, 0 /* GET */, key)
        }
        // 如果是浅层的
        if (shallow) return res
        // vue2是初始化就直接递归代理，vue3是取值时会进行代理（懒代理）
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res)
        }
        return res
    }
}
function createSetter(isShallow = false) {
    // target: 目标对象 key: 属性名 value: 新属性值 receiver: Proxy
    return function set(target, key, value, receiver) {
        // 当数据更新时，通知对应属性的 effect 重新执行
        // 我们要区分是新增的还是修改的
        // vue2里无法监控更改索引，无法监控数组的长度
        // 获取未变更的值
        const oldValue = target[key]
        // 判断是否存在这个属性
        const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)
        // target: 需要取值的目标对象 key: 需要获取的值的键值 value: 设置的值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值
        const result = Reflect.set(target, key, value, receiver)
        if (!hadKey) {
            // 新增
            trigger(target, 0 /* ADD */, key, value)
        } else if (hasChanged(oldValue, value)) {
            // 修改
            trigger(target, 1 /* SET */, key, value, oldValue)
        }
        return result
    }
}
// 生成 getter
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
// 生成 setter
const set = createSetter()
const shallowSet = createSetter(true)
// readonly Setter
const readonlyObj = {
    set: (target, key) => {
        console.warn(`set ${target} on key ${key} failed`)
    }
}
const mutableHandlers = {
    get,
    set
}
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
}
const readonlyHandlers = extend(
    {
        get: readonlyGet
    },
    readonlyObj
)
const shallowReadonlyHandlers = extend(
    {
        get: shallowReadonlyGet
    },
    readonlyObj
)

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers)
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers)
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers)
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers)
}
// 代理缓存
// WeakMap 会自动垃圾回收，不会造成内存泄漏，存储的key只能是对象
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
/**
 * 柯里化 new Proxy() 最核心的需要拦截
 * @param target 目标对象
 * @param isReadonly boolean  是不是仅读
 * @param baseHandlers
 */
function createReactiveObject(target, isReadonly, baseHandlers) {
    // 如果目标不是对象，没法拦截了 reactive 这个 api 只能拦截对象
    if (!isObject(target)) return target
    // 使用 proxy 代理, 将要代理的对象合对应的结果进行缓存
    // 如果某个对象已经代理过了，就不要再次代理
    // 可能一个对象 被代理是深度的 又被仅读代理了
    const proxyMap = isReadonly ? readonlyMap : reactiveMap
    const existProxy = proxyMap.get(target)
    // 如果已经被代理了直接返回即可
    if (existProxy) return existProxy
    const proxy = new Proxy(target, baseHandlers)
    proxyMap.set(target, proxy)
    return proxy
}

// value 是一个普通类型或者对象
function ref(value) {
    // 将普通类型变成一个对象
    return createRef(value)
}
function shallowRef(value) {
    return createRef(value, true)
}
const convert = val => (isObject(val) ? reactive(val) : val)
class RefImpl {
    // 参数中前面增加修饰符 标识此属性放到了实例上
    constructor(rawValue, shallow) {
        this.rawValue = rawValue
        this.shallow = shallow
        // 参数的实例添加_v-isRef 表示是一个ref属性
        this._v_isRef = true
        // 如果是深度的，需要把里面的都变成响应式（使用reactive转换）
        this._value = shallow ? rawValue : convert(rawValue)
    }
    // 类的属性访问器(编译后会自动转成defineProperty)
    get value() {
        track(this, 0 /* GET */, 'value')
        return this._value
    }
    set value(newValue) {
        // 判断老值和新值是否有变化
        if (hasChanged(newValue, this.rawValue)) {
            this.rawValue = newValue
            this._value = this.shallow ? newValue : convert(newValue)
            trigger(this, 1 /* SET */, 'value', newValue)
        }
    }
}
function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow)
}
// toRef toRefs 只是做了一层代理
class ObjectRefImpl {
    constructor(target, key) {
        this.target = target
        this.key = key
        this.__v_isRef = true
    }
    get value() {
        return this.target[this.key]
    }
    set value(newValue) {
        this.target[this.key] = newValue
    }
}
// 将对象的一个属性变成ref类型
function toRef(target, key) {
    return new ObjectRefImpl(target, key)
}
// object 可能传递的是一个数组或者对象
function toRefs(object) {
    const ret = isArray(object) ? new Array(object.length) : {}
    for (const key in object) {
        ret[key] = toRef(object, key)
    }
    return ret
}

class ComputedRefImpl {
    // ts 中默认不会挂载到this上
    constructor(getter, setter) {
        this.setter = setter
        // 默认取值时不要用缓存
        this._dirty = true
        // 计算属性默认会产生一个effect
        this.effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                // triggle 触发执行后，把_dirty置为true，再次触发get时候即可再次更新
                if (!this._dirty) {
                    this._dirty = true
                    // 通知依赖进行更新
                    trigger(this, 1 /* SET */, 'value')
                }
            }
        })
    }
    // 计算属性也要收集依赖
    get value() {
        // 在取值的时候才执行 effect(_dirty)
        if (this._dirty) {
            // 在 effect 执行时，会将用户的返回值返回，这时候可以更新 _value
            this._value = this.effect()
            this._dirty = false
        }
        // 收集此对象的.value属性的依赖
        track(this, 0 /* GET */, 'value')
        return this._value
    }
    set value(newValue) {
        this.setter(newValue)
    }
}
function computed(getterOrOptions) {
    let getter
    let setter
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions
        setter = () => {
            console.warn('computed value must be readonly')
        }
    } else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    return new ComputedRefImpl(getter, setter)
}

exports.computed = computed
exports.effect = effect
exports.reactive = reactive
exports.readonly = readonly
exports.ref = ref
exports.shallowReactive = shallowReactive
exports.shallowReadonly = shallowReadonly
exports.shallowRef = shallowRef
exports.toRef = toRef
exports.toRefs = toRefs
//# sourceMappingURL=reactivity.cjs.js.map
