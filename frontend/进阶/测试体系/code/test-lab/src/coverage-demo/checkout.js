// 被测源码：结算金额计算与能否下单判断
// 里面藏着一个业务 bug：VIP 折扣本该「满 100 才生效」，实现里漏了这条判断

export function calcPay(amount, isVip) {
    if (amount <= 0) return 0
    const rate = isVip ? 0.8 : 1
    return Math.round(amount * rate)
}

export function canCheckout(user, cart) {
    if (!user) return false
    if (!cart || cart.length === 0) return false
    const total = cart.reduce((sum, item) => sum + item.price * item.count, 0)
    return user.balance >= total
}
