// composables/useOrders.ts —— composables/ 目录自动导入：组件里直接用 useOrders()
export function useOrders() {
  return useFetch('/api/orders')
}
