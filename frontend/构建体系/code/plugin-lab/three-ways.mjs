// 构建插件开发：同一个需求（虚拟模块 + 注入构建信息），三套钩子各写一遍
// 需求：让源码可以 `import { BUILD_INFO } from 'virtual:build-info'`
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import webpack from 'webpack'
import { build as viteBuild } from 'vite'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
// 不用 virtual: 这种带冒号的写法：webpack 会把它当 URI scheme 报 Unhandled scheme
const VIRTUAL = 'virtual-build-info'
const RESOLVED = '\0' + VIRTUAL

const INFO = JSON.stringify({ builtAt: new Date().toISOString(), env: 'plugin-lab' })

// ---------------- 1. Rollup 版 ----------------
function rollupPlugin() {
    return {
        name: 'build-info-rollup',
        resolveId(source) {
            if (source === VIRTUAL) return RESOLVED
            return null
        },
        load(id) {
            if (id === RESOLVED) return `export const BUILD_INFO = ${INFO};`
            return null
        }
    }
}

// ---------------- 2. webpack 版 ----------------
// webpack 没有 resolveId/load，得自己接进 resolver + 造一个模块
function webpackPlugin() {
    return {
        apply(compiler) {
            // 拦截解析：把虚拟 id 指向一个"不存在的绝对路径"，再由 loader 提供内容
            compiler.hooks.normalModuleFactory.tap('build-info-webpack', nmf => {
                nmf.hooks.beforeResolve.tap('build-info-webpack', resolveData => {
                    if (resolveData.request === VIRTUAL) {
                        resolveData.request = path.join(ROOT, 'virtual-build-info.js')
                    }
                })
            })
            // 用 loader 把内容喂进去
            compiler.options.module.rules.push({
                test: /virtual-build-info\.js$/,
                use: [
                    {
                        loader: path.join(ROOT, 'virtual-loader.cjs'),
                        options: { info: INFO }
                    }
                ]
            })
        }
    }
}

// ---------------- 3. Vite 版 ----------------
function vitePlugin() {
    return {
        name: 'build-info-vite',
        // enforce: 'pre' —— 抢在 Vite 内置解析之前处理，否则虚拟 id 会被当成普通依赖
        enforce: 'pre',
        resolveId(source) {
            if (source === VIRTUAL) return RESOLVED
            return null
        },
        load(id) {
            if (id === RESOLVED) return `export const BUILD_INFO = ${INFO};`
            return null
        }
    }
}

// 从任意产物文本里抠出一段含关键字的片段（不管它压没压缩/换没换行）
function snippetOf(code, keyword) {
    const i = code.indexOf(keyword)
    if (i < 0) return '(未找到)'
    return code.slice(Math.max(0, i - 40), i + 60).replace(/\s+/g, ' ')
}

async function main() {
    console.log('---- 1. Rollup ----')
    const bundle = await rollup({
        input: path.join(ROOT, 'src/main.js'),
        plugins: [rollupPlugin()],
        // 虚拟模块之外还会解析 src，不需要额外插件
        onwarn: () => {}
    })
    const { output } = await bundle.generate({ format: 'es' })
    console.log('  产物含 BUILD_INFO:', output[0].code.includes('BUILD_INFO'))
    console.log('  产物片段:', snippetOf(output[0].code, 'builtAt'))

    console.log('\n---- 2. webpack ----')
    await new Promise((resolve, reject) => {
        webpack(
            {
                mode: 'production',
                entry: path.join(ROOT, 'src/main.js'),
                output: { path: path.join(ROOT, 'dist-webpack'), filename: 'out.js' },
                optimization: { minimize: false },
                // loader 规则直接写在配置里（插件只负责改写请求）
                module: {
                    rules: [
                        {
                            test: /virtual-build-info\.js$/,
                            use: [{ loader: path.join(ROOT, 'virtual-loader.cjs'), options: { info: INFO } }]
                        }
                    ]
                },
                plugins: [webpackPlugin()],
                performance: { hints: false },
                stats: 'errors-only'
            },
            (err, stats) => {
                if (err) return reject(err)
                if (stats.hasErrors()) {
                    return reject(new Error(JSON.stringify(stats.toJson().errors[0], null, 2).slice(0, 900)))
                }
                const code = fs.readFileSync(path.join(ROOT, 'dist-webpack', 'out.js'), 'utf8')
                console.log('  产物含 BUILD_INFO:', code.includes('BUILD_INFO'))
                console.log('  产物片段:', snippetOf(code, 'builtAt'))
                resolve()
            }
        )
    })

    console.log('\n---- 3. Vite（build 侧）----')
    const res = await viteBuild({
        root: ROOT,
        configFile: false,
        logLevel: 'warn',
        plugins: [vitePlugin()],
        build: {
            write: false,
            minify: false,
            rollupOptions: { input: path.join(ROOT, 'src/main.js') }
        }
    })
    const out = Array.isArray(res) ? res[0].output : res.output
    const code = out.find(o => o.type === 'chunk').code
    console.log('  产物含 BUILD_INFO:', code.includes('BUILD_INFO'))
    console.log('  产物片段:', snippetOf(code, 'builtAt'))

    console.log('\n---- 三套钩子的对照 ----')
    console.log('  Rollup/Vite：resolveId → load（声明式，插件只需回答"id 是什么""内容是什么"）')
    console.log('  webpack：normalModuleFactory.beforeResolve（改写请求）+ loader（喂内容）')
    console.log('  能力差异就来自这里：webpack 暴露的是内部工厂钩子，更灵活也更难写对')
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
