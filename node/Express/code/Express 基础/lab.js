/**
 * 自测小工具：等端口起来 → 用 fetch 真实请求一遍 → 打印结果 → 退出。
 *
 * 文档里贴的「实测输出」就是这里的原样输出，不假造。
 */

const net = require('node:net')

// 轮询直到端口能连上（listen 回调之前还有一个短暂窗口）
function waitUp(port, retries = 100) {
    return new Promise((resolve, reject) => {
        let tries = 0
        const tick = () => {
            const socket = net.connect(port, '127.0.0.1')
            socket.once('connect', () => {
                socket.destroy()
                resolve()
            })
            socket.once('error', () => {
                socket.destroy()
                if (++tries > retries) reject(new Error(`端口 ${port} 一直没起来`))
                else setTimeout(tick, 20)
            })
        }
        tick()
    })
}

async function request(port, method, path, { body, headers } = {}) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body })
    return { status: res.status, headers: res.headers, text: await res.text() }
}

// cases: [method, path, { body, headers, show }]
async function selfTest(port, label, cases) {
    await waitUp(port)
    console.log(`\n=== ${label} ===`)
    for (const [method, path, opts = {}] of cases) {
        const { status, headers, text } = await request(port, method, path, opts)
        console.log(`  ${method.padEnd(4)} ${path}`)
        console.log(`       状态码 ${status}`)
        for (const k of opts.show || ['content-type']) {
            const v = headers.get(k)
            if (v !== null) console.log(`       ${k}: ${v}`)
        }
        console.log(`       body: ${text.replace(/\n/g, '\\n')}`)
    }
    process.exit(0)
}

module.exports = { selfTest, request, waitUp }
