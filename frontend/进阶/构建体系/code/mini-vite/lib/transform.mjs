// import-analysis：把源码里的静态说明符解析成 id，并登记依赖。
//
// 对应真实 Vite 的 vite:import-analysis 插件。它做两件事：
//   1. 解析 —— 把 './helper.js' 这类说明符交给容器的 resolveId，拿到最终 id；
//   2. 改写 —— dev 侧把说明符换成浏览器能请求的 URL（build 侧不用改，因为打包时整条 import 会被删掉）。
// 顺手把依赖关系写进模块图，供 dev 逆推 HMR 边界、build 做拓扑排序。
//
// 不做（最小实现范围）：动态 import()、import.meta、?raw 之类的查询参数。
import { parse } from 'acorn'
import { toUrl } from './resolve.mjs'

export function createImportAnalysisPlugin({ command, root, resolve, moduleGraph }) {
    return {
        name: 'mini:import-analysis',
        // 排在用户 transform 之后：用户插件看到的是原始源码
        enforce: 'post',

        async transform(code, id) {
            if (!/\.[cm]?js$/.test(id)) return null

            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
            const deps = []
            const edits = []

            for (const node of ast.body) {
                const source = node.source // import ... from 'x' / export ... from 'x'
                if (!source) continue
                const resolved = await resolve(source.value, id)
                if (!resolved) continue
                deps.push(resolved)
                if (command === 'serve') {
                    edits.push({ start: source.start, end: source.end, text: JSON.stringify(toUrl(resolved, root)) })
                }
            }

            moduleGraph.setImports(id, deps)
            if (!edits.length) return null

            // 从后往前替换，避免前面的改写让后面的位置错位
            let out = code
            for (const e of edits.sort((a, b) => b.start - a.start)) {
                out = out.slice(0, e.start) + e.text + out.slice(e.end)
            }
            return out
        }
    }
}
