// webpack：loader 就是"输入源码字符串、输出 JS 代码字符串"的函数
// 这里实现一个 .txt loader：把纯文本变成导出字符串的 JS 模块
module.exports = function txtLoader(source) {
    // this.query / this.getOptions() 拿 loader 配置
    const options = this.getOptions() || {}
    const varName = options.exportName || 'content'

    // 开发时打印一下，方便看到"loader 被谁、被调用了几次"
    if (options.verbose) {
        console.log('  [txt-loader] 处理:', this.resourcePath.split(/[\\/]/).pop())
    }

    // 关键：返回的是"代码字符串"，不是值
    return `export const ${varName} = ${JSON.stringify(source.trim())};\nexport default ${varName};\n`
}
