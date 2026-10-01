// 手写体积门禁插件：产物生成后称重量，超预算就中断构建，并落一份可对比的清单
//
// 它不改任何代码 —— 体积回退是最容易混进代码库的退化，因为它不会让任何测试变红
import zlib from 'node:zlib'

export default function sizeGate({ limitKb = Infinity, manifest = 'bundle-manifest.json' } = {}) {
    return {
        name: 'size-gate',

        // generateBundle 是最后一个能改产物的钩子：此时的 code 就是最终落盘的内容
        generateBundle(_options, bundle) {
            const rows = []
            for (const [fileName, item] of Object.entries(bundle)) {
                // sourcemap 不发给用户，不参与称重
                if (fileName.endsWith('.map')) continue
                const source = item.type === 'chunk' ? item.code : item.source
                rows.push({
                    fileName,
                    type: item.type,
                    raw: Buffer.byteLength(source),
                    gzip: zlib.gzipSync(Buffer.from(source)).length
                })
            }
            rows.sort((a, b) => b.gzip - a.gzip)

            // this.emitFile：额外产出一个清单文件（走 asset 通道，不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })

            console.log('    ---- 产物清单 ----')
            for (const r of rows) {
                console.log(
                    `      ${r.fileName.padEnd(24)} ${r.type.padEnd(6)} raw ${String(r.raw).padStart(6)}B  gzip ${String(
                        r.gzip
                    ).padStart(6)}B`
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