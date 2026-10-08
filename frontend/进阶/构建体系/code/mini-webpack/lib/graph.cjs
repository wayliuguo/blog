'use strict'

const fs = require('node:fs')
const path = require('node:path')
const acorn = require('acorn')

const { Module } = require('./module.cjs')
const { createResolver } = require('./resolver.cjs')

// make 阶段：从入口出发自顶向下解析依赖，把整张模块图填进 compilation.modules。
// 对应 webpack 里 EntryPlugin + NormalModuleFactory 干的活；本实现只认 ESM 静态 import。

/**
 * 解析入口字符串：'./src/entry.js' 与 './src/entry' 两种写法都接受。
 * 真实 webpack 的 resolve 有完整后缀补全，这里只补一个 .js。
 *
 * @param {string} context - 入口的相对基准目录（是目录，不是文件所在目录）
 * @param {string} entry   - 配置里的入口字符串
 * @returns {string} 入口文件的绝对路径
 */
function resolveEntry(context, entry) {
    const candidates = [entry, entry + '.js'].map(p => path.join(context, p))
    return candidates.find(fs.existsSync) || candidates[0]
}

/**
 * 深度优先建图：读文件 → 解析 AST → 收集相对依赖 → 递归。
 *
 * 两个要点：
 * 1. **先登记再递归** —— 循环依赖（a → b → a）靠这一步终止，否则无限递归栈溢出；
 * 2. **按文件去重** —— 同一个文件被多处 import 时只建一个 Module，id 复用。
 *
 * @param {import('./compilation.cjs').Compilation} compilation - 本次编译的容器
 * @param {{context:string, entry:string}} options - 构建配置
 */
function makeGraph(compilation, options) {
    const resolve = createResolver()
    const visited = new Set()

    const visit = fileName => {
        if (visited.has(fileName)) return
        visited.add(fileName)

        const code = fs.readFileSync(fileName, 'utf8')
        const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })

        // 只认静态 import；裸模块（不以 . 开头）交给 resolver 报错
        const deps = []
        for (const node of ast.body) {
            if (node.type !== 'ImportDeclaration') continue
            if (node.source.value.startsWith('.')) deps.push(resolve(fileName, node.source.value))
        }

        // id = modules.size：发现顺序即编号，入口最先登记所以是 0
        const module = new Module(compilation.modules.size, fileName, code, deps)
        compilation.modules.set(module.id, module)

        for (const dep of deps) visit(dep)
    }

    visit(resolveEntry(options.context, options.entry))
}

module.exports = { makeGraph, resolveEntry }
