// 手写 mini-commonjs 的验证脚本：不加插件会失败，加替身插件能构建
// 运行：npm run mini:cjs
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import miniCommonjs from './plugins/mini-commonjs.mjs'

const ENTRY = fileURLToPath(new URL('./src/dep.cjs', import.meta.url))

async function build(label, plugins) {
    console.log(`\n---- ${label} ----`)
    try {
        const bundle = await rollup({ input: ENTRY, plugins })
        const { output } = await bundle.generate({ format: 'es' })
        console.log('  构建通过；产物：')
        console.log(
            output[0].code
                .split('\n')
                .map(l => '    ' + l)
                .join('\n')
        )
        console.log('  含 module.exports：', output[0].code.includes('module.exports'))
        await bundle.close()
    } catch (err) {
        console.log('  构建失败：', err.message.split('\n')[0])
    }
}

await build('① 不加 commonjs 插件（Rollup 只认 ESM）', [])
await build('② 手写 mini-commonjs 替身', [miniCommonjs()])
console.log('\n---- 结论 ----')
console.log('  Rollup 只认 ESM：CJS 的 module.exports 在它眼里就是一行普通赋值语句')
console.log('  替身插件做的事就是「把赋值改写成导出」；真实插件还要处理动态 require 与 interop 包装')
