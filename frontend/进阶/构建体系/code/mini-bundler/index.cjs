'use strict'

// 手写迷你打包器：模块图 → 依赖解析 → ESM→CJS 转换 → 运行时拼装
// 核心四步拆在 lib/ 下（resolve / graph / transform / generate），这里只做主流程编排与结果打印。
// 运行：npm run mini（默认入口 src/entry.js）/ npm run cycle / npm run tdz
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const { ROOT, rel } = require('./lib/root.cjs')
const { modules, collect } = require('./lib/graph.cjs')
const { transform } = require('./lib/transform.cjs')
const { generate } = require('./lib/generate.cjs')

const ENTRY = path.resolve(ROOT, process.argv[2] || 'src/entry.js')
const OUT_FILE = path.join(ROOT, 'dist', 'bundle.js')

// ---------- 主流程：建图 → 逐个转换 → 生成产物 ----------
collect(ENTRY)
const list = [...modules.values()]
for (const r of list) r.output = transform(r)

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, generate(list), 'utf8')

console.log('---- 1. 模块图（DFS 发现顺序，id 0 是入口）----')
for (const r of list) {
    console.log(`  ${String(r.id).padStart(2)}  ${rel(r.file).padEnd(28)} → 依赖 [${r.deps.map(d => d.id).join(', ')}]`)
}
console.log(`  共 ${list.length} 个模块`)

console.log('\n---- 2. ESM → CJS 转换（取第一个含 import 的模块）----')
const sample = list.find(r => /^import /m.test(r.code))
console.log(`  文件：${rel(sample.file)}`)
for (const line of sample.code.split('\n').filter(l => /^(import|export)/.test(l))) {
    console.log('  - ' + line)
}
console.log('  =>')
for (const line of sample.output.split('\n').filter(l => /__require\(|^exports\./.test(l))) {
    console.log('  + ' + line.trim())
}

const srcBytes = list.reduce((n, r) => n + Buffer.byteLength(r.code, 'utf8'), 0)
const outBytes = fs.statSync(OUT_FILE).size
console.log('\n---- 3. 产物 ----')
console.log(`  写出 ${rel(OUT_FILE)}：${outBytes} 字节`)
console.log(`  源码合计 ${srcBytes} 字节 → 产物是源码的 ${(outBytes / srcBytes).toFixed(2)} 倍（差额是运行时 + 包装）`)

// ---------- 4. 跑一遍：原生 ESM vs 打包产物 ----------

/**
 * 用子进程运行一段 JS 文件，返回退出码与输出的关键文本（用于原生 ESM 与产物的对照）。
 *
 * @param {string} file - 要运行的 JS 文件路径
 * @returns {{status:number, text:string}} 退出码（0 表示成功）与合并后的 stdout/stderr
 */
function run(file) {
    const r = spawnSync(process.execPath, [file], { encoding: 'utf8' })
    return { status: r.status, text: ((r.stdout || '') + (r.stderr || '')).trim() }
}

console.log('\n---- 4. 执行结果对照 ----')
const pairs = [
    [`原生 ESM：node ${rel(ENTRY)}`, run(ENTRY)],
    [`打包产物：node ${rel(OUT_FILE)}`, run(OUT_FILE)]
]
for (const [label, r] of pairs) {
    console.log(`  ${label}`)
    if (r.status === 0) {
        for (const line of r.text.split('\n')) console.log('    ' + line)
    } else {
        // 报错时只报关键那行：Node 的栈末尾是版本号，没有信息量
        const lines = r.text.split('\n').filter(Boolean)
        const reason = lines.find(l => /^\w*Error\b/.test(l)) || lines[lines.length - 1]
        console.log(`    [退出码 ${r.status}] ${reason}`)
    }
}
if (ENTRY.includes('cycle')) {
    console.log('\n  同一个循环依赖，两种结果的差别就是「打包改变了模块语义」的证据')
}
