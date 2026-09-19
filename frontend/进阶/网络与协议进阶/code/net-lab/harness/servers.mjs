/**
 * 场景用的临时服务器：同一套路由分别跑在 HTTP/1.1 与 HTTP/2（h2c）上，
 * 端口用 0 让系统分配，避免与文档里 5190 / 5191 的手动浏览服务撞车
 */
import http from 'node:http'
import http2 from 'node:http2'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { handle } = require('../lib/endpoints.cjs')

function listen(server) {
    return new Promise((resolve) => server.listen(0, () => resolve(server.address().port)))
}

/** HTTP/1.1 服务器 */
export async function startHttp1() {
    const server = http.createServer((req, res) => {
        handle(req, res)
    })
    return { server, port: await listen(server), close: () => server.close() }
}

/** HTTP/2 明文服务器（h2c），同一个 handler */
export async function startHttp2() {
    const server = http2.createServer((req, res) => {
        handle(req, res)
    })
    return { server, port: await listen(server), close: () => server.close() }
}

/** 并发发起 n 个 /api/slow 请求，返回每次的耗时（ms） */
export function slowRequests(base, n, ms, agent) {
    return Array.from({ length: n }, (_, i) => {
        const url = new URL(`/api/slow?ms=${ms}`, base)
        return new Promise((resolve) => {
            const started = process.hrtime.bigint()
            const req = http.get(url, { agent }, (res) => {
                res.resume()
                res.on('end', () => resolve(Number(process.hrtime.bigint() - started) / 1e6))
            })
            req.on('error', () => resolve(NaN))
        })
    })
}

export { http, http2 }
