/**
 * Node 侧的时间测量：用原生 http 客户端，而不是 fetch。
 * 原因很实在：fetch 的承诺要等到能解析出响应头才兑现，且实现会把响应体缓冲，
 * 拿不到「响应头到达 / 第一段内容到达 / 完成」这三个时刻的差别 —— 而流式渲染的关键恰恰是这三个时刻。
 */
import http from 'node:http'

export function probe(base, path, { onChunk } = {}) {
    return new Promise((resolve, reject) => {
        const t0 = performance.now()
        const at = () => Math.round((performance.now() - t0) * 10) / 10
        const req = http.request(base + path, res => {
            const headAt = at()
            const chunks = []
            let body = ''
            res.on('data', buf => {
                const text = Buffer.from(buf).toString('utf8')
                body += text
                const entry = { at: at(), bytes: Buffer.byteLength(text), text }
                chunks.push(entry)
                if (onChunk) onChunk(entry)
            })
            res.on('end', () =>
                resolve({
                    path,
                    headAt,
                    firstAt: chunks.length ? chunks[0].at : null,
                    total: at(),
                    chunks,
                    body,
                    size: Buffer.byteLength(body),
                    mode: res.headers['x-render-mode'],
                    renderMs: Number(res.headers['x-render-ms'] || 0)
                })
            )
        })
        req.on('error', reject)
        req.end()
    })
}

/** 从响应文本里捞出各段的标记名：服务端每写一段都会带上它 */
export const segmentNames = text => [...text.matchAll(/window\.__chunks\.push\(\{name:"([^"]+)"/g)].map(m => m[1])

/** 把一次流式响应的分段到达时刻整理成 [段名, 到达时刻, 该段字节] */
export function segmentTimeline(result) {
    const rows = []
    for (let i = 0; i < result.chunks.length; i++) {
        const names = segmentNames(result.chunks[i].text)
        for (const name of names) rows.push([name, result.chunks[i].at, result.chunks[i].bytes])
    }
    return rows
}
