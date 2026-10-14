export interface Order {
    id: string
    title: string
    amount: number
    status: 'pending' | 'paid' | 'shipped'
}

export const STATUS_CN: Record<Order['status'], string> = {
    pending: '待支付',
    paid: '已支付',
    shipped: '已发货',
}

const NEXT: Record<Order['status'], Order['status']> = {
    pending: 'paid',
    paid: 'shipped',
    shipped: 'shipped',
}

// 模块级数据源：与 web 侧订单业务同一份结构，方便三端对照
export const initialOrders: Order[] = [
    { id: '1001', title: '机械键盘', amount: 399, status: 'paid' },
    { id: '1002', title: '无线鼠标', amount: 199, status: 'pending' },
    { id: '1003', title: '显示器支架', amount: 259, status: 'pending' },
    { id: '1004', title: 'USB-C 扩展坞', amount: 329, status: 'shipped' },
]

export function advance(o: Order): Order {
    return { ...o, status: NEXT[o.status] }
}
