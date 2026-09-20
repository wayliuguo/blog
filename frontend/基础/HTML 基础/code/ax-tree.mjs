/**
 * 用 CDP 的 Accessibility 域读出**浏览器自己算的**可访问性树（role + name）。
 *
 * 页面里自己写的检查器只能拼一个"简化版可访问名"，真正权威的结果在无障碍树里——
 * 读屏软件读的就是这棵树。
 *
 * 用法：
 *   node ax-tree.mjs <url> [selector]
 * 例：
 *   node ax-tree.mjs "file:///.../code/site/a11y/index.html" "#bad-zone"
 *   node ax-tree.mjs "file:///.../code/site/a11y/index.html" "#good-zone"
 *
 * 依赖：Node 22 内置的全局 WebSocket，无第三方包。
 */
import { spawn } from 'node:child_process'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const [url, selector = 'body'] = process.argv.slice(2)
if (!url) {
    console.error('用法：node ax-tree.mjs <url> [selector]')
    process.exit(1)
}

// 这两类节点的名字就是它父节点的文字，打出来只是噪音
const SKIP_ROLES = new Set(['InlineTextBox', 'LineBreak', 'none'])

const PORT = 9500 + Math.floor(Math.random() * 300)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const child = spawn(
    CHROME,
    [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--window-size=1200,900',
        `--remote-debugging-port=${PORT}`,
        'about:blank'
    ],
    { stdio: 'ignore' }
)

async function findTarget() {
    for (let i = 0; i < 60; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
            const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
            if (page) return page
        } catch {
            /* 还没起来 */
        }
        await sleep(200)
    }
    throw new Error('拿不到调试目标')
}

function connect(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        ws.addEventListener('open', () => resolve(ws))
        ws.addEventListener('error', e => reject(new Error('WS 连接失败: ' + e.message)))
    })
}

let msgId = 1
function send(ws, method, params = {}) {
    const id = msgId++
    return new Promise((resolve, reject) => {
        const onMsg = ev => {
            const msg = JSON.parse(ev.data)
            if (msg.id !== id) return
            ws.removeEventListener('message', onMsg)
            msg.error ? reject(new Error(method + ' 失败: ' + JSON.stringify(msg.error))) : resolve(msg.result)
        }
        ws.addEventListener('message', onMsg)
        ws.send(JSON.stringify({ id, method, params }))
    })
}

try {
    const target = await findTarget()
    const ws = await connect(target.webSocketDebuggerUrl)

    await send(ws, 'Page.enable', {})
    await send(ws, 'DOM.enable', {})
    await send(ws, 'Accessibility.enable', {})
    await send(ws, 'Page.navigate', { url })
    await sleep(1500)

    const { root } = await send(ws, 'DOM.getDocument', { depth: 1 })
    const { nodeId } = await send(ws, 'DOM.querySelector', { nodeId: root.nodeId, selector })
    if (!nodeId) throw new Error('选择器没匹配到节点：' + selector)

    const { nodes } = await send(ws, 'Accessibility.queryAXTree', { nodeId })

    console.log(`# 无障碍树：${selector}（浏览器算出来的 role 与 name）`)
    for (const n of nodes) {
        const role = n.role?.value || ''
        if (SKIP_ROLES.has(role)) continue
        const name = n.name?.value || ''
        console.log(`${n.ignored ? '[被忽略] ' : ''}role = ${JSON.stringify(role)}  name = ${JSON.stringify(name)}`)
    }

    ws.close()
} catch (e) {
    console.error('ERROR ' + e.message)
    process.exitCode = 1
} finally {
    child.kill()
}
