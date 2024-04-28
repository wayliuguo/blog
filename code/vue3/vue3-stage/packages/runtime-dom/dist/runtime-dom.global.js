var VueRuntimeDOM = (function (exports) {
    'use strict'

    const isObject = value => typeof value === 'object' && value !== null
    const extend = Object.assign
    const isArray = Array.isArray
    const isString = value => typeof value === 'string'
    // 判断对象是否存在此属性
    const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key)

    const nodeOps = {
        // createElement, 不同的平台创建元素方式不同
        createElement: tagName => document.createElement(tagName),
        // 移除元素
        remove: child => {
            // 先找到其父元素
            const parent = child.parentNode
            if (parent) {
                parent.removeChild(child)
            }
        },
        // 如果参照物anchor为空，相当于appendChild
        insert: (child, parent, anchor = null) => {
            parent.insertBefore(child, anchor)
        },
        // 查询
        querySelector: selector => document.querySelector(selector),
        // 设置元素文本
        setElementText: (el, text) => (el.textContent = text),
        // 创建文本
        createText: text => document.createTextNode(text),
        // 设置节点内容
        setText: (node, text) => (node.nodeValue = text)
    }

    const patchAttr = (el, key, value) => {
        if (value === null) {
            el.removeAttribute(key)
        } else {
            el.setAttribute(key, value)
        }
    }

    const patchClass = (el, value) => {
        if (value == null) {
            value = ''
        }
        el.className = value
    }

    // 1.给元素缓存一个绑定事件的列表
    // 2.如果缓存中没有缓存过的，而且value有值，需要绑定方法并且缓存起来
    // 3.以前绑定过，value没有值，需要删除绑定方法与删除缓存
    // 4.前后都有，直接改变invoker 中 value 属性指向最新的事件即可
    const patchEvent = (el, key, value) => {
        // 对函数的缓存
        const invokers = el._vei || (el._vei = {})
        // 如果不存在
        const exists = invokers[key]
        if (value && exists) {
            // 需要绑定事件，而且还存在的情况下
            exists.value = value
        } else {
            const eventName = key.slice(2).toLowerCase()
            if (value) {
                // 要绑定事件且以前没有绑定过
                const invoker = (invokers[key] = createInvoker(value))
                el.addEventListener(eventName, invoker)
            } else {
                // 以前绑定过 当时没有value
                el.removeEventListener(eventName, exists)
                invokers[key] = undefined
            }
        }
    }
    // 一个元素绑定事件 addEventListener(fn1) 切换为 addEventListener(fn2)
    // 可以把 value = fn1, @click="value", 后续更改把 value = fn2 即可
    function createInvoker(value) {
        // 每次更新事件其实都是更改引用的value即可
        const invoker = e => {
            invoker.value(e)
        }
        invoker.value = value
        return invoker
    }

    const patchStyle = (el, prev, next) => {
        // 获取样式
        const style = el.style
        if (next == null) {
            el.removeAttribute('style')
        } else {
            if (prev) {
                // 老的里有新的有没有需要移除
                for (const key in prev) {
                    if (next[key] == null) {
                        style[key] = ''
                    }
                }
            }
            // 新的里面需要赋值到style上
            for (const key in next) {
                style[key] = next[key]
            }
        }
    }

    /* eslint-disable indent */
    const patchProps = (el, key, prevValue, nextValue) => {
        switch (key) {
            case 'class':
                patchClass(el, nextValue)
                break
            case 'style':
                patchStyle(el, prevValue, nextValue)
                break
            default:
                // 如果不是事件，才是属性
                if (/^on[^a-z]/.test(key)) {
                    // 事件就是添加和删除修改
                    patchEvent(el, key, nextValue)
                } else {
                    patchAttr(el, key, nextValue)
                }
                break
        }
    }

    // createVNode 创建虚拟节点
    // h('div', {style: {color: red}}, 'children') h方法和createApp类似
    const createVNode = (type, props, children = null) => {
        // 可以根据 type 来区分是组件 还是普通的元素
        // 根据type来区分是元素还是组件
        // 给虚拟节点加一个类型
        const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0
        const vnode = {
            // 一个对象来描述对应的内容，虚拟节点有跨平台的能力
            __v_isVnode: true,
            type,
            props,
            children,
            component: null,
            el: null,
            key: props && props.key,
            shapeFlag
        }
        normalizeChildren(vnode, children)
        return vnode
    }
    function normalizeChildren(vnode, children) {
        let type = 0
        if (children == null);
        else if (isArray(children)) {
            type = 16 /* ARRAY_CHILDREN */
        } else {
            type = 8 /* TEXT_CHILDREN */
        }
        vnode.shapeFlag |= type
    }

    function createAppAPI(render) {
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

    const PublicInstanceProxyHandlers = {
        get({ _: instance }, key) {
            // 取值时要访问 setUpState, props, data
            const { setupState, props, data } = instance
            if (key[0] == '$') {
                // 不能访问$开头的变量
                return
            }
            if (hasOwn(setupState, key)) {
                return setupState[key]
            } else if (hasOwn(props, key)) {
                return props[key]
            } else if (hasOwn(data, key)) {
                return data[key]
            } else {
                return undefined
            }
        },
        set({ _: instance }, key, value) {
            const { setupState, props, data } = instance
            if (hasOwn(setupState, key)) {
                setupState[key] = value
            } else if (hasOwn(props, key)) {
                props[key] = value
            } else if (hasOwn(data, key)) {
                data[key] = value
            }
            return true
        }
    }

    // 组件中所有方法
    function createComponentInstance(vnode) {
        // 组件的实例
        const instance = {
            vnode,
            type: vnode.type,
            props: {},
            attrs: {},
            slots: {},
            ctx: {},
            data: {},
            setupState: {},
            isMounted: false // 表示这个组件是否挂载过了
        }
        instance.ctx = { _: instance } // instance.ctx._
        return instance
    }
    function setupComponent(instance) {
        const { props, children } = instance.vnode
        // 根据 props 解析出 props 和 attrs， 将其放到 instance 上
        instance.props = props
        instance.children = children
        // 需要先看下当前组件是否有状态的组件
        const isStateful = instance.vnode.shapeFlag | 4 /* STATEFUL_COMPONENT */
        // 表示现在是一个带状态的组件
        if (isStateful) {
            // 调用当前实例的setup 方法，用setup的返回值填充setupState和对应的render方法
            setupStatefulComponent(instance)
        }
    }
    function setupStatefulComponent(instance) {
        // 1.代理-传递给render函数的参数
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
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

    // core 根据 rendererOptions 如何渲染
    function createRenderer(rendererOptions) {
        // 挂载组件（组件的渲染流程）
        const mountComponent = (initialVNode, container) => {
            // 组件的渲染流程，最核心的就是调用 setup 拿到返回值，获取render 函数返回的结果来进行渲染
            // 1.先有实例
            const instance = (initialVNode.component = createComponentInstance(initialVNode))
            // 2.需要的数据解析到实例上
            setupComponent(instance)
        }
        const processComponent = (n1, n2, container) => {
            if (n1 == null) {
                // 组件没有上一次的虚拟节点
                mountComponent(n2)
            }
        }
        const patch = (n1, n2, container) => {
            // 针对不同类型，做初始化操作
            const { shapeFlag } = n2
            if (shapeFlag & 1 /* ELEMENT */);
            else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
                // 组件
                processComponent(n1, n2)
            }
        }
        const render = (vnode, container) => {
            // core 核心, 根据不同的虚拟节点，创建对应的真实元素
            // 默认调用 render，可能是初始化流程
            patch(null, vnode)
        }
        return {
            createApp: createAppAPI(render)
        }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // 节点操作就是增删改查
    // 属性操作包含 添加、删除、更新（样式、类、事件、其他属性）
    // 渲染时用到的所有方法
    extend({ patchProps }, nodeOps)
    // vue 中 runtime-core 提供了核心的方法，用来处理渲染的，内部会使用 runtime-dom中的api进行渲染
    function createApp(rootComponent, rootProps = null) {
        const app = createRenderer().createApp(rootComponent, rootProps)
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

    exports.createApp = createApp

    Object.defineProperty(exports, '__esModule', { value: true })

    return exports
})({})
//# sourceMappingURL=runtime-dom.global.js.map
