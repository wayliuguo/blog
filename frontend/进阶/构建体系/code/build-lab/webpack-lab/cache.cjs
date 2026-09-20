// webpack 深入：持久化缓存到底值不值 —— 小样本与大样本各测一遍
// 运行：npm run webpack:cache
// 设计：每次构建跑在独立子进程里，分别记录"子进程内构建耗时"与"进程总耗时"
const path = require('node:path')
const fs = require('node:fs')
const { spawnSync, execFileSync } = require('node:child_process')

const ROOT = __dirname
const LAB = path.join(ROOT, '..')
const ONE = path.join(ROOT, 'one-cache.cjs')

// 大样本复用 bench 生成的 200 个模块
const BIG_SRC = path.join(LAB, 'bench', 'src')
if (!fs.existsSync(path.join(BIG_SRC, 'index.js'))) {
    execFileSync(process.execPath, [path.join(LAB, 'bench', 'gen.cjs'), '200'], { stdio: 'inherit' })
}
const SMALL_SRC = path.join(ROOT, 'src')

function build(srcDir, useCache) {
    const wall0 = Date.now()
    const p = spawnSync(process.execPath, [ONE, srcDir, useCache ? '1' : '0'], { encoding: 'utf8' })
    const wall = Date.now() - wall0
    const line = (p.stdout || '').trim().split('\n').pop()
    if (!line) {
        console.log(p.stderr ? p.stderr.slice(-600) : '(无输出)')
        return { wall, buildMs: null, selfMs: null, ok: false }
    }
    const data = JSON.parse(line)
    if (!data.ok) console.log(data.errors)
    return { wall, ...data }
}

function round(label, srcDir) {
    fs.rmSync(path.join(ROOT, '.wp-cache'), { recursive: true, force: true })
    build(srcDir, false) // 冷启动，丢弃
    const noCache = build(srcDir, false)

    fs.rmSync(path.join(ROOT, '.wp-cache'), { recursive: true, force: true })
    build(srcDir, true) // 冷启动，顺带把缓存写盘
    const withCache = build(srcDir, true)

    console.log(`\n---- ${label} ----`)
    console.log(`  无缓存：构建 ${noCache.buildMs} ms（webpack 自报 ${noCache.selfMs} ms）/ 进程 ${noCache.wall} ms`)
    console.log(
        `  有缓存：构建 ${withCache.buildMs} ms（webpack 自报 ${withCache.selfMs} ms）/ 进程 ${withCache.wall} ms`
    )
    console.log(`  构建提速（按 webpack 自报时间算）：${(noCache.selfMs / withCache.selfMs).toFixed(2)}x`)
    console.log(
        `  注意：进程内 ${noCache.buildMs} ms 里约 ${
            noCache.buildMs - noCache.selfMs
        } ms 是 require('webpack') 的固定成本，与缓存无关`
    )
    return { noCache, withCache }
}

const small = round('小样本：webpack-lab/src（4 个模块）', SMALL_SRC)
const big = round('大样本：bench/src（200 个模块）', BIG_SRC)

console.log('\n---- 结论 ----')
const ratio = r => (r.noCache.selfMs / r.withCache.selfMs).toFixed(2) + 'x'
console.log(`小样本 ${ratio(small)}，大样本 ${ratio(big)}（按 webpack 自报的构建时间算）`)
console.log(`模块越多收益越大：缓存省的是"模块转换"，模块少时还不够抵销读写缓存的开销`)
console.log(
    `进程总耗时比构建耗时多约 ${big.withCache.wall - big.withCache.buildMs} ms（Node 启动）+ ${
        big.noCache.buildMs - big.noCache.selfMs
    } ms（加载 webpack）`
)
console.log('所以持久化缓存不是默认就该开：先量，再决定；真要用，缓存目录要进 CI 缓存')
