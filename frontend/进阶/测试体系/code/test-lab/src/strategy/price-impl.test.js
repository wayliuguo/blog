import { describe, it, expect, vi } from 'vitest'

// 反模式：把内部依赖 mock 掉，断言「它被调用了、参数是啥」
// 这样测的是"实现路径"，不是"算出来的结果"
vi.mock('./discount.js', async () => {
    const actual = await vi.importActual('./discount.js')
    return {
        ...actual,
        discountRate: vi.fn(actual.discountRate)
    }
})

import { discountRate } from './discount.js'
import { calcTotal, VIP } from './price.js'

describe('反模式：测实现细节', () => {
    it('断言 discountRate 被调用且参数正确', () => {
        const total = calcTotal([{ price: 100, count: 3 }], VIP.gold)

        expect(discountRate).toHaveBeenCalledTimes(1)
        expect(discountRate).toHaveBeenCalledWith(VIP.gold, 300)
        expect(total).toBe(255)
    })
})

describe('反模式：重言式断言（把实现抄一遍当期望）', () => {
    it('用同样的算法算一遍期望值', () => {
        const items = [{ price: 100, count: 3 }]
        const expected = items.reduce((s, it) => s + it.price * it.count, 0) * 0.85

        // 期望值与被测代码用的是同一套算法 —— 实现写错了，这里也跟着错
        expect(calcTotal(items, VIP.gold)).toBe(expected)
    })
})
