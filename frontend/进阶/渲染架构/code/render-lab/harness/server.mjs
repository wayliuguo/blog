/**
 * 测量用服务：端口交给系统分配（listen 0），一套场景一个进程，跑完即关
 * 与手动浏览服务共用 harness/routes.mjs，只是多了一张「等页面上报」的桌子
 */
import http from 'node:http'
import { createHandler } from './routes.mjs'

export async function startServer(options = {}) {
    const pending = new Set()
    const received = []
    const handler = createHandler({
        ...options,
        onReport: (payload) => {
            received.push(payload)
            for (const waiter of pending) waiter(payload)
            pending.clear()
        }
    })
    await handler.warm() // SSG 的「构建时渲染」在接客之前完成

    const server = http.createServer(handler.handle)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

    return {
        origin: `http://127.0.0.1:${server.address().port}`,
        received,
        handler,
        /** 等下一次 /report 到达 */
        nextReport(timeout = 30000) {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(settle)
                    reject(new Error(`等页面上报超时（${timeout}ms）`))
                }, timeout)
                const settle = (payload) => {
                    clearTimeout(timer)
                    resolve(payload)
                }
                pending.add(settle)
            })
        },
        close: () => new Promise((resolve) => server.close(resolve))
    }
}
