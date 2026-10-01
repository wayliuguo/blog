'use strict'

// 一个极简插件：在 emit 时把产物清单打出来（对应 webpack 篇 4.1 的 EmitListPlugin）。
// 插件的全部接口就是「拿到 compiler，往它（或 compilation）的 hooks 上挂函数」。
class EmitListPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap('EmitListPlugin', compilation => {
            console.log('\n---- 产物清单（emit 钩子）----')
            for (const [name, content] of Object.entries(compilation.assets)) {
                console.log(`  ${name.padEnd(24)} ${(content.length / 1024).toFixed(1)} KB`)
            }
        })
    }
}

module.exports = { EmitListPlugin }