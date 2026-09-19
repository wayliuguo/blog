// Rollup：手写一个插件 —— 虚拟模块 + 构建收尾统计
// 运行：npm run rollup:plugin
const path = require('node:path')
const { rollup } = require('rollup')

const ROOT = __dirname
const VIRTUAL_ID = 'virtual:build-info'
const RESOLVED_ID = '\0' + VIRTUAL_ID

function buildInfoPlugin(options = {}) {
    return {
        name: 'build-info',

        // resolveId：决定一个 import 说明符指向哪个模块
        resolveId(source) {
            if (source === VIRTUAL_ID) {
                return RESOLVED_ID // \0 前缀是"虚拟模块"的约定，告诉其他插件别去磁盘找
            }
            return null // 返回 null 表示"我不处理，交给后面的插件"
        },

        // load：提供模块内容
        load(id) {
            if (id === RESOLVED_ID) {
                const info = {
                    builtAt: new Date().toISOString(),
                    env: options.env || 'unknown'
                }
                return `export const BUILD_INFO = ${JSON.stringify(info)};`
            }
            return null
        },

        // transform：改写已有模块的代码（这里给每个模块加一行来源标记）
        transform(code, id) {
            if (id.startsWith('\0')) return null
            if (!id.endsWith('.js')) return null
            return {
                code: `// from ${path.basename(id)}\n${code}`,
                map: null // 返回 null 表示不产出 sourcemap（真实插件应返回 map）
            }
        },

        // generateBundle：产物生成后、写盘前
        generateBundle(outputOptions, bundle) {
            console.log('---- generateBundle：产物清单 ----')
            for (const [name, item] of Object.entries(bundle)) {
                const size = item.type === 'chunk' ? item.code.length : item.source.length
                console.log(`  ${name.padEnd(16)} ${item.type.padEnd(6)} ${(size / 1024).toFixed(2)} KB`)
            }
        }
    }
}

;(async () => {
    const bundle = await rollup({
        input: path.join(ROOT, 'src-with-virtual/main.js'),
        plugins: [buildInfoPlugin({ env: 'demo' })]
    })
    const { output } = await bundle.generate({ format: 'es' })
    console.log('\n---- 产物里虚拟模块被内联了 ----')
    console.log(output[0].code.split('\n').filter((l) => l.includes('BUILD_INFO') || l.includes('builtAt')).join('\n'))
})()
