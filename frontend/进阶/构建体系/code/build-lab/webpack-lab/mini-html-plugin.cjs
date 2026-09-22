// 模仿 HtmlWebpackPlugin 的核心：在 processAssets 阶段读产物，生成 index.html 并注入各 chunk 的 <script>/<link>
// 真实 HtmlWebpackPlugin 还支持模板引擎、favicon、minify、多页，但"注入带 hash 的资源引用"这个灵魂就是这段
// 运行：npm run webpack:minihtml （主配置 --env minihtml，走 spa-app）
'use strict'
const path = require('node:path')
const webpack = require('webpack')

class MiniHtmlWebpackPlugin {
    constructor(options = {}) {
        this.template = options.template || '{{body}}'
        this.filename = options.filename || 'index.html'
        this.name = options.name || 'MiniHtmlWebpackPlugin'
    }

    apply(compiler) {
        compiler.hooks.make.tap(this.name, compilation => {
            // 让 webpack 认为我们产出了 index.html（否则 clean 选项只清理注册过的 asset）
        })

        compiler.hooks.compilation.tap(this.name, compilation => {
            compilation.hooks.processAssets.tap(
                {
                    name: this.name,
                    // HtmlWebpackPlugin 官方就挂在 PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE。这里是 200 后、压缩前也行
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
                },
                assets => {
                    // 收集实际写盘的 js/css（跳过 sourcemap 与 runtime 之外的所有 js）
                    const jsTags = []
                    const cssTags = []
                    for (const name of Object.keys(assets)) {
                        if (name.endsWith('.js')) jsTags.push(`<script src="/${name}"></script>`)
                        else if (name.endsWith('.css')) cssTags.push(`<link rel="stylesheet" href="/${name}" />`)
                    }
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${cssTags.join('\n')}</head>
<body><div id="root"></div>${jsTags.join('\n')}</body></html>`
                    // 用 compilation.emitAsset（不要 fs.writeFileSync），这样产物进 stats、跟随 clean/watch
                    compilation.emitAsset(this.filename, new webpack.sources.RawSource(html))
                    console.log(
                        '\n[%s] 生成 %s（注入 %d 个 script / %d 个 css）',
                        this.name,
                        this.filename,
                        jsTags.length,
                        cssTags.length
                    )
                }
            )
        })
    }
}

module.exports = MiniHtmlWebpackPlugin
