import { submitOrder } from '../api/order.js'
import { load, save } from '../utils/storage.js'
import { toast } from '../hooks/useToast.js'

let items = load('cart', [])

export function add(sku, qty = 1) {
    items.push({ sku, qty })
    save('cart', items)
    toast('已加入购物车')
}

export async function checkout() {
    const order = await submitOrder({ items })
    items = []
    save('cart', items)
    return order
}
