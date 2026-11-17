'use strict'

const { Hook } = require('./hook.cjs')
const { Compilation } = require('./compilation.cjs')

// Compiler：一次构建的入口，只创建一次，持有配置与 hooks。
class Compiler {
    constructor(options) {
        this.options = options
        // webpack 上各种 compiler.hooks.xxx 的缩小版；重点演示 make(建图) → seal(封装) → emit(写盘)
        this.hooks = { make: new Hook(), seal: new Hook(), emit: new Hook(), done: new Hook() }
    }

    run() {
        const compilation = new Compilation(this)
        // ① make：从入口出发递归解析依赖，构建模块图
        this.hooks.make.call(compilation)
        // ② seal：冻结模块图，按规则分 chunk
        this.hooks.seal.call(compilation)
        // ③ emit：渲染 chunk 为 asset
        this.hooks.emit.call(compilation)
        this.hooks.done.call(compilation, compilation.assets)
    }
}

module.exports = { Compiler }
