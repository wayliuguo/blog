// 底层请求能力：只负责发请求，不知道任何业务
import { CURRENCY } from '../shared/constants.js'

export async function request(url, options = {}) {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`${url} -> ${res.status}`)
    return res.json()
}

export function withCurrency(body) {
    return { ...body, currency: CURRENCY }
}
