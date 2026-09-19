import * as b from './circular-b.mjs'

export const valueFromA = 'A'

// 函数声明在实例化阶段就被初始化，所以循环依赖下它也是可用的
export function fnA() {
    return 'fnA'
}

console.log('[a] 依赖先求值完，这里能读到 b.valueFromB =', b.valueFromB)
