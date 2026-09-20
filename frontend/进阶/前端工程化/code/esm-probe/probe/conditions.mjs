// 条件导出的命中顺序 = exports 对象里键的书写顺序，不是"谁更具体"
import { createRequire } from 'node:module'
import { source as viaImport } from 'twin'
import { tag as internalEsm } from '#internal-esm'

const require = createRequire(import.meta.url)
const viaRequire = require('twin')
const internalCjs = require('#internal-cjs')

const short = p => p.replace(/\\/g, '/').replace(/^.*node_modules\//, 'node_modules/')

console.log('import  命中文件 =', short(import.meta.resolve('twin')))
console.log('import  看到     =', viaImport)
console.log('require 命中文件 =', short(require.resolve('twin')))
console.log('require 看到     =', viaRequire.source)
console.log('imports(#internal-esm) =', internalEsm, '| require(#internal-cjs) =', internalCjs.tag)
