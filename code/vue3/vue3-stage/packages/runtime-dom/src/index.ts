/* eslint-disable @typescript-eslint/no-explicit-any */

// 用户调用的是 runtime-dom -> runtime-core
// runtime-dom 核心就是提供domAPI方法, 其作用是为了解决平台（浏览器）差异
// 操作节点、操作属性的更新

import { extend } from '@vue/shared'
import { nodeOps } from './nodeOps'
import { patchProps } from './patchProps'
import { createRenderer } from '@vue/runtime-core'

// 节点操作就是增删改查
// 属性操作包含 添加、删除、更新（样式、类、事件、其他属性）

// 渲染时用到的所有方法
const rendererOptions = extend({ patchProps }, nodeOps)

// vue 中 runtime-core 提供了核心的方法，用来处理渲染的，内部会使用 runtime-dom中的api进行渲染
export function createApp(rootComponent, rootProps = null) {
    const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps)
    const { mount } = app
    app.mount = function (container) {
        // 清空容器的操作
        container = nodeOps.querySelector(container)
        container.innerHTML = ''
        // 将组件渲染成dom元素，进行挂载
        mount(container)
    }
    return app
}
