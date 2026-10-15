import { describe, it, expect } from 'vitest'
import { sum } from './sum.js'

describe('sum', () => {
    it('两个正数相加', () => {
        expect(sum(1, 2)).toBe(3)
    })

    it('能处理负数', () => {
        expect(sum(-1, 1)).toBe(0)
    })
})
