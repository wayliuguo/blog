// webpack 深入：钩子流水探针
// 运行：npm run webpack:hooks          观测主配置默认场景（webpack.config.cjs，src 多入口）
//       npm run webpack:hooks -- --prod 观测主配置的生产插件场景（--env prod：Html/MiniCss/Terser/Copy）
// 作用：把一次构建里 compiler / compilation 上的钩子全部 tap 一遍，回答四个问题
//   1. 触发顺序是怎样的（压成 12 个阶段）
//   2. 每个阶段能拿到什么（assets / modules / chunks 计数）
//   3. processAssets 的 stage 顺序
//   4. 各钩子上都挂了谁（哪些插件注册了它）
// 说明：本脚本只读源码，构建产物写到系统临时目录，不会动 webpack-lab/dist
const os = require('node:os')
const path = require('node:path')
const webpack = require('webpack')

const PROD = process.argv.includes('--prod')
// webpack.config.cjs 是函数式配置：--prod 分支用 env.prod 切到"常见生产插件"场景（Html/MiniCss/Terser/Copy）
const loadConfig = require('./webpack.config.cjs')
const CONFIG = typeof loadConfig === 'function' ? loadConfig(PROD ? { prod: true } : {}) : loadConfig
const OUT_DIR = path.join(os.tmpdir(), PROD ? 'webpack-hook-probe-prod' : 'webpack-hook-probe')

// ── 阶段划分：钩子按所属阶段归类，未登记的进「其他」 ────────────────────
// 顺序即 PHASES 的书写顺序
const PHASES = [
    [
        '① 初始化',
        ['validate', 'environment', 'afterEnvironment', 'entryOption', 'afterPlugins', 'afterResolvers', 'initialize'],
        'compiler 实例就绪，配置已校验'
    ],
    [
        '② 启动',
        ['beforeRun', 'run', 'readRecords', 'normalModuleFactory', 'contextModuleFactory'],
        '开始一次构建，工厂对象下发'
    ],
    [
        '③ 编译前',
        ['beforeCompile', 'compile', 'thisCompilation', 'compilation'],
        'compilation 诞生，注册子钩子的最后时机'
    ],
    [
        '④ 建模块',
        [
            'make',
            'addEntry',
            'buildModule',
            'normalModuleLoader',
            'succeedModule',
            'failedModule',
            'succeedEntry',
            'failedEntry',
            'dependencyReferencedExports',
            'finishMake',
            'finishModules'
        ],
        '递归解析依赖，逐个跑 loader'
    ],
    ['⑤ 封装', ['seal', 'unseal', 'needAdditionalSeal'], '冻结模块图，此后不能再加模块'],
    [
        '⑥ 优化',
        [
            'optimizeDependencies',
            'afterOptimizeDependencies',
            'beforeChunks',
            'afterChunks',
            'optimize',
            'optimizeModules',
            'afterOptimizeModules',
            'optimizeChunks',
            'afterOptimizeChunks',
            'optimizeTree',
            'afterOptimizeTree',
            'optimizeChunkModules',
            'afterOptimizeChunkModules'
        ],
        'chunk 切分（SplitChunks 在这一段）'
    ],
    [
        '⑦ 编号',
        [
            'shouldRecord',
            'reviveModules',
            'beforeModuleIds',
            'moduleIds',
            'optimizeModuleIds',
            'afterOptimizeModuleIds',
            'reviveChunks',
            'beforeChunkIds',
            'chunkIds',
            'optimizeChunkIds',
            'afterOptimizeChunkIds',
            'recordModules',
            'recordChunks'
        ],
        '确定 module.id 与 chunk.id'
    ],
    [
        '⑧ 代码生成',
        [
            'optimizeCodeGeneration',
            'beforeModuleHash',
            'afterModuleHash',
            'beforeCodeGeneration',
            'afterCodeGeneration',
            'beforeRuntimeRequirements',
            'additionalModuleRuntimeRequirements',
            'additionalChunkRuntimeRequirements',
            'additionalTreeRuntimeRequirements',
            'runtimeModule',
            'afterRuntimeRequirements'
        ],
        '生成运行时代码'
    ],
    [
        '⑨ 哈希',
        ['beforeHash', 'chunkHash', 'contentHash', 'assetPath', 'fullHash', 'afterHash', 'recordHash'],
        '算 [contenthash]，文件名在此确定'
    ],
    [
        '⑩ 产物',
        [
            'beforeModuleAssets',
            'shouldGenerateChunkAssets',
            'beforeChunkAssets',
            'renderManifest',
            'moduleAsset',
            'chunkAsset',
            'additionalChunkAssets',
            'additionalAssets',
            'optimizeAssets',
            'processAssets',
            'optimizeChunkAssets',
            'afterOptimizeChunkAssets',
            'processAdditionalAssets',
            'afterOptimizeAssets',
            'afterProcessAssets'
        ],
        '产物逐个生成，增删改的最后窗口'
    ],
    [
        '⑪ 收尾',
        [
            'afterSeal',
            'afterCompile',
            'shouldEmit',
            'emit',
            'assetEmitted',
            'afterEmit',
            'needAdditionalPass',
            'emitRecords',
            'done'
        ],
        '写盘并完成本次构建'
    ]
]

const HOOK_TO_PHASE = new Map()
const NOTE = new Map()
for (const [phase, hooks, note] of PHASES) {
    for (const h of hooks) HOOK_TO_PHASE.set(h, phase)
    NOTE.set(phase, note)
}

// 实测：webpack 5.111 下这几个钩子已废弃（运行时会打 DeprecationWarning）
const DEPRECATED = new Set([
    'additionalChunkAssets',
    'optimizeChunkAssets',
    'afterOptimizeChunkAssets',
    'normalModuleLoader'
])

const rows = []
let seq = 0

// ── 取值辅助：判断参数是什么、能数出多少 ────────────────────────────────
function typeOf(v) {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (Array.isArray(v)) return `Array(${v.length})`
    if (v instanceof Set) return `Set(${v.size})`
    if (v instanceof Map) return `Map(${v.size})`
    if (typeof v === 'object' && v.constructor && v.constructor.name) return v.constructor.name
    if (typeof v === 'string') return `String("${v.slice(0, 14)}")`
    return typeof v
}

// 直接读 compilation 的当前状态：比从回调参数里猜更可靠，任何钩子都能显示同一份快照
function snapshot(comp) {
    if (!comp) return [null, null, null]
    const assets =
        typeof comp.getAssets === 'function' ? comp.getAssets().length : Object.keys(comp.assets || {}).length
    const modules = comp.modules ? comp.modules.size : null
    const chunks = comp.chunks ? comp.chunks.size : null
    return [assets, modules, chunks]
}

class HookProbePlugin {
    apply(compiler) {
        for (const name of Object.keys(compiler.hooks)) {
            this.tapHook(compiler.hooks[name], 'compiler', name)
        }
        compiler.hooks.thisCompilation.tap('HookProbe', compilation => {
            this.lastCompilation = compilation
            // thisCompilation 每个 compilation 都会触发，这里只注册一次，避免重复 tap
            if (this.tapped) return
            this.tapped = true
            for (const name of Object.keys(compilation.hooks)) {
                this.tapHook(compilation.hooks[name], 'compilation', name)
            }
        })
        compiler.hooks.done.tap('HookProbe', () => {
            this.report(compiler)
        })
    }

    // HookMap（如 compiler.hooks.resolverFactory）的 tap 要多传一个 key，跳过不观测
    tapHook(hook, scope, name) {
        if (!hook || typeof hook.tap !== 'function') return
        if (typeof hook.for === 'function') return
        try {
            hook.tap('HookProbe', (...args) => {
                seq += 1
                const [assets, modules, chunks] = snapshot(
                    scope === 'compiler'
                        ? this.lastCompilation
                        : args[0] && args[0].hooks
                        ? args[0]
                        : this.lastCompilation
                )
                rows.push({
                    seq,
                    scope,
                    name,
                    phase: HOOK_TO_PHASE.get(name) || '其他',
                    args: args.map(typeOf).join(', ') || '（无参）',
                    assets,
                    modules,
                    chunks
                })
            })
        } catch (e) {
            // 个别钩子不接受同步 tap，忽略即可，不影响主流程观测
        }
    }

    show(v) {
        return v === null || v === undefined ? '-' : String(v)
    }

    pad(s, n) {
        const w = String(s).length + (s.length - String(s).length) // 中文按 2 列估
        return String(s) + ' '.repeat(Math.max(1, n - w))
    }

    report(compiler) {
        const line = (s = '') => console.log(s)
        const hr = t => line(`\n──── ${t} ${'─'.repeat(Math.max(0, 56 - t.length * 2))}`)

        // 0. 明细：每个钩子一行，带回调参数类型与产物计数（供查字段用）
        if (process.argv.includes('--raw')) {
            hr('0. 明细（按触发顺序）')
            line('')
            line(
                '  ' +
                    this.pad('seq', 6) +
                    this.pad('钩子', 42) +
                    this.pad('assets', 8) +
                    this.pad('modules', 9) +
                    this.pad('chunks', 8) +
                    '回调参数'
            )
            for (const r of rows) {
                line(
                    '  ' +
                        this.pad(r.seq, 6) +
                        this.pad(`${r.scope === 'compiler' ? 'C' : 'c'}.${r.name}`, 42) +
                        this.pad(this.show(r.assets), 8) +
                        this.pad(this.show(r.modules), 9) +
                        this.pad(this.show(r.chunks), 8) +
                        r.args
                )
            }
            line('')
            return
        }

        // 1. 主干顺序
        hr('1. 触发顺序（按阶段压缩）')
        line(`一次构建共触发 ${rows.length} 次钩子，涉及 ${new Set(rows.map(r => r.name)).size} 个不同钩子`)
        line('')
        for (const [phase, , note] of PHASES) {
            const hits = rows.filter(r => r.phase === phase)
            if (!hits.length) continue
            const names = [...new Set(hits.map(r => r.name))]
            const shown = names.slice(0, 7).join(' → ')
            const tail = names.length > 7 ? ` → …（共 ${names.length} 个）` : ''
            line(`  ${phase.padEnd(8)} ${shown}${tail}`)
            line(`  ${' '.repeat(8)} └ ${note}`)
        }

        // 2. 各阶段能拿到什么
        hr('2. 各阶段能拿到什么（assets / modules / chunks）')
        line('')
        line('  ' + this.pad('检查点', 26) + this.pad('assets', 8) + this.pad('modules', 9) + 'chunks')
        const checkpoints = [
            'compiler.make',
            'compiler.finishMake',
            'compilation.afterChunks',
            'compilation.renderManifest',
            'compilation.chunkAsset',
            'compilation.processAssets',
            'compiler.emit',
            'compiler.done'
        ]
        for (const cp of checkpoints) {
            const r = rows.find(x => `${x.scope}.${x.name}` === cp)
            if (!r) continue
            line(
                '  ' +
                    this.pad(cp, 26) +
                    this.pad(this.show(r.assets), 8) +
                    this.pad(this.show(r.modules), 9) +
                    this.show(r.chunks)
            )
        }

        // 3. processAssets stage 顺序
        hr('3. processAssets 的 stage 顺序')
        line('')
        const C = webpack.Compilation
        const stages = Object.keys(C)
            .filter(k => k.startsWith('PROCESS_ASSETS_STAGE_'))
            .map(k => [k.replace('PROCESS_ASSETS_STAGE_', ''), C[k]])
            .sort((a, b) => a[1] - b[1])
        for (const [name, value] of stages) {
            line(`  ${String(value).padStart(5)}  ${name}`)
        }

        // 4. 各钩子上挂了谁
        hr('4. 各钩子上挂了谁（当前配置下实际注册的插件）')
        line('')
        const comp = this.lastCompilation
        const OWN = new Set(['HookProbe'])
        const wanted = [
            'additionalAssets',
            'processAssets',
            'optimizeChunks',
            'renderManifest',
            'record',
            'finishModules',
            'runtimeModule',
            'contentHash'
        ]
        // stage 数值 → 常量名（processAssets 专用）
        const STAGE_NAMES = new Map(
            Object.keys(webpack.Compilation)
                .filter(k => k.startsWith('PROCESS_ASSETS_STAGE_'))
                .map(k => [webpack.Compilation[k], k.replace('PROCESS_ASSETS_STAGE_', '')])
        )
        const declared = new Set((CONFIG.plugins || []).map(p => p && p.constructor && p.constructor.name))

        for (const name of wanted) {
            const hook = comp && comp.hooks[name]
            if (!hook || !hook.taps) continue
            const taps = hook.taps.filter(t => !OWN.has(t.name))
            if (!taps.length) continue
            const bad = DEPRECATED.has(name) ? '（该钩子已废弃）' : ''
            line(`  compilation.hooks.${name}${bad}`)
            for (const t of taps) {
                const declaredMark = declared.has(t.name) ? '（配置里显式声明）' : ''
                if (name === 'processAssets' && t.stage !== undefined) {
                    const st = STAGE_NAMES.get(t.stage)
                    line(`      · ${t.name.padEnd(22)} stage=${String(t.stage).padStart(5)} ${st || ''}`)
                } else {
                    line(`      · ${t.name}${declaredMark}`)
                }
            }
        }
        const cwanted = ['emit', 'done', 'thisCompilation', 'afterEmit', 'shouldEmit']
        for (const name of cwanted) {
            const hook = compiler.hooks[name]
            if (!hook || !hook.taps) continue
            const taps = hook.taps.filter(t => !OWN.has(t.name))
            if (!taps.length) continue
            line(`  compiler.hooks.${name}`)
            for (const t of taps) {
                line(`      · ${t.name}${declared.has(t.name) ? '（配置里显式声明）' : ''}`)
            }
        }
        line('')
        line('  已废弃但仍在触发的钩子（5.x 建议改用 processAssets + stage）：')
        line('      ' + [...DEPRECATED].join(' · '))
    }
}

const probeConfig = Object.assign({}, CONFIG, {
    output: Object.assign({}, CONFIG.output, { path: OUT_DIR, clean: true }),
    plugins: (CONFIG.plugins || []).concat([new HookProbePlugin()])
})

// 关掉持久化缓存：缓存命中时 buildModule / normalModuleLoader 等压根不会触发，观测会失真
probeConfig.cache = false

const compiler = webpack(probeConfig)
compiler.run((err, stats) => {
    if (err) {
        console.error('构建失败：', err)
        process.exit(1)
    }
    if (stats.compilation.errors.length) {
        console.error('构建有 error：', stats.compilation.errors[0].message)
    }
    compiler.close(() => process.exit(0))
})
