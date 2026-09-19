// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter.jsx'

afterEach(cleanup)

describe('按角色和文案查，而不是按 class 查', () => {
    it('渲染初始值，点击后加一并回调', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()

        render(<Counter initial={5} onChange={onChange} />)

        // getByRole + accessible name：最接近"用户怎么找到这个按钮"
        await user.click(screen.getByRole('button', { name: '+1' }))

        expect(screen.getByText('6')).toBeTruthy()
        expect(onChange).toHaveBeenCalledWith(6)
    })

    it('连续点击两次，状态累加', async () => {
        const user = userEvent.setup()
        render(<Counter />)

        const btn = screen.getByRole('button', { name: '+1' })
        await user.click(btn)
        await user.click(btn)

        expect(screen.getByText('2')).toBeTruthy()
    })
})

describe('查不到时，报错信息本身就是调试线索', () => {
    it('getBy 查不到会打印整棵 DOM 树', () => {
        render(<Counter />)
        // 故意查一个不存在的按钮，看报错长什么样（用 try 接住，避免用例失败）
        try {
            screen.getByRole('button', { name: '减一' })
        } catch (e) {
            expect(e.message).toContain('Unable to find')
            expect(e.message).toContain('+1') // 报错里会列出页面上真实的按钮
        }
    })
})
