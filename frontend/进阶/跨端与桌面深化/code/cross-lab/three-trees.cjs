'use strict'
// Flutter 三棵树最小实现：Widget(配置) → Element(实例) → RenderObject(布局绘制)
// 验证核心契约：Widget 每帧重建很廉价，Element 按 runtimeType+key 复用，
// RenderObject 只有跨帧复用时才真正参与布局。零依赖，node three-trees.cjs
const assert = require('node:assert')

let elementReuse = 0
let renderCreate = 0

// ── Widget：不可变配置，每帧都可以整棵重建（廉价）──────────────
class Widget {
    constructor(type, key, props) {
        this.type = type
        this.key = key
        this.props = props
    }
}

// ── Element：Widget 的常驻实例，持有状态与生命周期 ─────────────
class Element {
    constructor(widget) {
        this.widget = widget
        this.renderObject = null
    }
    // Flutter 的 diff 发生在这里：runtimeType 与 key 都相同 → 复用 Element，
    // 只把新 Widget 挂上来（canUpdate 的语义）
    static canUpdate(old, next) {
        return old.widget.type === next.type && old.widget.key === next.key
    }
    update(next) {
        elementReuse++
        this.widget = next // 复用实例，只换配置
    }
}

// ── RenderObject：布局/绘制/命中测试，最重，跨帧复用 ───────────
class RenderObject {
    constructor(type) {
        this.type = type
        renderCreate++
    }
    layout() { return `layout:${this.type}` }
}

// ── 最小挂载器：模拟 build → diff → 复用/创建 ─────────────────
function mount(parentElement, widget) {
    if (!parentElement) {
        const el = new Element(widget)
        el.renderObject = new RenderObject(widget.type)
        return el
    }
    if (Element.canUpdate(parentElement, widget)) {
        parentElement.update(widget) // 复用 Element 与 RenderObject
        return parentElement
    }
    // 类型变了：Element 与 RenderObject 一起重建
    const el = new Element(widget)
    el.renderObject = new RenderObject(widget.type)
    return el
}

// ── 探针：同一个位置连续三帧 ─────────────────────────────────
let el1 = mount(null, new Widget('Text', 'title', { text: '订单 1001' }))
const ro1 = el1.renderObject

// 第二帧：同类型同 key，Widget 是新对象（每帧重建）—— Element/RenderObject 必须复用
const w2 = new Widget('Text', 'title', { text: '订单 1002' })
el1 = mount(el1, w2)
assert.ok(el1.widget === w2, 'Widget 换新（配置更新）')
assert.equal(el1.renderObject, ro1, 'RenderObject 跨帧复用')

// 第三帧：类型变了 —— 整链重建
el1 = mount(el1, new Widget('Image', 'title', {}))
assert.notEqual(el1.renderObject, ro1, '类型变化时 RenderObject 重建')

console.log(`探针    : 三帧渲染 → Element 复用 ${elementReuse} 次 · RenderObject 创建 ${renderCreate} 次（类型不变即复用）`)
console.log('三棵树契约成立：每帧重建 Widget 无成本，代价被 Element diff 与 RenderObject 复用吸收')
