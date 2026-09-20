/**
 * 场景：HTTP/2 多路复用解决了什么
 * 运行：npm run http2
 *
 * 同一套路由跑在 HTTP/1.1 与 HTTP/2(h2c) 两个临时服务器上，对照三件事：
 *   1. 6 个 200ms 请求：HTTP/1.1 单连接串行 / HTTP/1.1 六连接并发 / HTTP/2 单连接并发
 *   2. 1 个慢请求后面的快请求：HTTP/1.1 单连接上要等多久，HTTP/2 上要等多久
 */
import { startHttp1, startHttp2, table, title, section, ms, http, http2 } from '../harness/index.mjs'

/** HTTP/1.1 批次：agent 的 maxSockets 决定并发几个连接 */
function http1Batch(base, specs, maxSockets) {
    const agent = new http.Agent({ keepAlive: true, maxSockets })
    const t0 = performance.now()
    return Promise.all(
        specs.map(
            spec =>
                new Promise(resolve => {
                    const req = http.get(new URL(`/api/slow?ms=${spec.ms}`, base), { agent }, res => {
                        res.resume()
                        res.on('end', () =>
                            resolve({ label: spec.label, done: performance.now() - t0, sockets: maxSockets })
                        )
                    })
                    req.on('error', () => resolve({ label: spec.label, done: NaN, sockets: maxSockets }))
                })
        )
    )
}

/** HTTP/2 批次：一个连接上并发开 stream */
function http2Batch(base, specs) {
    const client = http2.connect(base)
    client.on('error', () => {})
    const t0 = performance.now()
    return Promise.all(
        specs.map(
            spec =>
                new Promise(resolve => {
                    const req = client.request({ ':path': `/api/slow?ms=${spec.ms}` })
                    req.resume()
                    req.on('end', () => resolve({ label: spec.label, done: performance.now() - t0, sockets: 1 }))
                    req.on('error', () => resolve({ label: spec.label, done: NaN, sockets: 1 }))
                })
        )
    ).then(rows => {
        client.close()
        return rows
    })
}

const avg = list => list.reduce((a, b) => a + b, 0) / list.length

export default async function run() {
    const h1 = await startHttp1()
    const h2 = await startHttp2()
    const base1 = `http://127.0.0.1:${h1.port}`
    const base2 = `http://127.0.0.1:${h2.port}`
    const six = Array.from({ length: 6 }, (_, i) => ({ label: '#' + (i + 1), ms: 200 }))

    try {
        const serial = await http1Batch(base1, six, 1)
        const parallel = await http1Batch(base1, six, 6)
        const multiplexed = await http2Batch(base2, six)
        const total = rows => Math.max(...rows.map(r => r.done))

        console.log(title('6 个 200ms 的请求，三种发法（同一台机器、同一个 handler）'))
        console.log(
            table(
                ['发法', 'TCP 连接数', '批次总耗时', '相对串行'],
                [
                    ['HTTP/1.1 单连接（maxSockets=1）', 1, ms(total(serial)), '1.00×'],
                    [
                        'HTTP/1.1 六连接（maxSockets=6）',
                        6,
                        ms(total(parallel)),
                        (total(serial) / total(parallel)).toFixed(2) + '×'
                    ],
                    [
                        'HTTP/2 单连接（6 个 stream）',
                        1,
                        ms(total(multiplexed)),
                        (total(serial) / total(multiplexed)).toFixed(2) + '×'
                    ]
                ]
            )
        )
        console.log(section('读法'))
        console.log('- HTTP/1.1 的「并发」是靠多开 TCP 连接换来的：一个域名同时 6 个连接，第 7 个请求就得排队')
        console.log('- HTTP/2 在一个连接上开多个 stream，连接数从 6 降到 1，耗时不变')
        console.log('- 并发度不再需要用连接数去凑，这正是「域名分片」这类老优化手段可以退休的原因')

        // —— 队头阻塞：慢请求后面压着的快请求
        const slowThenFast = [
            { label: '慢 500ms', ms: 500 },
            ...Array.from({ length: 5 }, (_, i) => ({ label: '快 20ms #' + (i + 1), ms: 20 }))
        ]
        const h1Head = (await http1Batch(base1, slowThenFast, 1)).slice(1)
        const h2Head = (await http2Batch(base2, slowThenFast)).slice(1)

        console.log(title('一个慢请求排在前面，后面 5 个 20ms 的请求什么时候完成'))
        console.log(
            table(
                ['发法', '快请求平均完成于', '快请求最晚完成于', '说明'],
                [
                    [
                        'HTTP/1.1 单连接',
                        ms(avg(h1Head.map(r => r.done))),
                        ms(Math.max(...h1Head.map(r => r.done))),
                        '同一连接上只能一个一个来，全被慢请求挡住'
                    ],
                    [
                        'HTTP/2 单连接',
                        ms(avg(h2Head.map(r => r.done))),
                        ms(Math.max(...h2Head.map(r => r.done))),
                        '各 stream 独立，慢的不拖累快的'
                    ]
                ]
            )
        )
        console.log(section('这就是「应用层队头阻塞」'))
        console.log('- HTTP/1.1：一个连接同时只处理一个请求，已发出的请求无法并行，后面的只能等')
        console.log('- HTTP/2：多路复用把「连接」与「请求」解耦，一条连接上 N 个 stream 各走各的')
        console.log('- 但 HTTP/2 仍跑在同一条 TCP 连接上：TCP 层丢包要让整条连接的所有 stream 一起等（TCP 层队头阻塞）')
        console.log(
            '- 彻底解决要靠 HTTP/3（QUIC over UDP，stream 级重传）——本机没有 QUIC 服务端，这一条只能讲原理，不在这里编数字'
        )
    } finally {
        h1.close()
        h2.close()
    }
}
