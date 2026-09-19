// 产物分析：同一份业务代码，四种"打包姿势"的体积对照
// 运行：npm run analyze
const path = require('node:path')
const esbuild = require('esbuild')

const ROOT = __dirname
const OUT = path.join(ROOT, 'dist')
require('node:fs').rmSync(OUT, { recursive: true, force: true })

// ---------- 被测源码：一个"大而全"的工具模块 ----------
const UTILS = Array.from({ length: 20 }, (_, i) => {
    return `export function util${i}(x) { return x + ${i} ? String(x).repeat(3).toUpperCase() + ${i} : 'x' }`
}).join('\n')

require('node:fs').mkdirSync(path.join(ROOT, 'src'), { recursive: true })
require('node:fs').writeFileSync(path.join(ROOT, 'src', 'utils.js'), UTILS + '\n')
require('node:fs').writeFileSync(
    path.join(ROOT, 'src', 'side-effect.js'),
    "// 顶层副作用：有没有 sideEffects 声明，决定它会不会被整块保留\nwindow.__ANALYZE_MARK__ = true\nexport const flag = 'with-side-effect'\n"
)

// ---------- 四种入口 ----------
const cases = [
    {
        // 把 namespace 整体再导出：打包器无法判断外部会用到哪个成员，只能全留
        name: 'A. 全量引入（namespace 再导出）',
        entry: 'case-a.js',
        code: "import * as utils from './utils.js'\nexport { utils }\nconsole.log(utils.util0(1))\n"
    },
    {
        name: 'B. 按需引入（具名 import）',
        entry: 'case-b.js',
        code: "import { util0 } from './utils.js'\nconsole.log(util0(1))\n"
    },
    {
        name: 'C. 用了带副作用的模块',
        entry: 'case-c.js',
        code: "import { util0 } from './utils.js'\nimport { flag } from './side-effect.js'\nconsole.log(util0(1), flag)\n"
    },
    {
        name: 'D. 动态 import 拆分（首屏只留入口）',
        entry: 'case-d.js',
        code: "console.log('first screen')\ndocument.addEventListener('click', () => {\n  import('./utils.js').then((m) => console.log(m.util0(1)))\n})\n"
    }
]

for (const c of cases) require('node:fs').writeFileSync(path.join(ROOT, 'src', c.entry), c.code)

// 给 C 场景加一份 sideEffects 声明，做组内对照
require('node:fs').writeFileSync(
    path.join(ROOT, 'src', 'package.json'),
    JSON.stringify({ sideEffects: ['./side-effect.js'] }, null, 2)
)

function build(entry, { minify, sideEffects } = {}) {
    const res = esbuild.buildSync({
        entryPoints: [path.join(ROOT, 'src', entry)],
        bundle: true,
        write: false,
        format: 'esm',
        target: 'es2020',
        minify: !!minify,
        splitting: false,
        metafile: true,
        // sideEffects 为 true 时，让 esbuild 相信"没有副作用的模块可以整块删"
        ...(sideEffects ? { treeShaking: true } : {})
    })
    return res
}

// D 场景单独用 splitting 构建，才能看到"首屏 vs 按需"的差别
const splitOut = path.join(OUT, 'split')
esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'case-d.js')],
    bundle: true,
    outdir: splitOut,
    format: 'esm',
    target: 'es2020',
    splitting: true
})
const splitFiles = require('node:fs')
    .readdirSync(splitOut)
    .map((f) => ({ name: f, size: require('node:fs').statSync(path.join(splitOut, f)).size }))
    .sort((a, b) => b.size - a.size)
const splitFirstScreen = require('node:fs').readFileSync(
    path.join(splitOut, splitFiles[splitFiles.length - 1].name),
    'utf8'
)

console.log('---- 未压缩产物体积（字节）----')
const rows = []
for (const c of cases) {
    const res = build(c.entry)
    const code = res.outputFiles[0].text
    const meta = Object.values(res.metafile.outputs)[0]
    rows.push({ name: c.name, bytes: meta.bytes, code })
}

const base = rows[0].bytes
for (const r of rows) {
    const bar = '█'.repeat(Math.max(1, Math.round((r.bytes / base) * 30)))
    console.log(`  ${r.name.padEnd(34)} ${String(r.bytes).padStart(6)}  ${bar}`)
}

console.log('\n---- 关键判断 ----')
console.log('  A 全量引入是否把 20 个函数都打进去了：', rows[0].code.includes('util19'))
console.log('  B 按需引入后 util19 还在吗：', rows[1].code.includes('util19'))
console.log('  C 带副作用模块的 window 赋值还在吗：', rows[2].code.includes('__ANALYZE_MARK__'))
console.log('  D 首屏产物里含 util 吗（应该在点击后才加载）：', splitFirstScreen.includes('function util0'))

console.log('\n---- D 场景：开启代码分割后的产物清单 ----')
for (const f of splitFiles) {
    console.log(`  ${f.name.padEnd(30)} ${String(f.size).padStart(6)} 字节`)
}
console.log('  首屏只需要加载入口那个文件，其余按需下载')

console.log('\n---- 压缩后的效果（取 A 与 B）----')
for (const idx of [0, 1]) {
    const res = build(cases[idx].entry, { minify: true })
    const meta = Object.values(res.metafile.outputs)[0]
    console.log(`  ${cases[idx].name}: ${rows[idx].bytes} → ${meta.bytes} 字节（${(meta.bytes / rows[idx].bytes).toFixed(2)}）`)
}

console.log('\n---- 体积优化的四条手段与收益量级 ----')
console.log('  1. 按需引入：依赖 tree-shaking，改的是"引用方式"，零成本')
console.log('  2. 动态 import：把非首屏代码挪出去，改的是"加载时机"')
console.log('  3. 换轻依赖（如 moment→dayjs）：改的是"依赖本身"，收益最直接')
console.log('  4. 压缩 + 现代语法产物：改的是"产物形态"，对所有代码生效')
