// webpack 深入：SplitChunks 的体积下限对照 —— 同样两个共享模块，改一个数字结果完全不同
// 运行：npm run webpack:split
const path = require('node:path')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

const ROOT = __dirname
const DIST = path.join(ROOT, 'dist')
const CLI = require.resolve('webpack-cli/bin/cli.js')

function build(minSize) {
    fs.rmSync(DIST, { recursive: true, force: true })
    const p = spawnSync(process.execPath, [CLI, '--config', path.join(ROOT, 'webpack.config.cjs')], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, WP_MIN_SIZE: String(minSize), WP_CACHE: '0' }
    })
    const files = fs.existsSync(DIST) ? fs.readdirSync(DIST).filter((f) => f.endsWith('.js')) : []
    return { files, out: p.stdout || '' }
}

for (const minSize of [20000, 0]) {
    const { files } = build(minSize)
    console.log(`\n---- splitChunks.minSize = ${minSize} ----`)
    for (const f of files.sort()) {
        console.log('  ', f, (fs.statSync(path.join(DIST, f)).size / 1024).toFixed(1), 'KB')
    }
    console.log('   抽出了独立 common chunk：', files.some((f) => f.startsWith('common')))
}

console.log('\n---- 结论 ----')
console.log('默认 minSize=20000（20KB）会拦住小模块：共享模块再"共享"也不会被抽出')
console.log('调 minSize 之前先想清楚：多一个 chunk = 多一个请求，未必更快')
