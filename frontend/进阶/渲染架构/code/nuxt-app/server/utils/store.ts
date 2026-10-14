// server/utils/store.ts —— Nitro 的 server/utils 目录自动导入：server 目录下可直接用这些函数
export interface Order {
  id: string
  title: string
  amount: number
  status: string
}

const g = globalThis as unknown as { __orders?: Order[] }

g.__orders ??= [
  { id: '1001', title: '机械键盘', amount: 399, status: 'paid' },
  { id: '1002', title: '显示器支架', amount: 259, status: 'pending' },
  { id: '1003', title: 'USB-C 扩展坞', amount: 189, status: 'paid' },
  { id: '1004', title: '人体工学椅', amount: 1299, status: 'refunded' },
  { id: '1005', title: '降噪耳机', amount: 899, status: 'paid' },
]

export function listOrders(): Order[] {
  return g.__orders!
}

export function getOrder(id: string): Order | undefined {
  return g.__orders!.find((o) => o.id === id)
}

export function addOrder(o: Omit<Order, 'id'>): string {
  const id = String(1000 + g.__orders!.length + 1)
  g.__orders!.push({ id, ...o })
  return id
}
