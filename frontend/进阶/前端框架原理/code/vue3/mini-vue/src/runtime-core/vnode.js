/**
 * VNode 与形状标记
 *
 * VNode 就是一个普通对象：描述"这里应该是什么"。shapeFlag 用位运算记录
 * "元素还是组件""孩子是文本还是数组"，patch 时按位与分发。
 */

const { ShapeFlags, isString, isObject, isArray } = require('../shared/index')

const Text = Symbol('Text')
const Fragment = Symbol('Fragment')
const Comment = Symbol('Comment')

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
    else if (isArray(children)) vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    else if (isObject(children)) vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN

    return vnode
}

function createVNode(type, props = null, children = null) {
    return createBaseVNode(type, props, children)
}

function createTextVNode(text = '') {
    const vnode = createBaseVNode(Text, null, String(text))
    vnode.shapeFlag = ShapeFlags.TEXT_CHILDREN
    return vnode
}

function createCommentVNode(text = '') {
    return createBaseVNode(Comment, null, text)
}

// 属性写法：h('div', { id: 'a' }, [ ... ]) 或 h(Component, { msg: 'hi' }, { default: () => ... })
const h = (type, props, children) => createVNode(type, props, children)

// 组件的 render 可能返回文本 / 数组 / null，统一成 VNode 再进 patch
function normalizeVNode(child) {
    if (child === null || child === undefined || typeof child === 'boolean') {
        return createCommentVNode('')
    }
    if (isArray(child)) return createVNode(Fragment, null, child.map(normalizeVNode))
    if (isObject(child)) return child
    return createTextVNode(child)
}

const isSameVNodeType = (n1, n2) => n1.type === n2.type && n1.key === n2.key

module.exports = {
    Text,
    Fragment,
    Comment,
    createVNode,
    createTextVNode,
    createCommentVNode,
    h,
    normalizeVNode,
    isSameVNodeType
}
