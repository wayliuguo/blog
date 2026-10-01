'use strict'

const fs = require('node:fs')
const acorn = require('acorn')
const { resolveId } = require('./resolve.cjs')

// ---------- 2. 建图：DFS 收集模块，id 按发现顺序分配，入口是 0 ----------

/** @type {Map<string, {id:number, file:string, code:string, ast:object, deps:Array<{spec:string,id:number}>}>} 绝对路径 → 模块记录 */
const modules = new Map()

/**
 * 深度优先收集模块：从一个入口开始，递归读文件、解析 AST、收集 import/export。
 *
 * 兼做去重与防环（见内部 modules.has 的注释），是理解整个打包器的核心。
 *
 * @param {string} file - 模块绝对路径
 * @returns {{id:number, file:string, code:string, ast:object, deps:Array}} 该模块的记录（已登记进 modules）
 */
function collect(file) {
    if (modules.has(file)) return modules.get(file)

    const code = fs.readFileSync(file, 'utf8')
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
    // id = modules.size：发现顺序即编号；入口最先 collect，所以 id 是 0
    const record = { id: modules.size, file, code, ast, deps: [] }
    // 先登记再递归：循环依赖（a → b → a）靠这一步终止（否则无限递归栈溢出）
    modules.set(file, record)

    for (const node of ast.body) {
        if (!node.source) continue
        if (!/^(Import|Export)/.test(node.type)) continue
        record.deps.push({ spec: node.source.value, id: collect(resolveId(node.source.value, file)).id })
    }
    return record
}

module.exports = { modules, collect }