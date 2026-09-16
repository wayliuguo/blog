// 02 exports 与 module.exports 的陷阱
// 这一段在演示：exports 只是 module.exports 的快捷引用，最终被导出的一定是 module.exports。
console.log('=== 0) 本文件里 exports 和 module.exports 是不是同一个对象 ===')
console.log('exports === module.exports ?', exports === module.exports) // true
console.log('所以一开始给 exports.xxx 挂属性，等于给 module.exports 挂属性')

console.log('\n=== 1) 正确姿势：给共享对象挂属性，外部看得见 ===')
const store = require('./lib/store.cjs')
console.log('require 到的对象:', store)
console.log('store.name =', store.name, '| store.version =', store.version)

console.log('\n=== 2) 陷阱一：直接给 exports 赋值 ===')
const reassigned = require('./traps/exports-reassign.cjs')
console.log('模块里写了 exports = { viaReassignedExports: true }')
console.log('外界 require 到的却是:', reassigned)
console.log('是个空对象吗:', Object.keys(reassigned).length === 0)
console.log('原因：exports 只是模块包裹函数的一个参数，重新赋值只改了局部变量，module.exports 没动')

console.log('\n=== 3) 陷阱二：替换 module.exports 之后再挂 exports ===')
const overwritten = require('./traps/module-exports-overwrite.cjs')
console.log('模块里写了 module.exports = { viaModuleExports: true }，之后才写 exports.viaExportsAfterOverwrite = true')
console.log('外界 require 到的:', overwritten)
console.log('viaModuleExports =', overwritten.viaModuleExports)
console.log(
    'viaExportsAfterOverwrite =',
    overwritten.viaExportsAfterOverwrite,
    '（undefined，挂在没人引用的老对象上了）'
)

console.log('\n结论：')
console.log('  整体替换导出对象 -> 写 module.exports = { ... }')
console.log('  增量挂属性       -> 写 exports.xxx = ...，且不要在之后重新赋值 module.exports')
