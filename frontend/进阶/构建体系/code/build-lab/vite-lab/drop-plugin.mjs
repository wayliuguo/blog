// Vite 常见自定义插件：构建期"剔除" + 产物体积报告
// 生产里四条真实诉求，一条脚本讲完：
//   (a) 剔除测试/mock 文件（main.spec.js、mock.js 命中即清空 → 被 tree-shake 摇掉）
//   (b) 剔除调试注释与 console.log 行
//   (c) generateBundle 里删掉指定产物（本文删 vendor chunk，演示白名单）
//   (d) 产物分析：逐文件报体积，超阈值即构建失败（大小门槛）
// 运行：npm run vite:drop
import path from 'node:path'
import url from 'node:url'
import fs from 'node:fs'
import { build } from 'vite'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const DIR = path.join(__dirname, 'src-drop')
fs.mkdirSync(path.join(DIR, 'src'), { recursive: true })
fs.writeFileSync(
    path.join(DIR, 'index.html'),
    '<!doctype html><script type="module" src="/src/main.js"></script>\n'
)
fs.writeFileSync(
    path.join(DIR, 'src', 'main.js'),
    [
        "import { hi } from './helper.js'",
        "import './mock.js'", // 会被 transform 清空
        "import './main.spec.js'", // 会被 transform 清空",
        "import React from 'react'",
        '',
        '// TODO: 上线前补全',
        'console.log("调试日志，构建期应被清掉")',
        'document.body.dataset.env = "dev"',
        '',
        "export const msg = 'main:' + hi",
        'console.log(msg)',
        ''
    ].join('\n')
)
fs.writeFileSync(path.join(DIR, 'src', 'helper.js'), "export const hi = 'helper'\n")
fs.writeFileSync(
    path.join(DIR, 'src', 'mock.js'),
    "export const fakeUsers = [{ id: 1, name: 'mock' }]\nconsole.log('mock 注入')\n"
)
fs.writeFileSync(
    path.join(DIR, 'src', 'main.spec.js'),
    "import { msg } from './main.js'\ndescribe('main', () => it('works', () => expect(msg).toBeTruthy()))\n"
)

const removed = []
const sizes = []

const dropPlugin = () => ({
    name: 'lab-drop',
    enforce: 'pre', // 抢在内置转换之前处理源码
    transform(code, id) {
        if (!id.includes('/src-drop/')) return null
        // (a) 测试 / mock 文件：直接清空，让 tree-shaking 把整个模块摇掉
        if (/\.spec\.js$|mock\.js$/.test(id)) {
            removed.push(path.basename(id))
            return { code: 'export {}' }
        }
        // (b) 剔除注释行与 console.log 调试行（真实场景往往精确到项目自己的 logger）
        const cleaned = code
            .split('\n')
            .map(l => (l.trim().startsWith('//') || /^\s*console\.log\(/.test(l) ? '' : l))
            .join('\n')
        return cleaned === code ? null : { code: cleaned }
    },
    // (c) 产物白名单：生成完删掉不想发布的 chunk
    generateBundle(_options, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type !== 'chunk') continue
            sizes.push({ file: fileName, bytes: chunk.code.length })
            if (fileName.startsWith('vendor')) {
                delete bundle[fileName]
                removed.push(fileName)
            }
        }
        sizes.sort((a, b) => b.bytes - a.bytes)
        const total = sizes.reduce((s, x) => s + x.bytes, 0)
        console.log('\n---- ④ 产物分析与体积门槛 ----')
        for (const { file, bytes } of sizes) {
            console.log(`    ${file.padEnd(30)} ${(bytes / 1024).toFixed(2)} KB`)
        }
        console.log(`    产物总字节: ${total}`)
        // (d) 体积门槛：超过 20 KB 即失败
        if (total > 20 * 1024) {
            throw new Error(`体积门槛未过：${(total / 1024).toFixed(1)} KB > 20 KB`)
        }
    }
})

const before = (await import('node:fs')).readFileSync(path.join(DIR, 'src', 'main.js'), 'utf8')
const result = await build({
    configFile: false,
    root: DIR,
    logLevel: 'error',
    plugins: [dropPlugin()],
    build: {
        write: false,
        minify: false,
        emptyOutDir: false,
        rollupOptions: {
            input: path.join(DIR, 'src', 'main.js'),
            // 用 fake 依赖制造一个 vendor chunk，演示"删掉指定产物"
            external: id => id === 'react',
            output: {
                manualChunks(id) {
                    if (id.includes('helper.js')) return 'vendor-lab'
                    return null
                }
            }
        }
    }
})

console.log('---- ①②③ 剔除与清空 ----')
console.log('  源码里注释行数：', before.split('\n').filter(l => l.trim().startsWith('//')).length)
console.log('  明显被剔除的调试位：', removed.filter(f => /mock|spec/.test(f)).join(', ') || '(无)')
console.log('  mock.js 是否还在产物/依赖里：', removed.includes('mock.js') ? '已剔除' : '（见下）')
console.log('  依赖 react 是否仍被解析为外部：', result ? 'external（不进产物）' : '')