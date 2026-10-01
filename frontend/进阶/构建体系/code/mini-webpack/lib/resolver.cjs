'use strict'

const fs = require('node:fs')
const path = require('node:path')

// 解析依赖：把 import 里的相对路径变成磁盘上的模块绝对路径。
// 真实 webpack 走 enhanced-resolve：node_modules 逐级上溯、exports 条件导出、别名、后缀补全……
function createResolver() {
    return (fromFileName, request) => {
        if (!request.startsWith('.')) throw new Error(`仅支持相对依赖：${request}`)
        const sourceDir = path.dirname(fromFileName)
        // 尝试 .js / index.js 的 Node 解析规则
        for (const candidate of [path.join(sourceDir, request), path.join(sourceDir, request + '.js')]) {
            if (fs.existsSync(candidate)) return path.join(candidate)
        }
        throw new Error(`找不到模块：${request}（来自 ${fromFileName}）`)
    }
}

module.exports = { createResolver }