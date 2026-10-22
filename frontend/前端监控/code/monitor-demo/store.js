// 极简购物车状态：演示页不需要真正的状态管理，reactive 单例足够
import { reactive, computed } from 'vue'
import { products } from './products.js'

export const cart = reactive({
    items: [] // { id, name, emoji, price, qty }
})

export const cartCount = computed(() => cart.items.reduce((n, it) => n + it.qty, 0))
export const cartTotal = computed(() => cart.items.reduce((n, it) => n + it.qty * it.price, 0))

export function findProduct(id) {
    return products.find((p) => p.id === Number(id))
}

export function addToCart(p, qty = 1) {
    const exist = cart.items.find((it) => it.id === p.id)
    if (exist) exist.qty += qty
    else cart.items.push({ id: p.id, name: p.name, emoji: p.emoji, price: p.price, qty })
}
