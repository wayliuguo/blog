// 手写注入全局变量插件：官方等价物是 DefinePlugin（编译期文本替换）/ BannerPlugin（注入头注释）
// DefinePlugin 挂在 parser 上做表达式替换，实现复杂；教学版选 BannerPlugin 的路子——
// 往每个 .js 产物头部插一行 window 全局赋值，效果是「运行时全局变量」。
// 关键坑：contenthash 在 processAssets 之前就算完了，直接改内容，文件名里的 hash 不会变。
// 必须同时 tap chunkHash，把注入内容算进 hash，否则改版本号不会让浏览器缓存失效。
'use strict'
const webpack = require('webpack')

class MiniDefinePlugin {
    constructor(options = {}) {
        this.globalName = options.globalName || '__APP_VERSION__'
        this.value = options.value || '0.0.0'
        this.name = options.name || 'MiniDefinePlugin'
    }

    apply(compiler) {
        const banner = `window["${this.globalName}"] = ${JSON.stringify(this.value)};\n`

        compiler.hooks.thisCompilation.tap(this.name, compilation => {
            // ① 注入内容参与 chunk hash 计算：版本变了 → 文件名变了 → 缓存失效
            compilation.hooks.chunkHash.tap(this.name, (chunk, hash) => {
                hash.update(banner)
            })

            // ② ADDITIONS(-100)：早于压缩(OPTIMIZE_SIZE/400)，banner 会一起被 terser 处理；
            //    早于 HTML(SUMMARIZE/1000)，HTML 引用到的文件名已带上新 hash
            compilation.hooks.processAssets.tap(
                { name: this.name, stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS },
                () => {
                    let count = 0
                    for (const name of Object.keys(compilation.assets)) {
                        if (!name.endsWith('.js')) continue
                        const source = compilation.assets[name].source().toString()
                        compilation.updateAsset(name, new webpack.sources.RawSource(banner + source))
                        count++
                    }
                    console.log(
                        `  [${this.name}] 注入 ${this.globalName}=${JSON.stringify(this.value)} → ${count} 个 JS 产物`
                    )
                }
            )
        })
    }
}

module.exports = MiniDefinePlugin
