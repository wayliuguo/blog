'use strict'

// mini-webpack：一个约百行的「最小 webpack」，复刻 Compiler → Compilation → Module → Chunk → Asset 五对象流水线。
// 目的：把 webpack 篇「一、五个对象」那段心智模型落到能跑的代码，理解源码执行顺序。
// 运行：node index.cjs（或 npm run mini）
//
// 只支持 ESM 静态 import，不含 loader 链 / 代码分割 / tree-shaking，
// 但「流水线顺序 + 运行时怎么生成」是真实的。
// 核心能力按对象拆在 lib/ 下（一个文件一个概念），这里只做编排与演示：
//   lib/hook.cjs          tapable 极简版（先注册、后触发）
//   lib/compiler.cjs      Compiler：持有配置与 hooks，定义 make → seal → emit 流水线
//   lib/compilation.cjs   Compilation：一次编译的容器（modules / chunks / assets）
//   lib/module.cjs        Module：一个源文件
//   lib/resolver.cjs      依赖寻址（相对路径 → 磁盘绝对路径）
//   lib/graph.cjs         make 阶段：DFS 建模块图
//   lib/transpile.cjs     ESM → CJS
//   lib/runtime.cjs       把模块图拼成可执行的运行时产物
//   lib/emit.cjs          emit 阶段：渲染 + 写盘
//   plugins/emit-list.cjs 示例插件
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const { Compiler } = require('./lib/compiler.cjs')
const { makeGraph } = require('./lib/graph.cjs')
const { emitAssets } = require('./lib/emit.cjs')
const { EmitListPlugin } = require('./plugins/emit-list.cjs')

// 一次构建：建 Compiler → 注册内置的 make/seal/emit → apply 用户插件 → run
function build(options) {
    const compiler = new Compiler(options)

    // ① make：从入口出发递归解析依赖，构建模块图
    compiler.hooks.make.tap('MiniBundler', compilation => makeGraph(compilation, options))

    // ② seal：冻结模块图，按规则分 chunk。
    //    本实现所有模块进一个 chunk；真实 webpack 在这里按 splitChunks 规则切多个。
    compiler.hooks.seal.tap('MiniBundler', compilation => {
        compilation.chunks = [compilation]
    })

    // ③ emit：渲染 chunk 为 asset 并写盘
    compiler.hooks.emit.tap('MiniBundler', compilation => emitAssets(compilation, options))

    // 内置钩子注册完之后再 apply 用户插件，保证用户插件的 emit 能看到已写入的 assets
    for (const plugin of options.plugins || []) plugin.apply(compiler)

    compiler.run()
    return compiler
}

// —— 演示：两个模块互相 import + 一个 emit 插件 ——
const ROOT = __dirname
build({
    context: ROOT,
    entry: './src/entry.js',
    output: { path: path.join(ROOT, 'dist-min'), filename: 'bundle.js' },
    plugins: [new EmitListPlugin()]
})

console.log('\n产物片段（bundle.js 的运行时骨架，与 webpack 同构）：')
const out = fs.readFileSync(path.join(ROOT, 'dist-min', 'bundle.js'), 'utf8')
console.log(out.slice(0, 220) + '\n…')

// 产物真的能跑：拿子进程 node 直接执行 bundle.js，验证运行时拼接没有出错
console.log('\n产物实际执行（node dist-min/bundle.js）：')
const res = spawnSync(process.execPath, [path.join(ROOT, 'dist-min', 'bundle.js')], { encoding: 'utf8' })
console.log('  ' + ((res.stdout || '') + (res.stderr || '')).trim())
