// 与 vue-sub 同源的订单数据（跨应用靠 id 对齐，不共享内存——这正是微前端与单体的区别）
export interface OrderDetail {
    id: string
    title: string
    amount: number
    status: 'paid' | 'pending' | 'shipped'
    items: { name: string; qty: number; price: number }[]
    created: string
}

export const orderDetails: Record<string, OrderDetail> = {
    '1001': {
        id: '1001', title: '机械键盘（青轴 87 键）', amount: 329, status: 'paid',
        items: [
            { name: '青轴 87 键键盘', qty: 1, price: 289 },
            { name: '键帽替换装', qty: 1, price: 40 },
        ],
        created: '2026-10-11 09:24',
    },
    '1002': {
        id: '1002', title: '4K 显示器 27 寸', amount: 1899, status: 'shipped',
        items: [{ name: '27 寸 4K IPS', qty: 1, price: 1899 }],
        created: '2026-10-11 14:03',
    },
    '1003': {
        id: '1003', title: '人体工学椅', amount: 1299, status: 'pending',
        items: [{ name: '工学椅（黑色）', qty: 1, price: 1299 }],
        created: '2026-10-12 20:47',
    },
    '1004': {
        id: '1004', title: 'USB-C 扩展坞', amount: 249, status: 'paid',
        items: [{ name: '8 合 1 扩展坞', qty: 1, price: 249 }],
        created: '2026-10-12 21:15',
    },
    '1005': {
        id: '1005', title: '无线鼠标', amount: 199, status: 'pending',
        items: [{ name: '双模无线鼠标', qty: 1, price: 199 }],
        created: '2026-10-13 08:31',
    },
}
