// 检查 node/ 下每个 md 是否都能从侧边栏到达
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const cfg = fs.readFileSync(path.join(ROOT, '.vitepress/config/node.js'), 'utf8')
const side = new Set([...cfg.matchAll(/link:\s*'([^']+)'/g)].map(m => decodeURIComponent(m[1])))

const files = []
;(function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (e.name.endsWith('.md')) files.push(path.relative(ROOT, p).replace(/\\/g, '/'))
    }
})(path.join(ROOT, 'node'))

const missing = files.filter(f => !side.has('/' + f.replace(/\.md$/, '')))

console.log('node/ 下文档数：' + files.length)
console.log('侧边栏链接数：' + side.size)
console.log('不在侧边栏的文档：' + missing.length)
missing.forEach(m => console.log('  - ' + m))
