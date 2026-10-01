// 手写 mini-css-extract 的「loader 那一半」
// 职责：把本模块的 CSS 文本登记到 compilation 上，交给 plugin 汇总成独立 .css 文件
//
// 为什么必须用 pitch：
//   loader 链是「从右往左」执行，轮到本 loader 的普通阶段时，source 已经是 css-loader 产出的 JS 代码，
//   取不到 CSS 文本。pitch 是「从左往右」先执行，且能直接拿到 remainingRequest（它后面那条链），
//   拿它去 importModule 就能把 css-loader 的导出（CSS 字符串）取回来。
'use strict'

module.exports = function extractCssLoader() {
    // 普通阶段不会被走到：pitch 已经返回了模块内容，webpack 会跳过剩下的 loader
}

module.exports.pitch = function (remainingRequest) {
    const callback = this.async()
    const compilation = this._compilation

    // importModule 是 webpack 5 提供的 loader API：在构建期把一条 loader 链跑一遍并拿回它的导出
    this.importModule(`!!${remainingRequest}`, {}, (err, exports) => {
        if (err) return callback(err)

        const css = typeof exports === 'string' ? exports : exports && exports.default
        if (typeof css !== 'string') {
            return callback(new Error('[extract-css-loader] 没拿到 CSS 文本，检查 css-loader 是否在这条链上'))
        }

        // 登记到 compilation：plugin 在 processAssets 阶段会来取
        if (!compilation.__miniCss) compilation.__miniCss = new Map()
        compilation.__miniCss.set(this.resourcePath, css)

        // 返回占位模块：样式已经由 plugin 汇总成独立文件，JS 侧不需要再塞内容
        callback(null, 'export default undefined\n')
    })
}