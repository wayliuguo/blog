// Rollup：PluginContext 实战 —— 构建期生成模块依赖图、检测循环依赖、产出清单文件
// 这就是依赖治理工具（rollup-plugin-visualizer / 依赖门禁）的核心：不改代码，只看图
// 运行：npm run rollup:context
const path = require('node:path')
const { rollup } = require('rollup')

const ROOT = __dirname
const short = (id) => path.relative(ROOT, id).replace(/\\/g, '/')

function depGraphPlugin({ failOnCycle = false } = {}) {
    return {
        name: 'dep-graph',

        // 模块解析完成后，它的导入关系就定了 —— 在这里收集
        moduleParsed(info) {
            this.getModuleInfo(info.id) // 此刻 info 已可查
        },

        async buildEnd() {
            // ① this.getModuleIds()：模块图里所有模块的 id
            const ids = [...this.getModuleIds()]

            // ② this.resolve()：用 Rollup 自己的解析器解析一个说明符（不是自己拼路径）
            const resolved = await this.resolve('./a.js', ids[0])
            console.log('  this.resolve("./a.js", entry) →', short(resolved.id))

            // ③ this.getModuleInfo()：读模块的导入/被导入关系
            const edges = []
            for (const id of ids) {
                for (const dep of this.getModuleInfo(id).importedIds) edges.push([short(id), short(dep)])
            }

            // ④ 环检测：DFS 找回头边
            const cycles = []
            const state = new Map()
            const stack = []
            const dfs = (id) => {
                state.set(id, 1)
                stack.push(id)
                for (const dep of this.getModuleInfo(id).importedIds) {
                    if (state.get(dep) === 1) {
                        cycles.push([...stack.slice(stack.indexOf(dep)), dep].map(short))
                    } else if (!state.get(dep)) {
                        dfs(dep)
                    }
                }
                stack.pop()
                state.set(id, 2)
            }
            for (const id of ids) if (!state.get(id)) dfs(id)

            // ⑤ this.warn / this.error：诊断带插件名前缀，error 会中断构建
            for (const c of cycles) this.warn(`循环依赖：${c.join(' → ')}`)
            if (cycles.length && failOnCycle) {
                this.error(`存在 ${cycles.length} 处循环依赖，构建终止`)
            }

            // ⑥ this.emitFile：额外产出一个文件（不占 chunk，走 asset 通道）
            this.emitFile({
                type: 'asset',
                fileName: 'module-graph.json',
                source: JSON.stringify({ modules: ids.map(short), edges, cycles }, null, 2)
            })

            console.log(`  模块 ${ids.length} 个 · 依赖边 ${edges.length} 条 · 环 ${cycles.length} 处`)
        }
    }
}

async function build(label, options) {
    console.log(`\n---- ${label} ----`)
    const warnings = []
    try {
        const bundle = await rollup({
            input: path.join(ROOT, 'src-cycle/entry.js'),
            plugins: [depGraphPlugin(options)],
            onwarn(w) {
                warnings.push(w.message)
            }
        })
        const { output } = await bundle.generate({ format: 'es' })
        const asset = output.find((o) => o.type === 'asset' && o.fileName === 'module-graph.json')
        console.log('  构建通过；emitFile 产出的 module-graph.json：', asset ? asset.source.length + ' 字节' : '（无）')
        console.log('  警告条数：', warnings.length)
        await bundle.close()
    } catch (err) {
        console.log('  构建被中断：', err.message)
    }
}

;(async () => {
    await build('① 只警告（failOnCycle: false）', { failOnCycle: false })
    await build('② 当门禁（failOnCycle: true）', { failOnCycle: true })
    console.log('\n---- 结论 ----')
    console.log('  this.getModuleIds / getModuleInfo 让你在构建期就能拿到完整的模块图')
    console.log('  this.emitFile 产出的是 asset，不进 chunk，适合放清单、报告、类型文件')
    console.log('  this.warn 只提示、this.error 直接中断 —— 同一个插件换个开关就是「报告」或「门禁」')
})()
