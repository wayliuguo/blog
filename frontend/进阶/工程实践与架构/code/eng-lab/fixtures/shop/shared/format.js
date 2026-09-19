// 纯函数：不做 IO，不碰 DOM，同输入同输出 —— 所以可以直接单测
import { CURRENCY } from './constants.js'

export function money(cents) {
    return `${CURRENCY} ${(cents / 100).toFixed(2)}`
}

export function maskPhone(phone) {
    return String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
