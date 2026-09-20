// Vite：静态资源的三个真实决策 —— 内联阈值、批量导入、语法降级目标
// 样本由脚本生成（两个大小悬殊的 svg + 三个同构特性模块）
// 运行：npm run vite:assets
const path = require('node:path')
const fs = require('node:fs')
const { build } = require('vite')

const DIR = path.join(__dirname, 'src-assets')

// ① 造样本
fs.mkdirSync(path.join(DIR, 'features'), { recursive: true })
const rect = '<rect width="8" height="8"/>'
fs.writeFileSync(path.join(DIR, 'small.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">${rect.repeat(20)}</svg>`)
fs.writeFileSync(path.join(DIR, 'big.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">${rect.repeat(400)}</svg>`)
fs.writeFileSync(
    path.join(DIR, 'index.html'),
    '<!doctype html>\n<html><body><script type="module" src="/main.js"></script></body></html>\n'
)
// glob 默认懒加载：每个匹配到的模块单独出一个 chunk
fs.writeFileSync(
    path.join(DIR, 'main.js'),
    [
        "import small from './small.svg'",
        "import big from './big.svg'",
        '',
        '// 一次导入一个目录：构建期展开成 N 条 import，不用手写也不用维护清单',
        "const modules = import.meta.glob('./features/*.js')",
        '',
        '// 语法降级观察点：?? 与 ?. 在 es2015 下会被改写',
        'export const title = window.__TITLE__ ?? "default"',
        'export const names = Object.keys(modules).sort()',
        '',
        'console.log(small, big, title, names?.length)'
    ].join('\n') + '\n'
)
// eager 版：把所有模块直接打进主 chunk
fs.writeFileSync(
    path.join(DIR, 'main-eager.js'),
    [
        "import small from './small.svg'",
        "import big from './big.svg'",
        '',
        "const modules = import.meta.glob('./features/*.js', { eager: true })",
        'export const names = Object.keys(modules).sort()',
        '',
        'console.log(small, big, names)'
    ].join('\n') + '\n'
)
for (const n of ['a', 'b', 'c']) {
    fs.writeFileSync(
        path.join(DIR, `features/${n}.js`),
        `export const name = '${n}'\nexport function render() { return document.createTextNode('feature-${n}') }\n`
    )
}

async function run(label, extra = {}, input = 'main.js') {
    const result = await build({
        configFile: false,
        root: DIR,
        logLevel: 'error',
        build: {
            write: false, // 只看产物内容，不落盘
            minify: false,
            emptyOutDir: false,
            rollupOptions: { input: path.join(DIR, input) },
            ...extra
        }
    })
    const output = Array.isArray(result) ? result[0].output : result.output
    return { label, output }
}

const isInline = (output) =>
    output.some((o) => o.type === 'chunk' && o.isEntry && o.code.includes('data:image/svg+xml'))
const hasAsset = (output) => output.some((o) => o.type === 'asset' && o.fileName.endsWith('.svg'))
const chunks = (output) => output.filter((o) => o.type === 'chunk').length

;(async () => {
    // ② 内联阈值：默认 4096 字节
    const a = await run('默认', { assetsInlineLimit: 4096 })
    console.log('---- ① assetsInlineLimit 决定"内联还是发文件" ----')
    console.log(`  4096（默认）：small.svg(0.6KB) 内联=${isInline(a.output)} · big.svg(10.8KB) 独立文件=${hasAsset(a.output)}`)
    const b = await run('收紧', { assetsInlineLimit: 512 })
    console.log(`  512（收紧） ：small.svg 内联=${isInline(b.output)} · big.svg 独立文件=${hasAsset(b.output)}`)

    // ③ 语法降级
    const t1 = await run('esnext', { target: 'esnext' })
    const t2 = await run('es2015', { target: 'es2015' })
    const code1 = t1.output.find((o) => o.type === 'chunk' && o.isEntry).code
    const code2 = t2.output.find((o) => o.type === 'chunk' && o.isEntry).code
    console.log('\n---- ② build.target 决定降级到哪一档语法 ----')
    console.log(`  target=esnext：产物里还有 "??"  = ${code1.includes('??')} · 还有 "?." = ${code1.includes('?.')}`)
    console.log(`  target=es2015：产物里还有 "??"  = ${code2.includes('??')} · 还有 "?." = ${code2.includes('?.')}`)
    console.log(`  主 chunk 体积：esnext ${code1.length} 字符 · es2015 ${code2.length} 字符`)

    // ④ glob 的两种形态
    const g1 = await run('懒加载')
    const g2 = await run('eager', {}, 'main-eager.js')
    console.log('\n---- ③ import.meta.glob：懒加载 vs eager ----')
    console.log(`  默认（懒加载）：chunk 数 ${chunks(g1.output)}（入口 1 + 每个特性 1）`)
    console.log(`  eager: true   ：chunk 数 ${chunks(g2.output)}（全部并进主 chunk）`)

    console.log('\n---- 结论 ----')
    console.log('  assetsInlineLimit 是字节阈值：小图标内联省请求，大图必须独立文件才能被缓存')
    console.log('  build.target 只管语法降级，不管 API polyfill：Object.fromEntries 这类还得自己补')
    console.log('  glob 默认懒加载（每个模块一个 chunk），eager 会合并——选哪个取决于"这些模块是不是首屏就要"')
})()
