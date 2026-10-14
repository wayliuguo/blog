// build.mjs —— 构建期做三件事：扫描 pages/ 生成路由表、打 SSR 包、打客户端包
import { build } from 'esbuild'
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// ① 扫描 pages/：index.tsx -> "/"；order/[id].tsx -> "/order/:id"
function scanRoutes(dir, prefix = '') {
    const routes = []
    for (const name of readdirSync(dir).sort()) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
            routes.push(...scanRoutes(full, `${prefix}/${name}`))
        } else if (name.endsWith('.tsx')) {
            const base = name.replace(/\.tsx$/, '')
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

// ② 生成 routes.gen.ts：文件路由的本质是「构建期生成的 import 映射」
writeFileSync(
    'src/generated/routes.gen.ts',
    routes.map((r, i) => `import * as page${i} from '${r.file}'`).join('\n') +
        '\nimport type { Route } from "../match"\n' +
        'export const routes: Route[] = [\n' +
        routes.map((r, i) => `  { pattern: '${r.pattern}', page: page${i} },`).join('\n') +
        '\n]\n',
)

// ③ 两份产物：SSR 包（node 平台）+ 客户端包（浏览器 + hydrate 入口）
await build({
    entryPoints: ['src/server-entry.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: '.build/server.js',
    packages: 'external',
    jsx: 'automatic',
})
await build({
    entryPoints: ['src/client-entry.tsx'],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    outfile: '.build/client.js',
    jsx: 'automatic',
})
console.log('build done, routes =', routes.map((r) => r.pattern).join(', '))
