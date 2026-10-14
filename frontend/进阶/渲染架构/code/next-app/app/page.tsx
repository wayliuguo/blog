import Link from 'next/link'
import { store } from '../lib/store'

// 首页是纯静态内容：构建时渲染一次（SSG），请求路径上零渲染
export default function Home() {
    const orders = store.list()
    const total = orders.reduce((s, o) => s + o.amount, 0)
    return (
        <main>
            <h1>订单中心</h1>
            <p>共 {orders.length} 笔订单，累计金额 ¥{total}</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        <Link href={`/orders/${o.id}`}>#{o.id} {o.title}</Link>
                    </li>
                ))}
            </ul>
            <Link href="/orders">查看订单列表（SSR）→</Link>
        </main>
    )
}
