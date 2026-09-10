/** 模块一 5 篇文档重命名 + 全站引用修正（含 %20 编码形态）。用法：node rename-v2.cjs [--apply] */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')

const RENAMES = [
    ['node/01-运行环境/01-认识后端与 Node.js.md', 'node/01-运行环境/01-Node.js 是什么.md'],
    ['node/01-运行环境/03-事件循环与错误处理.md', 'node/01-运行环境/03-事件循环.md'],
    ['node/01-运行环境/04-异步编程入门.md', 'node/01-运行环境/04-异步编程与事件驱动.md'],
    ['node/01-运行环境/06-进程与并发决策.md', 'node/01-运行环境/06-进程线程与优雅退出.md'],
    ['node/01-运行环境/07-把运行环境串起来.md', 'node/01-运行环境/07-运行机制收束.md']
]

const TEXT_RULES = []
for (const [from, to] of RENAMES) {
    const a = path.basename(from, '.md')
    const b = path.basename(to, '.md')
    TEXT_RULES.push([a, b])
    TEXT_RULES.push([a.replace(/ /g, '%20'), b.replace(/ /g, '%20')])
}

// 注意：.vitepress/config 必须扫描（侧边栏里写着文档名），只跳过构建产物
const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    'code',
    'public',
    'drawio',
    'xmind',
    'dist',
    'verify-dist',
    '.temp',
    '.workbuddy'
])
const EXT = new Set(['.md', '.js', '.json', '.yml', '.yaml'])

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue
            walk(p, out)
        } else if (EXT.has(path.extname(e.name))) {
            out.push(p)
        }
    }
    return out
}

const files = walk(ROOT)
const hits = []

for (const f of files) {
    // 跳过被重命名文件自身（先改内容再改名亦可，这里统一处理）
    let src = fs.readFileSync(f, 'utf8')
    let changed = false
    for (const [from, to] of TEXT_RULES) {
        if (src.includes(from)) {
            const n = src.split(from).length - 1
            hits.push(`${path.relative(ROOT, f).replace(/\\/g, '/')}  ${from} -> ${to}  (${n} 处)`)
            src = src.split(from).join(to)
            changed = true
        }
    }
    if (changed && APPLY) fs.writeFileSync(f, src)
}

console.log(`扫描文件：${files.length}`)
console.log(`命中替换：${hits.length} 处`)
hits.forEach(h => console.log('  ' + h))

if (APPLY) {
    for (const [from, to] of RENAMES) {
        const a = path.join(ROOT, from)
        const b = path.join(ROOT, to)
        if (fs.existsSync(a)) {
            fs.renameSync(a, b)
            console.log(`renamed: ${from} -> ${to}`)
        } else {
            console.log(`skip (不存在): ${from}`)
        }
    }
    console.log('完成。')
} else {
    console.log('\n这是预演，加 --apply 执行。')
}
