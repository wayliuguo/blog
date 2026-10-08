// ban-api 门禁样本：直连 localStorage + console.log，两条规则都会命中
export function logOrder(order) {
    localStorage.setItem('last-order', order.id)
    console.log('order created', order.id)
    return order.id
}
