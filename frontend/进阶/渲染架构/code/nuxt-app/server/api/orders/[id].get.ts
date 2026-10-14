// server/api/orders/[id].get.ts —— GET /api/orders/:id
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const order = getOrder(id!)
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'order not found' })
  }
  return order
})
