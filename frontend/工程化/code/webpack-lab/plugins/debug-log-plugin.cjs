// 钩子间谍插件：把 compiler.hooks 上的关键钩子逐个 tap 一遍，打印此刻拿到的参数，
// 然后原样放行（不影响构建）。默认关闭，DEBUG_WP=1 时启用——webpack.config.cjs 里条件挂载。
// 用途：对照「常用钩子与一次编译的时间线」，亲眼看每个钩子在哪一步、参数长什么样。
'use strict'
const util = require('node:util')

/** 打印工具：字符串截断，对象用 util.inspect 限深，防止刷屏 */
function log(hook, detail) {
    const body =
        typeof detail === 'string'
            ? detail.length > 120
                ? detail.slice(0, 120) + '…'
                : detail
            : util.inspect(detail, { depth: 2, colors: false, breakLength: 120 })
    console.log(`[debug-log] ${hook}  ${body}`)
}

module.exports = class DebugLogPlugin {
    static name = 'DebugLogPlugin'

    apply(compiler) {
        // ① 读到 entry 配置之后
        compiler.hooks.entryOption.tap(DebugLogPlugin.name, (context, entry) => {
            log('entryOption', entry)
        })

        // ② 所有插件装完，配置已定稿
        compiler.hooks.afterPlugins.tap(DebugLogPlugin.name, (compiler) => {
            log('afterPlugins', `plugins.length=${compiler.options.plugins.length}, mode=${compiler.options.mode}`)
        })

        // ③ 新一次编译即将开始（watch 下每次重编都触发）
        compiler.hooks.compile.tap(DebugLogPlugin.name, (params) => {
            log('compile', `normalModuleFactory=${!!params.normalModuleFactory}`)
        })

        // ④ 依赖图生长阶段：从 entry 开始递归建模块
        compiler.hooks.make.tapAsync(DebugLogPlugin.name, (compilation, callback) => {
            log('make', '开始递归建模块（结束后才进入 seal）')
            callback()
        })

        // ⑤ 产物已定稿、尚未写盘：能拿到全部 assets
        compiler.hooks.emit.tap(DebugLogPlugin.name, (compilation) => {
            const names = Object.keys(compilation.assets)
            log('emit', `assets(${names.length})=[${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''}]`)
        })

        // ⑥ 写盘之后
        compiler.hooks.afterEmit.tap(DebugLogPlugin.name, (compilation) => {
            log('afterEmit', '产物已写入 dist/')
        })

        // ⑦ 整个构建结束：stats 背后就是 compilation，直接取汇总数
        compiler.hooks.done.tap(DebugLogPlugin.name, (stats) => {
            const { compilation } = stats
            log(
                'done',
                `hash=${compilation.hash}, duration=${stats.endTime - stats.startTime}ms, modules=${compilation.modules.size}, assets=${Object.keys(compilation.assets).length}`
            )
        })
    }
}
