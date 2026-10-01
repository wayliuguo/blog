'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { rel } = require('./root.cjs')

// ---------- 1. 依赖解析：把 import 里的相对路径变成磁盘上的真实文件 ----------

/**
 * 把 import 语句里的裸字符串，解析成磁盘上真实存在的文件绝对路径。
 *
 * 是打包器的「寻址」步骤：拿到字符串 './greet.js'，算出它到底是谁。
 *
 * @param {string} specifier - import 里的模块标识，如 './greet.js' 或 'react'
 * @param {string} importer   - 引用者（当前模块）的绝对路径，作为相对路径的基准目录
 * @returns {string} 命中磁盘文件的绝对路径
 * @throws {Error} 裸模块（不以 . 开头）或三个候选文件都不存在时抛错
 */
function resolveId(specifier, importer) {
    // 只支持相对路径依赖；裸模块（node_modules 包）一律报错，第 5 篇的 @rollup/plugin-node-resolve 才处理
    if (!specifier.startsWith('.')) {
        throw new Error(`只支持相对路径依赖，遇到裸模块 ${specifier}（来自 ${rel(importer)}）`)
    }
    // 相对路径的基准是「引用者所在目录」，不是入口目录——这是必须带 importer 的原因
    const abs = path.resolve(path.dirname(importer), specifier)
    // 浏览器要求写全后缀，真实打包器会替我们补：./x → ./x.js → ./x/index.js
    for (const candidate of [abs, abs + '.js', path.join(abs, 'index.js')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    throw new Error(`找不到模块 ${specifier}（来自 ${rel(importer)}）`)
}

module.exports = { resolveId }