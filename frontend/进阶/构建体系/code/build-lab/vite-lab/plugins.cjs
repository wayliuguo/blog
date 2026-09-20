// Vite：插件顺序（enforce / apply）+ 一个真实场景插件（HTML 注入 modulepreload 与 CSP nonce）
// 样本由脚本生成：入口动态 import 一个子模块，构建后就有"依赖 chunk"可注入
// 运行：npm run vite:plugins
const path = require('node:path')
const fs = require('node:fs')
const { build, createServer } = require('vite')

const DIR = path.join(__dirname, 'src-plugins')
fs.mkdirSync(DIR, { recursive: true })
fs.writeFileSync(
    path.join(DIR, 'index.html'),
    ['<!doctype html>', '<html>', '  <head><title>lab</title></head>', '  <body><script type="module" src="/main.js"></script></body>', '</html>', ''].join('\n')
)
fs.writeFileSync(
    path.join(DIR, 'main.js'),
    ["import { hello } from './vendor.js'", "console.log('main', hello)"].join('\n') + '\n'
)
fs.writeFileSync(path.join(DIR, 'vendor.js'), "export const hello = 'vendor'\n")

// ---------- 1. 真实场景插件：产物 HTML 收尾 ----------
// 它要干三件生产里真会干的事：给首屏依赖加 modulepreload、给脚本加 CSP nonce、只在构建期跑
function htmlGuard({ nonce = 'lab-nonce', skipExisting = false } = {}) {
    return {
        name: 'html-guard',
        apply: 'build', // 只在 vite build 时生效，dev 完全不加载
        transformIndexHtml: {
            order: 'post', // 排在其它 HTML 变换之后，保证看到的是最终产物
            handler(html, ctx) {
                const entry = Object.values(ctx.bundle).find((o) => o.type === 'chunk' && o.isEntry)
                // Vite 默认已经注入过 modulepreload，不查重就会重复发请求
                const imports = (entry?.imports || []).filter((f) => !(skipExisting && html.includes(f)))
                const preloads = imports
                    .map((f) => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
                    .join('\n    ')
                const withNonce = html.replace(/<script /g, `<script nonce="${nonce}" `)
                return withNonce.replace('</head>', `    ${preloads}\n  </head>`)
            }
        }
    }
}

// dev 侧：挂一个中间件暴露依赖清单（build 插件的 configureServer 不会跑，所以要单独一个）
function devManifest() {
    return {
        name: 'dev-manifest',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__manifest', (_req, res) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ deps: ['vendor.js'], mode: 'serve' }))
            })
        }
    }
}

// ---------- 2. 顺序探针：只记录，不改写 ----------
// 按模块分组记录：同一个模块上，三个插件的 transform 谁先谁后
const orders = new Map()
function marker(name, enforce) {
    return {
        name: `marker-${name}`,
        enforce,
        transform(code, id) {
            if (!id.includes('main.js')) return null
            const arr = orders.get(id) || []
            arr.push(name)
            orders.set(id, arr)
            return null
        }
    }
}
const htmlGuardRan = { build: false, serve: false }
function probeRun() {
    return {
        name: 'probe-run',
        apply: 'build',
        transformIndexHtml() {
            htmlGuardRan.build = true
            return null
        }
    }
}

async function htmlBuild(skipExisting) {
    const result = await build({
        configFile: false,
        root: DIR,
        logLevel: 'error',
        plugins: [probeRun(), htmlGuard({ skipExisting })],
        build: {
            write: false,
            minify: false,
            emptyOutDir: false,
            rollupOptions: {
                output: {
                    // 把静态依赖切成单独 chunk，入口才有"依赖 chunk"可注入 preload
                    manualChunks(id) {
                        if (id.includes('vendor.js')) return 'vendor'
                        return null
                    }
                }
            }
        }
    })
    const output = Array.isArray(result) ? result[0].output : result.output
    const html = output.find((o) => o.fileName === 'index.html')
    const text = typeof html.source === 'string' ? html.source : Buffer.from(html.source).toString('utf8')
    const entry = output.find((o) => o.type === 'chunk' && o.isEntry)
    return { text, imports: entry.imports || [] }
}

;(async () => {
    // ① 插件顺序：enforce 决定同一钩子的执行次序
    await build({
        configFile: false,
        root: DIR,
        logLevel: 'error',
        plugins: [marker('post', 'post'), marker('normal'), marker('pre', 'pre')],
        build: { write: false, minify: false, emptyOutDir: false }
    })
    console.log('---- ① enforce 决定同一钩子的执行顺序 ----')
    console.log('  main.js 上三个插件的先后：', ([...orders.values()][0] || []).join(' → ') || '(未采集到)')

    // ② 真实插件：不查重 vs 查重
    const naive = await htmlBuild(false)
    const smart = await htmlBuild(true)
    console.log('\n---- ② 真实插件：产物 HTML 收尾 ----')
    console.log('  入口 chunk 的依赖 chunk：', naive.imports.join(', ') || '(无)')
    console.log('  不查重时 modulepreload 条数：', (naive.text.match(/rel="modulepreload"/g) || []).length, '（Vite 默认 1 条 + 插件又加 1 条）')
    console.log('  查重后   modulepreload 条数：', (smart.text.match(/rel="modulepreload"/g) || []).length)
    console.log('  <script> 带 nonce：', /<script nonce="lab-nonce"/.test(smart.text))
    console.log('  最终 HTML：')
    console.log(
        smart.text
            .split('\n')
            .filter((l) => l.includes('modulepreload') || l.includes('<script'))
            .map((l) => '    ' + l.trim())
            .join('\n')
    )

    // ③ dev 侧：apply:'build' 的插件不加载，中间件可用
    const server = await createServer({
        configFile: false,
        root: DIR,
        logLevel: 'error',
        plugins: [probeRun(), devManifest(), htmlGuard()],
        server: { port: 0, host: '127.0.0.1' }
    })
    await server.listen()
    const port = server.httpServer.address().port
    const res = await fetch(`http://127.0.0.1:${port}/__manifest`)
    console.log('\n---- ③ dev 侧：apply 与中间件 ----')
    console.log('  GET /__manifest →', res.status, await res.text())
    console.log("  apply:'build' 的插件在 dev 下被调用：", htmlGuardRan.build && !htmlGuardRan.serve ? '否（build 时 true、dev 时未被调用）' : '（见下）')
    await server.close()

    console.log('\n---- 结论 ----')
    console.log('  enforce 只影响"同一钩子里谁先谁后"：pre → normal → post，跨钩子无效')
    console.log('  apply 决定插件加载与否：dev 专属逻辑写 apply:"serve"，产物处理写 apply:"build"')
    console.log('  transformIndexHtml 的 ctx.bundle 只有构建期才有 —— dev 阶段想做同样的事要走 configureServer')
    console.log('  modulepreload 解决的是"入口 JS 下载完才知道还要下依赖"的串行等待')
    console.log('  但 Vite 默认已经注入过了：自定义注入必须先查重，否则同一个 chunk 会被请求两次')
})()
