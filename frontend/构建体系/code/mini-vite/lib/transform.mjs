// import-analysis：把源码里的静态说明符解析成 id，并登记依赖。
//
// 对应真实 Vite 的 vite:import-analysis 插件。它做两件事：
//   1. 解析 —— 把 './helper.js' 这类说明符交给容器的 resolveId，拿到最终 id；
//   2. 记图 —— 把依赖关系写进模块图，供 build 做拓扑排序（依赖在前、入口在后）。
// 真实 Vite 在这一步还会改写说明符（dev 侧换成浏览器能请求的 URL）；build 侧不需要，
// 因为打包时整条 import 会被删掉，所以本实现只解析、不改代码。
//
// 不做（最小实现范围）：动态 import()、import.meta、?raw 之类的查询参数。
import { parse } from 'acorn'

export function createImportAnalysisPlugin({ resolve, moduleGraph }) {
    return {
        name: 'mini:import-analysis',
        // 排在用户 transform 之后：用户插件看到的是原始源码
        enforce: 'post',

        async transform(code, id) {
            if (!/\.[cm]?js$/.test(id)) return null

            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
            const deps = []

            for (const node of ast.body) {
                const source = node.source // import ... from 'x' / export ... from 'x'
                if (!source) continue
                const resolved = await resolve(source.value, id)
                if (resolved) deps.push(resolved)
            }

            moduleGraph.setImports(id, deps)
            return null
        }
    }
}
