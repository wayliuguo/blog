// Rollup：tree-shaking 到底摇掉了什么 —— 未使用的导出 vs 顶层副作用
// 运行：npm run rollup:shake
const path = require('node:path')
const { rollup } = require('rollup')

const ROOT = __dirname

async function build(input, label) {
    const bundle = await rollup({ input })
    const { output } = await bundle.generate({ format: 'es' })
    const code = output[0].code
    console.log(`\n---- ${label} ----`)
    console.log('  含 unusedHelper（未被引用的导出）：', code.includes('unusedHelper'))
    console.log('  含"meta.js 被求值了"（顶层副作用）：', code.includes('meta.js 被求值了'))
    console.log('  产物字符数：', code.length)
}

;(async () => {
    await build(path.join(ROOT, 'src/index.js'), '入口引用了 math 与 meta')
    console.log('\n---- 结论 ----')
    console.log('未被引用的导出会被摇掉；但"模块顶层的副作用"会被保留（Rollup 不知道它重不重要）')
    console.log('所以库要声明 sideEffects:false，或者别在模块顶层写有副作用的语句')
})()
