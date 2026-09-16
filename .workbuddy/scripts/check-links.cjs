/**
 * 校验文档链接是否指向真实存在的页面：
 *   1. node/ 下正文里的相对/绝对链接
 *   2. .vitepress/config/*.js 里的侧边栏与顶部导航链接
 *   3. 站点落地页（index.md）frontmatter 与正文里的链接
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
    // 目录链接必须落在 index.md 上，否则 VitePress 会判死链
    if (fs.existsSync(target)) {
        return fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.md'))
    }
    if (fs.existsSync(target + '.md')) return true
    if (fs.existsSync(path.join(target, 'index.md'))) return true
    return false
}

function decode(raw) {
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}

const problems = []

// 1. node/ 下正文链接
let bodyCount = 0
for (const file of walk(DOC_ROOT)) {
    const text = fs.readFileSync(file, 'utf8')
    const re = /\]\(([^)\s]+)\)/g
    let m
    while ((m = re.exec(text))) {
        const raw = m[1]
        if (/^(https?:|mailto:|#)/.test(raw)) continue
        const target = raw.split('#')[0]
        if (!target) continue
        bodyCount++
        const decoded = decode(target)
        const abs = target.startsWith('/')
            ? path.join(ROOT, decoded.replace(/^\//, ''))
            : path.resolve(path.dirname(file), decoded)
        if (!exists(abs)) {
            problems.push({ file: path.relative(ROOT, file), link: raw, resolved: path.relative(ROOT, abs) })
        }
    }
}

// 2. .vitepress/config/*.js 里的侧边栏与顶部导航链接
const configDir = path.join(ROOT, '.vitepress', 'config')
const configRe = /(?:^|\s)link:\s*'([^']+)'/gm
let configCount = 0
for (const name of fs.readdirSync(configDir).filter((f) => f.endsWith('.js')).sort()) {
    const file = path.join(configDir, name)
    const text = fs.readFileSync(file, 'utf8')
    let m
    while ((m = configRe.exec(text))) {
        const link = m[1]
        if (/^https?:/.test(link)) continue
        configCount++
        const decoded = decode(link.replace(/^\//, ''))
        if (!exists(path.join(ROOT, decoded))) {
            problems.push({
                file: path.relative(ROOT, file),
                link,
                resolved: decoded
            })
        }
    }
}

// 3. 站点落地页：frontmatter 的 link: 与正文链接
let landingCount = 0
for (const name of ['index.md']) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
    if (fm) {
        const fmRe = /(?:^|\s)link:\s*'?(.+?)'?\s*$/gm
        let m
        while ((m = fmRe.exec(fm[1]))) {
            const link = m[1].trim()
            if (/^https?:/.test(link)) continue
            landingCount++
            const decoded = decode(link.replace(/^\//, ''))
            if (!exists(path.join(ROOT, decoded))) {
                problems.push({ file: name + ' (frontmatter)', link, resolved: decoded })
            }
        }
    }
    const re = /\]\(([^)\s]+)\)/g
    let m
    while ((m = re.exec(text))) {
        const raw = m[1]
        if (/^(https?:|mailto:|#)/.test(raw)) continue
        landingCount++
        const decoded = decode(raw.split('#')[0])
        const abs = raw.startsWith('/')
            ? path.join(ROOT, decoded.replace(/^\//, ''))
            : path.resolve(ROOT, decoded)
        if (!exists(abs)) {
            problems.push({ file: name, link: raw, resolved: path.relative(ROOT, abs) })
        }
    }
}

console.log('正文相对链接：' + bodyCount + ' 条')
console.log('导航/侧边栏链接：' + configCount + ' 条')
console.log('落地页链接：' + landingCount + ' 条')
console.log('问题：' + problems.length + ' 处')
for (const p of problems) {
    console.log('  [' + p.file + '] ' + p.link + '  ->  ' + p.resolved)
}
if (!problems.length) console.log('全部通过')
