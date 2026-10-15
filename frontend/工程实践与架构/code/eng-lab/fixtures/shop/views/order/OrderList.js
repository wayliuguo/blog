import { useOrderList } from '../../hooks/useOrderList.js'
import { money } from '../../shared/format.js'
import { request } from '../../utils/http.js'

export async function OrderList() {
    const { load, rowActions } = useOrderList()
    const rows = await load()
    // 这条 request 绕过了 api 层，前后端契约一变就得回来改视图
    const stat = await request('/api/orders/stat')
    return { rows, stat, text: money(rows.length * 100) }
}
