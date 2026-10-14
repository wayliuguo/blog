// src/data.ts —— 订单数据：与 mini-next 同一份场景，两端共用
export interface Order {
    id: string
    title: string
    amount: number
    status: string
}

export const orders: Order[] = [
    { id: '1001', title: '机械键盘', amount: 399, status: 'paid' },
    { id: '1002', title: '显示器支架', amount: 259, status: 'pending' },
    { id: '1003', title: 'USB-C 扩展坞', amount: 189, status: 'paid' },
    { id: '1004', title: '人体工学椅', amount: 1299, status: 'refunded' },
    { id: '1005', title: '降噪耳机', amount: 899, status: 'paid' },
]

export function findOrder(id: string): Order | undefined {
    return orders.find((o) => o.id === id)
}
