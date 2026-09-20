// Rollup：CJS 互操作 —— 没有 commonjs 插件会怎样，以及最小可用转换长什么样
// 运行：npm run rollup:cjs
const path = require('node:path')
const { rollup } = require('rollup')

const ENTRY = path.join(__dirname, 'src-cjs/entry.js')

// 一个 20 行能跑的 @rollup/plugin-commonjs 替身：只处理两种最常见的写法
function miniCommonjs() {
    return {
        name: 'mini-commonjs',
        transform(code, id) {
            if (!id.endsWith('.cjs')) return null
            let out = code
            if (/module\.exports\s*=/.test(out)) {
                out = out.replace(/module\.exports\s*=/g, 'export default')
            } else {
                out = out.replace(/exports\.(\w+)\s*=/g, 'export const $1 =')
            }
            return { code: out, map: null }
        }
    }
}

async function build(label, plugins) {
    console.log(`\n---- ${label} ----`)
    try {
        const bundle = await rollup({ input: ENTRY, plugins })
        const { output } = await bundle.generate({ format: 'es' })
        const code = output[0].code
        console.log('  构建通过；产物：')
        console.log(
            code
                .split('\n')
                .filter(Boolean)
                .map(l => '    ' + l)
                .join('\n')
        )
        console.log('  含 module.exports：', code.includes('module.exports'))
        await bundle.close()
    } catch (err) {
        console.log('  构建失败：', err.message.split('\n')[0])
    }
}

;(async () => {
    await build('① 不加 commonjs 插件', [])
    await build('② 手写 mini-commonjs', [miniCommonjs()])

    console.log('\n---- 结论 ----')
    console.log('  Rollup 只认 ESM：CJS 的 module.exports 在它眼里就是一行普通赋值语句')
    console.log('  @rollup/plugin-commonjs 干的就是「把赋值改写成导出」，上面 20 行是它的最小形态')
    console.log('  真实插件还要处理：动态 require、混合导出、条件导出、interop 的 default 包装')
    console.log('  所以「库里带 CJS 依赖」不是 Rollup 的短板，而是必须多配一个插件的成本')
})()
