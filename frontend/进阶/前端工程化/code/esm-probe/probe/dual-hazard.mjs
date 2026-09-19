// 同一个包，被 import 和 require 各解析到一份入口文件，
// 于是模块级状态出现两份 —— 这就是 dual package hazard
import { createRequire } from 'node:module'
import { read as esmRead, bump as esmBump, source as esmSource } from 'twin'

const require = createRequire(import.meta.url)
const cjs = require('twin')

console.log('import  侧入口 =', esmSource)
console.log('require 侧入口 =', cjs.source)

esmBump()
console.log('ESM 侧 +1 后  -> esm.count =', esmRead(), '| cjs.count =', cjs.read())

cjs.bump()
console.log('CJS 侧 再 +1  -> esm.count =', esmRead(), '| cjs.count =', cjs.read())
