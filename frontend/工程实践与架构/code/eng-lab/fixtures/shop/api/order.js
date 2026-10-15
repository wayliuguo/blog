// 接口层：把后端契约翻译成前端可用的函数，视图只依赖它，不依赖 http 细节
import { request, withCurrency } from '../utils/http.js'
import { PAGE_SIZE } from '../shared/constants.js'

export function fetchOrders({ page = 1, keyword = '' } = {}) {
    return request(`/api/orders?page=${page}&size=${PAGE_SIZE}&q=${encodeURIComponent(keyword)}`)
}

export function submitOrder(payload) {
    return request('/api/orders', { method: 'POST', body: JSON.stringify(withCurrency(payload)) })
}

export function cancelOrder(id) {
    return request(`/api/orders/${id}/cancel`, { method: 'POST' })
}
