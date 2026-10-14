// build.mjs —— 构建期：扫描 pages/ 生成路由表，再按 server / client 两遍编译 SFC
import { build } from 'esbuild'
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { vuePlugin } from './src/vue-plugin.ts'

function scanRoutes(dir, prefix = '') {
    const routes = []
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
            routes.push(...scanRoutes(full, `${prefix}/${name}`))
        } else if (name.endsWith('.vue')) {
            const base = name.replace(/\.vue$/, '')
            let pattern = base === 'index' ? prefix : `${prefix}/${base}`
            pattern = pattern.replace(/\[\w+\]/g, (m) => `:${m.slice(1, -1)}`)
            const rel = relative('pages', full).replaceAll('\\', '/')
            routes.push({ pattern, file: `../../pages/${rel}` })
        }
    }
    return routes
}

const routes = scanRoutes('pages')
mkdirSync('src/generated', { recursive: true })

// 文件路由的本质：构建期生成的 import 映射
writeFileSync(
    'src/generated/routes.gen.ts',
    routes.map((r, i) => `import * as page${i} from '${r.file}'`).join('\n') +
        '\nexport const routes = [\n' +
        routes.map((r, i) => `  { pattern: '${r.pattern}', page: page${i} },`).join('\n') +
        '\n]\n',
)

// 两份产物：SSR 包（模板编出 ssrRender）+ 客户端包（模板编出 render + hydration）
await build({
    entryPoints: ['src/server-entry.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '.build/server.js',
    packages: 'external',
    plugins: [vuePlugin('server')],
})
await build({
    entryPoints: ['src/client-entry.ts'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: '.build/client.js',
    plugins: [vuePlugin('client')],
})
console.log('build done, routes =', routes.map((r) => r.pattern).join(', '))
