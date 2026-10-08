// dev 引擎：不打包，按 URL 按需转换。
//
// 这是 mini-vite 的"另一半"。它与 build 引擎的差别不在插件，而在"什么时候处理哪些模块"：
//   dev   —— 浏览器请求哪个就处理哪个，import 原样保留，转换结果直接回给浏览器；
//   build —— 一次走完整张模块图，把所有模块拼成一个文件。
// 两者共用同一个插件容器，所以同一份插件在两端都生效（这就是文档 §3.5 说的"生效端"）。
//
// 对应真实 Vite 的 dev server（src/node/server/index.ts + 内置中间件链）。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fromUrl } from './resolve.mjs'

/** 极简 connect：中间件用 next() 表示"我不处理，交给下一个" */
function runMiddlewares(list, req, res) {
    return new Promise((resolve, reject) => {
        let index = 0
        const next = err => {
            if (err) return reject(err)
            if (res.writableEnded) return resolve(true)
            if (index >= list.length) return resolve(false)
            const fn = list[index++]
            Promise.resolve(fn(req, res, next)).then(() => {
                if (res.writableEnded) resolve(true)
            }, reject)
        }
        next()
    })
}

export async function createDevServer({ root, container, moduleGraph }) {
    const middlewares = []
    const server = {
        config: container.config,
        middlewares: { use: fn => middlewares.push(fn) }
    }

    await container.buildStart({})
    // configureServer 返回的函数是 post hook：排在内置中间件之后
    const postHooks = await container.configureServer(server)

    const log = msg => console.log(`  [dev] ${msg}`)

    async function serveModule(url, res) {
        const id = fromUrl(url, root)
        const code = await container.load(id)
        if (code == null) {
            res.statusCode = 404
            return res.end(`// 没有插件提供 ${id}`)
        }
        const transformed = await container.transform(code, id)
        moduleGraph.markTransformed(id)
        const deps = moduleGraph.get(id)?.imports ?? []
        log(`GET ${url}  →  转换（依赖 ${deps.length} 个）`)
        res.setHeader('Content-Type', 'application/javascript')
        res.end(transformed)
    }

    async function serveHtml(res) {
        const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8')
        const out = await container.transformIndexHtml(html, { path: '/index.html', server })
        log('GET /  →  transformIndexHtml')
        res.setHeader('Content-Type', 'text/html')
        res.end(out)
    }

    const httpServer = http.createServer(async (req, res) => {
        try {
            if (await runMiddlewares([...middlewares, ...postHooks], req, res)) return
            const url = req.url.split('?')[0]
            if (url === '/' || url === '/index.html') return await serveHtml(res)
            return await serveModule(url, res)
        } catch (err) {
            res.statusCode = 500
            res.end(String((err && err.stack) || err))
        }
    })

    return {
        httpServer,
        async listen() {
            await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve))
            return httpServer.address().port
        },
        async close() {
            await new Promise(resolve => httpServer.close(resolve))
            await container.buildEnd()
        }
    }
}
