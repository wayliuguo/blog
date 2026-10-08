// 手写 MiniCssExtractPlugin：替代 mini-css-extract-plugin 的「plugin 那一半」
// 两段式分工：loader 管单个模块（把 CSS 文本登记进来），plugin 管汇总成产物（合成一个 .css 文件）
'use strict'
const crypto = require('node:crypto')
const webpack = require('webpack')

class MiniCssExtractPlugin {
    constructor(options = {}) {
        this.filename = options.filename || '[name].[contenthash:8].css'
        this.name = options.name || 'MiniCssExtractPlugin'
    }

    apply(compiler) {
        // thisCompilation 只针对本次编译（不含子编译器），比 compilation 更早
        compiler.hooks.thisCompilation.tap(this.name, compilation => {
            compilation.hooks.processAssets.tap(
                {
                    name: this.name,
                    // 排在 ADDITIONS(-100)：要早于 MiniHtmlPlugin(SUMMARIZE/1000)，
                    // 否则 HTML 生成时还看不到这个 .css 产物
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
                },
                () => {
                    const registry = compilation.__miniCss
                    if (!registry || registry.size === 0) return

                    // 教学版简化：所有登记到的 CSS 拼成一个文件（真实实现按 chunk 分组、各自产出）
                    const css = [...registry.values()].join('\n')

                    // 官方靠 filename 里的 [contenthash] 占位符；这里手算一个，效果一样
                    const hash = crypto.createHash('md5').update(css).digest('hex').slice(0, 8)
                    const entryName = [...compilation.entrypoints.keys()][0] || 'main'
                    const file = this.filename.replace('[name]', entryName).replace('[contenthash:8]', hash)

                    // 用 emitAsset 产出新文件，而不是 fs.writeFileSync：
                    // 这样它才进 stats、参与 output.clean、跟随 watch
                    compilation.emitAsset(file, new webpack.sources.RawSource(css))
                    console.log(`  [MiniCssExtractPlugin] 汇总 ${registry.size} 个模块 → ${file}`)
                }
            )
        })
    }
}

module.exports = MiniCssExtractPlugin
