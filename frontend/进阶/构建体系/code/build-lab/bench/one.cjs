// bench：单个工具的构建（每个工具跑在独立子进程里，避免互相污染）
// 用法：node bench/one.cjs <esbuild|rollup|webpack> <srcDir> <outFile>
const path = require('node:path')
const fs = require('node:fs')

const tool = process.argv[2]
const srcDir = process.argv[3]
const outFile = process.argv[4]
const t0 = performance.now()

function done() {
    const buildMs = Math.round(performance.now() - t0)
    const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0
    // 检测字符串常量而不是函数名：压缩会改名，但字符串不会
    const hasUnused = fs.existsSync(outFile)
        ? fs.readFileSync(outFile, 'utf8').includes('这段应该被 tree-shaking 摇掉')
        : null
    console.log(JSON.stringify({ tool, buildMs, size, hasUnused }))
}

const entry = path.join(srcDir, 'index.js')

if (tool === 'esbuild') {
    const esbuild = require('esbuild')
    esbuild.buildSync({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        minify: false,
        outfile: outFile,
        logLevel: 'silent'
    })
    done()
} else if (tool === 'rollup') {
    const { rollup } = require('rollup')
    rollup({ input: entry })
        .then((b) => b.write({ file: outFile, format: 'esm' }))
        .then(done)
} else if (tool === 'webpack' || tool === 'webpack-min') {
    const webpack = require('webpack')
    webpack(
        {
            mode: 'production',
            entry,
            output: { path: path.dirname(outFile), filename: path.basename(outFile) },
            optimization: { minimize: tool === 'webpack-min' },
            performance: { hints: false }
        },
        (err) => {
            if (err) throw err
            done()
        }
    )
}
