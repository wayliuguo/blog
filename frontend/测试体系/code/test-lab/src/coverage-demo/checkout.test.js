import { describe, it, expect } from 'vitest'
import { calcPay, canCheckout } from './checkout.js'

// 反例：每条分支都走了一遍，覆盖率 100%，但断言只说"是个数字"
// 业务 bug（VIP 折扣少了满 100 的门槛）照样从这套测试底下溜走
describe('弱断言：覆盖率好看，质量没保障', () => {
    it('VIP 有折扣', () => {
        const result = calcPay(81, true)
        expect(typeof result).toBe('number')
    })

    it('非 VIP 不打折', () => {
        expect(typeof calcPay(81, false)).toBe('number')
    })

    it('金额为 0 时返回 0', () => {
        expect(typeof calcPay(0, true)).toBe('number')
    })

    it('未登录不能下单', () => {
        expect(typeof canCheckout(null, [{ price: 10, count: 1 }])).toBe('boolean')
    })

    it('空购物车不能下单', () => {
        expect(typeof canCheckout({ balance: 100 }, [])).toBe('boolean')
    })

    it('余额充足可以下单', () => {
        expect(typeof canCheckout({ balance: 100 }, [{ price: 10, count: 1 }])).toBe('boolean')
    })
})
