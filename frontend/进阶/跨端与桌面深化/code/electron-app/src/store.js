// 数据层：主进程独占，渲染进程只能通过 IPC 拿到快照
const orders = [
    { id: '1001', title: '机械键盘', amount: 399, status: 'paid' },
    { id: '1002', title: '无线鼠标', amount: 199, status: 'pending' },
    { id: '1003', title: '显示器支架', amount: 259, status: 'pending' },
    { id: '1004', title: 'USB-C 扩展坞', amount: 329, status: 'shipped' },
]

const NEXT = { pending: 'paid', paid: 'shipped', shipped: 'shipped' }

function findOrder(id) {
    return orders.find((o) => o.id === id) ?? null
}

function advanceStatus(id) {
    const o = findOrder(id)
    if (!o) return null
    o.status = NEXT[o.status] ?? o.status
    return o
}

module.exports = { orders, findOrder, advanceStatus }
