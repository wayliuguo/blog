// Vite 插件调试入口：用 JS API 跑一次构建 / 起一次 dev，方便把断点下在插件钩子里
// 用法：
//   node vite-lab/debug-entry.mjs              → build（普通执行，断点自动跳过）
//   node vite-lab/debug-entry.mjs --serve      → dev server（起来后请求一次页面）
//   npm run vite:debug
//   npm run vite:debug:inspect                 → 带 --inspect-brk，停在第一行等调试器
// 调试器接法见本篇第九节：VS Code 附加 9229，或打开 chrome://inspect
import { build, createServer } from 'vite'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const DIR = import.meta.dirname
const CONFIG = path.join(DIR, 'vite.config.mjs')
const OUT_DIR = path.join(os.tmpdir(), 'vite-debug-entry-dist')

// 四个预设断点：需要时把 debugger 前面的注释去掉即可
function markerPlugin() {
    return {
        name: 'debug-marker',
        configResolved(config) {
            // 断点①：配置已解析。这里能拿到 command、完整插件链、最终配置
            // debugger
            console.log(`  [① configResolved] command=${config.command} 插件数=${config.plugins.length}`)
        },
        buildStart() {
            // 断点②：构建开始，还没有任何模块被加载
            // debugger
        },
        transform(code, id) {
            // 断点③：每个模块经过时都会停。排查「我的插件为什么没生效」就下在这里，
            // 看 id 是否符合预期、enforce 是否让你排在了别人后面
            // debugger
            if (id.includes('main.js')) console.log(`  [③ transform] 命中 main.js，源码 ${code.length} 字节`)
            return null
        },
        generateBundle(_options, bundle) {
            // 断点④：产物已生成、还没写盘——bundle 里有全部产物，改内容有效
            // debugger
            console.log(`  [④ generateBundle] 产物 ${Object.keys(bundle).length} 个`)
        }
    }
}

// 记录各里程碑耗时：构建慢的时候用它定位是哪一段
function timingPlugin() {
    const t0 = performance.now()
    const marks = []
    const at = () => Math.round(performance.now() - t0)
    return {
        name: 'timing',
        buildStart() {
            marks.push(['buildStart（开始建模块）', at()])
        },
        buildEnd() {
            marks.push(['buildEnd（模块建完）', at()])
        },
        renderStart() {
            marks.push(['renderStart（开始出产物）', at()])
        },
        generateBundle() {
            marks.push(['generateBundle（产物就绪）', at()])
        },
        writeBundle() {
            marks.push(['writeBundle（写完盘）', at()])
        },
        closeBundle() {
            marks.push(['closeBundle（收尾）', at()])
        },
        __dump() {
            console.log('\n---- 各里程碑耗时（相对起点，ms）----')
            for (const [name, ms] of marks) console.log(`  ${name.padEnd(30)} ${String(ms).padStart(6)}`)
        }
    }
}

const useServe = process.argv.includes('--serve')
const timing = timingPlugin()
const plugins = [markerPlugin(), timing]

if (useServe) {
    const server = await createServer({ configFile: CONFIG, plugins, server: { port: 0 } })
    await server.listen()
    const base = server.resolvedUrls?.local?.[0]
    console.log(`  dev server 已就绪：${base}`)
    // 主动请求一次，让 resolveId / load / transform 跑起来（不打请求什么都不会发生）
    for (const p of ['/', '/src/main.js']) {
        const res = await fetch(base.replace(/\/$/, '') + p)
        await res.text()
        console.log(`  fetch ${p} → ${res.status}`)
    }
    console.log('  按 Ctrl+C 退出（dev server 不会自己退出，这正是可以反复下断点的原因）')
    // --once：请求完就退出，方便脚本里跑一次看输出
    if (process.argv.includes('--once')) {
        await server.close()
        console.log('  --once：已关闭 dev server')
    }
} else {
    await build({
        configFile: CONFIG,
        build: { outDir: OUT_DIR, emptyOutDir: true },
        plugins
    })
    timing.__dump()
    const files = fs.readdirSync(path.join(OUT_DIR, 'assets'))
    console.log(`\n  产物目录：${OUT_DIR}`)
    console.log(`  assets 下 ${files.length} 个文件：${files.join(', ')}`)
}
