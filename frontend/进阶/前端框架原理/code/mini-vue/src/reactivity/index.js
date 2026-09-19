/**
 * reactivity 模块出口
 *
 * 这一层可以脱离 Vue 单独使用（真实 @vue/reactivity 也是独立包）：
 * 只负责"谁依赖了哪个对象的哪个属性"，不关心界面怎么更新。
 */

const { ReactiveEffect, effect, track, trigger, stop, describeDeps, resetDebug } = require('./effect')
const { reactive, readonly, shallowReadonly, isReactive, isReadonly, isProxy } = require('./reactive')
const { ref, isRef, unref, proxyRefs } = require('./ref')
const { computed } = require('./computed')

module.exports = {
    ReactiveEffect,
    effect,
    track,
    trigger,
    stop,
    describeDeps,
    resetDebug,
    reactive,
    readonly,
    shallowReadonly,
    isReactive,
    isReadonly,
    isProxy,
    ref,
    isRef,
    unref,
    proxyRefs,
    computed
}
