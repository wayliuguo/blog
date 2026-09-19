// 构建插件开发：unplugin —— 一份实现，同时给 Rollup / Vite / webpack 用
// 运行：npm run plugin:unplugin
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createUnplugin } from 'unplugin'
import { rollup } from 'rollup'
import webpack from 'webpack'
import { build as viteBuild } from 'vite'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
// 不用 virtual: 这种带冒号的写法：webpack 会把它当 URI scheme 报 Unhandled scheme
const VIRTUAL = 'virtual-build-info'
const RESOLVED = '\0' + VIRTUAL

// 只写一次：resolveId + load，unplugin 负责翻译成各打包器的钩子
// 注意：createUnplugin 返回的不是工厂函数，适配器才是入口 —— unplugin.rollup(options)
const unplugin = createUnplugin((options = {}) => {
    const info = JSON.stringify({ builtAt: new Date().toISOString(), env: options.env || 'dev' })
    return {
        name: 'build-info-unplugin',
        resolveId(id) {
            if (id === VIRTUAL) return RESOLVED
            return null
        },
        load(id) {
            if (id === RESOLVED) return `export const BUILD_INFO = ${info};`
            return null
        },
        transform(code) {
            if (!code.includes('__PLUGIN_MARK__')) return null
            return code.replace(/__PLUGIN_MARK__/g, 'marked by unplugin')
        }
    }
})

function snippetOf(code, keyword) {
    const i = code.indexOf(keyword)
    if (i < 0) return '(未找到)'
    return code.slice(Math.max(0, i - 30), i + 60).replace(/\s+/g, ' ')
}

async function main() {
    const opts = { env: 'unplugin-demo' }

    console.log('---- 1. 同一份实现 → Rollup ----')
    const bundle = await rollup({
        input: path.join(ROOT, 'src/main.js'),
        plugins: [unplugin.rollup(opts)],
        onwarn: () => {}
    })
    const { output } = await bundle.generate({ format: 'es' })
    console.log('  含 BUILD_INFO:', output[0].code.includes('BUILD_INFO'), '|', snippetOf(output[0].code, 'builtAt'))

    console.log('\n---- 2. 同一份实现 → Vite ----')
    const res = await viteBuild({
        root: ROOT,
        configFile: false,
        logLevel: 'error',
        plugins: [unplugin.vite(opts)],
        build: {
            write: false,
            minify: false,
            rollupOptions: { input: path.join(ROOT, 'src/main.js') }
        }
    })
    const out = Array.isArray(res) ? res[0].output : res.output
    const vcode = out.find((o) => o.type === 'chunk').code
    console.log('  含 BUILD_INFO:', vcode.includes('BUILD_INFO'), '|', snippetOf(vcode, 'builtAt'))

    console.log('\n---- 3. 同一份实现 → webpack ----')
    await new Promise((resolve, reject) => {
        webpack(
            {
                mode: 'development',
                devtool: false,
                entry: path.join(ROOT, 'src/main.js'),
                output: { path: path.join(ROOT, 'dist-unplugin'), filename: 'out.js' },
                plugins: [unplugin.webpack(opts)],
                performance: { hints: false },
                stats: 'errors-only'
            },
            (err, stats) => {
                if (err) return reject(err)
                if (stats.hasErrors()) {
                    return reject(new Error(JSON.stringify(stats.toJson().errors[0]).slice(0, 600)))
                }
                const code = fs.readFileSync(path.join(ROOT, 'dist-unplugin', 'out.js'), 'utf8')
                console.log('  含 BUILD_INFO:', code.includes('BUILD_INFO'), '|', snippetOf(code, 'builtAt'))
                resolve()
            }
        )
    })

    console.log('\n---- 结论 ----')
    console.log('unplugin 把 resolveId / load / transform 翻译成各打包器的原生钩子')
    console.log('代价：只能用它抽象的那一层，deep 定制（webpack 内部工厂钩子、Vite 的 configureServer）仍要写原生插件')
}

main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
})
