// ============================================================
// mini-react/dom —— 宿主环境 DOM 操作（commit 阶段的"手"）
// 对应 React 源码包：packages/react-dom（ReactFiberConfigDOM：createInstance、
//                  commitUpdate、insertBefore 等宿主操作 + 属性 diff）
// 被依赖：reconciler.js（render 阶段借走 createInstance/setInitialProperties）、
//        index.js（commit 阶段借走全部插入/删除/更新操作）
// 职责：
//   ① 实例创建：createElement / createTextNode
//   ② 插入与移除：appendChild / insertBefore / removeChild（commitPlacement 等调用）
//   ③ 属性：初始铺属性（completeWork 时节点还游离在文档外）+ 更新时逐项 diff
// 建议断点：commitUpdate（看"旧属性表 vs 新属性表"的 diff 三步）；
//          setInitialProperties（看事件 / class / style / 表单 property 的分派）
// ============================================================

/** 事件属性识别：onClick / onChange……（on 后跟大写才是事件，避开 online 这类巧合） */
const isEventKey = key => key.length > 2 && key[0] === 'o' && key[1] === 'n' && key[2] >= 'A' && key[2] <= 'Z'

// 这些属性写 property 才对：value 的 attribute 只影响初始值，
// checked / selected / disabled 的 attribute 也不会实时反映状态
const SHOULD_USE_PROPERTY = /^(value|checked|selected|disabled|muted)$/

// ============================================================
// 实例创建（源码 ReactFiberConfigDOM.ts 的 createInstance / createTextInstance）
// ============================================================
/**
 * 创建宿主元素实例。
 *
 * @param {string} type - 标签名
 * @returns {HTMLElement}
 */
function createInstance(type) {
    return document.createElement(type)
}

/**
 * 创建文本实例。
 *
 * @param {string} content - 文本内容
 * @returns {Text}
 */
function createTextInstance(content) {
    return document.createTextNode(content)
}

// ============================================================
// 插入与移除（源码 insertBefore / appendChildToContainer / removeChildFromContainer）
// ============================================================
/**
 * 追加孩子。
 *
 * @param {HTMLElement} parent - 宿主实例或容器
 * @param {Node} child
 */
function appendChild(parent, child) {
    parent.appendChild(child)
}

/**
 * 插到 before 之前——"移动"与"插入"在 DOM 层是同一个动作，
 * 这就是为什么复用节点的移动也记 Placement 标记。
 *
 * @param {HTMLElement} parent
 * @param {Node} child
 * @param {Node} before - 锚点（必须已是 parent 的孩子）
 */
function insertBefore(parent, child, before) {
    parent.insertBefore(child, before)
}

/**
 * 移除孩子（commitDeletion 找到宿主父节点后调用）。
 *
 * @param {HTMLElement} parent
 * @param {Node} child
 */
function removeChild(parent, child) {
    parent.removeChild(child)
}

/**
 * 清空容器（createRoot().unmount() 用）。
 *
 * @param {HTMLElement} container
 */
function clearContainer(container) {
    container.textContent = ''
}

// ============================================================
// 属性：初始铺设（源码 finalizeInitialChildren）
// ============================================================
/**
 * 初始挂载时一次性铺属性。children 不在这里——孩子是独立的 fiber，
 * 由 commit 阶段负责插入（这也是"属性"与"结构"两条线的分界）。
 *
 * @param {HTMLElement} instance - 已创建但尚未插入文档的元素
 * @param {Object} props - 元素属性
 *
 * @example
 *   setInitialProperties(el, { className: 'item', onClick: fn, id: 'x' })
 */
function setInitialProperties(instance, props) {
    for (const key in props) {
        if (key === 'children') continue
        setProperty(instance, key, props[key], undefined)
    }
}

// ============================================================
// 属性：更新 diff（源码 commitUpdate → updateProperties）
// ============================================================
/**
 * 更新属性：拿"旧属性表 vs 新属性表"做三步 diff。
 * ① 旧的没了 → 移除；② 新的多了/变了 → 写入；③ 值没变的键一律不碰。
 *
 * @param {HTMLElement} instance - 复用的 DOM 实例
 * @param {Object} prevProps - 上一轮属性（fiber.alternate.props）
 * @param {Object} nextProps - 本轮属性（fiber.props）
 *
 * @example
 *   commitUpdate(el, { className: 'a', onClick: f1 }, { className: 'b', onClick: f1 })
 *   // → 只写 className，事件 f1 相同不重新绑定
 */
function commitUpdate(instance, prevProps, nextProps) {
    // ① 移除：旧有新无（或新值为 null/undefined/false 的清除语义）
    for (const key in prevProps) {
        if (key === 'children') continue
        const nextValue = nextProps[key]
        if (nextValue === undefined) {
            removeProperty(instance, key, prevProps[key])
        } else if (nextValue === null || nextValue === false) {
            removeProperty(instance, key, prevProps[key])
        }
    }
    // ② 新增 / 更新：值不同才动（事件函数也要换——闭包里捕获的 state 得是新值）
    for (const key in nextProps) {
        if (key === 'children') continue
        const prevValue = prevProps[key]
        const nextValue = nextProps[key]
        if (nextValue === undefined || nextValue === null || nextValue === false) continue // 上一步已处理
        if (nextValue !== prevValue) {
            setProperty(instance, key, nextValue, prevValue)
        }
    }
}

/**
 * 文本更新：HostText fiber 复用同一个 Text 节点，只改 nodeValue。
 *
 * @param {Text} textInstance
 * @param {string} newContent
 */
function commitTextUpdate(textInstance, newContent) {
    textInstance.nodeValue = newContent
}

// ============================================================
// 单个属性的写入 / 移除（源码 pushAttribute / pushStyle 等的运行时对应）
// ============================================================
/**
 * 写一个属性，按类别分派到最合适的 DOM API。
 * 顺序：事件 → className → style 对象 → 清除语义 → 表单 property → setAttribute。
 *
 * @param {HTMLElement} instance - 目标元素
 * @param {string} key
 * @param {*} value
 * @param {*} prevValue - 事件属性用它解绑旧回调；初始铺属性时为 undefined
 */
function setProperty(instance, key, value, prevValue) {
    if (isEventKey(key)) {
        const eventName = key.slice(2).toLowerCase() // onClick → click
        if (prevValue) instance.removeEventListener(eventName, prevValue)
        instance.addEventListener(eventName, value)
        return
    }
    if (key === 'className') {
        instance.className = value || ''
        return
    }
    if (key === 'style' && isObject(value)) {
        // 对象 style：逐条写入；旧有新无的条目清空（增量 diff 在 commitUpdate 层做，这里兜底清残留）
        if (isObject(prevValue)) {
            for (const styleName in prevValue) {
                if (!(styleName in value)) instance.style[styleName] = ''
            }
        }
        for (const styleName in value) instance.style[styleName] = value[styleName]
        return
    }
    if (value === null || value === undefined || value === false) {
        removeProperty(instance, key, prevValue)
        return
    }
    if (SHOULD_USE_PROPERTY.test(key)) {
        instance[key] = value // value/checked 等写 property，不写 attribute
        return
    }
    instance.setAttribute(key, value)
}

/**
 * 移除一个属性。事件要解绑；value/checked 这类要恢复 property 默认值。
 *
 * @param {HTMLElement} instance
 * @param {string} key
 * @param {*} prevValue - 旧值（事件解绑要用）
 */
function removeProperty(instance, key, prevValue) {
    if (isEventKey(key)) {
        if (prevValue) instance.removeEventListener(key.slice(2).toLowerCase(), prevValue)
        return
    }
    if (SHOULD_USE_PROPERTY.test(key)) {
        instance[key] = key === 'value' ? '' : false
        return
    }
    if (key === 'className') {
        instance.className = ''
        return
    }
    instance.removeAttribute(key)
}
