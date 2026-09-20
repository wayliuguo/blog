'use strict'
// JSBridge 设计演进模拟：协议 / 回调表 / Promise 化 / 批量 / 白名单（node bridge.cjs）
const assert = require('node:assert')

// ── 一代桥：URL Scheme 拦截 + 协议编解码 ────────────────────────
// H5 发起 jsbridge://module/method?id=N&data=<encodeURIComponent(JSON)>
// Native 拦截请求解析协议；回复靠 callbackId 关联
function encodeCall(module, method, params, callbackId) {
    return `jsbridge://${module}/${method}?id=${callbackId}&data=${encodeURIComponent(JSON.stringify(params))}`
}
function decodeCall(url) {
    const m = url.match(/^jsbridge:\/\/(\w+)\/(\w+)\?id=(\d+)&data=(.*)$/)
    assert.ok(m, '协议不合法')
    const [, module, method, id, data] = m
    return { module, method, callbackId: Number(id), params: JSON.parse(decodeURIComponent(data)) }
}

// ── Native 侧：回调表 + 批量队列 + 白名单 ───────────────────────
class NativeBridge {
    constructor(allowOrigins) {
        this.callbacks = new Map() // callbackId -> callback
        this.allowOrigins = allowOrigins
        this.nextId = 1
        this.messages = [] // 批量通道：flush 才真正送达
        this.queue = []
    }
    register(id, cb) {
        this.callbacks.set(id, cb)
    }
    // Native 执行完回调用一次性回调（用后即清，防重复触发与泄漏）
    invokeCallback(id, result) {
        const cb = this.callbacks.get(id)
        assert.ok(cb, '回调必须已注册')
        this.callbacks.delete(id)
        cb(result)
    }
    // H5 → Native：先校验 origin 白名单，再进队列
    postMessage(origin, module, method, params) {
        if (!this.allowOrigins.includes(origin)) return { ok: false, reason: 'origin denied' }
        this.queue.push({ module, method, params, id: this.nextId++ })
        return { ok: true }
    }
    // 批量：同一 tick 的调用 flush 成一条消息
    flush() {
        if (this.queue.length === 0) return
        this.messages.push(this.queue.splice(0))
    }
}

// ── 探针一：协议编解码对称 · 回调表一次性清理 ───────────────────
{
    const call = encodeCall('device', 'getInfo', { os: 'android' }, 7)
    const decoded = decodeCall(call)
    assert.deepEqual(decoded, {
        module: 'device',
        method: 'getInfo',
        callbackId: 7,
        params: { os: 'android' }
    })

    const nb = new NativeBridge(['https://app.demo'])
    let got = null
    nb.register(7, r => {
        got = r
    })
    nb.invokeCallback(7, { sdk: 34 })
    assert.deepEqual(got, { sdk: 34 })
    assert.ok(!nb.callbacks.has(7), '一次性回调：用后即清')
    assert.throws(() => nb.invokeCallback(7, {}), '重复触发同一 callbackId 必须失败')
    console.log('探针一  : 协议编解码对称 · 回调表一次性清理 ✓')
}

// ── 二代桥：回调转 Promise + 超时兜底 ───────────────────────────
// H5 侧的 invoke：注册 callbackId 返回 Promise；超时未回复则 reject
// 并清理回调表——否则表只进不出就是泄漏。
function createInvoke(nb, timeoutMs) {
    let seq = 100
    return function invoke(module, method, params) {
        return new Promise((resolve, reject) => {
            const id = seq++
            const timer = setTimeout(() => {
                nb.callbacks.delete(id) // 超时清理，防回调表泄漏
                reject(new Error('bridge timeout'))
            }, timeoutMs)
            nb.register(id, result => {
                clearTimeout(timer)
                resolve(result)
            })
            // 真实实现这里把调用发过桥；测试由用例手动触发回复
        })
    }
}

// ── 探针二：Promise 化 · 超时兜底清表 ───────────────────────────
;(async () => {
    const nb = new NativeBridge(['https://app.demo'])
    const invoke = createInvoke(nb, 50)

    const okP = invoke('device', 'getInfo', {}).then(
        r => ({ kind: 'ok', r }),
        e => ({ kind: 'err', msg: e.message })
    )
    nb.invokeCallback(100, { sdk: 34 }) // Native 及时回复
    assert.deepEqual(await okP, { kind: 'ok', r: { sdk: 34 } })

    const slowP = invoke('device', 'slow', {}).then(
        r => ({ kind: 'ok', r }),
        e => ({ kind: 'err', msg: e.message })
    )
    const out = await slowP
    assert.deepEqual(out, { kind: 'err', msg: 'bridge timeout' })
    assert.equal(nb.callbacks.size, 0, '超时后回调表已清空')
    console.log('探针二  : 回调转 Promise · 超时 reject 并清理回调表 ✓')

    // ── 探针三：同 tick 批量合并 · 空队列不发 ─────────────────────
    const nb2 = new NativeBridge(['https://app.demo'])
    nb2.postMessage('https://app.demo', 'log', 'pageview', { page: 'a' })
    nb2.postMessage('https://app.demo', 'log', 'click', { id: 'btn' })
    nb2.postMessage('https://app.demo', 'log', 'click', { id: 'btn2' })
    nb2.flush()
    assert.equal(nb2.messages.length, 1, '同 tick 三次调用合并成一条消息')
    assert.equal(nb2.messages[0].length, 3)
    nb2.flush()
    assert.equal(nb2.messages.length, 1, '空队列 flush 不产生空消息')
    console.log('探针三  : 同 tick 批量合并 · 空队列不发 ✓')

    // ── 探针四：origin 白名单 ────────────────────────────────────
    assert.equal(nb2.postMessage('https://app.demo', 'pay', 'request', {}).ok, true)
    const denied = nb2.postMessage('https://evil.example', 'pay', 'request', {})
    assert.equal(denied.ok, false, '非白名单 origin 拒绝')
    console.log('探针四  : origin 白名单外的调用被拒 ✓')
    console.log('\nbridge 探针全部通过 ✓')
})()
