// Rollup：同一种输入，五种输出格式的产物对比
// 运行：npm run rollup:formats
const path = require('node:path')
const fs = require('node:fs')
const { rollup } = require('rollup')

const ROOT = __dirname
const OUT = path.join(ROOT, 'dist-formats')
fs.rmSync(OUT, { recursive: true, force: true })

const input = path.join(ROOT, 'src/index.js')

const FORMATS = [
    { format: 'es', name: 'esm', ext: 'mjs', desc: 'ES Module：现代浏览器 <script type=module> 与打包器' },
    { format: 'cjs', name: 'cjs', ext: 'cjs', desc: 'CommonJS：Node require' },
    { format: 'umd', name: 'umd', ext: 'js', desc: 'UMD：浏览器全局 + AMD + CJS 三合一' },
    { format: 'iife', name: 'iife', ext: 'js', desc: 'IIFE：直接 <script> 引入，挂到全局变量' },
    { format: 'system', name: 'system', ext: 'js', desc: 'SystemJS：老式模块加载器' }
]

;(async () => {
    console.log('---- 输入源码 ----')
    console.log(fs.readFileSync(input, 'utf8').trim())

    console.log('\n---- 五种输出格式对比 ----')
    for (const f of FORMATS) {
        const bundle = await rollup({ input })
        const outFile = path.join(OUT, `out.${f.ext}`)
        await bundle.write({
            file: outFile,
            format: f.format,
            name: 'MyLib', // umd / iife 需要全局变量名
            exports: 'named'
        })
        const code = fs.readFileSync(outFile, 'utf8')
        const size = fs.statSync(outFile).size
        console.log(`\n  [${f.name}] ${(size / 1024).toFixed(2)} KB — ${f.desc}`)
        console.log('  首行:', code.split('\n')[0].slice(0, 90))
        console.log('  末行:', code.trim().split('\n').slice(-1)[0].slice(0, 90))
    }

    console.log('\n---- 结论 ----')
    console.log('同一份源码，格式差异只在"包裹层"：模块体是一样的')
    console.log('esm 体积最小（没有包裹层），umd 最大（要兼容三种加载方式）')
    console.log('只有 es 格式能被 tree-shaking 二次优化，所以 package.json 的 module/exports 字段要指向它')
})()
