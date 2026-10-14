// pages/order/[id].tsx —— 方括号目录即动态段：/order/:id，params 由服务端路由匹配传入
import { findOrder } from '../../src/data'

export async function load(params: { id: string }) {
    return { order: findOrder(params.id) ?? null }
}

export default function OrderDetail({ order }: { order: { id: string; title: string; amount: number; status: string } | null }) {
    if (!order) {
        return (
            <main>
                <h1>404</h1>
                <p>订单不存在</p>
                <a href="/">返回列表</a>
            </main>
        )
    }
    return (
        <main>
            <h1>订单 {order.id}</h1>
            <p>{order.title} · ¥{order.amount} · {order.status}</p>
            <a href="/">返回列表</a>
        </main>
    )
}
