// Rollup 演示用的输入：多个导出 + 一个"看起来无副作用"的模块
import { add, mul } from './math.js'
import { VERSION } from './meta.js'

export function sum(list) {
    return list.reduce((acc, n) => acc + n, 0)
}

export function calc(a, b) {
    return add(a, b) + mul(a, b)
}

export { VERSION }
