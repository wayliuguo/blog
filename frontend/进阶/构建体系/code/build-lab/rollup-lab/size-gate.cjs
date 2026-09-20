// Rollup：一个生产里真会写的插件 —— 产物体积门禁 + 清单
// 它不改代码，只在产物生成后"称重量"：超预算就中断构建，并留下可对比的清单
// 运行：npm run rollup:gate
const path = require('node:path')
const zlib = require('node:zlib')
const { rollup } = require('rollup')

function bundleGuard({ limitKb = Infinity, manifest = 'bundle-manifest.json' } = {}) {
    return {
        name: 'bundle-guard',

        // generateBundle 是最后一个能改产物的钩子：此时的 code 就是最终落盘的内容
        generateBundle(outputOptions, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            // this.emitFile：额外产出一个清单文件（不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })

            console.log('    ---- 产物清单 ----')
            for (const r of rows) {
                console.log(
                    `      ${r.fileName.padEnd(24)} ${r.type.padEnd(6)} raw ${String(r.raw).padStart(
                        6
                    )}B  gzip ${String(r.gzip).padStart(6)}B`
                )
            }

            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
            console.log(`      合计 gzip ${rows.reduce((s, r) => s + r.gzip, 0)}B，预算 ${limitKb}KB —— 通过`)
        }
    }
}

async function build(label, limitKb) {
    console.log(`\n---- ${label} ----`)
    try {
        const bundle = await rollup({
            input: path.join(__dirname, 'src/index.js'),
            plugins: [bundleGuard({ limitKb })]
        })
        const { output } = await bundle.generate({ format: 'es' })
        const manifest = output.find(o => o.fileName === 'bundle-manifest.json')
        console.log('    清单落盘：', manifest ? manifest.fileName + ' ' + manifest.source.length + ' 字节' : '（无）')
        await bundle.close()
    } catch (err) {
        console.log('    构建被中断：', err.message)
    }
}

;(async () => {
    await build('① 预算 100KB（宽松）', 100)
    await build('② 预算 0.15KB（严格）', 0.15)
    console.log('\n---- 结论 ----')
    console.log('  体积门禁必须用 gzip 后的字节：raw 差 3 倍，用户下载的是 gzip')
    console.log('  清单（manifest）比「打印一行」有用：两次构建对拍才知道是哪天、哪个 chunk 涨上去的')
    console.log('  this.error 让插件从「报告」变成「门禁」——CI 里非零退出码就是靠它')
})()
