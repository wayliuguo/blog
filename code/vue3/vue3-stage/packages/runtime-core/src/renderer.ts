// core 根据 rendererOptions 如何渲染
// createRenderer 目的是创建一个渲染器

import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from './shapeFlag'

export function createRenderer(rendererOptions) {
    const setupRenderEffect = () => {}

    // 挂载组件（组件的渲染流程）
    const mountComponent = (initialVNode, container) => {
        // 组件的渲染流程，最核心的就是调用 setup 拿到返回值，获取render 函数返回的结果来进行渲染
        // 1.先有实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode))
        // 2.需要的数据解析到实例上
        setupComponent(instance)
        // 3.创建一个 effect，让 render 函数执行
        setupRenderEffect()
    }

    const processComponent = (n1, n2, container) => {
        if (n1 == null) {
            // 组件没有上一次的虚拟节点
            mountComponent(n2, container)
        } else {
            // 组件更新流程
        }
    }

    const patch = (n1, n2, container) => {
        // 针对不同类型，做初始化操作
        const { shapeFlag } = n2
        if (shapeFlag & ShapeFlags.ELEMENT) {
            // 元素
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            // 组件
            processComponent(n1, n2, container)
        }
    }

    const render = (vnode, container) => {
        // core 核心, 根据不同的虚拟节点，创建对应的真实元素
        // 默认调用 render，可能是初始化流程
        patch(null, vnode, container)
    }
    return {
        createApp: createAppAPI(render)
    }
}
