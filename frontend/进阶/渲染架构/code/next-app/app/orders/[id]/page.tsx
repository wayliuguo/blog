import Link from 'next/link'
import { notFound } from 'next/navigation'
import { store } from '../../../lib/store'

// 已知 id 构建期预渲染，其余请求时动态渲染；revalidate=10 即 ISR（10 秒后台重建）
export const revalidate = 10

export async function generateStaticParams() {
    return store.list().map((o) => ({ id: o.id }))
}

// Next 15：params 是 Promise，必须 await
export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const order = store.get(id)
    if (!order) notFound()
    return (
        <main>
            <h1>订单 {order.id}（ISR：10 秒后台重建）</h1>
            <p>{order.title} · ¥{order.amount} · {order.status}</p>
            <Link href="/orders">返回列表</Link>
        </main>
    )
}
