'use strict'
// RN 原生映射器最小实现：JS 描述树 → diff → 原生控件指令（零依赖，node mapper.cjs）
// React Native 的本质不是「跑网页」，而是：JS 侧维护一棵描述树，
// 每次渲染 diff 出最小指令集（创建/更新/删除），由 Native 侧应用到真实控件上。
const assert = require('node:assert')

// ── JS 侧：用对象描述 UI（对应 React 元素树）──────────────────
function el(type, props, ...children) {
    return { type, props, children: children.flat() }
}

// ── Native 侧：真实控件宿主（模拟原生 ViewManager）────────────
class NativeHost {
    constructor() {
        this.nextId = 1
        this.nodes = new Map() // id -> { type, props, children: [] }
        this.ops = []          // 本轮应用到原生层的指令
        this.nodes.set(0, { type: 'root', props: {}, children: [] }) // 根宿主
    }
    create(type, parentId) {
        const id = this.nextId++
        this.nodes.set(id, { type, props: {}, children: [] })
        this.nodes.get(parentId).children.push(id)
        this.ops.push({ op: 'CREATE', id, type, parentId })
        return id
    }
    update(id, props) {
        Object.assign(this.nodes.get(id).props, props)
        this.ops.push({ op: 'UPDATE', id, props })
    }
    remove(id) {
        const node = this.nodes.get(id)
        for (const child of [...node.children]) this.remove(child)
        const parent = [...this.nodes.values()].find((n) => n.children.includes(id))
        parent.children.splice(parent.children.indexOf(id), 1)
        this.nodes.delete(id)
        this.ops.push({ op: 'REMOVE', id })
    }
}

// ── 映射器：diff 描述树与已挂载树，产出最小指令集 ─────────────
// 真实 RN 里这段逻辑在 Fabric 的 C++ 渲染器中；这里用几十行呈现其契约。
// mounted 节点携带已挂载的子树，实现跨帧对位比较。
function diffAndApply(host, parentId, element, mounted) {
    if (!mounted) {
        const id = host.create(element.type, parentId)
        host.update(id, element.props)
        const node = { id, type: element.type, props: { ...element.props }, children: [] }
        for (const child of element.children) node.children.push(diffAndApply(host, id, child, null))
        return node
    }
    if (mounted.type !== element.type) {
        host.remove(mounted.id) // 类型变化：整棵子树重建（React 的 remount 语义）
        return diffAndApply(host, parentId, element, null)
    }
    // 同类型：只下发改动的 props
    const changed = {}
    for (const [k, v] of Object.entries(element.props)) {
        if (mounted.props[k] !== v) changed[k] = v
    }
    if (Object.keys(changed).length) host.update(mounted.id, changed)
    mounted.props = { ...element.props }
    // 子级按位对齐：少则删，多则建，等则递归
    const next = element.children
    while (mounted.children.length > next.length) host.remove(mounted.children.pop().id)
    mounted.children = next.map((child, i) =>
        diffAndApply(host, mounted.id, child, mounted.children[i] ?? null)
    )
    return mounted
}

// ── 探针：两帧渲染，验证指令集是最小化的 ──────────────────────
const host = new NativeHost()
const frame1 = el('View', {}, el('Text', { text: '订单 1001' }), el('Text', { text: '¥399' }))
const tree = diffAndApply(host, 0, frame1, null) // 挂载树要保住，下一帧 diff 的基准
const firstOps = host.ops.length
assert.ok(host.ops.every((o) => o.op === 'CREATE' || o.op === 'UPDATE'), '首帧只有创建与初始化')

// 第二帧：只改一个文字 —— 指令集应该只有 1 条 UPDATE
host.ops = []
const frame2 = el('View', {}, el('Text', { text: '订单 1001' }), el('Text', { text: '¥429' }))
diffAndApply(host, 0, frame2, tree)
assert.equal(host.ops.length, 1, `第二帧只产生 1 条指令（实际 ${host.ops.length}）`)
assert.equal(host.ops[0].op, 'UPDATE')
assert.equal(host.ops[0].props.text, '¥429')

// 第三帧：类型变化（Text → Image）——旧子树整棵 REMOVE，新子树 CREATE
host.ops = []
const frame3 = el('View', {}, el('Image', { src: 'pay.png' }), el('Text', { text: '¥429' }))
diffAndApply(host, 0, frame3, tree)
assert.ok(host.ops.some((o) => o.op === 'REMOVE'), '类型变化触发子树移除')
assert.ok(host.ops.some((o) => o.op === 'CREATE' && o.type === 'Image'), '新类型子树创建')

console.log(`探针一  : 首帧 ${firstOps} 条指令（整树创建）· 第二帧 1 条指令（单点更新）· 第三帧 类型变化触发子树重建`)
console.log('RN 原生映射器契约成立：JS 重渲染 ≠ 重建原生控件，diff 后只下发改动的最小指令集')
