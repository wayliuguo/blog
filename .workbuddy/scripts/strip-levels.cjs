/**
 * 去除正文的分级标记（分级只保留在 90-附录 面试题库）。
 * 用法：node strip-levels.cjs [--apply]
 *  1) `## [初级] xxx` / `### [中级] xxx`  ->  `## xxx`
 *  2) 删除 `> [高级] 本节内容适合有 2 年以上经验的开发者。` 之类整行
 *  3) 报告其余残留
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const LV = '(?:初级|中级|高级)'

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, out)
        else if (e.name.endsWith('.md')) out.push(p)
    }
    return out
}

const files = walk(path.join(ROOT, 'node'))
const report = { heading: 0, quote: 0, rest: [] }

for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    if (rel === 'node/index.md' || rel.startsWith('node/90-附录/')) continue

    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
    const out = []
    for (const line of lines) {
        const h = line.match(new RegExp(`^(#{2,3})\\s*\\[${LV}\\]\\s*`))
        if (h) {
            report.heading++
            out.push(line.replace(new RegExp(`^(#{2,3})\\s*\\[${LV}\\]\\s*`), '$1 '))
            continue
        }
        if (new RegExp(`^>\\s*\\[${LV}\\]`).test(line)) {
            report.quote++
            continue
        }
        if (new RegExp(`\\[${LV}\\]`).test(line)) report.rest.push(`${rel}: ${line.slice(0, 90)}`)
        out.push(line)
    }

    let text = out.join('\n')
    // 合并因删行产生的连续空行
    text = text.replace(/\n{3,}/g, '\n\n')
    if (APPLY) fs.writeFileSync(f, text)
}

console.log(`H2/H3 级别标签：${report.heading} 处`)
console.log(`整行引用式级别说明：${report.quote} 处`)
console.log(`其余残留：${report.rest.length} 处`)
report.rest.forEach(r => console.log('  ' + r))
console.log(APPLY ? '\n已应用。' : '\n这是预演，加 --apply 执行。')
