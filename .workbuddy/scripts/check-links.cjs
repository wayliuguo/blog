/**
 * 校验文档链接是否指向真实存在的页面：
 *   1. 各板块（ai / frontend / node / docs…）正文里的相对链接
 *   2. .vitepress/config/*.js 里的侧边栏与顶部导航链接
 *   3. 站点落地页（index.md）frontmatter 与正文里的链接
 *
 * 用法：
 *   node .workbuddy/scripts/check-links.cjs                  # 全部板块
 *   node .workbuddy/scripts/check-links.cjs --board frontend  # 只查前端板块
 *
 * 注意：链接目标里出现裸空格（如 `](../JavaScript 核心/a.md)`）会被 markdown-it 判为
 * 非法目标、渲染成纯文本，VitePress 又不会报死链——属于静默失效，这里单独拦。
 */
const fs = require('fs')
const path = require('path')
const boards = require('./boards.cjs')

const ROOT = boards.ROOT
const LINK_RE = /\]\(([^)\n]+)\)/g

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

/** 扫一段正文里的 markdown 链接 */
function scanBody(text, file, counter) {
    const body = boards.stripFences(text)
    let m
    LINK_RE.lastIndex = 0
    while ((m = LINK_RE.exec(body))) {
        const raw = m[1].trim()
        if (/^(https?:|mailto:|#)/.test(raw)) continue
        counter.n++
        if (/\s/.test(raw)) {
            problems.push({
                file,
                link: raw,
                kind: '裸空格',
                resolved: '（目标含空格，渲染成纯文本，链接失效）'
            })
            continue
        }
        const target = raw.split('#')[0]
        if (!target) continue
        const decoded = decode(target)
        const abs = target.startsWith('/')
            ? path.join(ROOT, decoded.replace(/^\//, ''))
            : path.resolve(path.dirname(file), decoded)
        if (!exists(abs)) {
            problems.push({
                file: path.relative(ROOT, file),
                link: raw,
                kind: '死链',
                resolved: path.relative(ROOT, abs)
            })
        }
    }
}

// 1. 各板块正文链接
const picked = boards.select(boards.contentBoards())
let bodyCount = 0
for (const board of picked) {
    const files = boards.walkMd(path.join(ROOT, board))
    const counter = { n: 0 }
    for (const file of files) scanBody(fs.readFileSync(file, 'utf8'), file, counter)
    bodyCount += counter.n
    console.log(`[${board}] 文档 ${files.length} 篇 · 链接 ${counter.n} 条`)
}

// 2. .vitepress/config/*.js 里的侧边栏与顶部导航链接
const configDir = path.join(ROOT, '.vitepress', 'config')
const configRe = /(?:^|\s)link:\s*'([^']+)'/gm
let configCount = 0
for (const name of fs
    .readdirSync(configDir)
    .filter(f => f.endsWith('.js'))
    .sort()) {
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
                kind: '死链',
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
                problems.push({ file: name + ' (frontmatter)', link, kind: '死链', resolved: decoded })
            }
        }
    }
    const counter = { n: 0 }
    scanBody(text, file, counter)
    landingCount += counter.n
}

console.log('='.repeat(70))
console.log('正文相对链接：' + bodyCount + ' 条')
console.log('导航/侧边栏链接：' + configCount + ' 条')
console.log('落地页链接：' + landingCount + ' 条')
console.log('问题：' + problems.length + ' 处')
for (const p of problems) {
    console.log(`  [${p.kind}] [${p.file}] ${p.link}  ->  ${p.resolved}`)
}
if (!problems.length) console.log('全部通过')
process.exit(problems.length ? 1 : 0)
