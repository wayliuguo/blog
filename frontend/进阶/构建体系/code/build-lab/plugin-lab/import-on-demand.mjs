// 构建插件开发：一个真实场景插件 —— 组件库按需引入（babel-plugin-import 的打包器版）
// 一份实现，用 unplugin 同时给 Rollup / Vite / webpack 用
// 运行：npm run plugin:ondemand
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createUnplugin } from 'unplugin'
import { rollup } from 'rollup'
import webpack from 'webpack'
import { build as viteBuild } from 'vite'
import { parse } from '@babel/parser'
import MagicString from 'magic-string'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const LIB = path.join(ROOT, 'ui-lib')
const ENTRY = path.join(ROOT, 'src-ondemand/main.js')

// 把裸导入 'ui-lib' / 'ui-lib/es/xxx' 指到本地样本（真实项目里这是 node-resolve 的活）
const resolver = {
    name: 'ui-lib-resolver',
    resolveId(source) {
        if (source === 'ui-lib') return path.join(LIB, 'index.js')
        if (source.startsWith('ui-lib/')) return path.join(LIB, source.slice('ui-lib/'.length))
        return null
    },
    load(id) {
        // 本实验不关心样式内容：真实项目由 css 插件接管，这里给个空模块
        if (id.endsWith('.css')) return 'export default ""'
        return null
    }
}

const unplugin = createUnplugin(({ libraryName = 'ui-lib', style = true } = {}) => {
    return {
        name: 'import-on-demand',
        transform(code, id) {
            if (!id.endsWith('.js') || !code.includes(libraryName)) return null
            const ast = parse(code, { sourceType: 'module' })
            const s = new MagicString(code)
            let changed = false

            for (const node of ast.program.body) {
                if (node.type !== 'ImportDeclaration') continue
                if (node.source.value !== libraryName) continue
                const specs = node.specifiers.filter((sp) => sp.type === 'ImportSpecifier')
                if (!specs.length) continue

                const lines = []
                for (const sp of specs) {
                    const name = sp.imported.name // Button
                    const dir = name.toLowerCase() // button
                    lines.push(`import ${sp.local.name} from '${libraryName}/es/${dir}.js'`)
                    if (style) lines.push(`import '${libraryName}/es/${dir}/style.css'`)
                }
                s.overwrite(node.start, node.end, lines.join('\n'))
                changed = true
            }

            if (!changed) return null
            // 用 magic-string 而不是字符串 replace：它顺带把 sourcemap 算好了
            return { code: s.toString(), map: s.generateMap({ hires: true }) }
        }
    }
})

function report(label, code, map) {
    const hit = (s) => String(code.includes(s)).padEnd(5)
    const size = String(code.length).padStart(5)
    const m = map ? ` · sourcemap mappings ${map.mappings.length} 字符` : ''
    console.log(`  ${label.padEnd(18)} button:${hit('button 被注册')} table:${hit('table 被注册')} form:${hit('form 被注册')} ${size} 字符${m}`)
}

async function main() {
    console.log('---- ① 不用插件：import { Button } from "ui-lib" ----')
    const plain = await rollup({ input: ENTRY, plugins: [resolver], onwarn: () => {} })
    const plainOut = (await plain.generate({ format: 'es' })).output
    report('Rollup（无插件）', plainOut[0].code)
    await plain.close()

    console.log('\n---- ② 加了按需插件（同一份源码）----')
    // Rollup
    const b = await rollup({ input: ENTRY, plugins: [resolver, unplugin.rollup()], onwarn: () => {} })
    const out = (await b.generate({ format: 'es', sourcemap: true })).output
    report('Rollup', out[0].code, out[0].map)
    await b.close()

    // Vite
    const res = await viteBuild({
        root: ROOT,
        configFile: false,
        logLevel: 'error',
        plugins: [resolver, unplugin.vite()],
        build: { write: false, minify: false, rollupOptions: { input: ENTRY } }
    })
    const vout = (Array.isArray(res) ? res[0] : res).output
    report('Vite', vout.find((o) => o.type === 'chunk').code)

    // webpack
    await new Promise((resolve, reject) => {
        webpack(
            {
                mode: 'production',
                entry: ENTRY,
                output: { path: path.join(ROOT, 'dist-ondemand'), filename: 'out.js' },
                resolve: { alias: { 'ui-lib': LIB } },
                module: { rules: [{ test: /\.css$/, type: 'asset/source' }] },
                plugins: [unplugin.webpack()],
                optimization: { minimize: false },
                performance: { hints: false },
                stats: 'errors-only'
            },
            (err, stats) => {
                if (err) return reject(err)
                if (stats.hasErrors()) return reject(new Error(JSON.stringify(stats.toJson().errors[0]).slice(0, 600)))
                report('webpack', fs.readFileSync(path.join(ROOT, 'dist-ondemand/out.js'), 'utf8'))
                resolve()
            }
        )
    })

    console.log('\n---- 结论 ----')
    console.log('  组件库每个模块顶层都有注册副作用，所以"整包引入"会把三个组件全打进来')
    console.log('  按需插件把具名导入改写成深路径 + 样式副作用导入，只引真正用到的那个')
    console.log('  改写必须用 magic-string：字符串 replace 会让 sourcemap 错位，报错定位到行号就不可信了')
    console.log('  同一份实现跑三个打包器：差异只在 unplugin.rollup / .vite / .webpack 这一行')
}

main().catch((e) => {
    console.error(e.message || e)
    process.exit(1)
})
