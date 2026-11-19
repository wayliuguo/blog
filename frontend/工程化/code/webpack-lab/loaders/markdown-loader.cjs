// 手写 markdown-loader：最简「同步 loader」
// 本质一句话：输入源码字符串，输出「JS 模块代码字符串」。
// 输出必须是能被 JS import 的代码，而不是渲染结果本身——所以这里 export default 一个 HTML 字符串。
// 演示用语法集：标题 / 加粗 / 行内代码 / 无序列表 / 段落，够说明 loader 的模型。
'use strict'

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function mdToHtml(md) {
    const lines = escapeHtml(md).split(/\r?\n/)
    const out = []
    let inList = false

    for (const line of lines) {
        // 无序列表：连续的 "- " 行收进一个 <ul>
        const li = line.match(/^- (.*)$/)
        if (li) {
            if (!inList) {
                out.push('<ul>')
                inList = true
            }
            out.push(`<li>${li[1]}</li>`)
            continue
        }
        if (inList) {
            out.push('</ul>')
            inList = false
        }

        const h = line.match(/^(#{1,4}) (.*)$/)
        if (h) {
            const level = h[1].length
            out.push(`<h${level}>${h[2]}</h${level}>`)
            continue
        }
        if (!line.trim()) continue
        out.push(`<p>${line}</p>`)
    }
    if (inList) out.push('</ul>')

    // 行内语法在块级结构拼完之后统一替换，避免干扰逐行匹配
    return out
        .join('\n')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// 同步 loader：直接 return；异步 loader 才需要 this.async() + callback
module.exports = function markdownLoader(source) {
    return `export default ${JSON.stringify(mdToHtml(source))}\n`
}
