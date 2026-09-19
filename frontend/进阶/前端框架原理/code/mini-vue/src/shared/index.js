/**
 * 公共工具：类型判断与 ShapeFlags
 *
 * ShapeFlags 用一个整数表达"这个 VNode 是元素还是组件""孩子是文本还是数组"，
 * patch 时按位与就能分发到不同处理函数——比一堆 if 组合更省、也更贴近真实实现。
 */

const ShapeFlags = {
    ELEMENT: 1, // 0001
    STATEFUL_COMPONENT: 1 << 1, // 0010
    TEXT_CHILDREN: 1 << 2, // 0100
    ARRAY_CHILDREN: 1 << 3, // 1000
    SLOTS_CHILDREN: 1 << 4
}

const isObject = (val) => val !== null && typeof val === 'object'
const isArray = Array.isArray
const isString = (val) => typeof val === 'string'
const isFunction = (val) => typeof val === 'function'
const hasChanged = (value, oldValue) => !Object.is(value, oldValue)

const EMPTY_OBJ = {}
const extend = Object.assign

module.exports = {
    ShapeFlags,
    isObject,
    isArray,
    isString,
    isFunction,
    hasChanged,
    EMPTY_OBJ,
    extend
}
