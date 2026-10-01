'use strict'

const MagicString = require('magic-string')
const { rel } = require('./root.cjs')

// ---------- 3. 转换：ESM 语法 → CJS 的 require / exports ----------

/**
 * 把单个模块里所有顶层 ESM 语句（import/export）改写成 CJS。
 *
 * 用 magic-string 原地改写：import 改成 __require、export 就地删关键字并在末尾统一补 exports 赋值。
 * 其余代码一行不动、行号尽量不变（便于产物对照源码）。
 *
 * @param {{id:number, file:string, code:string, ast:object, deps:Array}} record - 某个模块的记录（collect 产物）
 * @returns {string} 转换后的模块代码文本
 * @throws {Error} 遇到 export ... from / export * from 时抛错（本迷你实现不支持）
 */
function transform(record) {
    const s = new MagicString(record.code)
    const tail = [] // 需要追加到模块末尾的 exports 赋值

    for (const node of record.ast.body) {
        if (node.type === 'ImportDeclaration') {
            // 用依赖图里登记好的 id 替代字符串，拼出最短的 __require(id)
            const id = record.deps.find(d => d.spec === node.source.value).id
            s.overwrite(node.start, node.end, renderImport(node, id))
        } else if (node.type === 'ExportDefaultDeclaration') {
            s.overwrite(node.start, node.declaration.start, 'exports.default = ')
            s.appendLeft(node.end, ';')
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
            // export const a = 1  →  const a = 1（末尾再补 exports.a = a）
            s.overwrite(node.start, node.declaration.start, '')
            for (const name of declaredNames(node.declaration)) tail.push(`exports.${name} = ${name}`)
        } else if (node.type === 'ExportNamedDeclaration') {
            if (node.source) throw new Error(`暂不支持 export ... from（${rel(record.file)}）`)
            s.overwrite(node.start, node.end, '')
            for (const sp of node.specifiers) tail.push(`exports.${sp.exported.name} = ${sp.local.name}`)
        } else if (node.type === 'ExportAllDeclaration') {
            throw new Error(`暂不支持 export * from（${rel(record.file)}）`)
        }
    }

    if (tail.length) s.append('\n' + tail.join('\n'))
    return s.toString()
}

/**
 * 把一条 import 语句映射成一段 __require 表达式，覆盖四种形式。
 *
 * @param {object} node - 对应的 ImportDeclaration AST 节点
 * @param {number} id   - 该依赖在依赖图中的编号（transform 已解析好的最短数字）
 * @returns {string} 拼好的 CJS 代码片段
 */
function renderImport(node, id) {
    const specs = node.specifiers
    if (specs.length === 0) return `__require(${id})` // 只为副作用

    const ns = specs.find(s => s.type === 'ImportNamespaceSpecifier')
    if (ns) return `const ${ns.local.name} = __require(${id})`

    const def = specs.find(s => s.type === 'ImportDefaultSpecifier')
    const named = specs
        .filter(s => s.type === 'ImportSpecifier')
        .map(s => (s.imported.name === s.local.name ? s.local.name : `${s.imported.name}: ${s.local.name}`))

    if (!def) return `const { ${named.join(', ')} } = __require(${id})`

    // default 与具名混用：先拿一份命名空间，再分别解构（__m3 是临时变量）
    const tmp = `__m${id}`
    const parts = [`const ${tmp} = __require(${id})`, `const ${def.local.name} = ${tmp}.default`]
    if (named.length) parts.push(`const { ${named.join(', ')} } = ${tmp}`)
    return parts.join('; ')
}

/**
 * 取出一条声明/导出语句里被导出的所有名字。
 * 处理 export const { a, b } = x 这种解构声明，要把每个名字都取出来。
 *
 * @param {object} decl - 声明节点（VariableDeclaration 或函数/类声明）
 * @returns {string[]} 被导出的标识符名字数组
 */
function declaredNames(decl) {
    if (decl.type === 'VariableDeclaration') return decl.declarations.flatMap(d => patternNames(d.id))
    return [decl.id.name]
}

/**
 * 从解构模式里递归取出所有绑定的标识符名字。
 *
 * @param {object} node - Identifier / ObjectPattern / ArrayPattern
 * @returns {string[]} 命中的标识符名
 */
function patternNames(node) {
    if (node.type === 'Identifier') return [node.name]
    if (node.type === 'ObjectPattern') return node.properties.flatMap(p => patternNames(p.value))
    if (node.type === 'ArrayPattern') return node.elements.filter(Boolean).flatMap(patternNames)
    return []
}

module.exports = { transform }