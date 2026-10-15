import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchProfile, findUser } from './user-api.js'
import { loadUserName } from './profile.js'

// 四类测试替身的区别，全在这一个文件里对照：
//   stub  —— 替身只负责"给出固定答案"，不记录调用（vi.stubGlobal / mockReturnValue）
//   spy   —— 保留真实实现，顺便记录调用（vi.spyOn）
//   mock  —— 完全由测试指定行为，并记录调用（vi.fn）
//   fake  —— 能跑的简化实现，有自己的内部状态（下面手写的 fakeFetch）

function fakeFetch(routes) {
    return url => {
        const route = routes[url]
        if (!route) return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(route) })
    }
}

describe('替身家族对照', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('stub：只给答案，不关心被调了几次', async () => {
        vi.stubGlobal('fetch', vi.fn(fakeFetch({ '/api/users/1': { id: '1', name: '阿白' } })))

        const user = await fetchProfile('1')
        expect(user.name).toBe('阿白')
        // stub 一般不写这种断言 —— 写了就变成 mock 了
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('spy：保留真实实现，只做旁观记录', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
        console.log('hello')
        expect(spy).toHaveBeenCalledWith('hello')
        // restoreAllMocks 负责还原，避免污染后续用例
    })

    it('mock：行为完全由测试指定，包括抛错', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve(null) })
        )

        await expect(fetchProfile('1')).rejects.toThrow('HTTP 500')
    })

    it('fake：内部有状态，能表达"第一次失败第二次成功"', async () => {
        let calls = 0
        vi.stubGlobal(
            'fetch',
            vi.fn(() => {
                calls += 1
                if (calls === 1) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve(null) })
                return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ name: '阿白' }) })
            })
        )

        expect(await loadUserName('1')).toBe('未知用户')
        expect(await loadUserName('1')).toBe('阿白')
    })
})

describe('异步断言的三种写法', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(fakeFetch({ '/api/users/2': { id: '2', name: '小黑' } })))
    })

    it('await + 直接断言（最推荐，可读性最好）', async () => {
        const user = await fetchProfile('2')
        expect(user.name).toBe('小黑')
    })

    it('resolves / rejects（断言一个 promise 更紧凑）', async () => {
        await expect(fetchProfile('2')).resolves.toEqual({ id: '2', name: '小黑' })
    })

    it('兜底分支也要测：网络失败时返回未知用户', async () => {
        expect(await loadUserName('not-exist')).toBe('未知用户')
    })
})

describe('不替换依赖也能测的部分，就不要替换', () => {
    it('纯函数直接测，零替身', () => {
        expect(findUser('1')).toEqual({ id: '1', name: '阿白' })
        expect(findUser('404')).toBeUndefined()
    })
})
