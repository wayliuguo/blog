/**
 * fetch：状态码、超时、取消、竞态
 * 全部请求都打到配套的本地接口（server.js 的 /api/search、/api/echo），所以结果是真实的网络行为：
 *   /api/search?q=&delay=&status=   delay 毫秒后返回，status 可指定 4xx/5xx
 * 以 file:// 打开时自动把请求指向 http://localhost:5176（接口带 CORS 头），因此两种打开方式都能跑。
 */
const BASE = location.protocol === 'file:' ? 'http://localhost:5176' : ''
const api = (path) => BASE + path

const lines = []
const log = (line) => lines.push(line)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------ ① 基本用法与响应状态 */
async function basic() {
    const res = await fetch(api('/api/search?q=well&delay=60'))
    const data = await res.json()
    log('① status = ' + res.status + '，res.ok = ' + res.ok + '，content-type = ' + res.headers.get('content-type'))
    log('   await res.json() 得到：' + JSON.stringify(data))
}

/* ------------------------------------------------ ② 4xx/5xx 不会 reject */
async function notOk() {
    const res = await fetch(api('/api/search?status=500'))
    log('② 请求一个 500：没有抛异常，res.ok = ' + res.ok + '，res.status = ' + res.status)
    log('   所以“请求成功”必须自己判 res.ok，只看 await 有没有 throw 会把服务端错误当成成功')
}

/* ------------------------------------------------ ③ 超时 */
async function timeout() {
    try {
        await fetch(api('/api/search?delay=800'), { signal: AbortSignal.timeout(120) })
        log('③ 超时：没有抛异常（不符合预期）')
    } catch (e) {
        log('③ AbortSignal.timeout(120) 打给一个 800ms 才返回的接口 -> 抛 ' + e.name)
    }
}

/* ------------------------------------------------ ④ 主动取消 */
async function manualAbort() {
    const ctrl = new AbortController()
    const p = fetch(api('/api/search?delay=800'), { signal: ctrl.signal })
    setTimeout(() => ctrl.abort(), 60)
    try {
        await p
        log('④ 主动取消：没有抛异常（不符合预期）')
    } catch (e) {
        log('④ controller.abort() 之后 -> 抛 ' + e.name + '，请求真的被掐断，不是“忽略结果”')
    }
}

/* ------------------------------------------------ ⑤ 竞态 */
async function race() {
    // 无守卫：先发的请求后回来，会把后发的结果覆盖掉
    let noGuard = null
    const searchNoGuard = (q, delay) =>
        fetch(api('/api/search?q=' + q + '&delay=' + delay))
            .then((r) => r.json())
            .then((d) => {
                noGuard = d.q
            })
    await Promise.all([searchNoGuard('a', 400), searchNoGuard('ab', 80)])
    log('⑤ 无守卫：依次输入 a、ab（a 的请求更慢）-> 最终显示 ' + JSON.stringify(noGuard) + ' ← 用旧结果覆盖了新结果')

    // 序号守卫：只认最后一次输入的响应
    let seq = 0
    let guarded = null
    const searchGuarded = async (q, delay) => {
        const mine = ++seq
        const d = await (await fetch(api('/api/search?q=' + q + '&delay=' + delay))).json()
        if (mine === seq) guarded = d.q
    }
    await Promise.all([searchGuarded('a', 400), searchGuarded('ab', 80)])
    log('   序号守卫：只接受“序号最新”的响应 -> 最终显示 ' + JSON.stringify(guarded))

    // 取消守卫：发新请求前掐掉上一个
    let ctrl = null
    let aborted = null
    const searchAbort = async (q, delay) => {
        if (ctrl) ctrl.abort()
        ctrl = new AbortController()
        try {
            const d = await (await fetch(api('/api/search?q=' + q + '&delay=' + delay), { signal: ctrl.signal })).json()
            aborted = d.q
        } catch (e) {
            /* 被新请求取消的旧请求会走到这里，属于预期，忽略即可 */
        }
    }
    await Promise.all([searchAbort('a', 400), searchAbort('ab', 80)])
    log('   取消守卫：新请求发出前 abort 掉旧的 -> 最终显示 ' + JSON.stringify(aborted) + '（顺带省掉一次无用响应）')
}

/* ------------------------------------------------ ⑥ XHR 对照 */
function xhrGet(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url)
        xhr.onload = () => resolve({ readyState: xhr.readyState, status: xhr.status, body: xhr.responseText })
        xhr.onerror = () => reject(new Error('network error'))
        xhr.send()
    })
}

async function xhrCompare() {
    const r = await xhrGet(api('/api/echo?msg=hello'))
    log('⑥ 同一件事用 XMLHttpRequest：readyState = ' + r.readyState + '（DONE），status = ' + r.status + '，响应体 ' + r.body)
    log('   XHR 只有回调式 API，要自己拼 Promise；fetch 原生返回 Promise，但少了上传进度、同步模式这些能力')
}

async function main() {
    try {
        await basic()
        await notOk()
        await timeout()
        await manualAbort()
        await race()
        await xhrCompare()
    } catch (e) {
        log('执行中断：' + e.name + ' / ' + e.message)
        log('若看到 Failed to fetch，请先在 code 目录执行 npm start（本页依赖本地接口）')
    }
    document.getElementById('probe').textContent = lines.join('\n')
}

main()
