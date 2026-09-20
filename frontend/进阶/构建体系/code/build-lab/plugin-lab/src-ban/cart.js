export function saveCart(items) {
    localStorage.setItem('cart', JSON.stringify(items))
    return items
}
