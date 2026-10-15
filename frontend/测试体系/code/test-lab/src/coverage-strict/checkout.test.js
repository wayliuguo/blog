import { describe, it, expect } from 'vitest'
import { calcPay, canCheckout } from '../coverage-demo/checkout.js'

// 同一份被测代码、同样的覆盖率数字，换成"断言具体值"就立刻暴露 bug：
// 81 元的 VIP 订单本不该打折（未满 100），实现却给了 8 折
describe('强断言：覆盖率相同，但能抓到 bug', () => {
    it('未满 100 的 VIP 订单不打折', () => {
        expect(calcPay(81, true)).toBe(81) // 实际拿到 65，用例失败
    })

    it('满 100 的 VIP 订单打八折', () => {
        expect(calcPay(200, true)).toBe(160)
    })

    it('非 VIP 原价', () => {
        expect(calcPay(200, false)).toBe(200)
    })

    it('余额刚好等于总额可以下单', () => {
        expect(canCheckout({ balance: 100 }, [{ price: 50, count: 2 }])).toBe(true)
    })

    it('余额差一分也不能下单', () => {
        expect(canCheckout({ balance: 99.99 }, [{ price: 50, count: 2 }])).toBe(false)
    })
})
