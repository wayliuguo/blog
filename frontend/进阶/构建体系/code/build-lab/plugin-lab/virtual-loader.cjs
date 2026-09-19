// webpack 版插件的配套 loader：虚拟模块在 webpack 里要靠 loader 提供内容
module.exports = function virtualLoader() {
    const options = this.getOptions() || {}
    console.log('  [virtual-loader] options.info =', String(options.info).slice(0, 60))
    return `export const BUILD_INFO = ${options.info};`
}
