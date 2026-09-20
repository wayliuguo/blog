import { request } from '../utils/http.js'
import { dayjsLike } from '../utils/date.js'

export async function fetchCoupons() {
    const list = await request('/api/coupons')
    return list.map(c => ({ ...c, expireText: dayjsLike(c.expireAt) }))
}
