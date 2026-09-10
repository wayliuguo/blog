/**
 * 顶部元信息块（本篇位置 / 前置依赖 / 学完你能做到）-> 「承上 / 启下」两行。
 * 用法：node head-to-hook.cjs [--apply]
 *
 * 承上 = 本篇原有「前置依赖」正文（保留链接与说明）
 * 启下 = 下一篇标题 + 链接 + 该篇的「学完你能做到」（从下一篇文件读取，不新编内容）
 * 头部其它引用行（如开篇导语、「本篇在全景图的哪一层」）按原相对位置保留。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const LABEL = /^\*\*(本篇位置|前置依赖|学完你能做到)\*\*/

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, out)
        else if (e.name.endsWith('.md')) out.push(p)
    }
    return out
}

const all = walk(path.join(ROOT, 'node')).filter(f => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    return rel !== 'node/index.md' && !rel.startsWith('node/90-附录/')
})

const achv = new Map()
for (const f of all) {
    const m = fs.readFileSync(f, 'utf8').match(/^>\s*\*\*学完你能做到\*\*[：:]\s*(.+)$/m)
    if (m) achv.set(path.resolve(f), m[1].trim())
}

let done = 0
const skipped = []

for (const f of all) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

    let h1 = 0
    while (h1 < lines.length && !/^#\s/.test(lines[h1])) h1++
    if (h1 >= lines.length) continue

    let j = h1 + 1
    while (j < lines.length && lines[j].trim() === '') j++
    const startJ = j
    const collected = []
    while (j < lines.length && (lines[j].startsWith('>') || lines[j].trim() === '')) {
        collected.push(lines[j])
        j++
    }
    let endJ = j
    while (collected.length && collected[collected.length - 1].trim() === '') {
        collected.pop()
        endJ--
    }
    if (!collected.some(l => /^\*\*前置依赖\*\*/.test(l.replace(/^>\s*/, '')))) {
        skipped.push(rel)
        continue
    }

    const isLabel = l => LABEL.test(l.replace(/^>\s*/, ''))
    const idxs = collected.map((l, k) => (isLabel(l) ? k : -1)).filter(k => k >= 0)
    const first = idxs[0]
    const last = idxs[idxs.length - 1]

    const beforeExtras = collected.slice(0, first).filter(l => l.trim())
    const afterExtras = collected.slice(last + 1).filter(l => l.trim())

    const pre = collected.find(l => /^\*\*前置依赖\*\*/.test(l.replace(/^>\s*/, '')))
    const cheng = pre.replace(/^>\s*\*\*前置依赖\*\*[：:]\s*/, '').trim()

    let qi = ''
    const refIdx = lines.findIndex(l => /^##\s*参考/.test(l))
    if (refIdx >= 0) {
        const nl = lines.slice(refIdx).find(l => /^-\s*下一篇[：:]/.test(l.trim()))
        const mm = nl && nl.match(/^-\s*下一篇[：:]\s*\[([^\]]+)\]\(([^)]+)\)/)
        if (mm) {
            const [, title, rawLink] = mm
            const target = path.resolve(path.dirname(f), decodeURIComponent(rawLink) + '.md')
            const t = achv.get(target)
            qi = t ? `[${title}](${rawLink}) —— ${t}` : `[${title}](${rawLink})`
        }
    }

    const newBlock = [...beforeExtras, `> 承上：${cheng}`]
    if (qi) newBlock.push(`> 启下：${qi}`)
    newBlock.push(...afterExtras)

    const text = [...lines.slice(0, h1 + 1), '', ...newBlock, ...lines.slice(endJ)]
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')

    done++
    if (APPLY) fs.writeFileSync(f, text)
}

console.log(`处理文档：${done}`)
if (skipped.length) {
    console.log(`跳过（无前置依赖块）：${skipped.length}`)
    skipped.forEach(s => console.log('  ' + s))
}
console.log(APPLY ? '\n已应用。' : '\n这是预演，加 --apply 执行。')
