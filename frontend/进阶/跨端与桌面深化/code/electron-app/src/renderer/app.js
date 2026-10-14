// 渲染进程：纯前端代码，零 Node 依赖——所有系统能力都走 window.desktop
const listEl = document.getElementById('order-list')
const hintEl = document.getElementById('bridge-hint')

// 桥接自检：preload 没生效时给出明确提示（这是 Electron 最常见的翻车点）
if (window.desktop) {
    hintEl.textContent = 'preload 已注入：window.desktop 可用（contextIsolation 开启）'
} else {
    hintEl.textContent = 'window.desktop 不存在：检查 preload 路径与 contextIsolation 配置'
}

const STATUS_CN = { pending: '待支付', paid: '已支付', shipped: '已发货' }

async function renderList() {
    const orders = await window.desktop.listOrders()
    listEl.innerHTML = ''
    for (const o of orders) {
        const li = document.createElement('li')
        li.textContent = `#${o.id} ${o.title} ¥${o.amount} · ${STATUS_CN[o.status]}`
        li.dataset.id = o.id
        li.addEventListener('click', () => showDetail(o.id))
        listEl.appendChild(li)
    }
}

async function showDetail(id) {
    const o = await window.desktop.getOrder(id)
    document.getElementById('detail-empty').hidden = true
    const body = document.getElementById('detail-body')
    body.hidden = false
    document.getElementById('d-title').textContent = `#${o.id} ${o.title}`
    document.getElementById('d-meta').textContent = `金额 ¥${o.amount}`
    document.getElementById('d-status').textContent = `状态：${STATUS_CN[o.status]}`
    const btn = document.getElementById('advance-btn')
    btn.onclick = async () => {
        // invoke 到主进程推进状态 → 返回新对象 → 重新拉列表
        const next = await window.desktop.advance(id)
        document.getElementById('d-status').textContent = `状态：${STATUS_CN[next.status]}`
        renderList()
    }
}

renderList()
