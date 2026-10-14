// server/api/orders/summary.get.ts —— GET /api/orders/summary
export default defineEventHandler(() => {
  const orders = listOrders()
  return {
    total: orders.length,
    amount: orders.reduce((s, o) => s + o.amount, 0),
    orders: orders.map((o) => ({ id: o.id, title: o.title })),
  }
})
