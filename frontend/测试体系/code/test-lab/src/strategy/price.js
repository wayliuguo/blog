import { discountRate, VIP } from './discount.js'

export { VIP }

export function calcTotal(items, level = VIP.normal) {
    const amount = items.reduce((sum, it) => sum + it.price * it.count, 0)
    const rate = discountRate(level, amount)
    return Math.round(amount * rate * 100) / 100
}
