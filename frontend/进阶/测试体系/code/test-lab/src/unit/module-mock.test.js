import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.mock 会被提升到文件顶部：它替换的是"模块依赖图里的那个模块"
// 所有 import 拿到的都是替身，不需要 stubGlobal
vi.mock('./user-api.js', async () => {
    const actual = await vi.importActual('./user-api.js')
    return {
        ...actual,
        fetchProfile: vi.fn()
    }
})

import { fetchProfile } from './user-api.js'
import { loadUserName, loadUserCard } from './profile.js'

beforeEach(() => {
    vi.mocked(fetchProfile).mockReset()
})

describe('整模块替换：把数据层换成 mock', () => {
    it('正常路径', async () => {
        vi.mocked(fetchProfile).mockResolvedValue({ id: '1', name: '阿白' })
        expect(await loadUserName('1')).toBe('阿白')
    })

    it('异常路径：抛错时兜底', async () => {
        vi.mocked(fetchProfile).mockRejectedValue(new Error('HTTP 500'))
        expect(await loadUserName('1')).toBe('未知用户')
    })

    it('一次调用被并发复用时只请求一次', async () => {
        vi.mocked(fetchProfile).mockResolvedValue({ id: '1', name: '阿白' })
        const card = await loadUserCard('1')
        expect(card).toEqual({ name: '阿白', orderCount: 1 })
        expect(fetchProfile).toHaveBeenCalledTimes(1)
    })
})

describe('vi.doMock：只在运行时替换，不受提升影响', () => {
    afterEach(() => {
        vi.doUnmock('./user-api.js')
        vi.resetModules()
    })

    it('同一个文件里可以对不同模块用不同策略', async () => {
        // resetModules 必须在 doMock 之前：先清掉模块缓存，再让新的 import 走替身
        vi.resetModules()
        vi.doMock('./user-api.js', () => ({
            fetchProfile: vi.fn().mockResolvedValue({ name: '动态替身' })
        }))

        const { loadUserName: fresh } = await import('./profile.js')
        expect(await fresh('1')).toBe('动态替身')
    })
})
