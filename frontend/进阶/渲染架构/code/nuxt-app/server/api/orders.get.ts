// server/api/orders.get.ts —— GET /api/orders：Nitro server route（文件即路由）
export default defineEventHandler(() => {
  return { orders: listOrders() }
})
