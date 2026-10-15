// 手写 css-loader：把 CSS 源码变成「导出一个 CSS 字符串的 JS 模块」
// 做两件官方 css-loader 也在做的事：
//   1. 递归内联 @import（官方默认行为就是内联，不会额外产生模块）
//   2. 把相对 url() 改写成 require()，运行时插值出带 hash 的最终文件名
'use strict'
const fs = require('node:fs')
const path = require('node:path')

const IMPORT_RE = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;/g
const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

// 远程地址 / data URI / 根路径不做改写，交给浏览器自己去取
function isRemote(request) {
    return /^(https?:)?\/\//.test(request) || request.startsWith('data:') || request.startsWith('/')
}

// 递归内联 @import：远程 @import 保持原样
function inlineImports(css, dir, ctx) {
    return css.replace(IMPORT_RE, (whole, request) => {
        if (isRemote(request)) return whole
        const abs = path.resolve(dir, request)
        // 告诉 webpack：这个文件也是本次构建的依赖，它改了要重新编译（真实 loader 也这么做）
        ctx.addDependency(abs)
        return inlineImports(fs.readFileSync(abs, 'utf8'), path.dirname(abs), ctx)
    })
}

module.exports = function cssLoader(source) {
    const dir = path.dirname(this.resourcePath)

    // ① 内联 @import
    const css = inlineImports(source, dir, this)

    // ② 相对 url() → require()，拼成「字符串 + 变量」的拼接表达式
    //    不用模板字符串是为了避开 CSS 里反引号 / ${} 的转义坑
    const requires = []
    const parts = []
    let last = 0
    let n = 0
    css.replace(URL_RE, (whole, quote, request, offset) => {
        if (isRemote(request)) return whole
        const abs = path.resolve(dir, request)
        const name = `__asset${n++}`
        requires.push(`const ${name} = require(${JSON.stringify(abs.replace(/\\/g, '/'))})`)
        // 保留 url( 与 ) 本身，只把中间那个资源地址换成运行时插值
        parts.push(JSON.stringify(css.slice(last, offset) + 'url('), name)
        last = offset + whole.length - 1 // 停在结尾的 ')'，下一段从它开始
        return whole
    })
    parts.push(JSON.stringify(css.slice(last)))

    // ③ loader 的输出必须是「JS 代码字符串」，而不是 CSS 文本本身
    return [...requires, `const css = ${parts.join(' + ')}`, 'export default css', ''].join('\n')
}
