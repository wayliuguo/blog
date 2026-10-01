import { a } from './a.js'

// 顶层就读 a：ESM 的 import 是活绑定，且函数声明会被提升，所以这里拿得到值；
// 打包成 CJS 后 exports.a 还没赋值，拿到的就是 undefined
console.log('b.js 顶层读到 a：' + typeof a)

export function b() {
    return 'b'
}
