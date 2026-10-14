// lib/store.ts —— 进程内订单存储：RSC 与 Server Action 共享同一份内存（演示用，生产应落库）
export interface Order {
    id: string
    title: string
    amount: number
    status: 'paid' | 'pending' | 'refunded'
}

const g = globalThis as unknown as { __orders?: Order[] }

g.__orders ??= [
    { id: '1001', title: '机械键盘', amount: 399, status: 'paid' },
    { id: '1002', title: '显示器支架', amount: 259, status: 'pending' },
    { id: '1003', title: 'USB-C 扩展坞', amount: 189, status: 'paid' },
    { id: '1004', title: '人体工学椅', amount: 1299, status: 'refunded' },
    { id: '1005', title: '降噪耳机', amount: 899, status: 'paid' },
]

export const store = {
    list: () => g.__orders!,
    get: (id: string) => g.__orders!.find((o) => o.id === id),
    add: (o: Omit<Order, 'id'>) => {
        const id = String(1000 + g.__orders!.length + 1)
        g.__orders!.push({ id, ...o })
        return id
    },
}
