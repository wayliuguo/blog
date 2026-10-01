'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { renderRuntime } = require('./runtime.cjs')

// emit 阶段：把模块图渲染成产物并写盘。
// webpack 里这一步由 Compilation.createChunkAssets 渲染 + Compiler.emitAssets 落盘，
// 产物先登记进 compilation.assets（内存里的清单），再写到 output.path。
// 之后注册的插件（如 EmitListPlugin）就能在 emit 钩子里读到这份清单。

/**
 * @param {import('./compilation.cjs').Compilation} compilation - 已 seal 的编译容器
 * @param {{output:{path:string, filename:string}}} options - 构建配置
 * @returns {string} 产物的绝对路径
 */
function emitAssets(compilation, options) {
    const content = renderRuntime(compilation)
    const outFile = path.join(options.output.path, options.output.filename)

    fs.mkdirSync(options.output.path, { recursive: true })
    fs.writeFileSync(outFile, content)

    compilation.assets[options.output.filename] = content
    return outFile
}

module.exports = { emitAssets }