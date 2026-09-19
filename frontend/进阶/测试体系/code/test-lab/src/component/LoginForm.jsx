import { useState } from 'react'

// 被测组件：受控表单 + 异步提交 + 三态反馈（idle / loading / error / success）
export function LoginForm({ onSubmit }) {
    const [name, setName] = useState('')
    const [pwd, setPwd] = useState('')
    const [status, setStatus] = useState('idle')
    const [msg, setMsg] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        if (!name || !pwd) {
            setStatus('error')
            setMsg('用户名和密码不能为空')
            return
        }
        setStatus('loading')
        try {
            const ok = await onSubmit({ name, pwd })
            setStatus(ok ? 'success' : 'error')
            setMsg(ok ? '登录成功' : '用户名或密码错误')
        } catch {
            setStatus('error')
            setMsg('网络异常，请重试')
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>登录</h2>
            <label htmlFor="login-name">用户名</label>
            <input id="login-name" value={name} onChange={(e) => setName(e.target.value)} />
            <label htmlFor="login-pwd">密码</label>
            <input id="login-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? '登录中…' : '登录'}
            </button>
            {status === 'error' && <p role="alert">{msg}</p>}
            {status === 'success' && <p>欢迎回来，{name}</p>}
        </form>
    )
}
