// Vite：双引擎实测 —— dev 按需转换 vs build 全量构建
// 运行：npm run vite
const path = require('node:path')
const fs = require('node:fs')
const { createServer, build } = require('vite')
const { spawnSync } = require('node:child_process')

const ROOT = __dirname

function walk(dir) {
    if (!fs.existsSync(dir)) return []
    const out = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(p))
        else out.push(p)
    }
    return out
}

;(async () => {
    // ---------- 1. dev server：只转换被请求到的模块 ----------
    console.log('---- 1. dev server（按需转换）----')
    const server = await createServer({
        configFile: path.join(ROOT, 'vite.config.mjs'),
        root: ROOT,
        // 端口交给系统分配；host 明确绑 127.0.0.1，否则 localhost 可能解析到 ::1 导致 fetch 失败
        server: { port: 0, host: '127.0.0.1' },
        logLevel: 'warn'
    })
    await server.listen()
    const port = server.httpServer.address().port
    const base = `http://127.0.0.1:${port}`

    // 只请求入口 JS，不请求页面里的其他模块
    const res = await fetch(`${base}/src/main.js`)
    const code = await res.text()
    console.log('  请求 /src/main.js 状态:', res.status)
    console.log('  返回内容里 import.meta.env.VITE_APP_NAME 被替换成：', /"([^"]*build-lab[^"]*)"/.exec(code)?.[1] ?? '(未替换)')
    console.log('  dev 下还留有原始 import 语句：', code.includes('from "/src/helper.js"') || code.includes("from '/src/helper.js'"))
    await server.close()

    // ---------- 2. build：全量走 Rollup ----------
    console.log('\n---- 2. build（Rollup 全量构建）----')
    const t0 = Date.now()
    const result = await build({
        configFile: path.join(ROOT, 'vite.config.mjs'),
        root: ROOT,
        logLevel: 'warn'
    })
    const output = Array.isArray(result) ? result[0].output : result.output
    console.log('  构建耗时:', Date.now() - t0, 'ms')
    console.log('  产物：')
    for (const item of output) {
        const size = item.type === 'chunk' ? item.code.length : item.source.length
        console.log(`    ${item.fileName.padEnd(28)} ${(size / 1024).toFixed(1)} KB`)
    }

    // ---------- 3. 产物里环境变量是否变成了字面量 ----------
    const entry = output.find((o) => o.type === 'chunk' && o.isEntry)
    const entryCode = entry ? entry.code : ''
    console.log('\n---- 3. 编译期替换证据 ----')
    console.log('  产物里含 "build-lab-prod"（.env.production）：', entryCode.includes('build-lab-prod'))
    console.log('  产物里含 "build-lab-dev"（.env）：', entryCode.includes('build-lab-dev'))
    console.log('  产物里还留有 import.meta.env：', entryCode.includes('import.meta.env'))

    // ---------- 4. 依赖预构建产物 ----------
    console.log('\n---- 4. 依赖预构建产物（optimizeDeps）----')
    // 显式触发一次预构建，否则只有 dev server 首次启动才会做
    // vite 没有导出 ./bin/vite.js，直接用包内路径
    const viteCli = path.join(ROOT, '..', 'node_modules', 'vite', 'bin', 'vite.js')
    spawnSync(process.execPath, [viteCli, 'optimize', '--force', '--config', path.join(ROOT, 'vite.config.mjs')], {
        cwd: ROOT,
        encoding: 'utf8'
    })
    // 预构建缓存落在最近的 node_modules/.vite 下（这里是 build-lab/node_modules/.vite）
    const depsDir = path.join(ROOT, '..', 'node_modules', '.vite', 'deps')
    const files = walk(depsDir).filter((f) => f.endsWith('.js'))
    if (files.length === 0) {
        console.log('  （本次运行没有触发预构建，可先执行 vite optimize --force）')
    } else {
        for (const f of files.slice(0, 6)) {
            console.log('  ', path.relative(depsDir, f), (fs.statSync(f).size / 1024).toFixed(1), 'KB')
        }
        console.log('  预构建做的事：CJS → ESM 转换 + 把碎片化的内部模块合并成一个文件')
    }
})()
