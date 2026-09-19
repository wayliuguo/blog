/**
 * 元素属性 vs DOM 属性 vs 事件
 *
 * 这三种东西长得像，写起来完全不同：
 *   · onClick 这种是"事件"，要用 addEventListener，且更新时要先摘掉旧的
 *   · class / style / value / checked 这些对应 DOM 上的同名属性（property）
 *   · 其余才走 setAttribute
 *
 * 只做 setAttribute 会在 value、checked 这类"受控属性"上出现"数据变了但界面不动"。
 */

const { isObject } = require('../shared/index')

const isOn = (key) => /^on[A-Z]/.test(key)

// 应该写成 property 而不是 attribute 的几个
const SHOULD_USE_PROPERTY = /^(value|checked|selected|disabled|muted)$/

function patchProp(el, key, prevValue, nextValue) {
    if (isOn(key)) {
        const name = key.slice(2).toLowerCase()
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

module.exports = { patchProp, isOn }
