/**
 * 组件的 props 与 slots
 *
 * props 用 shallowReadonly 包一层：子组件改父组件传下来的值必须报错，
 * 但 props 本身是响应式的（父组件更新时子组件要跟着更新）。
 *
 * slots 是一组"返回 VNode 树的函数"，由父组件的 render 生成、子组件调用。
 */

const { ShapeFlags, isFunction } = require('../shared/index')
const { shallowReadonly } = require('../reactivity/reactive')

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

function initSlots(instance, children) {
    const { shapeFlag } = instance.vnode
    if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        instance.slots = normalizeObjectSlots(children)
    } else {
        instance.slots = {}
    }
}

// 把 { default: () => [...] } 里的每项都包成"一定返回数组"的函数
function normalizeObjectSlots(rawSlots) {
    const slots = {}
    for (const [name, slot] of Object.entries(rawSlots)) {
        slots[name] = isFunction(slot) ? slot : () => slot
    }
    return slots
}

module.exports = { initProps, initSlots }
