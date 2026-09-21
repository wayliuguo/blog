// webpack 深入：插件调试入口（Node API 版）
// 用途：把「跑构建」这件事变成一段普通 JS，好让你在钩子上打断点、单步进去看参数
// 用法一（推荐）VS Code：在本文件任意 debugger 行左侧点红点 → F5 → 选「调试 webpack 插件」
// 用法二（不挑编辑器）：node --inspect-brk=9229 webpack-lab/debug-entry.cjs
//                      然后浏览器打开 chrome://inspect（或 edge://inspect）
// 只调试钩子时不要 npm run webpack：CLI 入口隔了一层 npm.cmd，--inspect-brk 传不到 node 上
const path = require('node:path')
const webpack = require('webpack')

const CONFIG = require('./webpack.config.cjs')

// 调试专用：关掉持久化缓存，否则第二次命中缓存时 buildModule / normalModuleLoader 直接不触发
const config = Object.assign({}, CONFIG, {
    cache: false,
    output: Object.assign({}, CONFIG.output, { path: path.join(__dirname, 'dist-debug') })
})

class DebugTargetPlugin {
    apply(compiler) {
        // 断点 1：compilation 刚诞生，assets / modules / chunks 此刻都是空的
        compiler.hooks.compilation.tap('DebugTarget', compilation => {
            const snap = () => ({
                assets: compilation.getAssets().length,
                modules: compilation.modules.size,
                chunks: compilation.chunks.size
            })

            // 断点 2：seal 之后不能再往里加模块，这里能看到完整的模块图
            compilation.hooks.seal.tap('DebugTarget', () => {
                debugger
            })

            // 断点 3：产物已就绪，增删改 assets 的最后窗口（stage 决定你在哪一层）
            compilation.hooks.processAssets.tap(
                {
                    name: 'DebugTarget',
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
                },
                assets => {
                    // 在这里可以观察：Object.keys(assets) 就是最终产物清单
                    debugger
                }
            )
        })

        // 断点 4：everything 结束，stats 里是本次构建的全部结论
        compiler.hooks.done.tap('DebugTarget', stats => {
            debugger
        })
    }
}

config.plugins = (config.plugins || []).concat([new DebugTargetPlugin()])

webpack(config, (err, stats) => {
    if (err) {
        console.error('构建失败：', err)
        process.exit(1)
    }
    console.log(stats.toString({ colors: false, chunks: false, modules: false }))
})
