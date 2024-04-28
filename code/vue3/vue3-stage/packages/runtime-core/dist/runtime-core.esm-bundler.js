const isObject = value => typeof value === 'object' && value !== null
const isArray = Array.isArray
const isString = value => typeof value === 'string'
// 判断对象是否存在此属性
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key)

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

export { createRenderer }
//# sourceMappingURL=runtime-core.esm-bundler.js.map
