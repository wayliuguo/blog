import { describe, it, expect, vi, afterEach } from 'vitest'

// 这个文件的用例必须按顺序跑，用来复现"mock 没还原"的后果
// vitest 默认不会自动还原 spy（restoreMocks 默认 false）

describe('反例：mock 泄漏', () => {
    it('A 用例 spy 了 console.log 且不还原', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {})
        expect(console.log.mock).toBeTruthy()
    })

    it.fails('B 用例拿到的 console.log 已经被换掉了', () => {
        expect(console.log.mock).toBeUndefined()
    })
})

describe('正例：每个用例结束都还原', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('A 用例 spy 后由 afterEach 还原', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {})
        expect(console.log.mock).toBeTruthy()
    })

    it('B 用例拿到的是干净的 console.log', () => {
        expect(console.log.mock).toBeUndefined()
    })
})
