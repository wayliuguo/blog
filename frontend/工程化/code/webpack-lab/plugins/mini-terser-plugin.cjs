// 手写 MiniTerserPlugin：替代 terser-webpack-plugin
// 压缩这件事本质就是「在产物优化阶段，把 .js 的源码过一遍 terser，再覆盖回 assets」
'use strict'
const webpack = require('webpack')
const terser = require('terser')

class MiniTerserPlugin {
    constructor(options = {}) {
        this.name = options.name || 'MiniTerserPlugin'
        this.terserOptions = options.terserOptions || {}
    }

    apply(compiler) {
        compiler.hooks.thisCompilation.tap(this.name, compilation => {
            compilation.hooks.processAssets.tapPromise(
                {
                    name: this.name,
                    // 官方 TerserPlugin 挂在 OPTIMIZE_SIZE(400)：此时产物内容已定，
                    // 排在它之后的插件（如 MiniHtmlPlugin）才能引用到压缩后的最终结果
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
                },
                async () => {
                    const targets = Object.keys(compilation.assets).filter(name => name.endsWith('.js'))

                    await Promise.all(
                        targets.map(async name => {
                            const before = compilation.assets[name].source().toString()
                            const result = await terser.minify(before, {
                                format: { comments: false },
                                ...this.terserOptions
                            })
                            if (result.error) throw result.error
                            // updateAsset 是覆盖已有产物的正确方式，文件名不变、hash 由 webpack 重算
                            compilation.updateAsset(name, new webpack.sources.RawSource(result.code))
                            const kb = n => (n / 1024).toFixed(2)
                            console.log(
                                `  [MiniTerserPlugin] ${name}: ${kb(before.length)} KB → ${kb(result.code.length)} KB`
                            )
                        })
                    )
                }
            )
        })
    }
}

module.exports = MiniTerserPlugin
