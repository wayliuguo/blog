import { valueFromA, fnA } from './circular-a.mjs'
import { valueFromB } from './circular-b.mjs'

console.log('[entry] 两个模块求值完毕后：', valueFromA, valueFromB, fnA())
