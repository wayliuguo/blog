// Rollup：副作用的两档控制 —— PURE 注解（表达式级）vs moduleSideEffects（模块级）
// 运行：npm run rollup:side-effects
const path = require('node:path')
const { rollup } = require('rollup')

const INPUT = path.join(__dirname, 'src-se/index.js')

async function build(label, treeshake) {
    const bundle = await rollup({ input: INPUT, treeshake })
    const { output } = await bundle.generate({ format: 'es' })
    const code = output[0].code
    const hit = s => String(code.includes(s)).padEnd(5)
    console.log(
        `  ${label.padEnd(26)} lib求值:${hit('lib 被求值')} pure求值:${hit('pure 被求值')} make('pure'):${hit(
            "'pure'"
        )} make('nopure'):${hit("'nopure'")} ${String(code.length).padStart(4)} 字符`
    )
    await bundle.close()
}

;(async () => {
    console.log('---- 同一份源码，只改 treeshake 配置 ----')
    await build('① 默认（都存在副作用）', true)
    await build('② moduleSideEffects: false', { moduleSideEffects: false })
    await build('③ 只把 pure.js 标成无副作用', {
        moduleSideEffects: id => !id.includes('pure.js')
    })

    console.log('\n---- 结论 ----')
    console.log('  PURE 注解管「单个表达式」：① 里带注解的 make("pure") 被删，紧邻的不带的没删')
    console.log('  moduleSideEffects 管「整个模块」：② 里 lib.js 与 pure.js 的顶层语句一起消失')
    console.log('  两者粒度不同：注解写在源码里（库作者负责），声明写在配置里（库使用者负责）')
    console.log('  ③ 是真实库的正确姿势：给「确定无副作用的模块」开白名单，而不是一刀切')
})()
