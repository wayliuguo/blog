// mini-vite 入口：把 dev 与 build 两套引擎各跑一遍，并把钩子调用次数摆在一起对照。
//
// 两套引擎共用同一份插件表——这正是 Vite 的形态：
// 插件只声明"我在哪个钩子上做什么"，至于这个钩子是在 dev 还是 build 触发，由引擎决定。
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createPluginContainer } from './lib/plugin-container.mjs'
import { createResolvePlugin, createFsPlugin } from './lib/resolve.mjs'
import { createModuleGraph } from './lib/module-graph.mjs'
import { createImportAnalysisPlugin } from './lib/transform.mjs'
import { createDevServer } from './lib/server.mjs'
import { build, label } from './lib/build.mjs'
import { emitBundle } from './lib/emit.mjs'

import { miniVirtual } from './plugins/mini-virtual.mjs'
import { miniBanner } from './plugins/mini-banner.mjs'
import { miniReport } from './plugins/mini-report.mjs'
import { miniMock } from './plugins/mini-mock.mjs'
import { miniHtml } from './plugins/mini-html.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(root, 'dist')
const FILE_NAME = 'assets/index.js'

const short = id => label(id, root)

/** 组装一次运行：插件表 + 容器 + 模块图。dev 与 build 用的是同一套插件。 */
function setup(command) {
    const moduleGraph = createModuleGraph()
    let container

    const plugins = [
        createResolvePlugin({ root }),
        createFsPlugin(),
        createImportAnalysisPlugin({
            command,
            root,
            moduleGraph,
            resolve: (source, importer) => container.resolveId(source, importer)
        }),
        miniVirtual(),
        miniBanner(),
        miniReport(),
        miniMock({ '/api/user': { name: 'mini-vite', from: 'mini-mock' } }),
        miniHtml()
    ]

    container = createPluginContainer(plugins, {
        command,
        root,
        mode: command === 'serve' ? 'development' : 'production'
    })

    return { container, moduleGraph }
}

// ---- build：全量建图 + 打包 ----
async function runBuild() {
    console.log('\n=== build 引擎：一次走完整张模块图，拼成一个文件 ===')
    const { container, moduleGraph } = setup('build')

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

// ---- dev：按 URL 按需转换，不打包 ----
async function runDev() {
    console.log('\n=== dev 引擎：按 URL 按需转换，import 原样保留 ===')
    const { container, moduleGraph } = setup('serve')
    const dev = await createDevServer({ root, container, moduleGraph })
    const port = await dev.listen()
    console.log(`  服务地址 http://127.0.0.1:${port}`)

    const get = async url => (await fetch(`http://127.0.0.1:${port}${url}`)).text()

    // 模拟浏览器：请求入口，以及入口"直接"import 的三个模块
    const main = await get('/src/main.js')
    await get('/src/helper.js')
    await get('/@deps/tiny-lib.js')
    await get('/@id/__x00__virtual:build-info')

    console.log('  main.js 里的说明符已被改写：')
    for (const spec of ['/src/helper.js', '/@deps/tiny-lib.js', '/@id/__x00__virtual:build-info']) {
        console.log(`    ${main.includes(`"${spec}"`) ? '✓' : '✗'} ${spec}`)
    }

    console.log(`  GET /api/user  →  ${await get('/api/user')}`)
    const html = await get('/')
    console.log(`  GET /  →  ${html.includes('injected by mini-html') ? 'HTML 已被 mini-html 处理' : 'HTML 未被处理'}`)

    const helperDeps = moduleGraph.get(path.join(root, 'src/helper.js'))?.imports ?? []
    console.log(`  helper.js 的直接依赖：${helperDeps.map(short).join(', ')}`)
    const deepId = path.join(root, 'src/deep.js')
    console.log(`  deep.js 被转换过吗：${moduleGraph.isTransformed(deepId) ? '是' : '否 —— 浏览器还没请求到它'}`)
    const lazyId = path.join(root, 'src/lazy.js')
    console.log(`  lazy.js 进入模块图了吗：${moduleGraph.get(lazyId) ? '是' : '否 —— 它不在依赖图里'}`)

    await dev.close()
    return container.hookCalls
}

// ---- 对照表 ----
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
    'configureServer',
    'transformIndexHtml',
    'buildEnd'
]

// 中文按 2 列宽算，否则表格会错位
const displayWidth = s => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - displayWidth(s)))

function printHookTable(devCalls, buildCalls) {
    console.log('\n=== 钩子调用对照（一次实测样本）===')
    console.log(`  ${pad('钩子', 20)}${pad('dev', 6)}${pad('build', 6)}`)
    for (const name of ORDER) {
        const dev = devCalls[name]
        const bd = buildCalls[name]
        const note = dev && !bd ? '  ← dev 专属' : !dev && bd ? '  ← build 专属' : ''
        console.log(`  ${pad(name, 20)}${pad(String(dev), 6)}${pad(String(bd), 6)}${note}`)
    }
}

const buildCalls = await runBuild()
const devCalls = await runDev()
printHookTable(devCalls, buildCalls)
