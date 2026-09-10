/**
 * 把指向 code/ 的 Markdown 链接改成不可点击的行内代码。
 * 用法：node delink-code.cjs [--apply]
 *   [文本](任意含 code/ 的路径)  ->  `文本`
 * 若文本本身已是行内代码（两端带反引号），保持原样。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const SKIP = new Set([
    'node_modules',
    '.git',
    'public',
    'code',
    'drawio',
    'xmind',
    'dist',
    'verify-dist',
    '.temp',
    '.workbuddy'
])

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (SKIP.has(e.name)) continue
            walk(path.join(dir, e.name), out)
        } else if (e.name.endsWith('.md')) out.push(path.join(dir, e.name))
    }
    return out
}

// 只处理相对路径（排除 http(s) 外链，避免误伤 claude-code/ 这类 URL）
const LINK_RE = /\[([^\]]+)\]\((?!https?:|mailto:)([^)\s]*code\/[^)\s]*)\)/g
let total = 0
const perFile = []

for (const f of walk(ROOT)) {
    const src = fs.readFileSync(f, 'utf8')
    let n = 0
    const out = src.replace(LINK_RE, (_m, text) => {
        n++
        const t = text.trim()
        return t.startsWith('`') && t.endsWith('`') ? t : '`' + t + '`'
    })
    if (n > 0) {
        total += n
        perFile.push(`${path.relative(ROOT, f).replace(/\\/g, '/')}  (${n})`)
        if (APPLY) fs.writeFileSync(f, out)
    }
}

console.log(`含 code 链接的文件：${perFile.length}，链接总数：${total}`)
perFile.forEach(l => console.log('  ' + l))
console.log(APPLY ? '\n已应用。' : '\n这是预演，加 --apply 执行。')
