// 手写体积门禁插件：产物生成后称重量，超预算就中断构建，并落一份可对比的清单
//
// generateBundle 是"已生成、未写盘"的唯一安全窗口：此时能读到最终代码，也能增删产物
import zlib from 'node:zlib'

export default function miniSizeGate({ limitKb = Infinity, manifest = 'build-manifest.json' } = {}) {
    return {
        name: 'mini-size-gate',

        generateBundle(_options, bundle) {
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

            console.log('  ---- 产物清单（按 gzip 排序）----')
            for (const r of rows) {
                console.log(
                    `    ${r.fileName.padEnd(32)} ${r.type.padEnd(6)} raw ${String(r.raw).padStart(6)}B  gzip ${String(
                        r.gzip
                    ).padStart(6)}B`
                )
            }

            // this.emitFile：额外产出一个清单文件（走 asset 通道，不占 chunk）
            this.emitFile({
                type: 'asset',
                fileName: manifest,
                source: JSON.stringify(rows, null, 2)
            })

            const over = rows.filter(r => r.gzip > limitKb * 1024)
            if (over.length) {
                this.error(`产物超预算：${over.map(r => `${r.fileName} gzip ${r.gzip}B > ${limitKb}KB`).join('；')}`)
            }
            console.log(`    合计 gzip ${rows.reduce((s, r) => s + r.gzip, 0)}B，预算 ${limitKb}KB —— 通过`)
        }
    }
}