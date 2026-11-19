// 08-type-switch/esm-default.js —— 后缀是普通的 .js，但同目录的 package.json 声明了 "type": "module"
// 这一段在演示：包级开关（type 字段）如何决定一个 .js 文件的解析方式。
import { fileURLToPath } from 'node:url'

console.log('  解析方式: ESM（由同目录 package.json 的 "type": "module" 决定）')
console.log('  可以用 import 语法:', '是')
console.log('  import.meta.url        =', import.meta.url)
console.log('  fileURLToPath(上面这个) =', fileURLToPath(import.meta.url))
console.log('  typeof require   =', typeof require, '（ESM 里没有 require）')
console.log('  typeof module    =', typeof module, '（ESM 里没有 module）')
console.log('  typeof __dirname =', typeof __dirname, '（ESM 里没有 __dirname，要用 import.meta.url 换算）')
