import { describe, it, expect } from 'vitest'
import { sum } from './sum.js'

describe('必会的几个断言', () => {
    it('toBe：原始值严格相等（Object.is）', () => {
        expect(sum(1, 2)).toBe(3)
    })

    it('toEqual：对象深比较', () => {
        expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })
    })

    it('toThrow：断言抛出', () => {
        expect(() => {
            throw new Error('boom')
        }).toThrow('boom')
    })

    it('toContain：数组/字符串包含', () => {
        expect([1, 2, 3]).toContain(2)
    })

    it('toMatchObject：部分字段匹配', () => {
        expect({ id: 1, name: '小黑', age: 3 }).toMatchObject({ name: '小黑' })
    })
})
