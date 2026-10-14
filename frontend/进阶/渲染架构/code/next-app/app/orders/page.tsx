import Link from 'next/link'
import { store } from '../../lib/store'

// 列表页声明 force-dynamic：每次请求都 SSR（存储会被 Server Action 改写，不能静态化）
export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
    const orders = store.list()
    return (
        <main>
            <h1>订单列表（SSR）</h1>
            <p>本页每次请求都在服务端重新渲染，Server Action 新增的订单立即可见。</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        <Link href={`/orders/${o.id}`}>#{o.id} {o.title} · ¥{o.amount} · {o.status}</Link>
                    </li>
                ))}
            </ul>
            <Link href="/orders/new">新建订单（Server Action）→</Link>
        </main>
    )
}
