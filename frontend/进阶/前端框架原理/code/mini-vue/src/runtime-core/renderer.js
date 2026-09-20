/**
 * renderer：把 VNode 树变成宿主节点树
 *
 * 平台无关的秘密全在第一行：所有宿主操作都由调用方注入（createRenderer(options)）。
 * runtime-dom 注入浏览器 DOM 操作，测试注入假节点操作，runtime-core 一行都不用改。
 *
 * patch 的分发靠 ShapeFlags 位运算：
 *   ELEMENT  → processElement
 *   COMPONENT → processComponent
 * 文本 / 注释 / Fragment 走 switch，因为它们没有"元素还是组件"这个维度。
 */

const { ShapeFlags } = require('../shared/index')
const { Text, Fragment, Comment, isSameVNodeType, createVNode, normalizeVNode } = require('./vnode')
const {
    createComponentInstance,
    setupComponent,
    setupRenderEffect,
    hasPropsChanged,
    updateProps
} = require('./component')
const { initSlots } = require('./componentProps')

function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        createText: hostCreateText,
        createComment: hostCreateComment,
        setText: hostSetText,
        setElementText: hostSetElementText,
        insert: hostInsert,
        remove: hostRemove,
        nextSibling: hostNextSibling,
        patchProp: hostPatchProp
    } = options

    // ---------- 入口 ----------
    function render(vnode, container) {
        if (vnode == null) {
            if (container._vnode) unmount(container._vnode, true)
        } else {
            // 顶层也允许直接给数组 / 字符串：统一成 VNode 再进 patch
            vnode = normalizeVNode(vnode)
            patch(container._vnode || null, vnode, container, null)
        }
        container._vnode = vnode
    }

    function patch(n1, n2, container, anchor) {
        if (n1 === n2) return

        // 类型或 key 变了：没有复用的余地，拆掉重建
        if (n1 && !isSameVNodeType(n1, n2)) {
            anchor = hostNextSibling(n1.el)
            unmount(n1, true)
            n1 = null
        }

        const { type, shapeFlag } = n2
        switch (type) {
            case Text:
                processText(n1, n2, container, anchor)
                break
            case Comment:
                processComment(n1, n2, container, anchor)
                break
            case Fragment:
                processFragment(n1, n2, container, anchor)
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor)
                else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, anchor)
                }
        }
    }

    // ---------- 文本 / 注释 / Fragment ----------
    function processText(n1, n2, container, anchor) {
        if (!n1) {
            n2.el = hostCreateText(n2.children)
            hostInsert(n2.el, container, anchor)
        } else {
            const el = (n2.el = n1.el)
            if (n1.children !== n2.children) hostSetText(el, n2.children)
        }
    }

    function processComment(n1, n2, container, anchor) {
        if (!n1) {
            n2.el = hostCreateComment(n2.children || '')
            hostInsert(n2.el, container, anchor)
        } else {
            n2.el = n1.el
        }
    }

    function processFragment(n1, n2, container, anchor) {
        // Fragment 没有自己的节点，用两个空文本节点夹住自己这一段，作为插入锚点
        const startAnchor = n1 ? n1.el : hostCreateText('')
        const endAnchor = n1 ? n1.anchor : hostCreateText('')
        n2.el = startAnchor
        n2.anchor = endAnchor

        if (!n1) {
            hostInsert(startAnchor, container, anchor)
            hostInsert(endAnchor, container, anchor)
            mountChildren(n2.children, container, endAnchor)
        } else {
            patchChildren(n1, n2, container, endAnchor)
        }
    }

    // ---------- 元素 ----------
    function processElement(n1, n2, container, anchor) {
        if (!n1) mountElement(n2, container, anchor)
        else patchElement(n1, n2, container, anchor)
    }

    function mountElement(vnode, container, anchor) {
        vnode.el = hostCreateElement(vnode.type)

        for (const [key, value] of Object.entries(vnode.props || {})) {
            if (key === 'key') continue
            hostPatchProp(vnode.el, key, null, value)
        }

        // 位运算分发孩子：文本 / 数组
        const { shapeFlag, children } = vnode
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) hostSetElementText(vnode.el, children)
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) mountChildren(children, vnode.el, null)

        hostInsert(vnode.el, container, anchor)
    }

    function mountChildren(children, container, anchor) {
        for (const child of children) patch(null, child, container, anchor)
    }

    function patchElement(n1, n2, container, anchor) {
        const el = (n2.el = n1.el)
        const oldProps = n1.props || {}
        const newProps = n2.props || {}

        for (const [key, next] of Object.entries(newProps)) {
            if (key === 'key') continue
            const prev = oldProps[key]
            if (prev !== next) hostPatchProp(el, key, prev, next)
        }
        // 新 props 里没有的旧属性要摘掉
        for (const key of Object.keys(oldProps)) {
            if (key === 'key') continue
            if (!(key in newProps)) hostPatchProp(el, key, oldProps[key], null)
        }

        patchChildren(n1, n2, el, anchor)
    }

    function patchChildren(n1, n2, container, anchor) {
        const c1 = n1.children
        const c2 = n2.children
        const prevShapeFlag = n1.shapeFlag
        const { shapeFlag } = n2

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) unmountChildren(c1, true)
            if (c1 !== c2) hostSetElementText(container, c2)
            return
        }

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, '') // 文本换数组：先清空
                mountChildren(c2, container, anchor)
            } else {
                patchKeyedChildren(c1, c2, container, anchor)
            }
        }
    }

    // ---------- 列表 diff：先对齐头尾，再处理中间的乱序部分 ----------
    function patchKeyedChildren(c1, c2, container, parentAnchor) {
        let i = 0
        const l2 = c2.length
        let e1 = c1.length - 1
        let e2 = l2 - 1

        // 1. 从头同步：能对上的直接复用，一个属性都不多改
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            i++
        }

        // 2. 从尾同步
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (!isSameVNodeType(n1, n2)) break
            patch(n1, n2, container, parentAnchor)
            e1--
            e2--
        }

        // 3. 新列表更长：中间这一段全部是新增
        if (i > e1 && i <= e2) {
            const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
            while (i <= e2) {
                patch(null, c2[i], container, anchor)
                i++
            }
            return
        }

        // 4. 旧列表更长：中间这一段全部要删除
        if (i > e2 && i <= e1) {
            while (i <= e1) {
                unmount(c1[i], true)
                i++
            }
            return
        }

        // 5. 中间乱序：按 key 建索引，找出"哪些还在、哪些新增"
        const s1 = i
        const s2 = i
        const keyToNewIndex = new Map()
        for (let j = s2; j <= e2; j++) {
            if (c2[j].key !== null) keyToNewIndex.set(c2[j].key, j)
        }

        for (let j = s1; j <= e1; j++) {
            const prevChild = c1[j]
            // 没 key 的退化成按下标对应 —— 这正是"用 index 当 key"会出现的行为
            const newIndex = prevChild.key !== null ? keyToNewIndex.get(prevChild.key) : s2 + (j - s1)

            if (newIndex === undefined || newIndex > e2) {
                unmount(prevChild, true)
            } else {
                patch(prevChild, c2[newIndex], container, parentAnchor)
            }
        }

        // 从后往前把节点挪到正确位置
        // （真实 Vue 会先算最长递增子序列，跳过本来就在正确位置的那些，这里简化为逐个插）
        for (let j = e2; j >= s2; j--) {
            const nextChild = c2[j]
            const anchor = j + 1 < l2 ? c2[j + 1].el : parentAnchor
            if (nextChild.el === null) patch(null, nextChild, container, anchor)
            else hostInsert(nextChild.el, container, anchor)
        }
    }

    // ---------- 组件 ----------
    function processComponent(n1, n2, container, anchor) {
        if (!n1) mountComponent(n2, container, anchor)
        else updateComponent(n1, n2)
    }

    function mountComponent(initialVNode, container, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode))
        setupComponent(instance)
        setupRenderEffect(instance, initialVNode, container, anchor, patch)
    }

    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component)
        instance.vnode = n2
        // props 与 slots 都没变就不必重渲染子组件
        if (!hasPropsChanged(n1.props, n2.props) && n1.children === n2.children) return
        updateProps(instance, n2.props)
        initSlots(instance, n2.children)
        instance.update()
    }

    // ---------- 卸载 ----------
    function unmount(vnode, doRemove) {
        const { type, shapeFlag } = vnode

        if (type === Fragment) {
            unmountChildren(vnode.children, doRemove)
            if (doRemove) {
                hostRemove(vnode.el)
                hostRemove(vnode.anchor)
            }
            return
        }

        if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            // 组件卸载：先停掉它的渲染 effect，否则依赖还在、更新还会来（内存泄漏）
            if (vnode.component && vnode.component.update) vnode.component.update.effect.stop()
            unmount(vnode.component.subTree, doRemove)
            return
        }

        if (doRemove) hostRemove(vnode.el)
    }

    function unmountChildren(children, doRemove) {
        for (const child of children) unmount(child, doRemove)
    }

    function createAppAPI() {
        return function createApp(rootComponent, rootProps = null) {
            return {
                mount(rootContainer) {
                    const vnode = createVNode(rootComponent, rootProps)
                    render(vnode, rootContainer)
                    return vnode.component.proxy
                }
            }
        }
    }

    return { render, createApp: createAppAPI(), patch, unmount }
}

module.exports = { createRenderer }
