// Vite 最小雏形：一个 dev server 的"按需转换、不打包"内核
// 只做三件事，用来理解 Vite 冷启动快的本质：
//   1. HTML/模块按 URL 返回，import 语句原样保留（不拼 bundle）
//   2. 只有被浏览器"请求到"的模块才转换
//   3. 裸导入改写成预构建前缀 /@deps/（对应真实 Vite 的 node_modules/.vite）
// 运行：npm run mini:vite
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, 'mini-src')

// ---- 造一份样本：helper 被入口引用、lazy 存在但从不被请求 ----
fs.mkdirSync(SRC, { recursive: true })
fs.writeFileSync(path.join(SRC, 'index.html'), '<!doctype html><script type="module" src="/src/main.js"></script>\n')
fs.writeFileSync(
    path.join(SRC, 'main.js'),
    ["import { hi } from './helper.js'", "import { greet } from 'tiny-lib'", "console.log('main', hi, greet)"].join(
        '\n'
    ) + '\n'
)
fs.writeFileSync(path.join(SRC, 'helper.js'), "export const hi = 'helper'\n")
fs.writeFileSync(path.join(SRC, 'lazy.js'), "export const lazy = 'never-requested'\n")

// 记录了"这一轮 dev server 一共转换了哪些模块"
const transformed = new Set()

// 极简"转换"：把裸导入改写成预构建前缀 /@deps/，并记录命中
function transform(id, code) {
    transformed.add('/src/' + path.basename(id))
    const lines = code
        .split('\n')
        // 相对导入 ./x 原样保留，让浏览器发第二个 ESM 请求
        .map(l => (/(^|[^'.])from '\.\/?/.test(l) ? l : l))
        // 裸导入（不是相对路径）指向 /@deps/，对应真实 Vite 的依赖预构建产物
        .map(l => {
            const m = /from '([^']+)'/.exec(l)
            return m && !m[1].startsWith('.') ? l.replace(m[1], `/@deps/${m[1]}.js`) : l
        })
    return { code: lines.join('\n') }
}

const server = createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url
    if (urlPath === '/index.html') {
        res.setHeader('Content-Type', 'text/html')
        res.end(fs.readFileSync(path.join(SRC, 'index.html')))
        return
    }
    if (urlPath.startsWith('/@deps/')) {
        // 真实 Vite 会命中 node_modules/.vite/deps；这里只演示"不改依赖源码"
        res.setHeader('Content-Type', 'application/javascript')
        res.end("export const greet = 'deps'\n")
        return
    }
    if (urlPath.startsWith('/src/')) {
        const file = path.join(SRC, urlPath.replace('/src/', ''))
        if (!fs.existsSync(file)) {
            res.statusCode = 404
            res.end('not found')
            return
        }
        // 关键一步：只有这个文件被请求到才走 transform
        const { code } = transform(urlPath, fs.readFileSync(file, 'utf8'))
        res.setHeader('Content-Type', 'application/javascript')
        res.end(code)
        return
    }
    res.statusCode = 404
    res.end('not found')
})

server.listen(0, '127.0.0.1', async () => {
    const port = server.address().port
    const base = `http://127.0.0.1:${port}`
    console.log('---- mini-vite：按需转换、不打包 ----')

    // 只请求入口 JS，不请求页面里其它模块
    const entry = await (await fetch(`${base}/src/main.js`)).text()
    console.log('  请求 /src/main.js →', await (await fetch(`${base}/src/main.js`)).status)
    console.log('  main.js 里 import 是否保留（不打包）：', entry.includes("from './helper.js'"))
    console.log('  main.js 里裸导入被改写：', entry.includes("from '/@deps/tiny-lib.js'"))

    // helper 被 import 引用、也会被请求；lazy 没人请求就不转换
    await fetch(`${base}/src/helper.js`)
    console.log('  helper.js 被请求 → 转换')
    console.log('  lazy.js 没被任何 import 指向，/src/lazy.js 没人请求')
    console.log('  本轮实际转换的模块：', [...transformed].join(', '))

    console.log('\n---- 对比：真实 build 会全量解析整个依赖图 ----')
    console.log('  结论：dev 的工作量只和"浏览器请求了什么"成正比，与项目规模无关')

    server.close()
})
