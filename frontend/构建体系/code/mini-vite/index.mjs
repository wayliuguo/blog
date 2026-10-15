// mini-vite 入口：跑一段 build —— 全量建图、拼成一个文件，并打印钩子触发次数。
//
// 与 mini-webpack 对齐：一次构建、一个产物。
// 插件只声明"我在哪个钩子上做什么"，钩子在 build 下按三种调用约定被触发
// （call / first / pipe，见 lib/hook.mjs）——这就是 Vite 的形态。
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createPluginContainer } from './lib/plugin-container.mjs'
import { createResolvePlugin, createFsPlugin } from './lib/resolve.mjs'
import { createModuleGraph } from './lib/module-graph.mjs'
import { createImportAnalysisPlugin } from './lib/transform.mjs'
import { build, label } from './lib/build.mjs'
import { emitBundle } from './lib/emit.mjs'

import { miniVirtual } from './plugins/mini-virtual.mjs'
import { miniBanner } from './plugins/mini-banner.mjs'
import { miniReport } from './plugins/mini-report.mjs'
import { miniHtml } from './plugins/mini-html.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(root, 'dist')
const FILE_NAME = 'assets/index.js'

const short = id => label(id, root)

/** 组装一次 build 运行：插件表 + 容器 + 模块图。 */
function setup() {
    const moduleGraph = createModuleGraph()
    let container

    const plugins = [
        createResolvePlugin({ root }),
        createFsPlugin(),
        createImportAnalysisPlugin({
            moduleGraph,
            resolve: (source, importer) => container.resolveId(source, importer)
        }),
        miniVirtual(),
        miniBanner(),
        miniReport(),
        miniHtml()
    ]

    container = createPluginContainer(plugins, { command: 'build', root, mode: 'production' })

    return { container, moduleGraph }
}

// ---- build：全量建图 + 打包 ----
async function runBuild() {
    console.log('\n=== build 引擎：一次走完整张模块图，拼成一个文件 ===')
    const { container, moduleGraph } = setup()

    const { code, order } = await build({ root, container, moduleGraph })
    const { bundle } = await emitBundle({ container, root, outDir, code, fileName: FILE_NAME })

    console.log(`  参与打包的模块 ${order.length} 个：${order.map(short).join(' → ')}`)
    console.log(`  产物 ${FILE_NAME}：${Buffer.byteLength(bundle[FILE_NAME].code)} B`)

    const run = spawnSync(process.execPath, [path.join(outDir, FILE_NAME)], { encoding: 'utf-8' })
    const printed = (run.stdout || run.stderr || '')
        .trim()
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n')
    console.log(`  执行产物（node dist/${FILE_NAME}）：\n${printed}`)

    return container.hookCalls
}

// ---- 钩子触发次数（一次构建）----
const ORDER = [
    'config',
    'configResolved',
    'buildStart',
    'resolveId',
    'load',
    'transform',
    'renderChunk',
    'generateBundle',
    'closeBundle',
    'transformIndexHtml',
    'buildEnd'
]

// 中文按 2 列宽算，否则表格会错位
const displayWidth = s => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - displayWidth(s)))

function printHookTable(calls) {
    console.log('\n=== 钩子调用（一次构建）===')
    console.log(`  ${pad('钩子', 20)}build`)
    for (const name of ORDER) {
        console.log(`  ${pad(name, 20)}${calls[name]}`)
    }
}

printHookTable(await runBuild())
