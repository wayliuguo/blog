// ============================================================
// mini-vue/runtime-core —— 运行时核心（平台无关）
// 对应 Vue3 源码包：@vue/runtime-core
// 依赖：shared.js（ShapeFlags / 类型判断）+ reactivity.js（effect / proxyRefs /
//       shallowReadonly）；被 index.js 依赖
// 覆盖机制（对应《Vue3 原理》第四章，按 VNode + patch 心智模型排布五节）：
//   VNode 数据基石（4.1）、patch 调度中枢（4.2）、组件挂载（4.3）、
//   元素挂载（4.4）、响应式 + effect 调度（4.5）
// ★ 建议断点：createBaseVNode（shapeFlag）、patch（shapeFlag 分发）、
//   processFragment / mountElement（挂载递归）、componentUpdateFn（挂载 / 更新）、
//   queueJob / flushJobs / nextTick（批处理）、patchKeyedChildren（头尾同步 + key 配对 + LIS）、
//   mountComponent / unmount（生命周期）
//   ——正好对应 demo-app 的四段链路：mount('#app') → 挂载 → 更新 → 卸载（文档 4.1~4.5 各阶段 / 5.3 总览）
// 整体协作链路（一条数据改动的完整旅程）：
//   组件 render 读响应式数据（track）→ 数据变化（trigger）→ 渲染 effect 的
//   scheduler → queueJob 入队 → 微任务 flushJobs → patch 新旧 VNode →
//   按 shapeFlag 分发 → 最小化操作宿主节点 → 生命周期钩子按序执行。
// ============================================================

// ============================================================
// VNode 与 shapeFlag（源码 src/runtime-core/vnode.ts）
//    ★ 断点：createBaseVNode（看 type/children 如何落到位标记上）
// ============================================================
/** 特殊 VNode 类型标记：文本节点（type 不是字符串标签，patch 时按符号分发） */
const Text = Symbol('Text')
/** 特殊 VNode 类型标记：片段——没有自己的宿主节点，只负责包一组孩子 */
const Fragment = Symbol('Fragment')
/** 特殊 VNode 类型标记：注释节点（渲染 null / false 的占位产物） */
const Comment = Symbol('Comment')

/**
 * 所有 createXxxVNode 的公共底座：组装 VNode 对象并推导 shapeFlag。
 *
 * shapeFlag 分两步按位叠加（位运算 |= 把两个标记合并进一个数字）：
 *   1. type 是字符串 → ELEMENT（普通元素）；type 是对象 → STATEFUL_COMPONENT；
 *   2. children 是字符串 → TEXT_CHILDREN；数组 → ARRAY_CHILDREN（并把混入的原始
 *      字符串就地包成 Text VNode，对齐真实 Vue 的 normalizeChildren）；对象 → SLOTS_CHILDREN
 *      （插槽对象的形态：{ default: () => [...] }）。
 * key 从 props 里提出来单独放（diff 的配对依据），props 里的 key 原样保留、
 * 挂载时会被跳过不写到 DOM 上。
 *
 * @param {string|Object|Symbol} type - 标签名 / 组件对象 / Text·Fragment·Comment 符号
 * @param {Object|null} props - 属性对象（含 key / 事件 onXxx 等）
 * @param {string|Array|Object|null} children - 文本 / VNode 数组 / 插槽对象 / 无
 * @returns {Object} VNode：{ type, props, key, children, shapeFlag, el, component }
 *
 * @example
 *   // 位① ELEMENT：type 是字符串标签（demo 的 p/button/ul/li 都走这）
 *   createBaseVNode('p', null, 'Hello vue!') // → shapeFlag: 1|4 = 5 (ELEMENT|TEXT_CHILDREN)
 *   // 位② ARRAY_CHILDREN：children 是数组（混入的原始字符串就地包成 Text VNode）
 *   createBaseVNode('ul', null, [li1, li2]) // → shapeFlag: 1|8 = 9 (ELEMENT|ARRAY_CHILDREN)
 *   // 位③ STATEFUL_COMPONENT：type 是组件对象；children 是插槽对象再叠 SLOTS_CHILDREN
 *   createBaseVNode(App, null, { default: () => [...] })
 *   // → shapeFlag: 2|16 (STATEFUL_COMPONENT|SLOTS_CHILDREN)；key 从 props 单独提到 vnode.key
 */
function createBaseVNode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props && props.key != null ? props.key : null,
        children,
        shapeFlag: 0,
        el: null, // 对应的真实节点
        component: null // 组件 VNode 上挂的实例
    }
    // 1. 是元素还是组件
    if (isString(type)) vnode.shapeFlag |= ShapeFlags.ELEMENT
    else if (isObject(type)) vnode.shapeFlag |= ShapeFlags.STATEFUL_COMPONENT

    // 2. 孩子是文本还是数组
    if (isString(children)) vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    else if (isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
        // 真实 Vue 的 normalizeChildren：数组里混入的原始字符串（编译产物会在
        // 标签之间生成空白文本节点）统一包成 Text VNode——否则它们没有 type/el，
        // patch 会静默跳过、unmount 会拿 undefined.el 直接崩
        vnode.children = children.map(child => (isString(child) ? createTextVNode(child) : child))
    } else if (isObject(children)) vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN

    return vnode
}

/**
 * 创建 VNode 的通用入口（h 的底层）。
 *
 * @param {string|Object|Symbol} type - 标签名 / 组件对象 / 特殊符号
 * @param {Object|null} [props] - 属性
 * @param {string|Array|Object|null} [children] - 孩子
 * @returns {Object} VNode
 */
function createVNode(type, props = null, children = null) {
    return createBaseVNode(type, props, children)
}

/**
 * 创建文本 VNode（type 为 Text 符号，children 固定是字符串）。
 *
 * @param {string} [text] - 文本内容
 * @returns {Object} shapeFlag 强制为 TEXT_CHILDREN 的 VNode
 */
function createTextVNode(text = '') {
    const vnode = createBaseVNode(Text, null, String(text))
    vnode.shapeFlag = ShapeFlags.TEXT_CHILDREN
    return vnode
}

/**
 * 创建注释 VNode——渲染 null / false 时的占位节点（保持锚点、不显示内容）。
 *
 * @param {string} [text] - 注释内容
 * @returns {Object} type 为 Comment 符号的 VNode
 */
function createCommentVNode(text = '') {
    return createBaseVNode(Comment, null, text)
}

// 属性写法：h('div', { id: 'a' }, [ ... ]) 或 h(Component, { msg: 'hi' }, { default: () => ... })
// 第 4 参 patchFlag 只有编译产物会传（2.3 静态标记）：手动 h 用不到，编译产物靠它落到 VNode 上
/**
 * 创建 VNode 的用户级入口（模板里手写、编译产物都用它）。
 * 与 createVNode 的唯一差别：可接收第 4 参 patchFlag 并落到 VNode 上，
 * 供 patchElement 时跳过静态部分的比对。
 *
 * @param {string|Object|Symbol} type - 标签名 / 组件对象 / 特殊符号
 * @param {Object|null} [props] - 属性
 * @param {string|Array|Object|null} [children] - 孩子
 * @param {number} [patchFlag] - 编译器静态标记（1=TEXT），手动调用不传
 * @returns {Object} VNode
 *
 * @example
 *   // 分支① 元素 + props + children：demo 编译产物的主体形态
 *   h('p', null, toDisplayString(ctx.message), 1)
 *   // → patchFlag=1（TEXT）：更新时只重算文本；li 带 key 时 key 落到 vnode.key 供 diff 配对
 *   // 分支② 对象组件：mount('#app') 的装配层把根组件包成 VNode
 *   h(App) // → shapeFlag: STATEFUL_COMPONENT = 2、props: null
 */
const h = (type, props, children, patchFlag) => {
    const vnode = createVNode(type, props, children)
    if (patchFlag) vnode.patchFlag = patchFlag
    return vnode
}

/**
 * 把"任意渲染产物"归一成 VNode——组件 render 的返回值可能是各种形态：
 *   - null / undefined / boolean → 注释节点占位（DOM 里不留痕但保住锚点）；
 *   - 数组 → Fragment 包起来（一个父位挂多个节点）；
 *   - 已经是 VNode（对象）→ 原样用；
 *   - 其余（字符串/数字）→ 文本节点。
 * patch 入口与 mountChildren 都依赖这一步保证"进 patch 的一定是 VNode"。
 *
 * @param {*} child - render 返回值 / children 数组里的任意一项
 * @returns {Object} 一定是一个 VNode
 */
function normalizeVNode(child) {
    if (child === null || child === undefined || typeof child === 'boolean') {
        return createCommentVNode('')
    }
    if (isArray(child)) return createVNode(Fragment, null, child.map(normalizeVNode))
    if (isObject(child)) return child
    return createTextVNode(child)
}

/**
 * 判断两个 VNode 是否"同类型可复用"：type 与 key 都相同才算。
 * 这是 diff 的复用判据——同类型就地 patch，不同类型拆掉重建。
 *
 * @param {Object} n1 - 旧 VNode
 * @param {Object} n2 - 新 VNode
 * @returns {boolean} 是否可复用
 */
const isSameVNodeType = (n1, n2) => n1.type === n2.type && n1.key === n2.key

// ============================================================
// 调度器：微任务批处理（源码 src/runtime-core/scheduler.ts）
//    ★ 断点：queueJob（三次触发只入队一次）、flushJobs（微任务里统一执行）
// ============================================================
/** 待执行的渲染 job 队列（每个组件的 update 函数就是一个 job） */
const queue = []
/** 本轮微任务是否已排过队：true 表示 flush 已在路上，后来者只需入队 */
let isFlushPending = false
/** 当前这轮 flush 的 Promise（nextTick 的回调挂它后面，保证 DOM 已更新） */
let currentFlushPromise = null

/** 已决议的 Promise 实例：queueFlush 用它把 flushJobs 挂进微任务 */
const resolvedPromise = Promise.resolve()

/**
 * 把一个渲染 job 排进微任务队列（去重）。
 * 同步改 3 次数据 → 渲染 effect 被 trigger 3 次 → scheduler 调 3 次 queueJob，
 * 但 includes 保证同一个 job 只进队一次——这就是"批处理"的来源。
 *
 * @param {Function} job - 待执行函数（通常是组件的 instance.update）
 *
 * @example
 *   // 分支① 首次入队：改 message → scheduler 调 queueJob(job)
 *   const job = instance.update
 *   queueJob(job) // → includes 未命中 → 入队；queueFlush 把 flushJobs 挂进微任务（isFlushPending 闸门）
 *   // 分支② 去重命中：「一次改三项」trigger 5 次调 5 次，同一个 job 只进队一次
 *   queueJob(job) // → includes 命中，队列里始终只有 1 个 job，微任务只渲染 1 次
 */
function queueJob(job) {
    if (!queue.includes(job)) queue.push(job) // 同一个 job 只排一次
    queueFlush()
}

/**
 * 保证"排队 → 微任务 flush"只发起一次：isFlushPending 是闸门，
 * 已开闸就不再新建 Promise，直到 flushJobs 把它复位。
 */
function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
}

/**
 * 在微任务里统一执行队列中的所有 job。
 * 先 splice 出快照再清空原队列：flush 过程中新触发的 job 留在队列里，
 * 结尾检查还有剩就递归再来一轮（组件父子链上的级联更新）。
 */
function flushJobs() {
    isFlushPending = false
    const jobs = queue.splice(0, queue.length) // 先取出快照，flush 过程中新加的留到下一轮
    for (const job of jobs) job()
    if (queue.length) flushJobs() // 组件有父子依赖时，执行中可能又推入新 job
}

/**
 * 等这轮更新做完（DOM 已经是最新的）再执行回调；不传 fn 则直接返回该 Promise。
 * 挂在 currentFlushPromise 后面（它 resolve 时 flushJobs 已跑完）；
 * 没有正在排队的更新就退化为 resolvedPromise（下个微任务立刻执行）。
 *
 * @param {Function} [fn] - DOM 更新完成后执行的回调
 * @returns {Promise} 与本轮 flush 对齐的 Promise
 */
function nextTick(fn) {
    const promise = currentFlushPromise || resolvedPromise
    return fn ? promise.then(fn) : promise
}

// ============================================================
// 组件的 props 与 slots（源码 src/runtime-core/componentProps.ts）
//    ★ 断点：initProps（声明过的进 props、没声明的进 attrs）
// ============================================================
/**
 * 初始化组件的 props / attrs。
 * 分拣规则：组件 options.props 里声明过的 key 进 props（并包 shallowReadonly），
 * 没声明的进 attrs（透传属性，$attrs 可见）。没声明任何 props 的组件
 * 直接把原始对象当 attrs 用，连分拣都省了。
 * propsRaw 保留一份可写的原始引用：父组件更新时改它，readonly 代理自动读到新值。
 *
 * @param {Object} instance - 组件实例（写入 props / propsRaw / attrs 三个字段）
 * @param {Object|null} rawProps - VNode 上带的原始 props
 */
function initProps(instance, rawProps) {
    const props = {}
    const attrs = {}
    const options = instance.type.props
    const raw = rawProps || {}

    // 声明过的进 props，没声明的进 attrs——这决定了它会不会出现在 $attrs 里
    for (const key of Object.keys(raw)) {
        if (options && key in options) props[key] = raw[key]
        else attrs[key] = raw[key]
    }

    instance.props = options ? shallowReadonly(props) : attrs
    // 留一份原始对象的引用：更新 props 时直接改它，代理会自动读到新值
    instance.propsRaw = options ? props : attrs
    instance.attrs = options ? attrs : {}
}

/**
 * 初始化组件插槽：VNode 的孩子是对象（SLOTS_CHILDREN 位）→ 归一成 slots；
 * 其他形态（文本/数组/空）→ 空 slots。
 *
 * @param {Object} instance - 组件实例（写入 slots 字段）
 * @param {Object|null} children - 组件 VNode 的 children
 */
function initSlots(instance, children) {
    const { shapeFlag } = instance.vnode
    if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        instance.slots = normalizeObjectSlots(children)
    } else {
        instance.slots = {}
    }
}

/**
 * 把插槽对象归一成"每个槽都是函数"的形态：函数原样保留，
 * 非函数（直接给了 VNode / VNode 数组）包一层 () => slot，调用统一返回数组。
 *
 * @param {Object} rawSlots - { 槽名: 函数 | VNode | VNode[] }
 * @returns {Object} { 槽名: () => VNode[] }（渲染时调用即得孩子数组）
 */
function normalizeObjectSlots(rawSlots) {
    const slots = {}
    for (const [name, slot] of Object.entries(rawSlots)) {
        slots[name] = isFunction(slot) ? slot : () => slot
    }
    return slots
}

// ============================================================
// 组件实例与渲染 effect（源码 src/runtime-core/component.ts）
//    ★ 断点：componentUpdateFn（isMounted 区分挂载 / 更新）、setupComponent（setup 执行）
// ============================================================
/** 生命周期注册的依据：setup 执行期间的当前实例 */
let currentInstance = null // 生命周期注册的依据：setup 执行期间的当前实例
/** patch 子树期间的"当前父实例"：沿途挂载的子组件以它为 parent（provide/inject 查找链的依据） */
let currentScopeInstance = null

/**
 * 注册 mounted 钩子（只能在 setup 执行期间调用：靠 currentInstance 定位实例）。
 * 挂载完成后在 mountComponent 里统一执行。
 *
 * @param {Function} fn - 回调
 */
const onMounted = fn => currentInstance && currentInstance.mounted.push(fn)
/**
 * 注册 unmounted 钩子（只能在 setup 执行期间调用）。
 * 卸载时在 unmount 的组件分支里统一执行。
 *
 * @param {Function} fn - 回调
 */
const onUnmounted = fn => currentInstance && currentInstance.unmounted.push(fn)

// ============================================================
// provide / inject：依赖注入（源码 src/runtime-core/apiInject.ts）
//    ★ 断点：provide（原型链副本的创建时机）、inject（沿 parent 链向上查找）
// 对应文档四章引言：初始与父实例共享同一个 provides；首次 provide 时才
// 用 Object.create(parentProvides) 建原型链副本——此后"就近覆盖、向上穿透"。
// ============================================================
/**
 * 向后代提供数据。实例创建时 provides 直接指向父级的 provides（共享同一个对象），
 * 第一次调用 provide 才用 Object.create(parentProvides) 造一个"原型链副本"：
 * 写进副本的是自己的值，原型上还能读到祖先的值——查值时"就近覆盖、向上穿透"。
 *
 * @param {string|symbol} key - 提供的键
 * @param {*} value - 提供的值
 */
const provide = (key, value) => {
    if (currentInstance) {
        let { provides } = currentInstance
        const parentProvides = currentInstance.parent && currentInstance.parent.provides
        // 还在共享父的 provides，先建自己的原型链副本
        if (parentProvides && provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}

/**
 * 注入祖先提供的数据：沿 parent 链的 provides 原型链向上查找（key in 判断会穿透原型）。
 * 找不到返回 undefined。注意取的是"父级的 provides"——自己 provide 的值自己 inject 不到。
 *
 * @param {string|symbol} key - 要注入的键
 * @returns {*} 祖先提供的值；无任何祖先提供时为 undefined
 */
const inject = key => {
    if (currentInstance) {
        const parentProvides = currentInstance.parent && currentInstance.parent.provides
        if (parentProvides && key in parentProvides) return parentProvides[key]
    }
}

/**
 * 创建组件实例：把一个组件 VNode 运行所需的状态都初始化好。
 * 关键字段：
 *   - parent：来自 currentScopeInstance（谁在 patch 自己的子树，谁就是父），
 *     provide/inject 的向上查找链由它串起来；
 *   - provides：初始直接共享父的 provides 对象，首次 provide 才建副本；
 *   - mounted / unmounted：onXxx 注册的钩子容器；
 *   - emit：把 `emit('change', 1)` 转成查 props 上的 onChange 并调用。
 *
 * @param {Object} vnode - 组件 VNode
 * @param {Object|null} parent - 父组件实例（无则 null，根组件就是 null）
 * @returns {Object} 组件实例
 */
function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        type: vnode.type,
        parent, // 父组件实例：mountComponent 时从 currentScopeInstance 取（provide/inject 向上查找用）
        provides: parent ? parent.provides : {}, // 初始共享父的 provides，首次 provide 才建副本
        props: {},
        propsRaw: {},
        attrs: {},
        slots: {},
        setupState: {},
        ctx: {},
        isMounted: false,
        subTree: null,
        update: null,
        proxy: null,
        mounted: [], // 生命周期：onMounted 注册的回调，挂载完成后统一执行
        unmounted: [] // 生命周期：onUnmounted 注册的回调，卸载时统一执行
    }
    instance.ctx = { _: instance }
    // emit：把子组件的 this.$emit('change', 1) 转成父组件传下来的 onChange
    instance.emit = (event, ...args) => {
        const handler = (instance.vnode.props || {})[`on${event[0].toUpperCase()}${event.slice(1)}`]
        if (handler) handler(...args)
    }
    return instance
}

/**
 * 组件初始化三步走：props → slots → 有状态组件的 setup。
 *
 * @param {Object} instance - 组件实例
 *
 * @example
 *   // demo-app 根组件（vnode.props=null、children 是数组）：
 *   setupComponent(instance)
 *   // → initProps：没声明 props → instance.props = {}
 *   // → initSlots：children 非 SLOTS_CHILDREN → slots = {}
 *   // → setupStatefulComponent：执行 setup，落定 4 个 ref + increment 到 setupState
 */
function setupComponent(instance) {
    initProps(instance, instance.vnode.props)
    initSlots(instance, instance.vnode.children)
    setupStatefulComponent(instance)
}

/**
 * 执行组件的 setup 并落定 render。
 * 先建 instance.proxy（setup / render 里的 this 就是它），
 * 再在 currentInstance 指向本实例的窗口期里调用 setup（onXxx / provide 靠它注册），
 * setup 的返回值交给 handleSetupResult 处理，最后兜底从 options 里取 render。
 *
 * @param {Object} instance - 组件实例
 */
function setupStatefulComponent(instance) {
    // 先建代理：render 里的 this.xxx 就是从这里取的
    instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers(instance))

    const { setup } = instance.type
    if (setup) {
        currentInstance = instance
        try {
            const setupResult = setup(shallowReadonly(instance.props), {
                emit: instance.emit,
                slots: instance.slots
            })
            handleSetupResult(instance, setupResult)
        } finally {
            currentInstance = null
        }
    }
    finishComponentSetup(instance)
}

/**
 * 实例代理的 get/set 策略（渲染时 this 的取值顺序）：
 *   get：setupState 最优先（ref 已解包）→ $slots / $el 特判 → props 其次 → ctx 兜底；
 *   set：写 setupState 的键实际写进 ref.value；其余落到 ctx 暂存。
 *
 * @param {Object} instance - 组件实例
 * @returns {{get: Function, set: Function}} Proxy handlers
 */
const publicInstanceProxyHandlers = instance => ({
    get(target, key) {
        const { setupState, props } = instance
        if (key in setupState) return setupState[key] // setup 返回的（ref 已被解包）
        if (key === '$slots') return instance.slots
        if (key === '$el') return instance.vnode.el
        if (key in props) return props[key] // props 其次
        return target[key]
    },
    set(target, key, value) {
        const { setupState } = instance
        if (key in setupState) {
            setupState[key] = value // 写回 setup 的 ref.value
            return true
        }
        target[key] = value
        return true
    }
})

/**
 * 处理 setup 的返回值，二选一：
 *   - 函数 → 它就是 render；
 *   - 对象 → 经 proxyRefs 解包 ref 后存进 setupState（模板里不用写 .value）。
 *
 * @param {Object} instance - 组件实例
 * @param {Function|Object} setupResult - setup() 的返回值
 */
function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult // setup 直接返回 render 函数
    } else if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult) // 解包 ref，模板里不用写 .value
    }
}

/**
 * setup 兜底：没通过 setup 拿到 render 的话，用组件 options 里的 render。
 *
 * @param {Object} instance - 组件实例
 */
function finishComponentSetup(instance) {
    if (!instance.render) instance.render = instance.type.render
}

/**
 * 执行组件 render 并归一成 VNode（组件"子树"的来源）。
 * render 以 proxy 为 this 调用——模板里的 this.count 就是这样取到值的。
 *
 * @param {Object} instance - 组件实例
 * @returns {Object} 归一后的子树 VNode
 */
function renderComponentRoot(instance) {
    const { render, proxy } = instance
    return normalizeVNode(render.call(proxy, proxy))
}

/**
 * 对比新旧 props 是否有变化（浅比较：键数量 + 逐键 !==）。
 * 父组件重渲染后靠它判断"子组件要不要跟着重渲染"。
 *
 * @param {Object|null} prevProps - 旧 props
 * @param {Object|null} nextProps - 新 props
 * @returns {boolean} true 表示有变化（需要 updateProps + 重渲染）
 */
// 父组件重新渲染后发现 props / slots 变了，才需要通知子组件重渲染
// h(Child) 不传 props 时 vnode.props 是 null，先兜成空对象再比
function hasPropsChanged(prevProps, nextProps) {
    const p1 = prevProps || {}
    const p2 = nextProps || {}
    const nextKeys = Object.keys(p2)
    if (nextKeys.length !== Object.keys(p1).length) return true
    return nextKeys.some(key => p2[key] !== p1[key])
}

/**
 * 把新 props 同步进 instance.propsRaw（浅覆盖 + 删掉新列表里没有的键）。
 * 直接改原始对象而不换引用：shallowReadonly 代理还能用，依赖它的 effect 自动重跑。
 *
 * @param {Object} instance - 组件实例
 * @param {Object|null} nextProps - 新 props
 */
function updateProps(instance, nextProps) {
    const raw = instance.propsRaw
    for (const key of Object.keys(nextProps)) raw[key] = nextProps[key]
    for (const key of Object.keys(raw)) {
        if (!(key in nextProps)) delete raw[key]
    }
}

/**
 * 给组件装上"渲染 effect"——组件响应式的发动机。
 *
 * componentUpdateFn 内部用 isMounted 区分首次（挂载子树）与后续（patch 新旧子树），
 * 并在 patch 子树前后保存/恢复 currentScopeInstance：
 * 这段时间内被挂载的子组件实例的 parent 都指向本组件（provide/inject 链的来源）。
 *
 * scheduler 是关键：数据变化不直接重渲染，而是把 instance.update 排进
 * 微任务队列——同一 tick 改 10 次数据也只渲染 1 次（queueJob 去重）。
 *
 * @param {Object} instance - 组件实例（写入 update / subTree / isMounted）
 * @param {Object} initialVNode - 组件 VNode（挂载后把 el 回填到它上面）
 * @param {Object} container - 挂载容器
 * @param {Object|null} anchor - 插入锚点
 * @param {Function} patch - renderer 的 patch（闭包传入，避免全局引用）
 *
 * @example
 *   // 分支① isMounted=false 挂载：mountComponent 第 3 步，effect 首跑同步执行
 *   setupRenderEffect(instance, rootVNode, el, null, patch)
 *   // → renderComponentRoot 得 Fragment subTree → patch(null, subTree) → isMounted 置 true
 *   // 分支② 更新：改 message 后 scheduler 调 queueJob，微任务里重跑 componentUpdateFn
 *   instance.update()
 *   // → patch(prevSubTree, nextSubTree) 最小化更新子树
 */
function setupRenderEffect(instance, initialVNode, container, anchor, patch) {
    const componentUpdateFn = () => {
        // patch 子树期间本组件是"当前父实例"：沿途挂载的子组件 parent 指向它（provide/inject 依据）
        const prev = currentScopeInstance
        currentScopeInstance = instance
        if (!instance.isMounted) {
            const subTree = (instance.subTree = renderComponentRoot(instance))
            patch(null, subTree, container, anchor)
            initialVNode.el = subTree.el
            instance.isMounted = true
        } else {
            const prevSubTree = instance.subTree
            const nextSubTree = (instance.subTree = renderComponentRoot(instance))
            patch(prevSubTree, nextSubTree, container, anchor)
        }
        currentScopeInstance = prev
    }

    // scheduler 是关键：数据变化不会立刻渲染，只把 update 排进微任务队列
    instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
}

// ============================================================
// renderer：patch 分发 / 挂载更新卸载 / 列表 diff（源码 src/runtime-core/renderer.ts）
//    ★ 断点：patch（shapeFlag 分发）、patchKeyedChildren（头尾同步 + key 配对）、
//            mountComponent / unmount（生命周期）
// createRenderer 是"平台无关"的关键：所有碰 DOM 的动作都经 options 里的
// 宿主操作函数（hostXxx），换成自定义宿主（如假宿主 / canvas）即可跑在别的环境。
// ============================================================
/**
 * 由一组宿主操作装配出完整的渲染器：render / createApp / patch / unmount。
 * 内部闭包持有全部核心逻辑（patch 及其分发的 processXxx / mountXxx / unmount），
 * 对外只暴露这四个入口。
 *
 * @param {Object} options - 宿主操作：
 *   createElement / createText / createComment / setText / setElementText /
 *   insert / remove / nextSibling / patchProp
 * @returns {{render: Function, createApp: Function, patch: Function, unmount: Function}}
 */
function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        insert: hostInsert,
        remove: hostRemove,
        nextSibling: hostNextSibling,
        patchProp: hostPatchProp
    } = options

    // ---------- 入口 ----------
    /**
     * 渲染入口：把 vnode 渲进 container，内部记住上一帧 VNode（container._vnode），
     * 下一次调用就有了 patch 所需的"旧树"。
     * vnode 传 null → 卸载上一帧的整棵树。
     * 顶层直接给数组 / 字符串也行（先 normalizeVNode 归一）。
     *
     * @param {Object|Array|string|null} vnode - 要渲染的 VNode（或可归一化的产物；null 卸载）
     * @param {Object} container - 容器（宿主元素或形似元素的对象，_vnode 挂在它上面）
     */
    function render(vnode, container) {
        if (vnode == null) {
            if (container._vnode) unmount(container._vnode, true)
        } else {
            // 顶层也允许直接给数组 / 字符串：统一成 VNode 再进 patch
            vnode = normalizeVNode(vnode)
            patch(container._vnode || null, vnode, container, null)
        }
        container._vnode = vnode
    }

    /**
     * patch 的总分发：n1 为 null 表示挂载，n1、n2 都有表示更新。
     * 分发顺序：先三个特殊符号（Text/Comment/Fragment），再按 shapeFlag 位判
     * ELEMENT 还是 STATEFUL_COMPONENT。
     * n1 存在但类型/key 对不上 → 没有复用余地：记下它的下个兄弟做锚点，
     * 拆掉旧的、把 n1 置 null 走全新挂载。
     *
     * @param {Object|null} n1 - 旧 VNode（null 表示挂载）
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点（插在它前面；null 追加到末尾）
     *
     * @example
     *   // 分支① n1=null 挂载：demo 加载即触发（render 首帧 / setupRenderEffect 首跑）
     *   patch(null, rootVNode, container, null)
     *   // → processComponent 建组件 → 子树长出后 mountElement 递归挂 DOM
     *   // 分支② 同类型更新：改 message 后微任务里触发
     *   patch(prevSubTree, nextSubTree, container, null)
     *   // → 同为 Fragment → patchChildren → patchElement 只动 patchFlag 标记的文本
     *   // 分支③ 类型/key 变化：demo 单组件走不到
     *   patch(oldDivVNode, newSpanVNode, container, anchor)
     *   // → 记锚点 → unmount 旧的 → n1 置 null 走全新挂载
     */
    function patch(n1, n2, container, anchor) {
        if (n1 === n2) return

        // 类型或 key 变了：没有复用的余地，拆掉重建
        if (n1 && !isSameVNodeType(n1, n2)) {
            anchor = hostNextSibling(n1.el) // 新节点要插在旧节点的原位置（它的下一个兄弟之前）
            unmount(n1, true)
            n1 = null
        }

        const { type, shapeFlag } = n2
        switch (type) {
            case Text:
                processText(n1, n2, container, anchor)
                break
            case Comment:
                processComment(n1, n2, container, anchor)
                break
            case Fragment:
                processFragment(n1, n2, container, anchor)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor)
                else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, anchor)
                }
        }
    }

    // ---------- 文本 / 注释 / Fragment ----------
    /**
     * 处理文本节点：挂载 = createText + insert；更新 = 复用旧节点，
     * 内容变了才 setText（细粒度复用到文本节点这一层）。
     *
     * @param {Object|null} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function processText(n1, n2, container, anchor) {
        if (!n1) {
            n2.el = hostCreateText(n2.children)
            hostInsert(n2.el, container, anchor)
        } else {
            const el = (n2.el = n1.el)
            if (n1.children !== n2.children) hostSetText(el, n2.children)
        }
    }

    /**
     * 处理注释节点：只挂载（内容不变），更新时直接沿用旧节点。
     *
     * @param {Object|null} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function processComment(n1, n2, container, anchor) {
        if (!n1) {
            n2.el = hostCreateComment(n2.children || '')
            hostInsert(n2.el, container, anchor)
        } else {
            n2.el = n1.el
        }
    }

    /**
     * 处理 Fragment：自己没有宿主节点，用两个空文本节点夹住"自己这一段"，
     * startAnchor / endAnchor 就是它在容器里的占位锚点——
     * 之后把内容插在 endAnchor 之前，卸载时按锚点整段移除。
     *
     * @param {Object|null} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function processFragment(n1, n2, container, anchor) {
        // Fragment 没有自己的节点，用两个空文本节点夹住自己这一段，作为插入锚点
        const startAnchor = n1 ? n1.el : hostCreateText('')
        const endAnchor = n1 ? n1.anchor : hostCreateText('')
        n2.el = startAnchor
        n2.anchor = endAnchor

        if (!n1) {
            hostInsert(startAnchor, container, anchor)
            hostInsert(endAnchor, container, anchor)
            mountChildren(n2.children, container, endAnchor)
        } else {
            patchChildren(n1, n2, container, endAnchor)
        }
    }

    // ---------- 元素 ----------
    /**
     * 元素的挂载 / 更新分流：n1 为 null → mountElement（全新挂载），否则 patchElement（就地更新）。
     *
     * @param {Object|null} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function processElement(n1, n2, container, anchor) {
        if (!n1) mountElement(n2, container, anchor)
        else patchElement(n1, n2, container, anchor)
    }

    /**
     * 全新挂载一个元素：创建节点 → 逐个挂属性（key 除外）→ 按 shapeFlag
     * 分发孩子（文本一次性 setElementText；数组递归 mountChildren）→ 插入容器。
     *
     * @param {Object} vnode - 要挂载的元素 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     *
     * @example
     *   // demo 的 <button @click="increment">count + 1</button>：四步依次执行
     *   mountElement(buttonVNode, container, anchor)
     *   // → createElement button → patchProp 落 addEventListener（@click 的编译产物）
     *   //   → setElementText "count + 1"（文本孩子一步落位）→ insert 进容器
     */
    function mountElement(vnode, container, anchor) {
        vnode.el = hostCreateElement(vnode.type)

        for (const [key, value] of Object.entries(vnode.props || {})) {
            if (key === 'key') continue // key 是 diff 配对用的，不是 DOM 属性
            hostPatchProp(vnode.el, key, null, value)
        }

        // 位运算分发孩子：文本 / 数组
        const { shapeFlag, children } = vnode
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) hostSetElementText(vnode.el, children)
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) mountChildren(children, vnode.el, null)

        hostInsert(vnode.el, container, anchor)
    }

    /**
     * 挂载一组数组孩子：逐项归一成 VNode 后递归 patch(null, ...)。
     *
     * @param {Array} children - VNode / 字符串混合数组
     * @param {Object} container - 宿主容器（父元素或 Fragment 的容器）
     * @param {Object|null} anchor - 插入锚点
     */
    function mountChildren(children, container, anchor) {
        // 数组孩子逐个归一：允许混入字符串（真实 Vue 的 normalizeChildren 也做这一步）
        for (const child of children) patch(null, normalizeVNode(child), container, anchor)
    }

    /**
     * 更新一个已复用的元素：el 沿用旧的，属性做"新有旧无→加 / 值变→改 /
     * 旧有新无→删"的双向 diff，最后把孩子的更新交给 patchChildren。
     *
     * @param {Object} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     *
     * @example
     *   // demo-app「改 message」：新子树里的 <p> 与旧的 type/key 相同 → 分流到这
     *   patchElement(prevP, nextP, container, anchor)
     *   // → el 复用；props 双向 diff（onClick 每轮都是新闭包 → 解绑旧回调绑新回调）
     *   // → patchChildren：文本孩子 "Hello vue!" !== "Hello MiniVue!" → setElementText 1 次
     *   //   （静态的 <p>"count = 0" 文本相同、ul 里的 li 全同——一个宿主操作都不产生）
     */
    function patchElement(n1, n2, container, anchor) {
        const el = (n2.el = n1.el)
        const oldProps = n1.props || {}
        const newProps = n2.props || {}

        for (const [key, next] of Object.entries(newProps)) {
            if (key === 'key') continue
            const prev = oldProps[key]
            if (prev !== next) hostPatchProp(el, key, prev, next) // 新增或值变了
        }
        // 新 props 里没有的旧属性要摘掉
        for (const key of Object.keys(oldProps)) {
            if (key === 'key') continue
            if (!(key in newProps)) hostPatchProp(el, key, oldProps[key], null) // 传 null → removeAttribute
        }

        patchChildren(n1, n2, el, anchor)
    }

    /**
     * 孩子更新的四种组合：
     *   新文本：旧的若是数组先整体卸载，再 setElementText 一次性替换；
     *   新数组：旧的若是文本先清空再 mountChildren；旧的也是数组 → patchKeyedChildren。
     * （新为空（非文本非数组）的情况在归一化后不会走到这里。）
     *
     * @param {Object} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 孩子们的容器（父元素或 Fragment 容器）
     * @param {Object|null} anchor - 插入锚点
     */
    function patchChildren(n1, n2, container, anchor) {
        const c1 = n1.children
        const c2 = n2.children
        const prevShapeFlag = n1.shapeFlag
        const { shapeFlag } = n2

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) unmountChildren(c1, true)
            if (c1 !== c2) hostSetElementText(container, c2)
            return
        }

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, '') // 文本换数组：先清空
                mountChildren(c2, container, anchor)
            } else {
                patchKeyedChildren(c1, c2, container, anchor)
            }
        }
    }

    // ---------- 列表 diff：先对齐头尾，再处理中间的乱序部分 ----------
    /**
     * 最长递增子序列（LIS，真实 Vue 同款 O(n log n) 解法）。
     * diff 第 5 步用它找出"本来就在正确位置、不需要移动"的最多节点，
     * 剩下的节点才需要 insert——这就是 Vue3 diff "最小化移动"的出处。
     *
     * 算法（贪心 + 二分 + 前驱回溯）：
     *   - result 维护"当前最长递增子序列的下标"（尾部替换用二分找位置，O(log n)）；
     *   - p[i] 记录"以 i 结尾的子序列里，i 的前一个元素下标"；
     *   - 末尾从 result 最后一个元素沿 p 一路回溯，把 result 还原成真正的子序列下标。
     *
     * @param {number[]} arr - 每一项的值（这里传 newIndexToOldIndexMap：0 表示"新节点没有旧对应，待挂载"，会被跳过）
     * @returns {number[]} 最长递增子序列的"下标"序列（升序）
     */
    function getSequence(arr) {
        const p = arr.slice() // p[i]：子序列中 i 的前驱下标（回溯用）
        const result = [0] // 存下标：当前 LIS 各位置对应的元素下标
        let i, j, u, v, c
        const len = arr.length
        for (i = 0; i < len; i++) {
            const arrI = arr[i]
            if (arrI !== 0) {
                // 0 是"新节点没有旧对应"的占位，不参与 LIS
                j = result[result.length - 1]
                if (arr[j] < arrI) {
                    // 比 result 尾部还大 → 直接接上，LIS 变长
                    p[i] = j
                    result.push(i)
                    continue
                }
                // 否则二分找 result 里第一个 >= arrI 的位置，替换之（让尾部更小，后面更容易接）
                u = 0
                v = result.length - 1
                while (u < v) {
                    c = (u + v) >> 1
                    if (arr[result[c]] < arrI) u = c + 1
                    else v = c
                }
                if (arrI < arr[result[u]]) {
                    if (u > 0) p[i] = result[u - 1] // 记前驱，末尾回溯时还原真实序列
                    result[u] = i
                }
            }
        }
        // 回溯：result 现在存的不是真实序列（有尾部替换过），沿 p 前驱链还原
        u = result.length
        v = result[u - 1]
        while (u-- > 0) {
            result[u] = v
            v = p[v]
        }
        return result
    }

    /**
     * 带 key 列表的最小化 diff（keyed 算法 + LIS 移动优化，真实 Vue 同款）。
     * 主线：头同步 → 尾同步 → 边界（纯增 / 纯删）→ 乱序（建索引 → 配对 → LIS → 倒序落 DOM）。
     * 每步的作用、每个属性的来龙去脉见函数体内逐行注释；逐步走读见《Vue3 原理》5.3.4。
     *
     * @param {Array} c1 - 旧孩子数组
     * @param {Array} c2 - 新孩子数组
     * @param {Object} container - 宿主容器
     * @param {Object|null} parentAnchor - 父级插入锚点（新列表末尾越界时的兜底锚点）
     */
    function patchKeyedChildren(c1, c2, container, parentAnchor) {
        // 游标与边界：
        //   i  —— 头同步指针，从 0 往右推
        //   e1 —— 旧列表末尾下标；e2 —— 新列表末尾下标（尾同步往左推）
        //   头尾各扫一轮之后，[i..e1] vs [i..e2] 夹住的中间段就是"乱序区"
        let i = 0
        const l2 = c2.length // 新列表总长：第 3 步算兜底锚点、第 5 步判越界都要用
        let e1 = c1.length - 1
        let e2 = l2 - 1

        // —— 第 1 步 从头同步（前缀匹配）：type + key 相同 → 就地 patch 复用。
        //    一旦不匹配立即停——"跳过不匹配的继续往后找同类"是第 4 步按 key 建索引的活，这里不做
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            i++
        }

        // —— 第 2 步 从尾同步（后缀匹配）：e1/e2 往左推，同理。
        //    "末尾追加 / 末尾不变"这类最常见场景，到这里就全部消化完了
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            e1--
            e2--
        }

        // —— 第 3 步 边界：一边先扫完了，中间段就是纯增或纯删，不用"认真 diff" ——
        if (i > e1 && i <= e2) {
            // 旧的中段先耗尽 → 新列表中间段全是新增。
            // 插入锚点 = 新列表里这批新增"后面的那个节点"（它已就位）；后面没有了 → 兜底父级锚点（末尾）
            const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
            while (i <= e2) {
                patch(null, c2[i], container, anchor) // n1 = null → 挂载
                i++
            }
            return
        }
        if (i > e2 && i <= e1) {
            // 新的中段先耗尽 → 旧列表中间段全是删除，逐个卸载
            while (i <= e1) {
                unmount(c1[i], true)
                i++
            }
            return
        }

        // —— 第 4 步 中间乱序（核心）：① 按 key 建索引 → ② 遍历旧区配对 → ③ 求 LIS ——
        // 乱序区起点：头尾同步后新旧列表的 i 相等，所以 s1 / s2 共用同一个 i
        const s1 = i
        const s2 = i

        // ① 按 key 建索引 keyToNewIndex：key → 它在新列表的下标（绝对下标）。
        //    目的：之后每个旧节点 O(1) 查一次就知道"我还在不在、在第几位"，
        //    免掉旧×新两两对比的 O(n²)；key 是 diff 的配对依据
        const keyToNewIndex = new Map()
        for (let j = s2; j <= e2; j++) {
            if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
        }

        // ② 遍历旧乱序区，产出 newIndexToOldIndexMap（下文简称 map）——
        //    一张"新列表乱序区每一格来自旧列表哪里"的登记表：
        //      下标 = 新列表乱序区的相对位置（0,1,2...）
        //      值   = 旧列表下标 + 1（+1 是为了把 0 让出来表示"这格是新增"），0 = 新增待挂载
        const toBePatched = e2 - s2 + 1 // 新乱序区要落的格子总数：闭区间 [s2..e2] 的元素个数 = 差 + 1。
        //                                map 必须一格不缺——LIS 和第 5 步都按它遍历
        const newIndexToOldIndexMap = new Array(toBePatched).fill(0) // 先全填 0 = "全是新增"，配对到再覆盖
        let moved = false // 只要出现一次"逆序配对"，就说明有节点要挪动——才值得算 LIS
        let maxNewIndexSoFar = 0 // 到目前为止配对到的最大新下标；拿它和当前比较，逆序立刻现形

        for (let j = s1; j <= e1; j++) {
            const prevChild = c1[j]
            // 没 key 的节点查不了表，退化成按下标硬对齐（s2 + 相对偏移）——
            // 这正是"用 index 当 key"时节点内容串位等怪现象的根源
            const newIndex = prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)

            if (newIndex === undefined || newIndex > e2) {
                unmount(prevChild, true) // 查无（或越界）→ 新列表已经没有它 → 卸载
            } else {
                // 登记进 map：newIndex - s2 把绝对下标换算成乱序区相对位置；j + 1 = 来自旧列表第 j 位
                newIndexToOldIndexMap[newIndex - s2] = j + 1
                // 新下标一路递增 = 旧序与新序一致，这段节点谁都不用挪；
                // 一旦比 maxNewIndexSoFar 小（逆序）→ 有节点要挪，标记 moved
                if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
                else moved = true
                patch(prevChild, c2[newIndex], container, parentAnchor) // 还在 → 就地更新（内容同则 0 宿主操作）
            }
        }

        // ③ 求 LIS（最长递增子序列，贪心 + 二分，O(n log n)）：
        //    map 里"值递增"的段 = 旧序与新序一致的节点——它们本来就在正确位置，不用挪。
        //    LIS 把"必须挪"的节点数压到最少；顺序完全没变时 moved = false，这里直接跳过
        const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
        let seqIdx = increasingNewIndexSequence.length - 1 // 从 LIS 末尾往前配对

        // —— 第 5 步 从后往前遍历新乱序区，落 DOM：mount 新增 / insert 挪位 / LIS 命中跳过 ——
        //    为什么从后往前：后一个节点的 el 要先就位，才能当前一个节点的插入锚点
        for (let j = toBePatched - 1; j >= 0; j--) {
            const nextIndex = s2 + j // 乱序区相对位置 → 新列表绝对下标
            const nextChild = c2[nextIndex]
            // 插入锚点 = 右邻居的 el（头尾同步 + 前序节点就位后天然正确）；乱序区右边界外 → 兜底 parentAnchor
            const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
            if (newIndexToOldIndexMap[j] === 0) {
                patch(null, nextChild, container, anchor) // map = 0 → 旧列表没有 → 新增挂载
            } else if (moved) {
                // seqIdx < 0：LIS 已全部配对完；j !== LIS[seqIdx]：当前格不在 LIS 里 → 挪到正确位置
                if (seqIdx < 0 || j !== increasingNewIndexSequence[seqIdx]) {
                    hostInsert(nextChild.el, container, anchor)
                } else {
                    seqIdx-- // LIS 命中：本来就在正确位置 → 原地不动（这就是 LIS 的意义）
                }
            }
        }
    }

    // ---------- 组件 ----------
    /**
     * 组件的挂载 / 更新分流：n1 为 null → mountComponent（全新实例），否则 updateComponent（复用实例）。
     *
     * @param {Object|null} n1 - 旧 VNode
     * @param {Object} n2 - 新 VNode
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     */
    function processComponent(n1, n2, container, anchor) {
        if (!n1) mountComponent(n2, container, anchor)
        else updateComponent(n1, n2)
    }

    /**
     * 挂载组件：建实例（parent 取自 currentScopeInstance）→ setupComponent 初始化
     * （执行 setup）→ setupRenderEffect 建渲染 effect（同步首跑即完成子树挂载）→
     * 统一执行 onMounted 钩子（此时子树一定挂载完，子组件的钩子先于父组件）。
     *
     * @param {Object} initialVNode - 组件 VNode（component 字段回填实例）
     * @param {Object} container - 宿主容器
     * @param {Object|null} anchor - 插入锚点
     *
     * @example
     *   // demo-app：根组件 VNode（type = { setup }，无 props 声明）挂进 #app：
     *   mountComponent(rootVNode, el, null)
     *   // → createComponentInstance（parent=null）→ setupComponent（setup 执行，4 个 ref 落定）
     *   // → setupRenderEffect（effect 首跑同步完成子树挂载）→ mounted 钩子统一执行
     */
    function mountComponent(initialVNode, container, anchor) {
        // parent 从 currentScopeInstance 取：组件更新 patch 子树时，它就是当前组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode, currentScopeInstance))
        setupComponent(instance)
        setupRenderEffect(instance, initialVNode, container, anchor, patch)
        // 生命周期：首次渲染 effect 是同步执行的，走到这里子树已挂载完，统一调用挂载钩子
        if (instance.isMounted) instance.mounted.forEach(hook => hook())
    }

    /**
     * 更新组件：实例与渲染 effect 全部复用，只换 vnode 引用。
     * props 与 slots 都没变就直接返回（父渲染不一定波及子）；
     * 变了则同步新 props / slots 再手动跑一次 update。
     *
     * @param {Object} n1 - 旧组件 VNode
     * @param {Object} n2 - 新组件 VNode
     */
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component)
        instance.vnode = n2
        // props 与 slots 都没变就不必重渲染子组件
        if (!hasPropsChanged(n1.props, n2.props) && n1.children === n2.children) return
        updateProps(instance, n2.props)
        initSlots(instance, n2.children)
        instance.update()
    }

    // ---------- 卸载 ----------
    /**
     * 卸载一个 VNode（递归）：按类型分流——
     *   Fragment：先递归卸载孩子，再移除首尾两个锚点节点；
     *   组件：先执行 unmounted 钩子、再停掉渲染 effect（顺序反了会内存泄漏：
     *   effect 还活着就会继续响应数据变化），最后递归卸载它的子树；
     *   元素：先递归卸载数组孩子（子组件的钩子与 effect.stop 都靠这一步触发），
     *   再移除自己的宿主节点。
     *
     * @param {Object} vnode - 要卸载的 VNode
     * @param {boolean} doRemove - 是否真的从 DOM 摘除（false 只递归触发钩子，用于"换个容器"场景）
     *
     * @example
     *   // 分支① 组件：点「卸载」→ app.unmount → unmount(rootVNode, true)
     *   unmount(componentVNode, true) // → unmounted 钩子 → effect.stop()（退订依赖）→ 递归卸子树
     *   // 分支② Fragment：subTree 夹着 4 个顶层节点
     *   unmount(fragmentVNode, true) // → 孩子逐个递归摘除 → 最后摘首尾两个锚点
     *   // 分支③ 元素：p / button / li 走到这
     *   unmount(elementVNode, true) // → 数组孩子先递归卸载 → hostRemove 摘掉自己
     */
    function unmount(vnode, doRemove) {
        const { type, shapeFlag } = vnode

        if (type === Fragment) {
            unmountChildren(vnode.children, doRemove)
            if (doRemove) {
                hostRemove(vnode.el)
                hostRemove(vnode.anchor)
            }
            return
        }

        if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            if (vnode.component && vnode.component.update) {
                // 生命周期：先执行卸载钩子，再停掉渲染 effect（否则依赖还在、更新还会来——内存泄漏）
                vnode.component.unmounted.forEach(hook => hook())
                vnode.component.update.effect.stop()
            }
            unmount(vnode.component.subTree, doRemove)
            return
        }

        // 元素：先递归卸载孩子（子组件的 unmounted 钩子、渲染 effect 的 stop 都靠这一步），再移除自己
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) unmountChildren(vnode.children, doRemove)
        if (doRemove) hostRemove(vnode.el)
    }

    /**
     * 批量卸载一组孩子。
     *
     * @param {Array} children - VNode 数组
     * @param {boolean} doRemove - 是否从 DOM 摘除
     */
    function unmountChildren(children, doRemove) {
        for (const child of children) unmount(child, doRemove)
    }

    /**
     * 生成 createApp 工厂：闭包住本渲染器的 render，
     * mount 时把根组件包成 VNode 渲进容器，返回根实例的代理（可从外部访问状态）。
     *
     * @returns {Function} createApp(rootComponent, rootProps) → { mount(rootContainer) }
     */
    function createAppAPI() {
        return function createApp(rootComponent, rootProps = null) {
            return {
                mount(rootContainer) {
                    const vnode = createVNode(rootComponent, rootProps)
                    render(vnode, rootContainer)
                    return vnode.component.proxy
                }
            }
        }
    }

    return { render, createApp: createAppAPI(), patch, unmount }
}
