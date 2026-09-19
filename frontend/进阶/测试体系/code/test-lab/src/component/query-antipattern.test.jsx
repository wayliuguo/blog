// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter.jsx'

afterEach(cleanup)

describe('反例一：用 DOM 结构当查询条件', () => {
    it('click 后断言第 N 层子节点', async () => {
        const user = userEvent.setup()
        const { container } = render(<Counter initial={1} onChange={vi.fn()} />)

        await user.click(container.querySelector('button'))

        // 断言写成了"p 里的 span"——把 <p> 换成 <div>，功能没坏，测试却红了
        expect(container.querySelector('p > span').textContent).toBe('2')
    })
})

describe('反例二：整棵 DOM 树拍快照', () => {
    it('把渲染结果整个存下来', () => {
        const { container } = render(<Counter />)
        // 任何样式/class 微调都要 npm test -- -u；而且看快照的人并不知道"什么是重要的"
        expect(container.innerHTML).toMatchSnapshot()
    })
})

describe('正例：只断言用户能感知的东西', () => {
    it('同样的场景，写法与实现解耦', async () => {
        const user = userEvent.setup()
        render(<Counter initial={1} onChange={vi.fn()} />)

        await user.click(screen.getByRole('button', { name: '+1' }))

        // 用户看到的是"数字变成了 2"，不关心它躺在哪个标签里
        expect(screen.getByText('2')).toBeTruthy()
    })
})
