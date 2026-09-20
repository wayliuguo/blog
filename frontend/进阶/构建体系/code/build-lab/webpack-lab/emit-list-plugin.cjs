// webpack：plugin 就是"注册钩子、在特定时机做点事"的类
// 这里实现两个插件：一个统计产物清单，一个验证 chunk 数量
const fs = require('node:fs')
const path = require('node:path')

class EmitListPlugin {
    constructor(options = {}) {
        this.name = options.name || 'EmitListPlugin'
    }
    apply(compiler) {
        // emit：产物即将写盘，此时 compilation.assets 已经就绪
        compiler.hooks.emit.tap(this.name, compilation => {
            const names = Object.keys(compilation.assets)
            console.log('\n---- 产物清单（emit 钩子）----')
            for (const n of names) {
                const size = compilation.assets[n].size()
                console.log(`  ${n.padEnd(28)} ${(size / 1024).toFixed(1)} KB`)
            }
            console.log('  chunk 数:', compilation.chunks.size)
        })

        // done：整次构建结束，stats 可用
        compiler.hooks.done.tap(this.name, stats => {
            const { errors, warnings } = stats.compilation
            console.log('  构建结束：error', errors.length, '/ warning', warnings.length)
        })
    }
}

class WriteManifestPlugin {
    constructor(options = {}) {
        this.out = options.out || 'manifest.json'
    }
    apply(compiler) {
        // thisCompilation 比 compilation 更早、且只针对本次编译（不含子编译器）
        compiler.hooks.thisCompilation.tap('WriteManifestPlugin', compilation => {
            compilation.hooks.processAssets.tap(
                {
                    name: 'WriteManifestPlugin',
                    // 在"产物优化之后、写盘之前"插入，能拿到压缩后的最终体积
                    stage: require('webpack').Compilation.PROCESS_ASSETS_STAGE_REPORT
                },
                () => {
                    const manifest = {}
                    for (const [name, asset] of Object.entries(compilation.assets)) {
                        manifest[name] = { size: asset.size() }
                    }
                    const json = JSON.stringify(manifest, null, 2)
                    // 用 emitAsset 而不是 fs.writeFileSync：产物要进 webpack 的输出流
                    compilation.emitAsset(this.out, new (require('webpack').sources.RawSource)(json))
                }
            )
        })
    }
}

module.exports = { EmitListPlugin, WriteManifestPlugin }
