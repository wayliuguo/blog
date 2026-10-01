'use strict'

// Module：一个源文件（经「转换函数」处理后的结果）。
// webpack 里这一步由 loader 链完成，本实现退化成一根固定的 transpile。
class Module {
    constructor(id, filename, code, deps) {
        this.id = id
        this.filename = filename
        this.code = code
        this.deps = deps
    }
}

module.exports = { Module }