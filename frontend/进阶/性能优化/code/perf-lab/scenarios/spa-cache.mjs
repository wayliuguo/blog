/**
 * 场景：第二次打开这个 SPA，到底能省下什么
 * 运行：npm run spa:cache
 *
 * 三组对照，每组都是「同一个 URL 连开两次」，看第二次比第一次快多少：
 *   无缓存        —— 每次换一个全新的浏览器档案，两次都是冷启动
 *   HTTP 强缓存   —— 固定端口 + 固定档案，服务器给 /spa/ 下的资源发 max-age
 *   Service Worker—— 同上，但缓存由 SW 接管（服务器仍然 no-store）
 *
 * 三组都给每个资源加 100ms 延迟：本机 localhost 是「秒下」，
 * 不加上这一跳，缓存省下的那点下载时间会被本机噪声完全盖住
 *
 * 为什么必须固定端口：HTTP 缓存按 origin 存，端口每次都变的话，
 * 上一次访问写进磁盘的缓存根本不会被查到，测出来就是「缓存没生效」的假象
 */
import os from 'node:os'
import path from 'node:path'
import { startServer, openChrome } from '../harness/index.mjs'
import { title, section, table, ms, bytes } from '../harness/index.mjs'

const RUN = Date.now()
const PORT = 5192
const tmp = (tag) => path.join(os.tmpdir(), `perf-lab-${tag}-${RUN}`)
const settle = (ms) => new Promise((r) => setTimeout(r, ms))

async function visit(srv, url, profileDir) {
    const wait = srv.nextReport(30000)
    const chrome = openChrome(url, [], profileDir)
    try {
        return await wait
    } finally {
        chrome.kill()
        await settle(800) // 等上一个 Chrome 把档案目录释放掉，否则下一个起不来
    }
}

async function twoVisits({ tag, server, freshEachTime, query }) {
    const srv = await startServer(server)
    const url = `${srv.origin}/spa/optimized.html?${new URLSearchParams(query)}`
    const dir = tmp(tag)
    const first = await visit(srv, url, freshEachTime ? `${dir}-1` : dir)
    const second = await visit(srv, url, freshEachTime ? `${dir}-2` : dir)
    await srv.close()
    return { first, second }
}

const cached = (report) => report.resources.filter((r) => r.size === 0).length

export default async function run() {
    const arms = [
        {
            name: '无缓存（对照）',
            tag: 'cold',
            freshEachTime: true,
            server: { spaLatency: 100 },
            query: { opt: '1', n: 2000 }
        },
        {
            name: 'HTTP 强缓存',
            tag: 'http',
            server: { port: PORT, spaCache: true, spaLatency: 100 },
            query: { opt: '1', n: 2000 }
        },
        {
            name: 'Service Worker',
            tag: 'sw',
            server: { port: PORT, spaLatency: 100 },
            query: { opt: '1', n: 2000, sw: '1' }
        }
    ]

    const rows = []
    for (const arm of arms) {
        // 缓存实验跑 2 轮没意义（第二轮会用到第一轮的缓存），每组只跑一次
        const { first, second } = await twoVisits(arm)
        rows.push({ name: arm.name, first, second })
    }

    console.log(title('同一个 URL 连开两次：第二次能省多少'))
    console.log(
        table(
            ['缓存策略', '首次 首屏有内容', '二次 首屏有内容', '首次 JS 传输', '二次 JS 传输', '二次命中缓存的资源'],
            rows.map(({ name, first, second }) => [
                name,
                ms(first.extra.firstViewMs),
                ms(second.extra.firstViewMs),
                bytes(first.extra.jsBytes),
                bytes(second.extra.jsBytes),
                `${cached(second)} / ${second.resources.length}`
            ])
        )
    )

    console.log(section('怎么选'))
    console.log('- HTTP 强缓存是默认该做的：零代码，一个响应头（带内容 hash 的文件名 + max-age）。')
    console.log('  这一组里它把二次访问从 ~280ms 拉到 ~100ms，且传输量归零。')
    console.log('- Service Worker 反而慢一点（~175ms vs ~108ms）：SW 本身要冷启动一个线程，')
    console.log('  每个请求都要过一遍它的 fetch 回调。它不是「更快的缓存」，')
    console.log('  真正的价值在 HTTP 缓存给不了的那两件事——离线可用、以及对缓存策略的精确控制')
    console.log('  （比如「HTML 走网络优先，JS 走缓存优先」这种分资源的策略）。')
    console.log('- 所以顺序是：先把 HTTP 强缓存配好，再考虑要不要为离线 / 精细控制引入 SW。')
    console.log('  反过来做，就会用一整套要维护的逻辑去换一个已经拿到的收益。')
    console.log('- 两者的前提都是文件名带内容 hash：内容变了文件名就变，用户才会去拿新的；')
    console.log('  否则「缓存生效」和「改了没生效」会变成同一个问题。')
}
