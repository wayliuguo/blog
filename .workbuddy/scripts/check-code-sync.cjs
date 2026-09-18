// 校验「文档代码 ↔ 配套代码」是否对齐
//
// 规则：
//   1. node/ 下每篇正文（排除 code/）的每个 ```javascript / ```js / ```typescript 代码块，
//      正上方 4 行内必须有出处标注：
//          > 摘自 `<相对路径>`（运行：`npm run xxx`）
//      或者显式声明为非配套脚本的示意片段：
//          > 示意片段（无配套脚本）
//   2. 有出处标注的代码块，内容按 `// …` 省略行切段，**每一段**去掉注释与空白后
//      都必须能在标注文件里找到（即脚本是文档代码的来源）。
//   3. 被标注的脚本必须出现在该篇 `## 配套代码` 表里（否则读者从表里找不到它）。
//
// 用法：
//   node .workbuddy/scripts/check-code-sync.cjs                    # 全部板块
//   node .workbuddy/scripts/check-code-sync.cjs --board frontend    # 只查前端板块
//   node .workbuddy/scripts/check-code-sync.cjs --module 运行环境    # 限定模块（相对板块根）
//   node .workbuddy/scripts/check-code-sync.cjs --strict            # 示意片段也算问题
const fs = require('fs')
const path = require('path')
const boards = require('./boards.cjs')

const ROOT = boards.ROOT
const ARGS = process.argv.slice(2)
const MODULE_FILTER = ARGS.includes('--module') ? ARGS[ARGS.indexOf('--module') + 1] : null
const STRICT = ARGS.includes('--strict')

// 参与「出处标注 + 逐字溯源」检查的语言。前端板块的主力语言是 css / html / jsx / vue，
// 只盯 js/ts 会让绝大多数代码块处于无人看管的状态。
const LANG_OK = new Set([
    'javascript',
    'js',
    'typescript',
    'ts',
    'css',
    'scss',
    'html',
    'jsx',
    'tsx',
    'vue',
    'json'
])
const ELLIPSIS = /^\s*\/\/\s*(…|\.\.\.)/

// 去掉注释与所有空白，只留代码骨架
// 关键：字符串字面量（' " `）内部的 // 与 /* 不能当成注释删掉——否则 mongodb://、
// http:// 这类 URL 会被吃后半截，造成「代码对不上」的误报。
function skeleton(src) {
    let out = ''
    let i = 0
    const n = src.length
    let inStr = null // 当前处于哪种字符串：' " `
    let escaped = false
    while (i < n) {
        const c = src[i]
        if (inStr) {
            if (escaped) {
                out += c
                escaped = false
            } else if (c === '\\') {
                out += c
                escaped = true
            } else if (c === inStr) {
                out += c
                inStr = null
            } else if (c === '\n') {
                // 普通字符串不允许跨行（模板字符串允许）；保守起见遇到换行就当字符串结束
                out += c
                inStr = null
            } else if (/\s/.test(c)) {
                // 串内空白去掉，保持与原实现一致
            } else {
                out += c
            }
            i++
            continue
        }
        // 不在字符串内
        if (c === '/' && src[i + 1] === '/') {
            while (i < n && src[i] !== '\n') i++ // 行注释跳到行尾
            continue
        }
        if (c === '/' && src[i + 1] === '*') {
            i += 2
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++
            i += 2
            continue
        }
        if (c === '"' || c === "'" || c === '`') {
            out += c
            inStr = c
            i++
            continue
        }
        if (/\s/.test(c)) {
            i++
            continue
        }
        out += c
        i++
    }
    return out
}

// 收集该篇 code/ 目录下的脚本文件（用于诊断提示）
function scriptFiles(docDir) {
    const out = []
    const codeDir = path.join(docDir, 'code')
    if (!fs.existsSync(codeDir)) return out
    ;(function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name)
            if (e.isDirectory()) {
                if (e.name === 'node_modules') continue
                walk(p)
            } else if (/\.(js|cjs|mjs|ts)$/.test(e.name)) out.push(p)
        }
    })(codeDir)
    return out
}

// 解析 ## 配套代码 表里的路径（第一列）
function tablePaths(text) {
    const i = text.indexOf('## 配套代码')
    if (i < 0) return null
    const j = text.indexOf('\n## ', i + 5)
    const seg = text.slice(i, j > 0 ? j : undefined)
    const out = new Set()
    for (const line of seg.split('\n')) {
        const m = line.match(/^\|\s*`?([^|`]+?)`?\s*\|/)
        if (m && m[1].includes('/')) out.add(m[1].trim())
    }
    return out
}

const problems = []
const stats = { docs: 0, blocks: 0, aligned: 0, sketch: 0, noAnno: 0, mismatch: 0, table: 0, short: 0 }

function note(doc, line, kind, msg) {
    problems.push({ doc, line, kind, msg })
}

function checkDoc(docPath, text) {
    const rel = path.relative(ROOT, docPath).replace(/\\/g, '/')
    const docDir = path.dirname(docPath)
    const lines = text.split('\n')
    const tbl = tablePaths(text)
    const cached = new Map()

    stats.docs++
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*```(\w*)\s*$/)
        if (!m) continue
        const lang = m[1]
        let j = i + 1
        while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++
        const body = lines.slice(i + 1, j).join('\n')
        const startLine = i + 1
        i = j
        if (!LANG_OK.has(lang)) continue

        stats.blocks++

        // 找上方 4 行内的标注
        let src = null
        let sketch = false
        for (let k = Math.max(0, startLine - 5); k < startLine - 1; k++) {
            const l = lines[k]
            const a = l.match(/摘自\s*`([^`]+)`/)
            if (a) src = a[1]
            if (/示意片段/.test(l)) sketch = true
        }

        if (!src) {
            if (sketch) {
                stats.sketch++
                if (STRICT) note(rel, startLine, '示意片段', '声明为无配套脚本的示意片段（--strict 下计为问题）')
            } else {
                stats.noAnno++
                note(rel, startLine, '缺出处标注', '代码块上方没有 `> 摘自 `<path>`` 标注，也没声明「示意片段」')
            }
            continue
        }

        const target = path.resolve(docDir, src)
        if (!fs.existsSync(target)) {
            stats.mismatch++
            note(rel, startLine, '出处不存在', `标注的脚本不存在：${src}`)
            continue
        }
        if (!cached.has(target)) cached.set(target, skeleton(fs.readFileSync(target, 'utf8')))
        const sk = cached.get(target)

        // 按省略行切段，逐段比对
        const segs = []
        let cur = []
        for (const line of body.split('\n')) {
            if (ELLIPSIS.test(line)) {
                if (cur.length) segs.push(cur.join('\n'))
                cur = []
            } else cur.push(line)
        }
        if (cur.length) segs.push(cur.join('\n'))

        const bad = []
        for (const s of segs) {
            const n = skeleton(s)
            if (n.length < 12) continue
            if (!sk.includes(n))
                bad.push(
                    s
                        .split('\n')
                        .filter(x => x.trim())[0]
                        .trim()
                        .slice(0, 60)
                )
        }

        if (bad.length) {
            stats.mismatch++
            note(
                rel,
                startLine,
                '代码对不上',
                `标注 ${src}，但以下段落在该文件里找不到：\n      - ${bad.join('\n      - ')}`
            )
            continue
        }

        if (tbl && !tbl.has(src)) {
            stats.table++
            note(rel, startLine, '表里没有', `代码标注了 ${src}，但它没出现在本篇 ## 配套代码 表里`)
            continue
        }

        const total = body.replace(ELLIPSIS, '').trim()
        if (total.length < 24) stats.short++
        stats.aligned++
    }
}

// 遍历各板块
const pickedBoards = boards.select(boards.sidebarBoards())
for (const board of pickedBoards) {
    const boardDir = path.join(ROOT, board)
    ;(function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name)
            if (e.isDirectory()) {
                if (e.name === 'code' || e.name === 'node_modules') continue
                walk(p)
            } else if (e.name.endsWith('.md')) {
                // 总结.md / 面试题.md 是元页面（汇总页），不参与代码对齐检查
                if (e.name === '总结.md' || e.name === '面试题.md') continue
                const relDir = path.relative(boardDir, path.dirname(p)).replace(/\\/g, '/')
                if (MODULE_FILTER && relDir !== MODULE_FILTER && !relDir.startsWith(MODULE_FILTER + '/'))
                    continue
                checkDoc(p, fs.readFileSync(p, 'utf8'))
            }
        }
    })(boardDir)
}

console.log('='.repeat(78))
console.log(`板块：${pickedBoards.join(' / ')}`)
console.log(`扫描文档 ${stats.docs} 篇 · JS 代码块 ${stats.blocks} 个`)
console.log(
    `  已对齐 ${stats.aligned} · 示意片段 ${stats.sketch} · 缺标注 ${stats.noAnno} · 对不上 ${stats.mismatch} · 表里没有 ${stats.table}`
)
console.log('='.repeat(78))
for (const p of problems) {
    console.log(`[${p.kind}] ${p.doc} : 行${p.line}`)
    console.log(`    ${p.msg}`)
}
const fatal = stats.noAnno + stats.mismatch + stats.table
console.log('='.repeat(78))
console.log(fatal === 0 ? '✅ 全部通过' : `❌ 问题 ${fatal} 处`)
process.exit(fatal === 0 ? 0 : 1)
