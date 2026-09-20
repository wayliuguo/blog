// Rollup：external / globals / manualChunks / preserveModules —— 库打包的四个产物开关
// 样本由脚本生成（模拟一个 200 个导出的第三方依赖）
// 运行：npm run rollup:external
const fs = require('node:fs')
const path = require('node:path')
const { rollup } = require('rollup')

const DIR = path.join(__dirname, 'src-ext')
const VENDOR = path.join(DIR, 'react.js')
const ENTRY = path.join(DIR, 'entry.js')

// ① 造样本：一个"很大的依赖"，顶层带副作用（所以不会被 tree-shaking 整块删掉）
fs.mkdirSync(DIR, { recursive: true })
fs.writeFileSync(
    VENDOR,
    ["console.log('react 被求值')", 'export function createElement(tag) { return { tag } }'].concat(
        Array.from({ length: 200 }, (_, i) => `export function helper${i}(x) { return x + ${i} }`)
    ).join('\n') + '\n'
)
// 整体 re-export：200 个导出一个都摇不掉（库顺手把依赖再导出去，就是这个下场）
fs.writeFileSync(ENTRY, "export * from 'react'\n")

// 把裸导入 'react' 指到本地样本（等价于 @rollup/plugin-node-resolve 干的事）
const resolver = {
    name: 'resolver',
    resolveId(source) {
        if (source === 'react') return VENDOR
        return null
    }
}

async function build(label, inputOptions, outputOptions) {
    const bundle = await rollup({ input: ENTRY, plugins: [resolver], ...inputOptions })
    const { output } = await bundle.generate(outputOptions)
    const code = output.map((o) => (o.type === 'chunk' ? o.code : o.source)).join('\n')
    console.log(
        `  ${label.padEnd(26)} 文件 ${String(output.length).padStart(2)} 个 · ${String(code.length).padStart(6)} 字符 · 含 helper199:${String(code.includes('helper199')).padEnd(5)} 含 global.React:${code.includes('global.React')}`
    )
    if (output.length > 1) {
        console.log('     产物：', output.map((o) => `${o.fileName}(${o.type === 'chunk' ? o.code.length : o.source.length}B)`).join(' '))
    }
    await bundle.close()
    return code
}

;(async () => {
    console.log('---- 同一份源码，改产物策略 ----')
    await build('① 全都打进来', {}, { format: 'es' })
    await build('② external 掉 react', { external: ['react'] }, { format: 'es' })
    await build('③ external + UMD globals', { external: ['react'] }, { format: 'umd', name: 'App', globals: { react: 'React' } })
    await build('④ manualChunks 拆 vendor', {}, { format: 'es', manualChunks: (id) => (id.includes('react.js') ? 'vendor' : null) })
    await build('⑤ preserveModules', {}, { format: 'es', preserveModules: true })

    console.log('\n---- 结论 ----')
    console.log('  external 决定「打不打进来」：② 之后产物里再没有 helper199')
    console.log('  UMD/IIFE 必须配 output.globals：③ 里外部依赖靠 global.React 取，不配就取到 undefined')
    console.log('  manualChunks 决定「分成几个文件」：④ 把依赖单独切出去，便于长缓存')
    console.log('  preserveModules 是「不合并」：⑤ 按源目录结构一比一输出，适合组件库让使用方自己摇')
})()
