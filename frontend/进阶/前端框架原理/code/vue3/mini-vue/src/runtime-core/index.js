/**
 * runtime-core 模块出口
 *
 * 这一层完全不认识 DOM：createRenderer 由外部注入宿主操作，
 * 所以它能跑在浏览器、Canvas、小程序、甚至一个假的节点对象上。
 */

const { createRenderer } = require('./renderer')
const {
    createVNode,
    createTextVNode,
    createCommentVNode,
    h,
    normalizeVNode,
    Text,
    Fragment,
    Comment
} = require('./vnode')
const { queueJob, nextTick, flushJobs } = require('./scheduler')
const { createComponentInstance, setupComponent } = require('./component')

module.exports = {
    createRenderer,
    createVNode,
    createTextVNode,
    createCommentVNode,
    h,
    normalizeVNode,
    Text,
    Fragment,
    Comment,
    queueJob,
    nextTick,
    flushJobs,
    createComponentInstance,
    setupComponent
}
