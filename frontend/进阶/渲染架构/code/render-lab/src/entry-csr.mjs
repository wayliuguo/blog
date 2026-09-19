/**
 * CSR 入口：HTML 里只有一个空容器，内容全靠这份 JS —— 先拉数据，再建整棵树。
 * 两个来回（JS → 接口）都要等，这正是 CSR 首屏慢的结构性原因。
 */
import { App } from './app.mjs'
import { renderDOM } from './render-dom.mjs'

const root = document.getElementById('app')
const stats = { created: 0, patched: 0, activated: 0 }
const entryAt = Math.round(performance.now() * 10) / 10

const fetchedAt = performance.now()
const response = await fetch('/api/data?reviews=1')
const data = await response.json()
const dataAt = performance.now()

renderDOM(App({ data }), root, stats)
const renderedAt = performance.now()

await Lab.finish(
    {
        strategy: 'csr',
        entryAt,
        apiWaitMs: Math.round(dataAt - fetchedAt),
        renderMs: Math.round(renderedAt - dataAt),
        nodes: root.querySelectorAll('*').length
    },
    stats
)
