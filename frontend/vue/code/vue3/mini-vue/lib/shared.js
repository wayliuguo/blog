// ============================================================
// mini-vue/shared —— 类型判断与 ShapeFlags
// 对应 Vue3 源码包：@vue/shared（最底层，自身零依赖）
// 被依赖：reactivity.js / compiler-core.js / runtime-core.js / index.js
// 对应文档：《Vue3 原理》3.10 类型判断、4.3 shapeFlag
// 说明：本文件只放"人人都要用、自己却不依赖任何人"的工具，
//       所以它被所有其他模块引用而不会形成循环依赖。
// ============================================================

// ============================================================
// ShapeFlags：VNode 形状位标记（源码 src/shared/shapeFlags.ts）
// ============================================================
/**
 * VNode 的"形状"用二进制位来描述：每一位代表一种独立特征，可以按位组合。
 *
 * 为什么用位标记而不是普通字段？
 *   一个 VNode 可能同时是「组件 + slots 孩子」，普通枚举只能表达一种，
 *   位标记用一个数字就能同时携带多个布尔特征，判断时一次按位与（&）即可。
 *
 * @example
 *   // 元素 + 数组孩子：两个位叠加
 *   vnode.shapeFlag = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN // 1 | 8 = 9
 *   // 判断是否是数组孩子：非 0 即为真
 *   if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) { ... }
 *   // 1<<n 就是第 n 位为 1：1<<0=1(0001)、1<<1=2(0010)、1<<2=4(0100)、1<<3=8(1000)
 */
const ShapeFlags = {
    ELEMENT: 1, // 0001 —— 普通 DOM 元素（type 是字符串标签名）
    STATEFUL_COMPONENT: 1 << 1, // 0010 —— 有状态组件（type 是对象，含 setup/render）
    TEXT_CHILDREN: 1 << 2, // 0100 —— 孩子是一个字符串（纯文本）
    ARRAY_CHILDREN: 1 << 3, // 1000 —— 孩子是 VNode 数组
    SLOTS_CHILDREN: 1 << 4 // 0001 0000 —— 孩子是插槽对象 { default: () => [...] }
}

// ============================================================
// 类型判断工具（源码 src/shared/general.ts）
// ============================================================
/**
 * 判断一个值是否为对象（不含 null、不含数组之外的特判——数组也算对象）。
 *
 * 注意 `val !== null` 必须先判：因为 `typeof null === 'object'` 是 JS 的历史坑，
 * 不先排除的话 null 会被误判成对象，后续对它取属性直接崩。
 *
 * @param {*} val - 任意值
 * @returns {boolean} 是否为非 null 的对象（数组、普通对象、Proxy 都算）
 *
 * @example
 *   isObject({})        // → true
 *   isObject(null)      // → false（先排除了 null）
 *   isObject([1, 2])    // → true（数组也是对象）
 *   isObject('str')     // → false
 */
const isObject = val => val !== null && typeof val === 'object'
/**
 * 是否为数组。直接复用原生 Array.isArray，能跨 iframe/realm 正确判断。
 *
 * @param {*} val - 任意值
 * @returns {boolean} 是否为数组
 *
 * @example
 *   isArray([1])    // → true
 *   isArray('ab')   // → false（字符串虽然像列表但不是数组）
 */
const isArray = Array.isArray
/**
 * 是否为字符串。VNode 的 type 为字符串意味着它是普通元素标签。
 *
 * @param {*} val - 任意值
 * @returns {boolean} 是否为字符串
 *
 * @example
 *   isString('div')  // → true（h('div', ...) 里用它区分元素与组件）
 *   isString(42)     // → false
 */
const isString = val => typeof val === 'string'
/**
 * 是否为函数。用于判断组件的 setup、render、watch 的源与回调等。
 *
 * @param {*} val - 任意值
 * @returns {boolean} 是否为函数
 *
 * @example
 *   isFunction(() => {})          // → true
 *   isFunction(instance.render)   // → true
 *   isFunction({})                // → false
 */
const isFunction = val => typeof val === 'function'
/**
 * 判断新值与旧值是否"变了"。是 trigger 是否要唤醒 effect 的门槛。
 *
 * 为什么用 Object.is 而不是 !== ？
 *   Object.is 能正确处理两个边界：NaN 与 NaN 视为相等（不改就不触发）、
 *   +0 与 -0 视为不同。这与 Vue 源码 hasChanged 的实现一致。
 *
 * @param {*} value - 新值
 * @param {*} oldValue - 旧值
 * @returns {boolean} true 表示有变化（值得触发更新）
 *
 * @example
 *   hasChanged(1, 1)      // → false（ref.value = 同值时不会 trigger）
 *   hasChanged(NaN, NaN)  // → false（NaN 与自身相等，不触发）
 *   hasChanged(2, 1)      // → true
 */
const hasChanged = (value, oldValue) => !Object.is(value, oldValue)

/**
 * 空对象常量。真实 Vue 里有 `Object.freeze` 处理，这里教学版直接给一个空对象，
 * 供"没有就兜底成空对象"的场景使用（本 mini-vue 代码体中保留以对齐源码结构）。
 *
 * @type {Object}
 *
 * @example
 *   const options = instance.type.props || EMPTY_OBJ
 */
const EMPTY_OBJ = {}
/**
 * Object.assign 的别名。真实 Vue 用它做"扩展/合并对象"，
 * 起别名是为了语义清晰（extend 强调"把 b 摊到 a 上"）。
 *
 * @type {(target: Object, ...sources: Object) => Object}
 *
 * @example
 *   extend({ a: 1 }, { b: 2 }) // → { a: 1, b: 2 }
 */
const extend = Object.assign
