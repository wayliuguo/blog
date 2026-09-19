/**
 * 临时 HTTP 服务：端口交给系统分配（listen 0），跑完即关。
 * 实验台里的服务都只活在一次场景运行期间，所以不需要固定端口，也不会互相撞车。
 */
import http from 'node:http'

export function startServer(handler) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            Promise.resolve(handler(req, res)).catch((err) => {
                res.writeHead(500).end(String(err && err.message))
            })
        })
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            resolve({
                port,
                base: `http://127.0.0.1:${port}`,
                close: () => new Promise((done) => server.close(done))
            })
        })
    })
}

export function readBody(req) {
    return new Promise((resolve) => {
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => resolve(Buffer.concat(chunks)))
    })
}

export function json(res, data, status = 200) {
    const body = Buffer.from(JSON.stringify(data))
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': body.length
    })
    res.end(body)
}

export function text(res, body, status = 200) {
    const buf = Buffer.from(body)
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'content-length': buf.length })
    res.end(buf)
}
