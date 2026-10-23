// ============================================================
// mini-vue/index —— 装配入口
// 对应 Vue3 源码：@vue/runtime-dom（浏览器宿主 + createRenderer 装配）
//                + 完整版 vue 入口（把编译 / 运行时 / 响应式三层 API 一起导出）
// 依赖：前四个文件必须先按序加载（shared → reactivity → compiler-core → runtime-core）
// 职责：
//   ① 浏览器宿主操作 nodeOps / patchProp（源码 src/runtime-dom/nodeOps.ts + patchProp.ts）
//   ② createRenderer({ ...nodeOps, patchProp }) 装出面向浏览器的 render / createApp
//   ③ 三层 API 聚合挂到 window.MiniVue（《Vue3 原理》一.1 协作关系的可运行证明）
// 说明：runtime-core 是"平台无关"的（只认宿主操作），本文件提供浏览器这一"平台"，
//       换掉 nodeOps / patchProp 就能跑在自定义渲染环境里。
// ============================================================

// ============================================================
// 浏览器宿主操作（源码 src/runtime-dom/nodeOps.ts + patchProp.ts）
// ============================================================
/**
 * 浏览器宿主的节点操作集合：createRenderer 所需的全部"碰 DOM"动作。
 * 每个方法都只做最薄的一层封装——具体何时调用、以什么顺序调用，
 * 全部由 runtime-core 的 renderer 决定。
 */
const nodeOps = {
    /** 创建元素节点（传入标签名，返回 HTMLElement）。 */
    createElement: tag => document.createElement(tag),
    /** 创建文本节点（独立于元素存在，如 Fragment 的锚点）。 */
    createText: text => document.createTextNode(text),
    /** 创建注释节点（null / false 的渲染占位）。 */
    createComment: text => document.createComment(text),
    /** 改文本节点内容（processText 复用旧节点时用）。 */
    setText: (node, text) => {
        node.nodeValue = text
    },
    /** 一次性改元素的全部文本孩子（TEXT_CHILDREN 更新路径）。 */
    setElementText: (el, text) => {
        el.textContent = text
    },
    /** 把 child 插到 parent 里 anchor 之前；anchor 为 null/nullish 追加到末尾。 */
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    /** 从 DOM 摘除节点（有父节点才摘，无则忽略）。 */
    remove: child => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
    /** 取节点的下一个兄弟节点——patch 换类型时用它确定"原位置"锚点。 */
    nextSibling: node => node.nextSibling
}

/**
 * 是否是事件属性（onXxx 且 X 为大写字母开头，如 onClick / onChange）。
 *
 * @param {string} key - 属性名
 * @returns {boolean}
 *
 * @example
 *   isOn('onClick') // → true
 *   isOn('online')  // → false（on 后面是小写，不是事件）
 */
const isOn = key => /^on[A-Z]/.test(key)

// 应该写成 property 而不是 attribute 的几个
// 这些属性走 setAttribute 有坑：value 的 attribute 只影响初始值、
// checked/selected/disabled/muted 的 attribute 也不会实时反映状态
const SHOULD_USE_PROPERTY = /^(value|checked|selected|disabled|muted)$/

/**
 * 浏览器的属性"打补丁"函数：按属性类别分派到最合适的 DOM API。
 * 判定顺序（自上而下命中即返回）：
 *   1. onXxx → 事件：先解绑旧回调再绑新回调（换函数不重复绑定）；
 *   2. class → 直接写 el.className（不用 setAttribute，性能与语义都更好）；
 *   3. style 对象 → 逐个样式属性写到 el.style；
 *   4. 表单/开关类（SHOULD_USE_PROPERTY）→ 写 property；
 *   5. 其余 → 值为 null/undefined/false 时 removeAttribute，否则 setAttribute。
 *
 * @param {HTMLElement} el - 目标元素
 * @param {string} key - 属性名
 * @param {*} prevValue - 旧值（事件属性用它解绑旧回调）
 * @param {*} nextValue - 新值（null/undefined/false 通常表示移除）
 *
 * @example
 *   patchProp(el, 'onClick', oldFn, newFn) // → el 上换成 newFn 监听 click
 *   patchProp(el, 'disabled', null, true)  // → el.disabled = true
 *   patchProp(el, 'title', 'a', null)      // → 移除 title 特性
 */
function patchProp(el, key, prevValue, nextValue) {
    if (isOn(key)) {
        const name = key.slice(2).toLowerCase() // onClick → click
        if (prevValue) el.removeEventListener(name, prevValue)
        if (nextValue) el.addEventListener(name, nextValue)
        return
    }

    if (key === 'class') {
        el.className = nextValue || ''
        return
    }

    if (key === 'style' && isObject(nextValue)) {
        for (const [prop, value] of Object.entries(nextValue)) el.style[prop] = value
        return
    }

    if (SHOULD_USE_PROPERTY.test(key)) {
        el[key] = nextValue
        return
    }

    if (nextValue === null || nextValue === undefined || nextValue === false) {
        el.removeAttribute(key)
    } else {
        el.setAttribute(key, nextValue)
    }
}

// ============================================================
// 装配：runtime-core（createRenderer）× 浏览器宿主 = 可用的 createApp / render
// ============================================================
// 解构出的 render / patch / unmount 已内置浏览器 nodeOps，可直接对真实 DOM 使用
const { render, createApp, patch, unmount } = createRenderer({ ...nodeOps, patchProp })

// ============================================================
// 聚合：三层 API 挂到 window.MiniVue（demo 与控制台统一入口）
// 三个文件层各导出一部分，加上本文件装配出的浏览器渲染器，构成完整闭环。
// ============================================================
window.MiniVue = {
    // 响应式层（reactivity.js）
    reactive,
    readonly,
    shallowReadonly,
    ref,
    computed,
    watch,
    effect,
    stop,
    isReactive,
    isReadonly,
    isRef,
    proxyRefs,
    describeDeps,
    // 编译层（compiler-core.js）
    compile,
    parse,
    transform,
    generate,
    toDisplayString,
    // 运行时层（runtime-core.js）
    h,
    createVNode,
    createRenderer,
    nextTick,
    onMounted,
    onUnmounted,
    provide,
    inject,
    // 装配完成的浏览器渲染器（本文件）
    render,
    patch,
    unmount,
    createApp,
    nodeOps,
    patchProp
}
