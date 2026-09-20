/**
 * 检查每个板块下「文档是否都能从侧边栏到达」。
 *
 * 规则：板块 X 的文档 `X/a/b.md`，侧边栏里必须有 link 指向 `/X/a/b`。
 * 板块由 .vitepress/config/<board>.js 决定（新增板块自动纳入）。
 *
 * 用法：
 *   node .workbuddy/scripts/check-sidebar-coverage.cjs                   # 全部板块
 *   node .workbuddy/scripts/check-sidebar-coverage.cjs --board frontend  # 只查一个
 *
 * 例外：各模块目录下的 code/ 是配套示例代码，不是站点页面，不参与覆盖检查。
 */
const fs = require('fs')
const path = require('path')
const boards = require('./boards.cjs')

const ROOT = boards.ROOT
const picked = boards.select(boards.sidebarBoards())

if (!picked.length) {
    console.log('没有匹配的板块（可用：' + boards.sidebarBoards().join(', ') + '）')
    process.exit(1)
}

let totalMissing = 0
for (const board of picked) {
    const cfgPath = path.join(boards.CONFIG_DIR, board + '.js')
    const cfg = fs.readFileSync(cfgPath, 'utf8')
    const side = new Set([...cfg.matchAll(/link:\s*'([^']+)'/g)].map(m => decodeURIComponent(m[1])))

    const files = boards.walkMd(path.join(ROOT, board)).map(p => path.relative(ROOT, p).replace(/\\/g, '/'))

    const missing = files.filter(f => !side.has('/' + f.replace(/\.md$/, '')))
    totalMissing += missing.length

    console.log('='.repeat(70))
    console.log(`[${board}] 文档 ${files.length} 篇 · 侧边栏链接 ${side.size} 条 · 未覆盖 ${missing.length} 篇`)
    missing.forEach(m => console.log('  - ' + m))
    if (!missing.length) console.log('  全部可达')
}

console.log('='.repeat(70))
console.log(totalMissing === 0 ? '✅ 全部通过' : `❌ 共 ${totalMissing} 篇不在侧边栏`)
process.exit(totalMissing ? 1 : 0)
