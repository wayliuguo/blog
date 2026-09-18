/**
 * 同源策略与 CORS：把"浏览器到底拦了什么"跑成可核对的输出
 *
 * 页面由 5177 提供（源 = http://localhost:5177），请求打到 5178（另一个源），
 * 所以这里每一条都是真实的跨源行为。
 * 注意：必须通过 http://localhost:5177/cors-demo.html 打开——用 file:// 打开时 Origin 是 null，
 * 同源判断与 CORS 的行为都会不同，看到的结果没有参考价值。
 *
 * 先启动两个服务：npm start（5177）+ npm run api（5178）
 * 两个服务的端口被占用时都会自动 +1；本页启动时按 5178 起依次探测，找到真正的 api-server，
 * 也可以用 ?api=端口 手动指定。
 */
const API_PORT = 5178
let API = 'http://localhost:' + API_PORT // main() 开头会被 findApi() 的探测结果覆盖

const lines = []
const log = (line) => lines.push(line)

const api = (path, init) => fetch(API + path, init)

// api-server 被占端口时会自动 +1，这里按同样的顺序探测「另一个源」实际在哪个端口：
// 只认 /__log 的 JSON 应答（返回 200 且带 total 字段）；其它响应（404、无 CORS 头、占用者回的不是 JSON）
// 都会 reject 或解析失败，跳过试下一个。探测请求带 2s 超时，端口上挂着不回话的服务也不会卡住页面
async function findApi() {
    const manual = new URLSearchParams(location.search).get('api')
    if (manual) return 'http://localhost:' + manual
    for (let port = API_PORT; port < API_PORT + 20; port++) {
        try {
            const res = await fetch('http://localhost:' + port + '/__log', { signal: AbortSignal.timeout(2000) })
            if (res.ok && (await res.json()).total !== undefined) return 'http://localhost:' + port
        } catch (e) {
            /* 试下一个端口 */
        }
    }
    throw new Error('没有探测到 api-server，请先在 code 目录执行 npm run api（或用 ?api=端口 手动指定）')
}

/** 把「成功」与「被浏览器拦下」都写成一行输出：被拦时 fetch 只给一个 TypeError */
async function attempt(label, run) {
    try {
        log(label + ' -> 通过：' + (await run()))
    } catch (e) {
        log(label + ' -> 被拦下：抛 ' + e.name + ' / ' + e.message)
    }
}

async function main() {
    try {
        API = await findApi()
    } catch (e) {
        document.getElementById('probe').textContent = e.message
        return
    }
    const json = (res) => res.json()
    await json(await fetch(API + '/__reset'))

    /* ------------------------------------------------ ① 同源：CORS 根本不参与 */
    await attempt('① 同源请求（5177 -> 5177）', async () => {
        const res = await fetch('./index.html')
        return 'status = ' + res.status + '，res.ok = ' + res.ok
    })

    /* ------------------------------------------------ ② 跨源 + ACAO: * */
    await attempt('② 跨源 + Access-Control-Allow-Origin: *', async () => {
        const res = await api('/api/data?mode=star')
        const d = await json(res)
        return (
            'status = ' + res.status + '，服务端看到的 origin = ' + d.origin +
            '，自定义响应头 X-Api-Server = ' + JSON.stringify(res.headers.get('x-api-server'))
        )
    })

    /* ------------------------------------------------ ③ 再放行 Expose-Headers */
    await attempt('③ ②之上再加 Access-Control-Expose-Headers', async () => {
        const res = await api('/api/data?mode=star&expose=1')
        await json(res)
        return 'X-Api-Server = ' + JSON.stringify(res.headers.get('x-api-server'))
    })

    /* ------------------------------------------------ ④ 服务端不给 CORS 头 */
    await attempt('④ 跨源 + 服务端不返回任何 Access-Control-* 头', async () => {
        const res = await api('/api/data?mode=none')
        const d = await json(res)
        return 'status = ' + res.status + '，服务端仍返回了 ' + d.from
    })

    /* ------------------------------------------------ ⑤ credentials 与 * 互斥 */
    await attempt('⑤ credentials: include + Access-Control-Allow-Origin: *', async () => {
        const res = await api('/api/data?mode=star', { credentials: 'include' })
        return 'status = ' + res.status
    })

    await attempt('⑥ credentials: include + 回显 Origin + Allow-Credentials', async () => {
        const res = await api('/api/data?mode=credentials', { credentials: 'include' })
        const d = await json(res)
        return 'status = ' + res.status + '，服务端看到的 origin = ' + d.origin
    })

    /* ------------------------------------------------ ⑦ 非简单请求先走预检 */
    const postJson = (mode) =>
        api('/api/data?mode=' + mode, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: 1 })
        })

    await attempt('⑦ POST + application/json，但预检里没有 Allow-Headers', async () => {
        const res = await postJson('star')
        return 'status = ' + res.status
    })

    await attempt('⑧ 同上，预检补齐 Allow-Methods / Allow-Headers', async () => {
        const res = await postJson('full')
        const d = await json(res)
        return 'status = ' + res.status + '，服务端收到的 content-type = ' + d.contentType
    })

    /* ------------------------------------------------ 服务端视角的统计 */
    const stats = await json(await fetch(API + '/__log'))
    log('')
    log('服务端统计：一共收到 ' + stats.total + ' 个 /api 请求，其中预检（OPTIONS）' + stats.preflight + ' 次')
    if (stats.lastPreflight)
        log(
            '最后一次预检的内容：Access-Control-Request-Method = ' +
                stats.lastPreflight.method +
                '，Access-Control-Request-Headers = ' +
                stats.lastPreflight.headers
        )
    log('被 CORS 拦下的那几次，服务端其实都正常收到并返回了——拦的是"把响应交给 JS"这一步')

    document.getElementById('probe').textContent = lines.join('\n')
}

main()
