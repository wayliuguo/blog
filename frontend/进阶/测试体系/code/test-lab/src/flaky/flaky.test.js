import { describe, it, expect, vi, afterEach } from 'vitest'
import { signInStreak, markVisited, visitCount, isSameDay, isSameDayUtc } from './streak.js'

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

describe('flaky 来源一：用 sleep 赌时间', () => {
    it.fails('以为 50ms 够了，实际要 80ms', async () => {
        let done = false
        setTimeout(() => {
            done = true
        }, 80)

        await sleep(50)
        expect(done).toBe(true) // 慢机器上 50ms 不够，快机器上刚好够 —— 典型的 flaky
    })

    it('修法：等待"条件成立"而不是等待"时间过去"', async () => {
        let done = false
        setTimeout(() => {
            done = true
        }, 80)

        await vi.waitFor(() => {
            expect(done).toBe(true)
        })
    })
})

describe('flaky 来源二：用例之间共享了可变状态', () => {
    it('A 用例访问了首页', () => {
        expect(markVisited('/home')).toBe(1)
    })

    it.fails('B 用例期望从零开始 —— 但 A 已经写过数据了', () => {
        expect(visitCount()).toBe(0)
    })
})

describe('flaky 来源三：依赖"今天"这个会变的值', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it.fails('跨过零点后，同一个断言会得到不同结果', () => {
        vi.useFakeTimers()
        // 把"现在"钉在 23:59:59.900（本地时间）
        vi.setSystemTime(new Date('2026-01-01T23:59:59.900'))
        const now = new Date()
        const lastSignIn = new Date('2026-01-01T00:00:00')

        // 业务希望：同一天签到不算连续天数
        const streak = signInStreak(lastSignIn, now)

        // 再拨 200ms 就跨天了
        vi.advanceTimersByTime(200)
        expect(signInStreak(lastSignIn, new Date())).toBe(streak)
    })

    it('修法：把时间也当成要注入的依赖', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T10:00:00'))
        const now = new Date()

        // 同一天签到 → 连续天数不增加
        expect(signInStreak(new Date('2026-01-01T09:00:00'), now)).toBe(0)
        // 昨天 23:00 签到，今天 10:00 再签 → 跨天但未断签
        expect(signInStreak(new Date('2025-12-31T23:00:00'), now)).toBe(1)
        // 从未签到 → 从 1 开始
        expect(signInStreak(null, now)).toBe(1)
    })
})

describe('flaky 来源四：时区（本地时间方法 vs UTC 时间戳）', () => {
    it('同一对时间戳，时区不同结论就不同', () => {
        const a = new Date('2026-01-01T00:00:00Z')
        const b = new Date('2026-01-01T23:00:00Z')

        // isSameDay 用 getFullYear/getDate 等本地方法：东八区下 a 是 1 号 08:00、b 是 2 号 07:00
        // 所以这段逻辑在开发者机器和 CI（常见 UTC）上会给出不同结果
        expect(isSameDayUtc(a, b)).toBe(true)
        expect(typeof isSameDay(a, b)).toBe('boolean')
        console.log(`本机时区偏移 ${-new Date().getTimezoneOffset() / 60} 小时，isSameDay 结果 = ${isSameDay(a, b)}`)
    })
})
