// Vite 插件钩子探针：把一次 serve 与一次 build 里所有钩子的调用顺序、回调参数、当下上下文记录下来
// 运行：npm run vite:hooks        （both：serve + build）
//       npm run vite:hooks:serve  （只跑 dev 侧）
//       npm run vite:hooks:build  （只跑 build 侧）
import { build, createServer, resolveConfig } from 'vite'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const DIR = import.meta.dirname
const CONFIG = path.join(DIR, 'vite.config.mjs')
// 只依赖已入库的 src/：探针不引 plugins.cjs 生成的 src-plugins/，保证新克隆仓库直接可跑
const ENTRY = path.join(DIR, 'src', 'main.js')

// 待测钩子：Vite 专属（T）+ Rollup/Rolldown 兼容（R）
// 全都注册上，实际没被调用的会在报告里单独列出——「哪些钩子在当前版本不触发」本身就是读数
const HOOKS = [
    // —— Vite 专属 ——
    'config',
    'configResolved',
    'configureServer',
    'configurePreviewServer',
    'transformIndexHtml',
    'handleHotUpdate',
    'hotUpdate',
    // —— Rollup / Rolldown 兼容：构建阶段 ——
    'options',
    'buildStart',
    'resolveId',
    'load',
    'transform',
    'moduleParsed',
    'resolveDynamicImport',
    'buildEnd',
    'closeBundle',
    'watchChange',
    // —— Rollup / Rolldown 兼容：输出阶段 ——
    'renderStart',
    'banner',
    'footer',
    'intro',
    'outro',
    'augmentChunkHash',
    'renderDynamicImport',
    'renderChunk',
    'generateBundle',
    'writeBundle'
]

// 需要返回值的钩子：返回 null 表示「不处理」，交给下一个插件
const RETURN_NULL = new Set([
    'options',
    'resolveId',
    'load',
    'transform',
    'resolveDynamicImport',
    'renderChunk',
    'renderDynamicImport'
])

function typeOf(v) {
    if (v === null) return 'null'
    if (v === undefined) return 'undefined'
    if (Array.isArray(v)) return `Array(${v.length})`
    const t = typeof v
    if (t === 'object') {
        const name = v.constructor ? v.constructor.name : 'Object'
        if (name === 'PluginContext') return 'PluginContext'
        // 配置对象：把 command 提出来，一眼能看出是 dev 还是 build
        if (v.command) return `Config{command:${v.command}}`
        // chunk / output 对象
        if (v.fileName !== undefined) return `Chunk{${v.fileName}}`
        const keys = Object.keys(v)
        // 产物集合（generateBundle / writeBundle 的第二参）：键就是文件名
        if (keys.length > 2 && keys.filter(k => /[./]/.test(k)).length >= 2) return `Bundle{${keys.length} 项}`
        return `Object{${keys.slice(0, 3).join(',')}}`
    }
    if (t === 'string') {
        // 先把换行压平，否则打印源码字符串会让整张表错位
        const flat = v.replace(/\s+/g, ' ').trim()
        const looksLikePath = /[\\/]/.test(flat) && !/[<>{}()[\],;='"`$|]/.test(flat) && flat.length < 180
        if (looksLikePath) return `path(${flat.replace(/\\/g, '/').split('/').pop()})`
        return flat.length > 30 ? `string("${flat.slice(0, 26)}…")` : `string("${flat}")`
    }
    return t
}

// 记录一次调用；state 里放「此刻能拿到什么」
function makeProbe(tag, enforce, records, state) {
    const plugin = { name: `probe-${tag}` }
    if (enforce) plugin.enforce = enforce
    // --legacy-hmr：只注册老的 handleHotUpdate，不注册 hotUpdate，用来验证前者是否还生效
    const hooks = process.argv.includes('--legacy-hmr') ? HOOKS.filter(h => h !== 'hotUpdate') : HOOKS
    for (const hook of hooks) {
        plugin[hook] = (...args) => {
            records.push({
                seq: records.length + 1,
                tag,
                hook,
                args: args.map(typeOf),
                command: state.command,
                env: state.environment,
                hasBundle: !!state.hasBundle,
                note: state.note
            })
            if (hook === 'transformIndexHtml') return args[0]
            if (hook === 'config') return undefined
            if (RETURN_NULL.has(hook)) return null
            return undefined
        }
    }
    return plugin
}

function section(title) {
    console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`)
}

async function reportPluginChain() {
    section('0. 解析后的插件链：enforce 排序 + 每个插件用了哪些钩子')
    // 传入三个不同 enforce 的同名插件，验证排序结果
    const cfg = await resolveConfig(
        {
            configFile: CONFIG,
            plugins: [
                { name: 'zz-probe-post', enforce: 'post' },
                { name: 'aa-probe-pre', enforce: 'pre' }
            ]
        },
        'serve'
    )
    const list = cfg.plugins.map((p, i) => {
        const e = p.enforce || '(normal)'
        const a = p.apply || 'both'
        return `${String(i).padStart(3)}  ${e.padEnd(8)} ${a.padEnd(6)} ${p.name}`
    })
    console.log(`  共 ${cfg.plugins.length} 个插件（含 Vite 内置）`)
    console.log('  idx  enforce  apply  name')
    console.log(list.join('\n'))

    const HOOK_SET = new Set(HOOKS)
    section('0b. Vite 内置 / 用户插件各自定义了哪些钩子（探针自身已剔除）')
    const rows = []
    for (const p of cfg.plugins) {
        if (p.name.includes('probe')) continue
        const defs = Object.keys(p).filter(k => HOOK_SET.has(k) && p[k] != null)
        if (defs.length) rows.push({ name: p.name, defs })
    }
    rows.sort((a, b) => b.defs.length - a.defs.length)
    for (const r of rows) {
        console.log(`  ${r.name}`)
        console.log(`      ${r.defs.join(', ')}`)
    }
    console.log(`\n  统计：${rows.length} 个插件用到了本轮考察的钩子`)
}

async function runBuild(records) {
    section('1. build 侧钩子调用顺序（vite build）')
    const outDir = path.join(os.tmpdir(), 'vite-hooks-probe-dist')
    const state = { command: 'build', environment: 'client', hasBundle: false, note: '' }
    const probes = [
        makeProbe('pre', 'pre', records, state),
        makeProbe('normal', undefined, records, state),
        makeProbe('post', 'post', records, state)
    ]
    await build({
        configFile: CONFIG,
        logLevel: 'warn',
        build: { outDir, emptyOutDir: true, minify: false },
        plugins: probes
    })
}

async function runServe(records) {
    section('2. dev 侧钩子调用顺序（vite dev + 请求页面）')
    const state = { command: 'serve', environment: 'client', hasBundle: false, note: '' }
    const probes = [makeProbe('pre', 'pre', records, state), makeProbe('normal', undefined, records, state)]
    const server = await createServer({
        configFile: CONFIG,
        logLevel: 'warn',
        server: { port: 0 },
        plugins: probes
    })
    await server.listen()
    const port = server.httpServer.address().port
    const base = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '') || `http://127.0.0.1:${port}`
    console.log(`  dev server: ${base}`)

    // 只请求两个地址：一个 HTML（走 transformIndexHtml）、一个模块（走 resolveId/load/transform）
    // 每请求一次统计一次 transform 次数——「dev 按需处理」的直接证据
    const targets = ['/', '/src/main.js']
    for (const t of targets) {
        state.note = `fetch ${t}`
        state.hasBundle = false
        const before = records.length
        try {
            const res = await fetch(base + t)
            const body = await res.text()
            const hit = records.slice(before).filter(r => r.tag === 'pre' && r.hook === 'transform').length
            console.log(`  fetch ${t.padEnd(18)} → ${res.status}  ${body.length} 字节  transform ${hit} 次`)
        } catch (e) {
            console.log(`  fetch ${t.padEnd(18)} → 失败: ${e.message}`)
        }
    }

    // 模拟一次文件变更，触发 HMR 相关钩子
    state.note = 'watcher change'
    try {
        server.watcher.emit('change', ENTRY)
        await new Promise(r => setTimeout(r, 400))
    } catch (e) {
        console.log('  watcher emit 失败：', e.message)
    }

    await server.close()
}

function dump(records, label) {
    section(`3. ${label}：调用序列`)
    console.log('  seq  tag      hook                    回调参数（实测类型）')
    for (const r of records) {
        console.log(
            `  ${String(r.seq).padStart(3)}  ${r.tag.padEnd(7)}  ${r.hook.padEnd(22)} ${r.args.join(', ') || '(无参)'}`
        )
    }
}

function summarise(records) {
    section('4. 钩子 × 侧 归属（实测）')
    const inBuild = new Set(records.filter(r => r.command === 'build').map(r => r.hook))
    const inServe = new Set(records.filter(r => r.command === 'serve').map(r => r.hook))
    const all = [...new Set(records.map(r => r.hook))].sort()
    console.log('  hook                    build?  serve?')
    for (const h of all) {
        console.log(`  ${h.padEnd(22)}  ${inBuild.has(h) ? ' ✓   ' : ' -   '}  ${inServe.has(h) ? ' ✓' : ' -'}`)
    }

    section('5. 注册了但本次没触发的钩子（当前版本无效或需特定条件）')
    const never = HOOKS.filter(h => !all.includes(h))
    console.log('  ' + (never.join(', ') || '（无）'))

    section('6. 主干：钩子首次出现的先后（画全景图用）')
    for (const side of ['build', 'serve']) {
        const firsts = []
        const seen = new Set()
        for (const r of records) {
            if (r.command !== side || seen.has(r.hook)) continue
            seen.add(r.hook)
            firsts.push(r)
        }
        console.log(`\n  —— ${side} 侧（共 ${firsts.length} 个钩子首次出现）——`)
        for (const r of firsts) {
            console.log(`   ${String(r.seq).padStart(3)}  ${r.hook.padEnd(22)} ${r.args.join(', ') || '(无参)'}`)
        }
    }

    section('7. 配置期钩子的执行顺序（enforce 是否生效）')
    for (const hook of ['config', 'configResolved', 'options', 'buildStart']) {
        const order = records.filter(r => r.hook === hook).map(r => r.tag)
        if (order.length) console.log(`  ${hook.padEnd(16)} ${order.join(' → ')}`)
    }
}

const only = process.argv[2]
const records = []
await reportPluginChain()
if (only !== '--serve') await runBuild(records)
if (only !== '--build') await runServe(records)
dump(
    records.filter(r => r.command === 'build'),
    'build 侧'
)
dump(
    records.filter(r => r.command === 'serve'),
    'dev 侧'
)
summarise(records)
