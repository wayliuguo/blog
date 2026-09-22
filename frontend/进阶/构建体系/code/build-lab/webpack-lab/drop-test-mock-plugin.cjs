// webpack 自定义插件：剔除测试 / mock 文件，让它们根本不进入打包
// 原理：依赖解析发生在 NormalModuleFactory；在 beforeResolve 钩子里对指定路径 return false，就跳过该模块
// 运行：npm run webpack:drop （主配置 --env drop，走 pit-app）
'use strict'

class DropTestAndMockPlugin {
    constructor(options = {}) {
        this.pattern = options.pattern || /\.(test|spec|mock)\.js$/
        this.name = options.name || 'DropTestAndMockPlugin'
    }

    apply(compiler) {
        // NormalModuleFactory 管「依赖 → 模块」的解析；beforeResolve 返回 false 等价于 webpack.IgnorePlugin
        compiler.hooks.normalModuleFactory.tap(this.name, factory => {
            factory.hooks.beforeResolve.tap(this.name, resolveData => {
                if (resolveData.request && this.pattern.test(resolveData.request)) {
                    // 命中 test/spec/mock → 告诉 webpack 跳过这个模块
                    return false
                }
                return undefined
            })
        })
    }
}

module.exports = DropTestAndMockPlugin
