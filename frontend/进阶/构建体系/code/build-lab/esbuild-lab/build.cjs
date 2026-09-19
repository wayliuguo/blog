// esbuild：transform（单文件转换）vs build（打包）——两件事，不是一个东西
// 运行：npm run esbuild
const path = require('node:path')
const esbuild = require('esbuild')

const ROOT = __dirname
const RAW = `
interface User { id: number; name: string }
const list: User[] = [{ id: 1, name: 'a' }]
export const names: string[] = list.map((u) => u.name ?? '')
`

console.log('---- 1. transform：只转换，不解析依赖 ----')
// 跑两次：第一次含加载 esbuild 原生二进制的成本，第二次才是转换本身
esbuild.transformSync(RAW, { loader: 'ts', target: 'es2015' })
const t0 = performance.now()
const out = esbuild.transformSync(RAW, {
    loader: 'ts',
    target: 'es2015'
})
const t1 = performance.now()
console.log('耗时:', Math.round(t1 - t0), 'ms')
console.log(out.code.trim())
console.log('  注意：`??` 被降级了吗：', out.code.includes('??') ? '没有（target 允许）' : '已降级')

console.log('\n---- 2. target 决定降级力度 ----')
for (const target of ['esnext', 'es2020', 'es2015']) {
    const r = esbuild.transformSync('const f = async () => { const x = await Promise.resolve(1); return x ** 2 }', {
        loader: 'ts',
        target
    })
    console.log(`  target=${target.padEnd(8)} 产物长度 ${String(r.code.length).padStart(4)}  ${r.code.slice(0, 70).replace(/\n/g, ' ')}`)
}

console.log('\n---- 3. build：解析依赖并打包 ----')
const bundle = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src/main.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2020',
    metafile: true
})
console.log('  输出文件数:', bundle.outputFiles.length)
console.log('  产物字符数:', bundle.outputFiles[0].text.length)

console.log('\n---- 4. metafile：产物里到底塞了什么 ----')
// metafile 的 inputs 给的是"源文件自身大小"，要看"各模块在产物里占多少"得读 outputs.inputs
const outMeta = Object.values(bundle.metafile.outputs)[0]
const rows = Object.entries(outMeta.inputs)
    .map(([k, v]) => ({ name: k.replace(ROOT, ''), bytes: v.bytesInOutput }))
    .sort((a, b) => b.bytes - a.bytes)
for (const r of rows) {
    console.log(`  ${r.name.padEnd(28)} ${String(r.bytes).padStart(6)} bytes`)
}
console.log('  产物总字节:', outMeta.bytes)
console.log('  未使用的 unused() 是否进产物：', bundle.outputFiles[0].text.includes('这段不应该出现在产物里'))

console.log('\n---- 5. minify 的效果 ----')
const min = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src/main.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2020',
    minify: true
})
console.log('  未压缩:', bundle.outputFiles[0].text.length, '字符')
console.log('  压缩后:', min.outputFiles[0].text.length, '字符')
console.log('  压缩比:', (min.outputFiles[0].text.length / bundle.outputFiles[0].text.length).toFixed(2))
