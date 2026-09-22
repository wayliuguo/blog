/**
 * 剥离指定目录树中所有 Markdown 单篇文档的「## 小结」块。
 *
 * 规则：从 `## 小结` 行开始，删到下一个 `## ` 标题（含边界清理空行）为止；
 * 若 `## 小结` 是最后一个小节，则删到文件末尾。
 * 跳过 <dir>/code/ 下的配套示例代码目录。
 *
 * 用法：
 *   node .workbuddy/scripts/strip-summary-block.cjs <dir>
 */
const fs = require('fs')
const path = require('path')

const target = process.argv[2]
if (!target) {
    console.error('用法: node strip-summary-block.cjs <dir>')
    process.exit(1)
}

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'code') continue // 配套示例代码不参与
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, acc)
        else if (e.name.endsWith('.md')) acc.push(p)
    }
    return acc
}

const changed = []
for (const file of walk(target)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    let i = lines.findIndex(l => /^##\s+小结\s*$/.test(l))
    if (i === -1) continue

    // 找到小结块结束：下一个 `## ` 标题
    let j = i + 1
    while (j < lines.length && !/^##\s/.test(lines[j])) j++

    // 删除 [i, j) 区间，再收敛前后多余空行
    const before = lines.slice(0, i)
    let after = lines.slice(j)
    if (!before.length) {
        // 小结是首块：直接清掉后续前导空行
        before.push('')
    }
    while (after.length && after[0].trim() === '') after.shift()
    // 前段尾部最多留一行空行
    while (before.length && before[before.length - 1].trim() === '') before.pop()
    before.push('')

    fs.writeFileSync(file, before.concat(after).join('\n'))
    changed.push(path.relative(process.cwd(), file))
}

console.log(`共处理 ${changed.length} 个文件的小结块:`)
changed.forEach(f => console.log('  - ' + f))
