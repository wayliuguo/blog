import { fetchCoupons } from '../../api/coupon.js'
import { useToast } from '../../hooks/useToast.js'
import { money } from '../../shared/format.js'

export async function Overview() {
    const coupons = await fetchCoupons()
    useToast(() => {})
    return `优惠券 ${coupons.length} 张，合计 ${money(coupons.length * 1000)}`
}
