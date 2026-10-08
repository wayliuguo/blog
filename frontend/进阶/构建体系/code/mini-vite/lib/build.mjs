// build 引擎：一次走完整张模块图，把所有模块拼成一个文件。
//
// 与 dev 引擎共用同一个插件容器——差别只在"处理哪些模块"：
//   dev   按 URL 按需转换，import 原样保留；
//   build 全量建图 + 拓扑排序 + 拼接，import 语句在拼接前被删掉。
//
// 打包用"scope hoisting 极简版"：按拓扑序把各模块代码摊平到一个作用域，
// 删掉 import 语句、去掉 export 关键字。真实 Rollup / Rolldown 会额外做重命名、
// 作用域分析、tree-shaking，这里只保留最小闭环。
// 对应真实 Vite 生产侧（Rollup / Rolldown）的建图 + 打包。
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'acorn'

/** 模块 id → 打印用的短名 */
export function label(id, root) {
    // \0 是不可见控制字符，打印时写成转义形式
    if (id.startsWith('\0')) return '\\0' + id.slice(1)
    if (id.startsWith('/@')) return id
    return path.relative(root, id).split(path.sep).join('/')
}

/** 从 index.html 里找入口：<script type="module" src="..."> */
export function findEntry(root) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8')
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/)
    if (!match) throw new Error('index.html 里找不到 <script type="module" src="...">')
    return path.join(root, match[1])
}

/**
 * 摊平一个模块：删掉 import 整条语句，去掉 export 关键字。
 * 只支持具名导出——export default / export * from 需要真正的作用域分析，超出最小实现。
 */
function flatten(code, id) {
    const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
    const cuts = []

    for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
            cuts.push({ start: node.start, end: node.end })
        } else if (node.type === 'ExportNamedDeclaration') {
            // export const x = … / export function f() …  → 只删 'export ' 关键字
            // export { a, b }                          → 整条删掉（a / b 已在同一作用域里）
            if (node.declaration) cuts.push({ start: node.start, end: node.declaration.start })
            else cuts.push({ start: node.start, end: node.end })
        } else if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportAllDeclaration') {
            throw new Error(`${label(id, process.cwd())}: mini 的 linker 只支持具名导出`)
        }
    }

    let out = code
    for (const c of cuts.sort((a, b) => b.start - a.start)) out = out.slice(0, c.start) + out.slice(c.end)
    return out.trim()
}

export async function build({ root, container, moduleGraph }) {
    await container.buildStart({})

    const entry = findEntry(root)
    const codeById = new Map()
    const visited = new Set()

    // 全量建图：与 dev 的区别就在这里——dev 只处理被请求到的模块，这里处理整张图
    async function visit(id) {
        if (visited.has(id)) return
        visited.add(id)
        const code = await container.load(id)
        if (code == null) throw new Error(`无法加载 ${id}`)
        codeById.set(id, await container.transform(code, id))
        moduleGraph.markTransformed(id)
        for (const dep of moduleGraph.get(id)?.imports ?? []) await visit(dep)
    }
    await visit(entry)

    // 拓扑排序：依赖在前、入口在后
    const order = moduleGraph.topoSort([entry])
    const parts = order.map(id => `// ---- ${label(id, root)} ----\n${flatten(codeById.get(id), id)}`)
    let code = parts.join('\n\n') + '\n'

    const chunk = { type: 'chunk', fileName: 'assets/index.js', isEntry: true, modules: order }
    code = await container.renderChunk(code, chunk, { format: 'es' })

    await container.buildEnd()
    return { code, chunk, entry, order }
}
