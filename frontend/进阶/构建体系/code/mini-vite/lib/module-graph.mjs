// 模块图：记录"谁引用了谁"。
//
// dev 侧靠它逆推 HMR 的 accept 边界（改了 helper.js，谁需要重新执行），
// build 侧靠它做拓扑排序（依赖在前、入口在后，才能安全地拼成一个文件）。
//
// 对应真实 Vite 的 ModuleGraph（src/node/server/moduleGraph.ts）。
export function createModuleGraph() {
    /** @type {Map<string, {id:string, imports:string[], importers:string[]}>} */
    const modules = new Map()
    /** 真正被转换过的模块。注意：出现在 modules 里 ≠ 被转换过——依赖关系会提前建节点 */
    const transformed = new Set()

    function ensure(id) {
        if (!modules.has(id)) modules.set(id, { id, imports: [], importers: [] })
        return modules.get(id)
    }

    return {
        modules,

        ensure,
        get: id => modules.get(id) || null,

        /** 引擎在 transform 完成后调用 */
        markTransformed: id => transformed.add(id),
        isTransformed: id => transformed.has(id),

        /** 由 import-analysis 在 transform 时调用：登记一个模块的直接依赖 */
        setImports(id, imports) {
            const mod = ensure(id)
            mod.imports = imports
            for (const dep of imports) {
                const depMod = ensure(dep)
                if (!depMod.importers.includes(id)) depMod.importers.push(id)
            }
        },

        getImporters: id => ensure(id).importers,

        /** 深度优先后序：依赖在前、入口在后 */
        topoSort(entryIds) {
            const ordered = []
            const seen = new Set()
            const visit = id => {
                if (seen.has(id)) return
                seen.add(id)
                for (const dep of ensure(id).imports) visit(dep)
                ordered.push(id)
            }
            for (const id of entryIds) visit(id)
            return ordered
        }
    }
}
