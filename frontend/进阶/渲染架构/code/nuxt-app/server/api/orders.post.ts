// server/api/orders.post.ts —— POST /api/orders：服务端写操作，前端 $fetch 直接调
export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: string; amount?: number }>(event)
  const title = String(body.title ?? '').trim()
  const amount = Number(body.amount ?? 0)
  if (!title || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: '标题必填且金额需大于 0' })
  }
  const id = addOrder({ title, amount, status: 'pending' })
  return { id }
})
