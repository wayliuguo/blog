// 08-type-switch/cjs-forced.cjs —— .cjs 后缀优先级高于 package.json 的 "type"
// 这一段在演示：文件后缀是最高优先级的判定依据，哪怕所在包声明了 "type": "module" 也照样按 CJS 解析。
const path = require('node:path')

console.log('  解析方式: CommonJS（.cjs 后缀强制指定）')
console.log('  __filename            =', path.basename(__filename))
console.log('  __dirname             =', __dirname)
console.log('  typeof require        =', typeof require, '（CJS 里 require 可用）')
console.log('  module.exports 是对象 =', typeof module.exports === 'object')
console.log('  结论: 同一个目录下 .js 是 ESM，.cjs 仍然是 CommonJS，后缀说了算')
