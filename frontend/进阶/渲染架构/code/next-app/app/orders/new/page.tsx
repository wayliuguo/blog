'use client'

// 客户端组件：只有表单交互需要 JS，页面其余部分仍是服务端组件
import { useState } from 'react'
import { createOrder } from '../../actions'

export default function NewOrderPage() {
    const [error, setError] = useState<string | null>(null)
    return (
        <main>
            <h1>新建订单（Server Action）</h1>
            <form
                action={async (formData) => {
                    const res = await createOrder(formData)
                    if (res?.error) setError(res.error)
                }}
            >
                <p>
                    <input name="title" placeholder="商品标题" required />
                </p>
                <p>
                    <input name="amount" type="number" min="1" placeholder="金额" required />
                </p>
                <button type="submit">提交</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </main>
    )
}
