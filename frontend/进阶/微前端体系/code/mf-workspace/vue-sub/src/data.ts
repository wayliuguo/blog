// 统一业务数据：与渲染架构板块 next-app/nuxt-app 的订单数据同源（跨板块同一业务场景）
export interface Order {
    id: string
    title: string
    amount: number
    status: 'paid' | 'pending' | 'shipped'
}

export const orders: Order[] = [
    { id: '1001', title: '机械键盘（青轴 87 键）', amount: 329, status: 'paid' },
    { id: '1002', title: '4K 显示器 27 寸', amount: 1899, status: 'shipped' },
    { id: '1003', title: '人体工学椅', amount: 1299, status: 'pending' },
    { id: '1004', title: 'USB-C 扩展坞', amount: 249, status: 'paid' },
    { id: '1005', title: '无线鼠标', amount: 199, status: 'pending' },
]
