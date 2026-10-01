'use strict'

// 转换阶段：把 ESM 转成 CJS（对应 webpack 的 loader/降级那一步；真实的 Babel/SWC 做的比这多得多）。
// 只处理本演示用到的四种写法：具名导入、默认导入、export function、export default。
// 用正则而不是 AST 是为了让「ESM 语法 → CJS 语义」的对应关系一眼可见。
function transpile(code, importPathToId) {
    // import { a, b } from './x'
    code = code.replace(/^\s*import\s+\{([^}]+)\}\s+from\s+'([^']+)';?\s*$/gm, (_, names, from) => {
        return `var { ${names
            .split(',')
            .map(s => s.trim())
            .join(', ')} } = require(${importPathToId(from)});`
    })
    // import def from './x'
    code = code.replace(/^\s*import\s+(\w+)\s+from\s+'([^']+)';?\s*$/gm, (_, name, from) => {
        return `var ${name} = require(${importPathToId(from)});`
    })
    // export default <expr>
    code = code.replace(/^\s*export\s+default\s+(.+)$/gm, 'module.exports = $1')
    // export function / export const → 去掉 export 关键字
    code = code.replace(/^\s*export\s+(function|const|let|var|class)\b/gm, '$1')
    return code
}

module.exports = { transpile }