// src/vue-plugin.ts —— esbuild 的 .vue 加载器：mini-vite 的核心，两遍编译（server / client）
import { parse, compileTemplate } from 'vue/compiler-sfc'
import { transformSync } from 'esbuild'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export function vuePlugin(mode) {
    return {
        name: 'vue-sfc',
        setup(build) {
            build.onLoad({ filter: /\.vue$/ }, (args) => {
                const source = readFileSync(args.path, 'utf8')
                const { descriptor, errors } = parse(source, { filename: args.path })
                if (errors.length) {
                    return { errors: errors.map((e) => ({ text: String(e) })) }
                }
                // ① script：export default 改名捕获，交给 esbuild 转译掉 TS
                let scriptCode = 'const __default__ = {}'
                if (descriptor.script) {
                    const raw = descriptor.script.content.replace(/export\s+default/, 'const __default__ =')
                    scriptCode = transformSync(raw, { loader: 'ts' }).code
                }
                // ② template：按当前模式编译——server 编出 ssrRender，client 编出 render
                const id = createHash('md5').update(args.path).digest('hex').slice(0, 8)
                const tpl = compileTemplate({
                    source: descriptor.template.content,
                    filename: args.path,
                    id,
                    ssr: mode === 'server',
                    cssVars: [],
                })
                const tplCode = tpl.code.replace(
                    /export (function|const) (ssrRender|render)/,
                    'function $2',
                )
                const binding = mode === 'server' ? 'ssrRender' : 'render'
                // ③ 合成组件：默认导出 + 编译出的渲染函数，交给 Vue 运行时
                const contents = `${scriptCode}\n${tplCode}\nexport default Object.assign(__default__, { ${binding} })\n`
                return { contents, loader: 'js' }
            })
        },
    }
}
