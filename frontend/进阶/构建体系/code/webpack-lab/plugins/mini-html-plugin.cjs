// 手写 MiniHtmlPlugin：替代 HtmlWebpackPlugin
// 灵魂只有一句：从 compilation.assets 里「现读」带 hash 的最终文件名，拼进模板再产出 index.html
// 所以 hash 变了它会自动跟着变——这就是官方插件不让你手写 <script src="app.js"> 的原因
'use strict'
const webpack = require('webpack')

class MiniHtmlPlugin {
    constructor(options = {}) {
        this.filename = options.filename || 'index.html'
        this.title = options.title || 'webpack demo'
        this.name = options.name || 'MiniHtmlPlugin'
    }

    apply(compiler) {
        compiler.hooks.thisCompilation.tap(this.name, compilation => {
            compilation.hooks.processAssets.tap(
                {
                    name: this.name,
                    // 排在 MiniCssExtractPlugin(ADDITIONS/-100) 之后、压缩之前，
                    // 保证 CSS/JS 产物都已就位，且拿到的是压缩后的最终文件名
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
                },
                () => {
                    const publicPath = compilation.outputOptions.publicPath || ''

                    // JS 用 entrypoint 给的顺序（runtime 必须在 main 之前），不是 assets 的遍历顺序
                    const jsTags = []
                    for (const entrypoint of compilation.entrypoints.values()) {
                        for (const file of entrypoint.getFiles()) {
                            if (file.endsWith('.js')) jsTags.push(`<script src="${publicPath}${file}"></script>`)
                        }
                    }

                    // CSS 不是 entrypoint 的文件（由我们自己的插件产出），所以从 assets 里筛
                    const cssTags = Object.keys(compilation.assets)
                        .filter(name => name.endsWith('.css'))
                        .map(name => `<link rel="stylesheet" href="${publicPath}${name}" />`)

                    const html = [
                        '<!DOCTYPE html>',
                        '<html lang="zh-CN">',
                        '<head>',
                        '<meta charset="UTF-8">',
                        '<meta name="viewport" content="width=device-width, initial-scale=1">',
                        `<title>${this.title}</title>`,
                        ...cssTags,
                        '</head>',
                        '<body>',
                        '<div id="app"></div>',
                        ...jsTags,
                        '</body>',
                        '</html>',
                        ''
                    ].join('\n')

                    // 同样用 emitAsset：写盘、stats、clean、watch 才会都照顾到
                    compilation.emitAsset(this.filename, new webpack.sources.RawSource(html))
                    console.log(`  [MiniHtmlPlugin] 注入 ${jsTags.length} 个 script / ${cssTags.length} 个 link → ${this.filename}`)
                }
            )
        })
    }
}

module.exports = MiniHtmlPlugin