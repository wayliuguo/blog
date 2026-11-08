'use strict'

// Compilation：一次编译的产物容器。Module / Chunk / Asset 三个对象都挂在它上面，
// 生命周期只覆盖「这一次构建」——watch 模式下每轮重新建一个。
class Compilation {
    constructor(compiler) {
        this.compiler = compiler
        this.modules = new Map() // id -> Module，模块图
        this.chunks = [] // 一组 Module 的集合（本实现只有一个 chunk）
        this.assets = {} // 最终写盘的文件：文件名 -> 内容
    }
}

module.exports = { Compilation }
