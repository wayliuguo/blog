/**
 * runtime-dom：把 runtime-core 和浏览器宿主操作装到一起
 *
 * 官方包之所以要分 runtime-core / runtime-dom 两个，就是为了这一行：
 *   createRenderer({ ...nodeOps, patchProp })
 * 换成别的 nodeOps，同一份核心代码就能渲染到别的平台。
 */

const { createRenderer, h, createVNode, nextTick } = require('../runtime-core/index')
const { nodeOps } = require('./nodeOps')
const { patchProp } = require('./patchProp')

const { render, createApp } = createRenderer({ ...nodeOps, patchProp })

// 让 h 在浏览器侧也可以直接用（模板编译产物也是调它）
module.exports = { createApp, render, h, createVNode, nextTick, nodeOps, patchProp }
