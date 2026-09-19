import { ORDER_STATUS } from '../shared/constants.js'

export function dayjsLike(ts) {
    const d = new Date(ts)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function statusLabel(status) {
    return ORDER_STATUS[status.toUpperCase()] ?? status
}
