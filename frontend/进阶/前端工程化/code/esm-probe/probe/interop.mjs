// ESM 引 CJS：default 一定是 module.exports 本身；
// 具名导出则是 Node 在求值前用 cjs-module-lexer 静态扫出来的
import legacy, { name, version } from './legacy.cjs'
import * as ns from './legacy.cjs'

console.log('default       =', legacy)
console.log('具名 name     =', name, '| version =', version)
console.log('命名空间 keys  =', Object.keys(ns))

// 扫不出名字时，具名导入不存在，只能走 default
const opaque = await import('./legacy-opaque.cjs')
console.log('opaque keys   =', Object.keys(opaque))
console.log('opaque.default =', opaque.default)
