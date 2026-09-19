/** 价格换算：分 → 展示字符串。服务端与客户端必须给出完全一样的字符串，否则 hydration 必失配 */
export function formatPrice(cents) {
    return `¥${(cents / 100).toFixed(2)}`
}

/** 故意与服务端不同的写法：用来演示「两端口径不一致会让 hydration 失配」 */
export function formatPriceLoose(cents) {
    return `¥${Math.round(cents / 100)}`
}
