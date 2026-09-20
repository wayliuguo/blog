// Rollup：钩子全景 —— 哪些是 build 钩子（只跑一次），哪些是 output 钩子（每个 output 各跑一次）
// 运行：npm run rollup:hooks
const path = require('node:path')
const { rollup } = require('rollup')

const BUILD_HOOKS = ['options', 'buildStart', 'resolveId', 'load', 'transform', 'moduleParsed', 'buildEnd']
const OUTPUT_HOOKS = ['renderStart', 'renderChunk', 'generateBundle', 'writeBundle', 'closeBundle']

// 一个只记录、不改写的插件：把每次钩子调用按顺序记下来
function trace() {
    const log = []
    const plugin = { name: 'trace-hooks' }
    for (const hook of [...BUILD_HOOKS, ...OUTPUT_HOOKS]) {
        plugin[hook] = () => {
            log.push(hook)
            return null // 返回 null = 不改写，交给后面的插件
        }
    }
    return { plugin, log }
}

const phaseOf = (hook) => (BUILD_HOOKS.includes(hook) ? 'build ' : 'output')

function firstSeen(log) {
    const seen = new Set()
    return log.filter((h) => (seen.has(h) ? false : (seen.add(h), true)))
}

function count(log) {
    const c = {}
    for (const h of log) c[h] = (c[h] || 0) + 1
    return c
}

;(async () => {
    const input = path.join(__dirname, 'src/index.js')

    // ① 写盘一次：走完包括 writeBundle / closeBundle 在内的全部钩子
    const t1 = trace()
    const b1 = await rollup({ input, plugins: [t1.plugin] })
    await b1.write({ format: 'es', dir: path.join(__dirname, 'dist-hooks') })
    await b1.close() // closeBundle 只在 bundle 被关闭时触发（write 后要显式 close）

    console.log('---- ① 一次 write 走完的钩子（按首次出现排序）----')
    firstSeen(t1.log).forEach((h, i) => {
        console.log(`  ${String(i + 1).padStart(2)}. ${h.padEnd(15)} ${phaseOf(h)}`)
    })

    console.log('\n---- 每个钩子实际被调用几次（入口 + 2 个依赖模块）----')
    for (const [h, n] of Object.entries(count(t1.log))) {
        console.log(`  ${h.padEnd(15)} ${phaseOf(h)} ${n}`)
    }

    // ② 同一个 bundle 连续 generate 两次：build 阶段不该重跑
    const t2 = trace()
    const b2 = await rollup({ input, plugins: [t2.plugin] })
    await b2.generate({ format: 'es' })
    const mid = count(t2.log)
    await b2.generate({ format: 'cjs' })
    const end = count(t2.log)

    console.log('\n---- ② 第二次 generate 新增的调用 ----')
    for (const h of [...BUILD_HOOKS, ...OUTPUT_HOOKS]) {
        console.log(`  ${h.padEnd(15)} ${phaseOf(h)} +${(end[h] || 0) - (mid[h] || 0)}`)
    }
    await b2.close()

    console.log('\n---- 结论 ----')
    console.log('  build 钩子（options → buildEnd）：一次构建只跑一次，与配了几个 output 无关')
    console.log('  output 钩子（renderStart → closeBundle）：每个 output 各跑一次')
    console.log('  resolveId / load / transform / moduleParsed 按模块数放大：3 个模块就是 3 次')
    console.log('  所以「读源码、解析、建图」放 build 阶段，「改产物、写盘、上报」放 output 阶段')
})()
