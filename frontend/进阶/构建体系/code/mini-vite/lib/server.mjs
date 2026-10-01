import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { transform } from './transform.mjs'

// dev server 最小内核：只做「按 URL 找文件 + 只转被请求到的模块」，没有打包这一步。
// 真实 Vite 的中间件链（vite:resolve / vite:import-analysis / vite:transform）在这里退化成三个 if。
export function createDevServer(root) {
    const server = createServer((req, res) => {
        const urlPath = req.url === '/' ? '/index.html' : req.url
        if (urlPath === '/index.html') {
            res.setHeader('Content-Type', 'text/html')
            res.end(fs.readFileSync(path.join(root, 'index.html')))
            return
        }
        if (urlPath.startsWith('/@deps/')) {
            // 真实 Vite 会命中 node_modules/.vite/deps；这里只演示"不改依赖源码"
            res.setHeader('Content-Type', 'application/javascript')
            res.end("export const greet = 'deps'\n")
            return
        }
        if (urlPath.startsWith('/src/')) {
            const file = path.join(root, urlPath.replace('/src/', ''))
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
    return server
}