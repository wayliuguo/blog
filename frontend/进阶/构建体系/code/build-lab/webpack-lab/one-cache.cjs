// webpack 深入：单次构建的耗时采样（跑在独立子进程里，避免多次构建互相影响）
// 用法：node webpack-lab/one-cache.cjs <srcDir> <0|1 是否开持久化缓存>
const path = require('node:path')
const webpack = require('webpack')

const srcDir = process.argv[2]
const useCache = process.argv[3] === '1'
const ROOT = __dirname

const config = {
    mode: 'production',
    entry: path.join(srcDir, 'index.js'),
    output: { path: path.join(ROOT, 'dist-cache'), filename: 'out.js', clean: true },
    module: {
        rules: [
            {
                test: /\.txt$/,
                use: [{ loader: path.join(ROOT, 'txt-loader.cjs'), options: { exportName: 'text' } }]
            }
        ]
    },
    optimization: { minimize: false },
    cache: useCache ? { type: 'filesystem', cacheDirectory: path.join(ROOT, '.wp-cache'), name: 'bench' } : false,
    performance: { hints: false },
    stats: 'errors-only'
}

const t0 = performance.now()
webpack(config, (err, stats) => {
    if (err) {
        console.log(JSON.stringify({ ok: false }))
        process.exit(1)
    }
    const info = stats.toJson({ errors: true })
    console.log(
        JSON.stringify({
            ok: info.errors.length === 0,
            buildMs: Math.round(performance.now() - t0),
            // webpack 自报的构建时间（不含 CLI 启动与 Node 启动）
            selfMs: Math.round(info.time),
            errors: info.errors.slice(0, 1)
        })
    )
})
