import { createVNode } from './vnode'

export function createAppAPI(render) {
    // 根据哪个组件哪个属性来创建应用
    return function createApp(rootComponent, rootProps) {
        const app = {
            _props: rootProps,
            _component: rootComponent,
            _container: null,
            // 挂载的容器
            mount(container) {
                // 1. 根据组件创建虚拟节点
                // 2.将虚拟节点和容器获取到后调用render方法进行渲染

                // 创造虚拟节点
                const vnode = createVNode(rootComponent, rootProps)

                // 调用 render
                render(vnode, container)

                app._container = container
            }
        }
        return app
    }
}
