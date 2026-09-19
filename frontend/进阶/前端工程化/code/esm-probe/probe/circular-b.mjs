import * as a from './circular-a.mjs'

// a 的模块体还没执行，它的 const 还在 TDZ，连读键都会抛
try {
    console.log('[b] 读 a.valueFromA =', a.valueFromA)
} catch (err) {
    console.log('[b] 读 a.valueFromA ->', `${err.name}: ${err.message}`)
}
try {
    console.log('[b] Object.keys(a) =', Object.keys(a))
} catch (err) {
    console.log('[b] Object.keys(a) ->', `${err.name}: ${err.message}`)
}
console.log('[b] typeof a.fnA =', typeof a.fnA, '（函数声明在实例化阶段就已就绪）')

export const valueFromB = 'B'
