// 04 ESM 导入 CommonJS：默认导入 vs 命名导入
// 这一段在演示：ESM 里引一个 CJS 模块有两种写法，各自的来源和限制不一样。
// 默认导入拿到的就是对方的 module.exports；命名导入靠的是 cjs-module-lexer 的静态扫描。
import store from './lib/store.cjs' // 默认导入：整个 module.exports
import { name, version } from './lib/store.cjs' // 命名导入：静态扫出来的属性
import * as ns from './lib/store.cjs' // 命名空间对象，把上面两种都摊开看

console.log('=== 1) 默认导入（import store from ...）===')
console.log('store =', store)
console.log('store 就是对方的 module.exports，属性随便取：', store.name, store.version, store.describe())

console.log('\n=== 2) 命名导入（import { name, version } from ...）===')
console.log(`name = ${name}`)
console.log(`version = ${version}`)
console.log('它和默认导入指向的是同一个对象上的同一份值:', store.name === name && store.version === version)
console.log('原理：Node 用 cjs-module-lexer 在加载前扫出 exports.xxx / module.exports = {...} 这类字面量属性名，')

console.log('\n=== 3) 命名空间对象上都挂了什么 ===')
console.log('Object.keys(namespace) =', Object.keys(ns))
console.log('namespace.default === store ?', ns.default === store)

console.log('\n=== 4) 限制：静态扫不到的导出，只能走默认导入 ===')
console.log('store.dynamic（默认导入看得见）=', store.dynamic)
console.log('namespace.dynamic（命名导入看不见）=', ns.dynamic)
console.log('原因：store.cjs 里是 exports[计算出来的变量名] = ... 挂上去的，静态分析只能识别字面量属性名')

console.log('\n结论：')
console.log('  import store from "./x.cjs"        -> 永远拿得到，等同于 x.cjs 的 module.exports')
console.log('  import { foo } from "./x.cjs"      -> 只在 foo 是静态可识别的属性名时可用，动态挂的属性拿不到')
