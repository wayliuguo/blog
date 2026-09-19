// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm.jsx'

afterEach(cleanup)

// 手动控制 Promise 的兑现时机：这样"加载中"这个中间态就能被稳定断言，不用碰真实定时器
function deferred() {
    let resolve
    let reject
    const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('交互：用 user-event 模拟真实用户', () => {
    it('空表单提交时给出校验提示，且不调用 onSubmit', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        render(<LoginForm onSubmit={onSubmit} />)
        await user.click(screen.getByRole('button', { name: '登录' }))

        expect(screen.getByRole('alert').textContent).toBe('用户名和密码不能为空')
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('输入后提交，成功后展示欢迎语', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockResolvedValue(true)

        render(<LoginForm onSubmit={onSubmit} />)
        // getByLabelText：靠 <label for> 关联，正是无障碍用户找到输入框的方式
        await user.type(screen.getByLabelText('用户名'), '阿白')
        await user.type(screen.getByLabelText('密码'), 'secret')
        await user.click(screen.getByRole('button', { name: '登录' }))

        // findBy* = getBy* + waitFor：只要"最终会出现"，中间几帧不管
        expect(await screen.findByText('欢迎回来，阿白')).toBeTruthy()
        expect(onSubmit).toHaveBeenCalledWith({ name: '阿白', pwd: 'secret' })
    })
})

describe('异步中间态：把 Promise 捏在手里', () => {
    it('提交期间按钮禁用且文案变为登录中', async () => {
        const user = userEvent.setup()
        const d = deferred()
        const onSubmit = vi.fn().mockReturnValue(d.promise)

        render(<LoginForm onSubmit={onSubmit} />)
        await user.type(screen.getByLabelText('用户名'), '阿白')
        await user.type(screen.getByLabelText('密码'), 'secret')
        await user.click(screen.getByRole('button', { name: '登录' }))

        expect(screen.getByRole('button', { name: '登录中…' }).disabled).toBe(true)

        d.resolve(true)
        expect(await screen.findByText('欢迎回来，阿白')).toBeTruthy()
    })

    it('请求失败时给出错误提示，按钮恢复可用', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn().mockRejectedValue(new Error('500'))

        render(<LoginForm onSubmit={onSubmit} />)
        await user.type(screen.getByLabelText('用户名'), '阿白')
        await user.type(screen.getByLabelText('密码'), 'secret')
        await user.click(screen.getByRole('button', { name: '登录' }))

        expect(await screen.findByRole('alert')).toBeTruthy()
        expect(screen.getByRole('alert').textContent).toBe('网络异常，请重试')
        expect(screen.getByRole('button', { name: '登录' }).disabled).toBe(false)
    })
})

describe('waitFor：断言"某件事最终会发生"', () => {
    it('等待 DOM 变化而不是睡固定时间', async () => {
        const onSubmit = vi.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve(true), 10))
        )

        const user = userEvent.setup()
        render(<LoginForm onSubmit={onSubmit} />)
        await user.type(screen.getByLabelText('用户名'), '阿白')
        await user.type(screen.getByLabelText('密码'), 'secret')
        await user.click(screen.getByRole('button', { name: '登录' }))

        await waitFor(() => {
            expect(screen.getByText('欢迎回来，阿白')).toBeTruthy()
        })
    })
})
