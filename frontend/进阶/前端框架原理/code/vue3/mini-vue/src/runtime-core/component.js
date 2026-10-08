/**
 * 组件：把 setup 的返回值、render 函数、实例代理串起来
 *
 * 最重要的一处是 setupRenderEffect —— 组件的渲染函数被包进一个 effect：
 *   1. 首次执行时说明组件"挂载"，patch(null, subTree)
 *   2. 之后依赖变化时说明"更新"，patch(prevSubTree, subTree)
 *   3. scheduler 把更新排进微任务队列，所以一轮里改多次状态只渲染一次
 */

const { isObject, isFunction } = require('../shared/index')
const { effect } = require('../reactivity/effect')
const { proxyRefs } = require('../reactivity/ref')
const { shallowReadonly } = require('../reactivity/reactive')
const { initProps, initSlots } = require('./componentProps')
const { normalizeVNode } = require('./vnode')
const { queueJob } = require('./scheduler')

function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        propsRaw: {},
        attrs: {},
        slots: {},
        setupState: {},
        ctx: {},
        isMounted: false,
        subTree: null,
        update: null,
        proxy: null
    }
    instance.ctx = { _: instance }
    // emit：把子组件的 this.$emit('change', 1) 转成父组件传下来的 onChange
    instance.emit = (event, ...args) => {
        const handler = (instance.vnode.props || {})[`on${event[0].toUpperCase()}${event.slice(1)}`]
        if (handler) handler(...args)
    }
    return instance
}

function setupComponent(instance) {
    initProps(instance, instance.vnode.props)
    initSlots(instance, instance.vnode.children)
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    // 先建代理：render 里的 this.xxx 就是从这里取的
    instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers(instance))

    const { setup } = instance.type
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
            slots: instance.slots
        })
        handleSetupResult(instance, setupResult)
    }
    finishComponentSetup(instance)
}

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

function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult // setup 直接返回 render 函数
    } else if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult) // 解包 ref，模板里不用写 .value
    }
}

function finishComponentSetup(instance) {
    if (!instance.render) instance.render = instance.type.render
}

function renderComponentRoot(instance) {
    const { render, proxy } = instance
    return normalizeVNode(render.call(proxy, proxy))
}

// 父组件重新渲染后发现 props / slots 变了，才需要通知子组件重渲染
function hasPropsChanged(prevProps = {}, nextProps = {}) {
    const nextKeys = Object.keys(nextProps)
    if (nextKeys.length !== Object.keys(prevProps).length) return true
    return nextKeys.some(key => nextProps[key] !== prevProps[key])
}

function updateProps(instance, nextProps) {
    const raw = instance.propsRaw
    for (const key of Object.keys(nextProps)) raw[key] = nextProps[key]
    for (const key of Object.keys(raw)) {
        if (!(key in nextProps)) delete raw[key]
    }
}

function setupRenderEffect(instance, initialVNode, container, anchor, patch) {
    const componentUpdateFn = () => {
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
    }

    // scheduler 是关键：数据变化不会立刻渲染，只把 update 排进微任务队列
    instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })
}

module.exports = {
    createComponentInstance,
    setupComponent,
    setupRenderEffect,
    renderComponentRoot,
    hasPropsChanged,
    updateProps
}
