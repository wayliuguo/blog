export function submit(order) {
    console.log('submit', order)
    return fetch('/api/order', { method: 'POST', body: JSON.stringify(order) })
}
