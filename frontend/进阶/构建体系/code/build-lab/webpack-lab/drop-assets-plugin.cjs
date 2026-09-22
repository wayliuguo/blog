// webpack 自定义插件：构建后将指定产物文件从输出中剔除（如 LICENSE、sourcemap、多余 chunk）
// 挂在 processAssets 的 OPTIMIZE 之后（300 以后即可，这里用 400 与 Terser 同段后，防止又写回来）
// 运行：npm run webpack:drop （主配置 --env drop）
'use strict'

class DropAssetsPlugin {
    constructor(options = {}) {
        this.ignore = options.ignore || [] // 文件名或正则
        this.name = options.name || 'DropAssetsPlugin'
    }

    apply(compiler) {
        compiler.hooks.compilation.tap(this.name, compilation => {
            compilation.hooks.processAssets.tap(
                {
                    name: this.name,
                    stage: require('webpack').Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE + 1
                },
                assets => {
                    const matched = Object.keys(assets).filter(name => {
                        return this.ignore.some(rule => (typeof rule === 'string' ? name === rule : rule.test(name)))
                    })
                    for (const name of matched) {
                        delete assets[name]
                        console.log('  [DropAssetsPlugin] 剔除:', name)
                    }
                }
            )
        })
    }
}

module.exports = DropAssetsPlugin
