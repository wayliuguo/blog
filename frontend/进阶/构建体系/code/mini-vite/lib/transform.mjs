// 转换阶段：只改「模块说明符」，不动其它代码。
//
// 这是 dev 侧最反直觉的一步 —— import 语句本身被**原样保留**，浏览器据此再发下一个 ESM 请求，
// 于是"一个模块一个文件"这个粒度被保住了，HMR 才有得做（打包器里这个粒度会消失）。
//
// 真实 Vite 的 vite:import-analysis 插件做同样的事，还额外处理：
//   相对导入 → 补全后缀、拼成浏览器能取的绝对 URL
//   裸导入   → /node_modules/.vite/deps/xxx.js（依赖预构建产物）

// 模块图的最小形态：只记录本轮 dev server 转换过哪些模块。
// 真实 Vite 的 module graph 节点上还挂 importers / importedModules，HMR 靠它逆推 accept 边界。
export const transformed = new Set()

// 匹配 import / export 语句里的模块说明符；捕获「关键字 + 引号」以便原地替换
const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g

/**
 * @param {string} id   - 模块的 URL 路径（如 '/src/main.js'），用作模块图里的节点 key
 * @param {string} code - 该模块的源码
 * @returns {{code:string}} 转换后的代码
 */
export function transform(id, code) {
    // 只有被浏览器请求到的模块才会走到这里 —— 这就是"按需转换"
    transformed.add(id)

    const out = code.replace(SPECIFIER_RE, (whole, keyword, quote, specifier) => {
        // 相对导入原样保留：浏览器会再发一个 ESM 请求，服务端到时再按需转换它
        if (specifier.startsWith('.')) return whole
        // 裸导入指向预构建前缀，对应真实 Vite 的 node_modules/.vite/deps
        return `${keyword}${quote}/@deps/${specifier}.js${quote}`
    })

    return { code: out }
}