// 组件中所有方法

import { PublicInstanceProxyHandlers } from './PublicInstanceProxyHandlers'
import { ShapeFlags } from './shapeFlag'

export function createComponentInstance(vnode) {
    // 组件的实例
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        attrs: {},
        slots: {},
        ctx: {},
        data: {},
        setupState: {}, // 如果setup返回一个对象，这个对象会作为setupState
        isMounted: false // 表示这个组件是否挂载过了
    }
    instance.ctx = { _: instance } // instance.ctx._
    return instance
}

export function setupComponent(instance) {
    const { props, children } = instance.vnode

    // 根据 props 解析出 props 和 attrs， 将其放到 instance 上
    instance.props = props
    instance.children = children

    // 需要先看下当前组件是否有状态的组件
    const isStateful = instance.vnode.shapeFlag | ShapeFlags.STATEFUL_COMPONENT
    // 表示现在是一个带状态的组件
    if (isStateful) {
        // 调用当前实例的setup 方法，用setup的返回值填充setupState和对应的render方法
        setupStatefulComponent(instance)
    }
}

function setupStatefulComponent(instance) {
    // 1.代理-传递给render函数的参数
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers as any)
    // 2.获取组件的类型，拿到组件的setup方法
    const Component = instance.type
    const { setup } = Component
    const setupContext = createSetupContext(instance)
    setup(instance.prpos, setupContext)
    Component.render(instance.proxy)
}

function createSetupContext(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => {},
        expose: () => {}
    }
}
