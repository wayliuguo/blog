'use server'

// app/actions.ts —— Server Action：表单直接调用服务端函数，无需手写 API 路由
import { redirect } from 'next/navigation'
import { store } from '../lib/store'

export async function createOrder(formData: FormData): Promise<{ error: string } | undefined> {
    const title = String(formData.get('title') ?? '').trim()
    const amount = Number(formData.get('amount') ?? 0)
    if (!title || amount <= 0) {
        return { error: '标题必填且金额需大于 0' }
    }
    const id = store.add({ title, amount, status: 'pending' })
    redirect(`/orders/${id}`)
}
