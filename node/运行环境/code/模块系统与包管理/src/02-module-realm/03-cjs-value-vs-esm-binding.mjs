// 03 值的拷贝 vs 活绑定：同一个文件里同时导入 CJS 计数器与 ESM 计数器
// 这一段在演示：CommonJS 导出的是「导出那一刻的值」，ESM 导出的是「实时绑定」。
// 触发方式完全一样（都调一次 increase()），但读回来的 count 结果不同。
import cjsCounter from './lib/counter.cjs'
import { count as cjsNamedCount } from './lib/counter.cjs'
import { count as esmCount, increase as esmIncrease } from './lib/counter.mjs'

console.log('=== 调用 increase() 之前 ===')
console.log(`CJS 快照 count = ${cjsCounter.count}`)
console.log(`ESM 活绑定 count = ${esmCount}`)
console.log('两者初始都是 0，看不出区别')

console.log('\n=== 各调一次 increase() ===')
const cjsInside = cjsCounter.increase() // 改的是 counter.cjs 内部的局部变量
const esmInside = esmIncrease() // 改的就是 counter.mjs 里被导出的那个绑定
console.log(`CJS increase() 内部返回 = ${cjsInside}`)
console.log(`ESM increase() 内部返回 = ${esmInside}`)

console.log('\n=== 调用之后，从外部再读一次 count ===')
console.log(`CJS 快照 count = ${cjsCounter.count}    <- 还是 0`)
console.log(`ESM 活绑定 count = ${esmCount}    <- 变成 1 了`)
console.log(`CJS 命名导入 count = ${cjsNamedCount}    <- 同样是 0，命名导入也救不了它`)

console.log('\n=== 为什么：看 CJS 模块内部真实的值 ===')
console.log(`cjsCounter.peek()（模块内部实时值）= ${cjsCounter.peek()}`)
console.log('内部其实已经是 1 了，只是 require 那一刻把 count 拷进了 exports 对象，外面永远停在拷贝时的 0')

console.log('\n结论：')
console.log('  CommonJS -> 值的拷贝，模块内部后续赋值导入方看不到，要同步得自己封装 getter')
console.log('  ES Module -> 活绑定（live binding），模块内部一改，所有导入方实时同步')
