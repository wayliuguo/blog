/**
 * 场景：缓存决策——同一份数据，响应头不同，第二次访问的行为就不同
 * 运行：npm run cache
 *
 * 三件事：
 *   1. 强缓存（immutable）/ 协商缓存（no-cache + ETag）/ no-store 的第二次请求对照
 *   2. 按 RFC 9111 的判定公式，把响应头翻译成「客户端会不会发请求」
 *   3. stale-while-revalidate：过期了但还能先用旧的，后台再刷新
 */
import { startHttp1, table, title, section, bytes } from '../harness/index.mjs'

const RESOURCES = [
    { name: '内容哈希的 JS', path: '/api/cache/immutable/app.js', kind: '强缓存' },
    { name: '接口 JSON', path: '/api/cache/etag/doc.json', kind: '协商缓存' },
    { name: 'HTML 文档', path: '/api/cache/html', kind: '不缓存' }
]

/** 按 RFC 9111 判新鲜度：年龄 < max-age 就是新鲜的，直接可用，不发请求 */
function decide(headers, ageSeconds) {
    const cc = headers.get('cache-control') || ''
    const maxAge = Number((cc.match(/max-age=(\d+)/) || [])[1] ?? NaN)
    const swr = Number((cc.match(/stale-while-revalidate=(\d+)/) || [])[1] ?? NaN)
    if (/no-store/.test(cc)) return '每次都重新请求（no-store）'
    if (/immutable/.test(cc)) return '新鲜期内不发请求，且跳过刷新（immutable）'
    if (!Number.isNaN(maxAge) && ageSeconds < maxAge) return '新鲜，不发请求'
    if (!Number.isNaN(swr) && ageSeconds - maxAge < swr) return '先用旧数据渲染，后台悄悄刷新（swr 窗口内）'
    if (/no-cache/.test(cc)) return '过期，带校验字段发请求（协商缓存）'
    return '过期，重新请求'
}

async function probe(base, item) {
    const first = await fetch(base + item.path)
    const body = await first.text()
    const etag = first.headers.get('etag')
    const headers = { cacheControl: first.headers.get('cache-control'), etag }

    // 第二次：带 If-None-Match（有 ETag 才带），看服务端是否回 304
    const second = await fetch(base + item.path, {
        headers: etag ? { 'If-None-Match': etag } : {}
    })
    const secondBody = second.status === 304 ? '' : await second.text()

    return {
        ...item,
        headers,
        firstBytes: body.length,
        secondStatus: second.status,
        secondBytes: secondBody.length,
        rfc: decide(first.headers, 30)
    }
}

export default async function run() {
    const h1 = await startHttp1()
    const base = `http://127.0.0.1:${h1.port}`

    try {
        const rows = []
        for (const item of RESOURCES) rows.push(await probe(base, item))

        console.log(title('第一次与第二次请求的对照'))
        console.log(
            table(
                ['资源', 'Cache-Control', '首次状态/字节', '二次状态/字节', '二次是否传正文'],
                rows.map(r => [
                    r.name,
                    r.headers.cacheControl,
                    `200 / ${bytes(r.firstBytes)}`,
                    `${r.secondStatus} / ${bytes(r.secondBytes)}`,
                    r.secondBytes === 0 ? '否' : '是'
                ])
            )
        )
        console.log(section('先说明这一列的口径'))
        console.log('脚本里的 fetch 是普通 HTTP 客户端，不带缓存：它永远照发不误，所以「二次状态」只反映服务端行为。')
        console.log('浏览器会不会真的发这次请求，取决于下面这条 RFC 9111 的判定规则——这才是各响应头的差别所在。')

        console.log(section('把响应头翻译成「客户端会不会发请求」'))
        console.log(
            table(
                ['资源', '按 RFC 9111 判定的客户端行为'],
                rows.map(r => [r.name, r.rfc])
            )
        )
        console.log('- 强缓存命中时请求根本不出浏览器，`Age: 30` 那一步的值是从上次响应算起的')
        console.log('- 协商缓存省的是正文，省不掉这一次往返：304 也是要花 RTT 的')
        console.log('- `no-store` 的不该给「每次都要最新」的接口滥用，接口该用 `no-cache` + ETag，才可能拿到 304')

        // 缓存失效：ETag 变了才会回 200 全量
        const changed = await fetch(base + '/api/cache/etag/doc.json', {
            headers: { 'If-None-Match': '"0000000000000000"' }
        })
        console.log(section('校验字段对不上时'))
        console.log(
            `带一个过期的 ETag 再请求：服务端状态码 ${changed.status}，正文 ${bytes((await changed.text()).length)}`
        )
        console.log('→ 也就是说，协商缓存的收益完全取决于 ETag / Last-Modified 是否稳定；内容一变就得整份重传')

        // stale-while-revalidate 的三个区间
        const swrRows = []
        for (const age of [30, 300, 1200]) {
            const res = await fetch(`${base}/api/cache/swr/feed.json?age=${age}`)
            await res.text()
            swrRows.push([
                `Age=${age}s`,
                age < 60 ? '新鲜' : age - 60 < 600 ? '过期但在 swr 窗口内' : '过期且超出 swr 窗口',
                decide(res.headers, age)
            ])
        }
        console.log(title('stale-while-revalidate：max-age=60, stale-while-revalidate=600 的三种年龄'))
        console.log(table(['响应的 Age', '状态', '客户端行为'], swrRows))
        console.log(section('取舍'))
        console.log('- 强缓存（max-age + immutable）：最快，代价是内容更新只能靠改文件名')
        console.log('- 协商缓存（no-cache + ETag）：内容实时，代价是每次一发往返')
        console.log('- swr：先给旧内容保证速度，后台刷新保证最终一致，适合列表页 / 详情页这类可以稍微旧一点的数据')
        console.log('- `no-store` 只留给登录态、支付结果这类绝不允许落盘的响应')
    } finally {
        h1.close()
    }
}
