/**
 * 校验 node/ 文档的相对链接 + 侧边栏配置链接
 * 用法：node check-links.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const DOC_ROOT = path.join(ROOT, 'node')

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p, acc)
        else if (e.name.endsWith('.md')) acc.push(p)
    }
    return acc
}

function exists(target) {
    if (fs.existsSync(target)) return true
    if (fs.existsSync(target + '.md')) return true
    if (fs.existsSync(path.join(target, 'index.md'))) return true
    return false
}

let total = 0
const problems = []

// 1. 正文相对链接
for (const file of walk(DOC_ROOT)) {
    const text = fs.readFileSync(file, 'utf8')
    const re = /\]\(([^)\s]+)\)/g
    let m
    while ((m = re.exec(text))) {
        const raw = m[1]
        if (/^(https?:|mailto:|#)/.test(raw)) continue
        const target = raw.split('#')[0]
        if (!target) continue
        total++
        let decoded
        try {
            decoded = decodeURIComponent(target)
        } catch {
            decoded = target
        }
        const abs = target.startsWith('/')
            ? path.join(ROOT, decoded.replace(/^\//, ''))
            : path.resolve(path.dirname(file), decoded)
        if (!exists(abs)) {
            problems.push({
                file: path.relative(ROOT, file),
                link: raw,
                resolved: path.relative(ROOT, abs)
            })
        }
    }
}

// 2. 侧边栏链接
const sidebarPath = path.join(ROOT, '.vitepress', 'config', 'node.js')
const sidebar = fs.readFileSync(sidebarPath, 'utf8')
const lre = /link:\s*'([^']+)'/g
let sidebarCount = 0
let lm
while ((lm = lre.exec(sidebar))) {
    const link = lm[1]
    sidebarCount++
    const decoded = decodeURIComponent(link.replace(/^\//, ''))
    const abs = path.join(ROOT, decoded)
    if (!exists(abs)) {
        problems.push({
            file: '.vitepress/config/node.js',
            link,
            resolved: decoded
        })
    }
}

console.log('正文相对链接：' + total + ' 条')
console.log('侧边栏链接：' + sidebarCount + ' 条')
console.log('问题：' + problems.length + ' 处')
for (const p of problems) {
    console.log('  [' + p.file + '] ' + p.link + '  ->  ' + p.resolved)
}
if (!problems.length) console.log('全部通过')
