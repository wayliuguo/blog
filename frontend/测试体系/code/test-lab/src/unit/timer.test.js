import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce, throttle } from './timer.js'

describe('debounce：用假定时器把"等 300ms"变成"拨表 300ms"', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('wait 毫秒内重复调用，只执行最后一次', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 300)

        debounced('a')
        vi.advanceTimersByTime(200)
        debounced('b')
        vi.advanceTimersByTime(200)
        debounced('c')
        vi.advanceTimersByTime(299)
        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('c')
    })

    it('不拨表就永远不触发——证明它是"延迟"而非"节流"', () => {
        const fn = vi.fn()
        debounce(fn, 1000)()
        vi.advanceTimersByTime(999)
        expect(fn).not.toHaveBeenCalled()
    })
})

describe('throttle：依赖 Date.now，假定时器会连系统时间一起冻结', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('一个周期内只执行一次', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled() // t=0    立即执行
        vi.advanceTimersByTime(50)
        throttled() // t=50   被推迟到 t=100
        vi.advanceTimersByTime(49)
        expect(fn).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(1) // t=100
        expect(fn).toHaveBeenCalledTimes(2)
    })
})
