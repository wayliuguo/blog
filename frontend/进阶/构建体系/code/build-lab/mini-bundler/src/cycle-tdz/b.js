import { a, A_NAME } from './a.js'

// 顶层就读：函数声明有提升，const 没有 —— 两者命运不同
console.log('b.js 顶层读到 a：' + typeof a)
console.log('b.js 顶层读到 A_NAME：' + A_NAME)

export function b() {
    return 'b'
}
