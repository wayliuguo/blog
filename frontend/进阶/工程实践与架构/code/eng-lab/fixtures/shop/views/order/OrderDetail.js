import { fetchOrders } from '../../api/order.js'
import { useToast } from '../../hooks/useToast.js'
import { UserCard } from '../user/UserCard.js'

export async function OrderDetail(id) {
    const [order] = (await fetchOrders()).items.filter((o) => o.id === id)
    useToast(() => {})
    // 跨领域直接引用别的领域内部文件：两个领域从此耦在一起
    return `${UserCard(order.buyer)} 的订单`
}
