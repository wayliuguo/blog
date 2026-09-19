// bench：同一份源码，分别用 esbuild / rollup / webpack 打包，对比耗时、体积与 tree-shaking
// 运行：npm run bench
// 设计要点：每个工具跑在独立子进程里，测的是"从命令行敲下到产物写完"的体验
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')

const ROOT = __dirname
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')
const N = 200

execFileSync(process.execPath, [path.join(ROOT, 'gen.cjs'), String(N)], { cwd: ROOT, stdio: 'inherit' })
fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(DIST, { recursive: true })

function run(tool, srcDir, outFile) {
    const wall0 = Date.now()
    const p = spawnSync(process.execPath, [path.join(ROOT, 'one.cjs'), tool, srcDir, outFile], {
        encoding: 'utf8'
    })
    const wall = Date.now() - wall0
    if (p.status !== 0) {
        console.log(`${tool} 失败：`, (p.stderr || '').slice(-800))
        return null
    }
    const data = JSON.parse(p.stdout.trim().split('\n').pop())
    return { ...data, wall }
}

function once(tool, srcDir, outFile) {
    run(tool, srcDir, outFile) // 预热：第一次含模块加载与磁盘缓存
    return run(tool, srcDir, outFile)
}

const rows = []
for (const tool of ['esbuild', 'rollup', 'webpack']) {
    const r = once(tool, SRC, path.join(DIST, `${tool}.js`))
    if (r) rows.push({ label: tool, ...r })
}

// 对照实验：webpack 没摇掉 unused，加 sideEffects:false 之后呢？
const SRC2 = path.join(ROOT, 'src-noside')
fs.rmSync(SRC2, { recursive: true, force: true })
fs.mkdirSync(SRC2, { recursive: true })
for (const f of fs.readdirSync(SRC)) fs.copyFileSync(path.join(SRC, f), path.join(SRC2, f))
fs.writeFileSync(path.join(SRC2, 'package.json'), JSON.stringify({ sideEffects: false }, null, 2))
const noside = once('webpack', SRC2, path.join(DIST, 'webpack-noside.js'))
if (noside) rows.push({ label: 'webpack + sideEffects:false', ...noside })

// 第二组对照：webpack 的删除动作其实由压缩器完成，关掉 minimize 就只标记不删除
const min = once('webpack-min', SRC, path.join(DIST, 'webpack-min.js'))
if (min) rows.push({ label: 'webpack + minimize', ...min })

console.log(`\n---- 同一份源码（${N} 个模块）构建对比（第二次运行）----`)
const sorted = [...rows].sort((a, b) => a.buildMs - b.buildMs)
const base = sorted[0].buildMs
console.log('工具'.padEnd(28) + '构建耗时'.padStart(10) + '进程总耗时'.padStart(12) + '产物'.padStart(10) + '含 unused')
for (const r of sorted) {
    console.log(
        `${r.label.padEnd(28)}${(r.buildMs + ' ms').padStart(10)}${(r.wall + ' ms').padStart(12)}${((r.size / 1024).toFixed(1) + ' KB').padStart(10)}  ${r.hasUnused}`
    )
}

console.log('\n---- 结论（由上面的实测数据推导）----')
console.log('最快/最慢倍数：', (sorted[sorted.length - 1].buildMs / base).toFixed(1) + 'x')
const shaken = rows.filter((r) => r.hasUnused === false)
const kept = rows.filter((r) => r.hasUnused === true)
console.log('摇掉了未使用代码：', shaken.map((r) => r.label).join(' / ') || '（无）')
console.log('仍保留未使用代码：', kept.map((r) => r.label).join(' / ') || '（无）')
console.log('webpack 的 tree-shaking 是"标记 + 压缩器删除"两步：关掉 minimize 就只剩标记')

console.log('\n---- 环境 ----')
console.log('Node', process.version, '| CPU', os.cpus()[0].model, '| 核数', os.cpus().length)
