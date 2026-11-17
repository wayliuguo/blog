// 构建插件开发：禁用 API 门禁 —— 把团队约定变成构建期的报错，而不是 CR 时的人肉提醒
// 运行：npm run plugin:ban
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import { parse } from '@babel/parser'
import { createRequire } from 'node:module'

// @babel/traverse 是 CJS，ESM 里拿 default 要走 createRequire
const traverse = createRequire(import.meta.url)('@babel/traverse').default

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const ENTRY = path.join(ROOT, 'src-ban/index.js')
const rel = id => path.relative(ROOT, id).replace(/\\/g, '/')

// 规则就是数据：命中条件 + 提示文案
const RULES = [
    {
        id: 'no-direct-storage',
        test: callee => callee.object?.name === 'localStorage',
        msg: '禁止直连 localStorage：请用统一的 storage 封装（它有容量兜底与隐私模式降级）'
    },
    {
        id: 'no-console',
        test: callee => callee.object?.name === 'console' && callee.property?.name === 'log',
        msg: '生产构建不允许 console.log：请用 logger（线上可关）'
    }
]

function banApi({ rules = RULES, fail = false, sink = [] } = {}) {
    return {
        name: 'ban-api',
        transform(code, id) {
            if (!id.endsWith('.js')) return null
            const ast = parse(code, { sourceType: 'module' })
            const hits = []

            traverse(ast, {
                CallExpression(p) {
                    const callee = p.node.callee
                    if (callee.type !== 'MemberExpression') return
                    for (const rule of rules) {
                        if (!rule.test(callee)) continue
                        hits.push({
                            rule: rule.id,
                            line: p.node.loc.start.line,
                            column: p.node.loc.start.column,
                            msg: rule.msg
                        })
                    }
                }
            })

            // 先记账再报错：this.error 会直接抛出，写在它后面的代码不会执行
            sink.push(...hits.map(h => ({ ...h, file: rel(id) })))
            for (const h of hits) {
                const at = `${rel(id)}:${h.line}:${h.column}`
                // this.warn 只提示、this.error 直接中断：同一个插件换个开关就是"报告"或"门禁"
                if (fail) this.error(`[${h.rule}] ${at} ${h.msg}`)
                this.warn(`[${h.rule}] ${at} ${h.msg}`)
            }
            return null
        }
    }
}

async function build(label, fail) {
    console.log(`\n---- ${label} ----`)
    const hits = []
    const warnings = []
    try {
        const bundle = await rollup({
            input: ENTRY,
            plugins: [banApi({ fail, sink: hits })],
            onwarn: w => warnings.push(w.message)
        })
        await bundle.generate({ format: 'es' })
        await bundle.close()
        console.log('  构建通过')
    } catch (err) {
        console.log('  构建被中断：', err.message)
    }
    console.log(`  命中 ${hits.length} 处（警告 ${warnings.length} 条）：`)
    for (const h of hits) console.log(`    ${h.file}:${h.line}:${h.column}  [${h.rule}] ${h.msg}`)
}

await build('① 只警告（fail: false）', false)
await build('② 当门禁（fail: true）', true)
console.log('\n---- 结论 ----')
console.log('  正则能扫到关键字，但扫不到"这是调用还是字符串" —— 所以要用 AST 判 CallExpression')
console.log('  this.error 中断的是构建，报错里带 [plugin] 前缀与文件行列，直接贴到工单里就能定位')
console.log('  规则写成数据后，新增一条禁用项只加一个对象，不用改遍历逻辑')
console.log('  error 会立刻中断：门禁模式只报出第一处（order.js），后面的 cart.js 根本没被处理')
console.log('  想一次报全，就把命中攒到数组里，等 buildEnd 再 this.error 一次')
console.log('  这份实现是 Rollup 原生写法；要走 Vite / webpack，用 unplugin 包一层即可（见 import-on-demand.mjs）')
