// mini-vite：一个 dev server 的"按需转换、不打包"内核
// 只做三件事，用来理解 Vite 冷启动快的本质：
//   1. HTML/模块按 URL 返回，import 语句原样保留（不拼 bundle）
//   2. 只有被浏览器"请求到"的模块才转换
//   3. 裸导入改写成预构建前缀 /@deps/（对应真实 Vite 的 node_modules/.vite）
// 运行：node index.mjs（或 npm run mini）
import path from 'node:path'
import url from 'node:url'
import { createDevServer } from './lib/server.mjs'
import { transformed } from './lib/transform.mjs'

const ROOT = path.dirname(url.fileURLToPath(import.meta.url))
const SRC = path.join(ROOT, 'src')

const server = createDevServer(SRC)

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