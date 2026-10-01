import { saveCart } from './cart.js'
import { submit } from './order.js'

export function checkout(items) {
    saveCart(items)
    return submit({ items })
}
