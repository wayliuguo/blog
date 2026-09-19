// 组合逻辑：把"取数 + 分页 + 过滤 + 权限"打包成视图能直接消费的形状
import { fetchOrders, cancelOrder } from '../api/order.js'
import { save } from '../utils/storage.js'
import { canEdit } from '../utils/validate.js'
import { PAGE_SIZE } from '../shared/constants.js'

export function useOrderList() {
    let list = []
    let page = 1

    async function load(keyword = '') {
        const res = await fetchOrders({ page, keyword })
        list = res.items
        save('orders-page', page)
        return list
    }

    return {
        load,
        rowActions: (order) => ({ cancel: canEdit(order), pageSize: PAGE_SIZE })
    }
}
