import { describe, it, expect } from 'vitest'
import { calcTotal, VIP } from './price.js'

// 正模式：只描述「输入 → 期望输出」，不关心内部是 if 链还是查表
// 表驱动：一行一条用例，补用例的成本极低
const cases = [
    { name: '普通用户无折扣', level: VIP.normal, items: [{ price: 100, count: 1 }], expect: 100 },
    { name: '黄金会员未满 200 九折', level: VIP.gold, items: [{ price: 100, count: 1 }], expect: 90 },
    { name: '黄金会员满 200 八五折', level: VIP.gold, items: [{ price: 100, count: 3 }], expect: 255 },
    { name: '铂金会员八折', level: VIP.platinum, items: [{ price: 250, count: 1 }], expect: 200 },
    { name: '空购物车为 0', level: VIP.platinum, items: [], expect: 0 }
]

describe('正模式：测行为', () => {
    it.each(cases)('$name', ({ level, items, expect: want }) => {
        expect(calcTotal(items, level)).toBe(want)
    })
})

// 边界：这些是真正容易出 bug 的地方，值得单独成例
describe('边界与异常', () => {
    it('金额含小数时按分位四舍五入', () => {
        expect(calcTotal([{ price: 33.33, count: 3 }], VIP.platinum)).toBe(79.99)
    })

    it('数量为 0 的商品不影响总额', () => {
        expect(calcTotal([{ price: 100, count: 0 }], VIP.normal)).toBe(0)
    })
})
