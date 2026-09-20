// Rust 工具链：esbuild(Go) / SWC(Rust) / Babel(JS) 转换同一份源码的速度对比
// 运行：npm run swc
const esbuild = require('esbuild')
const swc = require('@swc/core')
const babel = require('@babel/core')

// 用同一份 ES2020 语法源码，三个工具都做"降级到 ES2015"
const SOURCE = `
export class List {
  constructor() { this.items = [] }
  add(item) { this.items.push(item) }
  labels() {
    return this.items.map((it) => it.label ?? String(it.id))
  }
}
export const sum = (ns) => ns.reduce((a, b) => a + b, 0)
`

const N = 50

function bench(name, fn) {
    fn() // 预热：第一次含初始化成本
    const t0 = performance.now()
    let code = ''
    for (let i = 0; i < N; i++) code = fn()
    const ms = performance.now() - t0
    return { name, total: Math.round(ms), per: (ms / N).toFixed(2), len: (code || '').length }
}

const rows = [
    bench('esbuild (Go)', () => esbuild.transformSync(SOURCE, { loader: 'js', target: 'es2015' }).code),
    bench(
        'SWC (Rust)',
        () =>
            swc.transformSync(SOURCE, {
                jsc: { parser: { syntax: 'ecmascript' }, target: 'es2015' }
            }).code
    ),
    bench(
        'Babel (JS)',
        () =>
            babel.transformSync(SOURCE, {
                configFile: false,
                babelrc: false,
                presets: [[require('@babel/preset-env'), { targets: { esmodules: false } }]]
            }).code
    )
]

console.log(`---- 同一份 ES2020 源码降级到 ES2015，各转换 ${N} 次 ----`)
const sorted = [...rows].sort((a, b) => a.total - b.total)
const base = sorted[0].total / N
for (const r of sorted) {
    console.log(
        `${r.name.padEnd(14)} 总计 ${String(r.total).padStart(6)} ms  单次 ${String(r.per).padStart(7)} ms  ${(
            r.total /
            N /
            base
        ).toFixed(1)}x  产物 ${r.len} 字符`
    )
}

console.log('\n---- SWC 产物（节选）----')
console.log(
    swc
        .transformSync(SOURCE, { jsc: { parser: { syntax: 'ecmascript' }, target: 'es2015' } })
        .code.split('\n')
        .slice(0, 6)
        .join('\n')
)
console.log(
    '  ?? 被降级：',
    !swc.transformSync(SOURCE, { jsc: { parser: { syntax: 'ecmascript' }, target: 'es2015' } }).code.includes('??')
)

console.log('\n---- 结论 ----')
console.log('原生语言工具（Go/Rust）在"转换"这一步有数量级优势')
console.log('Babel 的价值是插件生态与提案支持，不是速度')
console.log('选型：要自定义 AST 转换 → Babel；只求快 → esbuild / SWC')
