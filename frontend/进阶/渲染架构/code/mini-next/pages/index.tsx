// pages/index.tsx —— 路由 "/" 由构建期从文件名生成（见 build.mjs 的 scanRoutes）
// load() 只在服务端执行：先取数后渲染，props 随 HTML 一起下发
import { orders } from '../src/data'

export async function load() {
    return { total: orders.length, first: orders[0].title, orders }
}

export default function Home({ total, orders }: { total: number; orders: typeof orders }) {
    return (
        <main>
            <h1>订单中心</h1>
            <p>共 {total} 笔订单</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        <a href={`/order/${o.id}`}>#{o.id} {o.title}</a>
                    </li>
                ))}
            </ul>
        </main>
    )
}
